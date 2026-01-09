import { TaskNode } from "@demo/core/pipeline/src/nodes";
import BaseRunnableTask from "@demo/core/pipeline/src/tasks/baseRunnableTask";
import { DAG } from "@demo/core/pipeline/src/dag";
import { Results } from "@demo/core/pipeline/src/types";
import { AgentController, AcaPyAgentAdapter } from "@demo/core";
import { randomUUID } from "crypto";
import { state as serverState } from "../state";

type ConnectionResult = {
  connectionId: string;
  invitation: unknown;
};

type ProofRequestResult = {
  presentationExchangeId: string;
  connectionId: string;
  request: any;
  demoVerifier?: {
    connectionId: string;
    proofExchangeId?: string;
  };
};

type PresentationResult = {
  presentationExchangeId: string;
  connectionId: string;
  request: any;
  state: string;
  demoVerifier?: {
    connectionId: string;
    proofExchangeId?: string;
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const POLL_INTERVAL_MS = 2000;
const VERIFIED_GRACE_MS = (() => {
  const raw = process.env.ACAPY_VERIFIED_GRACE_MS;
  if (!raw) return 2000;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 2000;
  return parsed;
})();

function decodeOobFromUrl(oobUrl: string): any {
  const url = new URL(oobUrl.trim());
  const encoded =
    url.searchParams.get("oob") ||
    url.searchParams.get("_oob") ||
    url.searchParams.get("oob64") ||
    url.searchParams.get("c_i") ||
    url.searchParams.get("d_m");
  if (!encoded) {
    throw new Error("No OOB invitation payload found in URL");
  }

  const normalized = encoded.replace(/ /g, "+").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(decoded);
}

async function fetchJson(url: string, opts: RequestInit): Promise<any> {
  const response = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ACA-Py request failed (${response.status} ${response.statusText}): ${text}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return undefined;
}

class ReceiveOobViaAcaPyTask extends BaseRunnableTask {
  private adapter: AcaPyAgentAdapter;
  private oobUrl: string;
  private result: ConnectionResult | null = null;
  private controlUrl: string;

  constructor(adapter: AcaPyAgentAdapter, oobUrl: string, name: string, description?: string) {
    super(name, description);
    this.adapter = adapter;
    this.oobUrl = oobUrl;
    this.controlUrl = adapter.getControlUrl();
  }

  async prepare(): Promise<void> {
    super.prepare();
    this.addMessage("Ready to accept DIDComm v2 OOB invitation with ACA-Py holder");
  }

  async run(): Promise<void> {
    super.run();
    if (!this.oobUrl) {
      this.addError("No OOB URL provided");
      this.setFailed();
      this.setCompleted();
      throw new Error("OOB URL is required");
    }

    const adminUrl = this.adapter.getAdminUrl();
    if (!adminUrl) {
      throw new Error("ACA-Py admin URL missing");
    }

    const invitation = decodeOobFromUrl(this.oobUrl);
    this.addMessage("Decoded OOB invitation");

    let acceptResponse: any;
    const controlReceive = `${this.controlUrl.replace(/\/$/, "")}/connections/receive-invitation`;
    const adminOutOfBandReceive = `${adminUrl.replace(/\/$/, "")}/out-of-band/receive-invitation`;
    const adminConnectionsReceive = `${adminUrl.replace(/\/$/, "")}/connections/receive-invitation`;
    const endpoints = [controlReceive, adminOutOfBandReceive, adminConnectionsReceive];

    let lastError: Error | null = null;
    for (const endpoint of endpoints) {
      try {
        const payload = {
          invitation,
          auto_accept: true,
          // Avoid reusing a previous connection in demo runs; it makes it too easy
          // to send the proof request on a different (older) connection than the one
          // CTS is waiting on.
          use_existing_connection: false,
        };

        acceptResponse = await fetchJson(endpoint, { method: "POST", body: JSON.stringify(payload) });
        this.addMessage(`Invitation posted to ${endpoint}`);
        break;
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.addMessage(`Failed at ${endpoint}, trying fallback...`);
      }
    }

    if (!acceptResponse && lastError) {
      this.addError(lastError.message);
      this.setFailed();
      this.setCompleted();
      throw lastError;
    }

    const connectionId =
      acceptResponse?.connection_id ||
      acceptResponse?.connectionId ||
      acceptResponse?.result?.connection_id ||
      acceptResponse?.result?.connectionId;

    if (!connectionId) {
      const error = new Error("ACA-Py did not return a connection id");
      this.addError(error.message);
      this.setFailed();
      this.setCompleted();
      throw error;
    }

    this.addMessage(`Connection created: ${connectionId}, waiting for active state...`);

    const record = await this.waitForConnection(adminUrl, connectionId);
    const state = record?.state || record?.result?.state;
    this.addMessage(`Connection state reached: ${state || "unknown"}`);

    this.result = {
      connectionId,
      invitation,
    };
    this.setAccepted();
    this.setCompleted();
  }

  private async waitForConnection(adminUrl: string, connectionId: string) {
    const control = this.controlUrl.replace(/\/$/, "");
    // Prefer control API wait to block until active
    try {
      const waited = await fetchJson(`${control}/connections/wait`, {
        method: "POST",
        body: JSON.stringify({ connection_id: connectionId, timeout_ms: 120000 }),
      });
      const state = waited?.state || waited?.record?.state;
      if (state === "active" || state === "completed") {
        return waited?.record || waited;
      }
    } catch (err) {
      // Fall back to polling admin if wait failed
      this.addMessage(`control wait failed, polling admin: ${err instanceof Error ? err.message : String(err)}`);
    }

    const deadline = Date.now() + 120_000;
    let last: any;
    while (Date.now() < deadline) {
      last = await fetchJson(`${adminUrl.replace(/\/$/, "")}/connections/${connectionId}`, {
        method: "GET",
      }).catch(() => null);
      const state = last?.state || last?.result?.state;
      if (state === "active" || state === "completed" || state === "response") {
        return last?.result || last;
      }
      await sleep(1500);
    }
    throw new Error("Timed out waiting for ACA-Py connection to become active");
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "ReceiveOobViaAcaPyTask",
      value: this.result,
    };
  }
}

class AwaitProofRequestTask extends BaseRunnableTask {
  private adapter: AcaPyAgentAdapter;
  private demoVerifierAdapter?: AcaPyAgentAdapter;
  private proofResult: ProofRequestResult | null = null;
  private startedAtMs: number | null = null;
  private demoVerifierResult?: { connectionId: string; proofExchangeId?: string };

  constructor(
    adapter: AcaPyAgentAdapter,
    name: string,
    description?: string,
    demoVerifierAdapter?: AcaPyAgentAdapter
  ) {
    super(name, description);
    this.adapter = adapter;
    this.demoVerifierAdapter = demoVerifierAdapter;
  }

  async prepare(): Promise<void> {
    super.prepare();
    this.addMessage("Waiting for PE v2 proof request from verifier");
    const enabled = (process.env.ACAPY_VERIFIER_AUTO_SEND_PROOF_REQUEST ?? "false").toLowerCase() === "true";
    if (enabled) {
      this.addMessage(
        this.demoVerifierAdapter
          ? "Demo auto-send proof request: enabled"
          : "Demo auto-send proof request: enabled, but no internal verifier controller is configured"
      );
    } else {
      this.addMessage("Demo auto-send proof request: disabled");
    }
  }

  async run(input?: any): Promise<void> {
    super.run();
    this.startedAtMs = Date.now();
    const connectionId = input?.connectionId;
    if (!connectionId) {
      const error = new Error("connectionId missing from prior step");
      this.addError(error.message);
      this.setFailed();
      this.setCompleted();
      throw error;
    }

    const adminUrl = this.adapter.getAdminUrl();
    if (!adminUrl) {
      throw new Error("ACA-Py admin URL missing");
    }

    await this.maybeSendDemoProofRequest(input);

    const record = await this.waitForProofRequest(adminUrl, connectionId);
    const presentationExchangeId =
      record?.pres_ex_id || record?.presentation_exchange_id || record?.presentation_exchange_id;

    if (!presentationExchangeId) {
      const error = new Error("Missing presentation exchange id in proof request");
      this.addError(error.message);
      this.setFailed();
      this.setCompleted();
      throw error;
    }

    const request = record?.by_format?.pres_request?.dif || record?.presentation_request_dict || record;
    this.addMessage("Proof request received (PE v2 / DIF)");

    this.proofResult = {
      presentationExchangeId,
      connectionId,
      request,
      demoVerifier: this.demoVerifierResult,
    };
    this.setAccepted();
    this.setCompleted();
  }

  private getRecordTimeMs(record: any): number {
    const raw = record?.updated_at || record?.created_at;
    if (!raw || typeof raw !== "string") return 0;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private async maybeSendDemoProofRequest(input: any): Promise<void> {
    const enabled = (process.env.ACAPY_VERIFIER_AUTO_SEND_PROOF_REQUEST ?? "false").toLowerCase() === "true";
    if (!enabled) return;
    if (!this.demoVerifierAdapter) return;

    const invitation: any = input?.invitation;
    const invitationId = invitation?.["@id"] || invitation?.id;
    if (!invitationId) {
      this.addMessage("Demo auto-send enabled but invitation missing @id; skipping auto-send");
      return;
    }

    const verifierControl = this.demoVerifierAdapter.getControlUrl().replace(/\/$/, "");
    const verifierAdminUrl = this.demoVerifierAdapter.getAdminUrl()?.replace(/\/$/, "") || null;
    this.addMessage("Demo auto-send: waiting for verifier connection...");
    const waited = await fetchJson(`${verifierControl}/connections/wait`, {
      method: "POST",
      body: JSON.stringify({ oob_id: invitationId, timeout_ms: 180_000 }),
    }).catch((e) => {
      this.addMessage(`Demo auto-send: verifier /connections/wait failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    });
    const verifierConnectionId =
      waited?.connection_id || waited?.record?.connection_id || waited?.record?.connectionId || waited?.connectionId;
    if (!verifierConnectionId) {
      this.addMessage("Demo auto-send: verifier connection not resolved; skipping proof request send");
      return;
    }

    const domain = "https://cts.verifier";
    const ayraSchemaUri = "https://schema.affinidi.io/AyraBusinessCardV1R0.jsonld#AyraBusinessCard";
    const ayraTypeUri = "https://schema.affinidi.io/AyraBusinessCardV1R0.jsonld";
    const ayraSchemaIdUri = "https://schema.affinidi.io/AyraBusinessCardV1R0.json";
    const vcTypeUri = "https://www.w3.org/2018/credentials#VerifiableCredential";
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const challenge = randomUUID();
      const presentationRequest = {
        dif: {
          options: {
            challenge,
            domain,
          },
          presentation_definition: {
            name: "Ayra Business Card LDP",
            purpose: "Present an Ayra Business Card signed as a Linked Data Proof VC",
            format: { ldp_vp: { proof_type: ["Ed25519Signature2020"] } },
            input_descriptors: [
              {
                id: "ayra-business-card",
                purpose: "Must be an Ayra Business Card with Ed25519Signature2020",
                // Multi-URI schema list with oneof_filter (OR semantics).
                schema: [{ uri: ayraTypeUri }, { uri: vcTypeUri }],
                oneof_filter: true,
                constraints: {
                  fields: [
                    {
                      path: ["$.type[*]", "$.vc.type[*]", "$.credential.type[*]"],
                      filter: { type: "string", const: "AyraBusinessCard" },
                    },
                  ],
                },
              },
            ],
          },
        },
      };
      const proofRequest = {
        connection_id: verifierConnectionId,
        protocol_version: "v2",
        // Keep records around so CTS can poll reliably even if ACA-Py auto-removes.
        auto_remove: false,
        // In demo mode we explicitly verify+ACK on the verifier side; keep the exchange
        // in `presentation-received` until it's verified.
        auto_verify: false,
        comment: `CTS demo verifier proof request (attempt ${attempt}/${maxAttempts})`,
          proof_formats: presentationRequest,
      };

      const response = await fetchJson(`${verifierControl}/proofs/request`, {
        method: "POST",
        body: JSON.stringify(proofRequest),
      }).catch((e) => {
        this.addMessage(`Demo auto-send: proof request failed: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      });

      let proofExchangeId =
        response?.proof_exchange_id ||
        response?.proofExchangeId ||
        response?.record?.proof_exchange_id ||
        response?.record?.presentation_exchange_id ||
        response?.record?.pres_ex_id;

      if (!proofExchangeId) {
        this.addMessage("Demo auto-send: verifier did not return proof_exchange_id; retrying...");
        await sleep(1000);
        continue;
      }

      // Sanity-check that the exchange record exists in verifier ACA-Py. If not, try to resolve
      // by scanning the verifier's records for this connection (and matching the challenge).
      if (verifierAdminUrl) {
        const record = await fetchJson(`${verifierAdminUrl}/present-proof-2.0/records/${proofExchangeId}`, {
          method: "GET",
        }).catch(() => null);
        if (!record) {
          const list = await fetchJson(
            `${verifierAdminUrl}/present-proof-2.0/records?connection_id=${encodeURIComponent(verifierConnectionId)}`,
            { method: "GET" }
          ).catch(() => null);
          const records = list?.results || list?.records || [];
          const match = (records || []).find((r: any) => {
            const dif = r?.by_format?.pres_request?.dif;
            return dif?.options?.challenge === challenge;
          });
          const resolved =
            match?.pres_ex_id || match?.presentation_exchange_id || match?.proof_exchange_id || proofExchangeId;
          if (!match) {
            this.addMessage(
              `Demo auto-send: proof record ${proofExchangeId} not found in verifier admin; retrying...`
            );
            await sleep(1000);
            continue;
          }
          proofExchangeId = resolved;
        }
      }

      this.demoVerifierResult = { connectionId: verifierConnectionId, proofExchangeId };
      this.addMessage(
        `Demo auto-send: proof request sent (verifier connection=${verifierConnectionId}, proof_exchange_id=${proofExchangeId})`
      );
      return;
    }

    this.demoVerifierResult = { connectionId: verifierConnectionId, proofExchangeId: undefined };
    this.addMessage("Demo auto-send: failed to create a verifier proof request after retries; waiting for external verifier");
  }

  private async waitForProofRequest(adminUrl: string, connectionId: string) {
    const deadline = Date.now() + 180_000;
    let last: any;
    const baseUrl = adminUrl.replace(/\/$/, "");
    const preferredStates = [
      "request-received",
      "presentation-request-received",
      "proposal-received",
      "proposal-sent",
      "presentation-received",
      "presentation-sent",
      "done",
    ];

    const extractDifRequest = (record: any) =>
      record?.by_format?.pres_request?.dif ||
      record?.by_format?.pres_request?.presentation_definition ||
      record?.pres_request?.by_format?.pres_request?.dif ||
      record?.presentation_request_dict ||
      record?.presentation_request ||
      record;

    const matchesAyraRequest = (record: any) => {
      const dif = extractDifRequest(record);
      const presentationDefinition = dif?.presentation_definition ?? dif;
      const name = presentationDefinition?.name;
      const inputDescriptors = presentationDefinition?.input_descriptors;
      if (name === "Ayra Business Card LDP") return true;
      if (Array.isArray(inputDescriptors)) {
        return inputDescriptors.some((d: any) => d?.id === "ayra-business-card");
      }
      return false;
    };

    while (Date.now() < deadline) {
      last = await fetchJson(`${baseUrl}/present-proof-2.0/records?connection_id=${encodeURIComponent(connectionId)}`, {
        method: "GET",
      }).catch(() => null);
      const records = (last?.results || last?.records || []).filter(
        (r: any) => !r?.connection_id || r?.connection_id === connectionId
      );
      const sortedRecords = (records || []).sort(
        (a: any, b: any) => this.getRecordTimeMs(b) - this.getRecordTimeMs(a)
      );

      for (const state of preferredStates) {
        const match = sortedRecords.find((r: any) => r?.state === state && matchesAyraRequest(r));
        if (match) return match;
      }

      await sleep(2000);
    }
    throw new Error("Timed out waiting for proof request from verifier");
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "AwaitProofRequestTask",
      value: this.proofResult,
    };
  }
}

class SendPresentationViaAcaPyTask extends BaseRunnableTask {
  private adapter: AcaPyAgentAdapter;
  private presentationResult: PresentationResult | null = null;

  constructor(adapter: AcaPyAgentAdapter, name: string, description?: string) {
    super(name, description);
    this.adapter = adapter;
  }

  async prepare(): Promise<void> {
    super.prepare();
    this.addMessage("Ready to send Ayra card presentation (Ed25519Signature2020, PE v2)");
  }

  private async listW3cCredentialRecords(baseUrl: string): Promise<any[]> {
    const list = await fetchJson(`${baseUrl}/credentials/w3c`, {
      method: "POST",
      body: JSON.stringify({}),
    }).catch(() => null);

    return (list?.results || list?.records || []) as any[];
  }

  private selectAyraW3cRecordIds(records: any[]): string[] {
    const ayraSchemaUri = "https://schema.affinidi.io/AyraBusinessCardV1R0.jsonld#AyraBusinessCard";
    const ayraTypeUri = "https://schema.affinidi.io/AyraBusinessCardV1R0.jsonld";
    const ayraTypeFragmentUri = "https://schema.affinidi.io/AyraBusinessCardV1R0.jsonld#AyraBusinessCard";
    const ayraSchemaIdUri = "https://schema.affinidi.io/AyraBusinessCardV1R0.json";
    const matching = records.filter((record) => {
      const expandedTypes = record?.expanded_types;
      if (
        Array.isArray(expandedTypes) &&
        (expandedTypes.includes(ayraTypeUri) || expandedTypes.includes(ayraTypeFragmentUri))
      )
        return true;
      const schemaIds = record?.schema_ids;
      if (Array.isArray(schemaIds) && (schemaIds.includes(ayraSchemaUri) || schemaIds.includes(ayraSchemaIdUri)))
        return true;
      const proofTypes = record?.proof_types;
      if (
        Array.isArray(proofTypes) &&
        proofTypes.includes("Ed25519Signature2020")
      )
        return true;
      return false;
    });

    return matching
      .map((record) => record?.record_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  }

  private async findAyraW3cCredentialRecordIds(baseUrl: string): Promise<string[]> {
    const records = await this.listW3cCredentialRecords(baseUrl);
    return this.selectAyraW3cRecordIds(records);
  }

  private async findDifCredentialsForExchange(baseUrl: string, exchangeId: string): Promise<any[]> {
    const resp = await fetchJson(`${baseUrl}/present-proof-2.0/records/${exchangeId}/credentials`, {
      method: "GET",
    }).catch(() => null);

    const maybeList =
      resp?.results ||
      resp?.records ||
      resp?.result ||
      resp?.credentials ||
      resp?.cred_info ||
      resp;

    if (Array.isArray(maybeList)) return maybeList;
    if (Array.isArray(maybeList?.results)) return maybeList.results;
    if (Array.isArray(maybeList?.records)) return maybeList.records;
    if (Array.isArray(maybeList?.credentials)) return maybeList.credentials;
    return [];
  }

  private selectAyraDifRecordIds(candidates: any[]): string[] {
    const asJson = (v: any) => {
      try {
        return JSON.stringify(v);
      } catch {
        return "";
      }
    };

    const isAyra = (c: any): boolean => {
      const blob = `${asJson(c)} ${asJson(c?.cred_info)} ${asJson(c?.credential)} ${asJson(c?.w3c_credential)}`
        .toLowerCase()
        .replace(/\s+/g, " ");
      return (
        blob.includes("ayrabusinesscard") ||
        blob.includes("ayra business card") ||
        blob.includes("schema.affinidi.io/ayrabusinesscard") ||
        blob.includes("ed25519signature2020")
      );
    };

    const extractId = (c: any): string | null => {
      const id =
        c?.record_id ||
        c?.recordId ||
        c?.cred_id ||
        c?.credId ||
        c?.referent ||
        c?.credential_id ||
        c?.credentialId ||
        c?.cred_info?.referent ||
        c?.cred_info?.record_id ||
        c?.cred_info?.credential_id;
      return typeof id === "string" && id.length > 0 ? id : null;
    };

    const preferred = candidates.filter(isAyra);
    const chosen = preferred.length > 0 ? preferred : candidates;
    return chosen.map(extractId).filter((id): id is string => typeof id === "string" && id.length > 0);
  }

  async run(input?: any): Promise<void> {
    super.run();
    const exchangeId = input?.presentationExchangeId;
    const connectionId = input?.connectionId;
    const request = input?.request;
    const demoVerifier = input?.demoVerifier;
    if (!exchangeId || !connectionId) {
      const error = new Error("presentationExchangeId or connectionId missing");
      this.addError(error.message);
      this.setFailed();
      this.setCompleted();
      throw error;
    }

    const adminUrl = this.adapter.getAdminUrl();
    if (!adminUrl) {
      throw new Error("ACA-Py admin URL missing");
    }
    const baseUrl = adminUrl.replace(/\/$/, "");

    const current = await fetchJson(`${baseUrl}/present-proof-2.0/records/${exchangeId}`, { method: "GET" }).catch(
      () => null
    );
    const currentState = current?.state || current?.result?.state;

    if (currentState && ["presentation-sent", "done", "abandoned"].includes(currentState)) {
      this.addMessage(`Presentation already ${currentState}; skipping send`);
      this.presentationResult = {
        presentationExchangeId: exchangeId,
        connectionId,
        request,
        state: currentState,
        demoVerifier,
      };
      this.setAccepted();
      this.setCompleted();
      return;
    }

    // ACA-Py requires request-received before we can send a presentation
    if (currentState && currentState !== "request-received") {
      this.addMessage(`Presentation exchange state is ${currentState}; waiting for request-received...`);
      await this.waitForState(baseUrl, exchangeId, ["request-received"]);
    }

    const logPayload = (label: string, payload: unknown) => {
      let serialized: string;
      try {
        serialized = JSON.stringify(payload);
      } catch {
        serialized = String(payload);
      }
      const message = `${label}: ${serialized}`;
      this.addMessage(message);
      console.info(message);
    };

    const difCandidates = await this.findDifCredentialsForExchange(baseUrl, exchangeId);
    logPayload("SendPresentation: dif credentials response", difCandidates);
    const difRecordIds = this.selectAyraDifRecordIds(difCandidates);
    logPayload("SendPresentation: dif record_ids", difRecordIds);
    if (difCandidates.length > 0) {
      this.addMessage(`Found ${difCandidates.length} present-proof credential candidate(s) for this exchange`);
    } else {
      this.addMessage("No present-proof credential candidates returned for this exchange");
    }

    let recordIds: string[] = difRecordIds;
    if (recordIds.length === 0) {
      // Fallback: older ACA-Py versions may not return DIF candidates; try scanning stored W3C credentials directly.
      const w3cRecords = await this.listW3cCredentialRecords(baseUrl);
      logPayload("SendPresentation: w3c credentials response", w3cRecords);
      recordIds = this.selectAyraW3cRecordIds(w3cRecords);
      logPayload("SendPresentation: w3c record_ids", recordIds);
      if (recordIds.length > 0) {
        this.addMessage(`Fallback: found ${recordIds.length} stored W3C credential record(s) for Ayra`);
      }
    }

    const walletRecordId = serverState.lastIssuedWalletRecordId;
    if (walletRecordId) {
      recordIds = [walletRecordId];
      this.addMessage(`Using holder wallet record_id (primary): ${walletRecordId}`);
      console.info(`[SendPresentationViaAcaPyTask] Using holder wallet record_id (primary): ${walletRecordId}`);
      logPayload("SendPresentation: wallet record_id", walletRecordId);
    } else if (serverState.lastIssuedCredentialId) {
      const issuedCredentialId = serverState.lastIssuedCredentialId;
      recordIds = [issuedCredentialId];
      this.addMessage(`Using issued credential_id from issuance flow: ${issuedCredentialId}`);
      console.info(
        `[SendPresentationViaAcaPyTask] Using issued credential_id from issuance flow: ${issuedCredentialId}`
      );
      logPayload("SendPresentation: issued credential_id", issuedCredentialId);
    }

    if (recordIds.length > 0) {
      this.addMessage(`Sending presentation with record_ids (${recordIds.length})`);
    } else {
      this.addMessage("No matching credential record ids found; sending empty DIF spec (likely empty presentation)");
    }

    let presentationDid = serverState.holderPresentationDid;
    if (!presentationDid) {
      presentationDid = await this.adapter.createDidKey("ed25519");
      serverState.holderPresentationDid = presentationDid;
      this.addMessage(`Using holder presentation DID: ${presentationDid}`);
      console.info(`[SendPresentationViaAcaPyTask] Using holder presentation DID: ${presentationDid}`);
    }

    const sendPayload = {
      // Keep the holder record until the verifier ACKs to avoid double-delete errors.
      auto_remove: false,
      dif: recordIds.length > 0
        ? { issuer_id: presentationDid, record_ids: { "ayra-business-card": recordIds } }
        : { issuer_id: presentationDid },
    };
    logPayload("SendPresentation: send-presentation payload", {
      exchangeId,
      recordIds,
      payload: sendPayload,
    });

    await fetchJson(`${baseUrl}/present-proof-2.0/records/${exchangeId}/send-presentation`, {
      method: "POST",
      body: JSON.stringify(sendPayload),
    });
    this.addMessage("Presentation sent via ACA-Py");

    const record = await this.waitForState(baseUrl, exchangeId, ["presentation-sent", "done"]);
    const state = record?.state || record?.result?.state;
    this.presentationResult = {
      presentationExchangeId: exchangeId,
      connectionId,
      request,
      state,
      demoVerifier,
    };
    this.setAccepted();
    this.setCompleted();
  }

  private async waitForState(baseUrl: string, exchangeId: string, targetStates: string[]) {
    const deadline = Date.now() + 120_000;
    let last: any;
    while (Date.now() < deadline) {
      last = await fetchJson(`${baseUrl}/present-proof-2.0/records/${exchangeId}`, { method: "GET" }).catch(() => null);
      const state = last?.state || last?.result?.state;
      if (state && targetStates.includes(state)) {
        return last?.result || last;
      }
      await sleep(1500);
    }
    throw new Error(`Timed out waiting for presentation record ${exchangeId} to reach ${targetStates.join(",")}`);
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "SendPresentationViaAcaPyTask",
      value: this.presentationResult,
    };
  }
}

export class WaitForVerificationViaAcaPyTask extends BaseRunnableTask {
  private adapter: AcaPyAgentAdapter;
  private demoVerifierAdapter?: AcaPyAgentAdapter;
  private verified = false;
  private finalState: string | null = null;

  constructor(
    adapter: AcaPyAgentAdapter,
    name: string,
    description?: string,
    demoVerifierAdapter?: AcaPyAgentAdapter
  ) {
    super(name, description);
    this.adapter = adapter;
    this.demoVerifierAdapter = demoVerifierAdapter;
  }

  async run(input?: any): Promise<void> {
    super.run();
    try {
      const exchangeId = input?.presentationExchangeId;
      if (!exchangeId) {
        const error = new Error("presentationExchangeId missing from presentation step");
        this.addError(error.message);
        this.setFailed();
        this.setCompleted();
        throw error;
      }

      const adminUrl = this.adapter.getAdminUrl();
      if (!adminUrl) {
        throw new Error("ACA-Py admin URL missing");
      }
      const baseUrl = adminUrl.replace(/\/$/, "");

      const record = await this.waitForDone(baseUrl, exchangeId, input?.demoVerifier);
      const state = record?.state || record?.result?.state;
      const verifiedRaw = record?.verified ?? record?.result?.verified;
      this.verified = verifiedRaw === true || verifiedRaw === "true";
      this.finalState = state;
      this.addMessage(`Verification state: ${state}, verified=${this.verified}`);
      if (!this.verified) {
        throw new Error("Verifier record did not include verified=true");
      }
      this.setAccepted();
      this.setCompleted();
    } catch (err) {
      this.addError(err);
      this.setFailed();
      this.setCompleted();
      throw err;
    }
  }

  private async waitForDone(
    baseUrl: string,
    exchangeId: string,
    demoVerifier?: { connectionId?: string; proofExchangeId?: string }
  ) {
    const verifierControl =
      this.demoVerifierAdapter && demoVerifier?.connectionId
        ? this.demoVerifierAdapter.getControlUrl().replace(/\/$/, "")
        : null;
    let verifierProofExchangeId = demoVerifier?.proofExchangeId;
    const verifierConnectionId = demoVerifier?.connectionId;
    let loggedDemoAssist = false;
    let loggedMissingVerifierId = false;
    let verifyTriggered = false;
    let verifyTriggerId: string | null = null;

    const deadline = Date.now() + 180_000;
    const verifiedGraceMs = VERIFIED_GRACE_MS;
    const missingGraceMs = 6_000;
    const summarizeRecord = (record: any): string => {
      if (!record || typeof record !== "object") return "null";
      const summary = {
        state: record?.state || record?.presentation_state,
        verified: record?.verified,
        pres_ex_id: record?.pres_ex_id || record?.presentation_exchange_id,
        proof_exchange_id: record?.proof_exchange_id,
        thread_id: record?.thread_id,
        updated_at: record?.updated_at,
      };
      return JSON.stringify(summary);
    };
    const logSnapshot = (source: string, record: any, extra?: Record<string, unknown>) => {
      const payload = {
        source,
        exchangeId,
        threadId: record?.thread_id ?? null,
        state: record?.state ?? record?.presentation_state ?? null,
        verified: record?.verified ?? null,
        timestamp: new Date().toISOString(),
        ...extra,
      };
      this.addMessage(`Proof exchange update: ${JSON.stringify(payload)}`);
    };
    const normalizeState = (value: any): string | null => {
      if (!value || typeof value !== "string") return null;
      return value.replace(/_/g, "-").toLowerCase();
    };
    const isVerified = (value: any): boolean => value === true || value === "true";

    let last: any;
    let lastHolderRecord: any | null = null;
    let lastHolderSeenAt: number | null = null;
    let lastHolderState: string | null = null;
    let lastHolderVerified: any = null;
    let lastVerifierState: string | null = null;
    let lastVerifierRecord: any | null = null;
    let doneSeenAt: number | null = null;
    let doneSeenSource: "holder" | "verifier" | null = null;
    let verifiedSeenAt: number | null = null;
    let missingSeenAt: number | null = null;
    while (Date.now() < deadline) {
      last = await fetchJson(`${baseUrl}/present-proof-2.0/records/${exchangeId}`, { method: "GET" }).catch(() => null);
      const holderRecord = last?.result || last;
      const holderState = normalizeState(holderRecord?.state || holderRecord?.result?.state);
      const holderVerified = holderRecord?.verified ?? holderRecord?.result?.verified;
      if (holderRecord) {
        lastHolderRecord = holderRecord;
        lastHolderSeenAt = Date.now();
        if (missingSeenAt) {
          this.addMessage(
            `Proof exchange record reappeared after ${Date.now() - missingSeenAt}ms (exchangeId=${exchangeId})`
          );
          missingSeenAt = null;
        }
        if (holderState && holderState !== lastHolderState) {
          lastHolderState = holderState;
          logSnapshot("holder", holderRecord, { normalizedState: holderState });
        }
        lastHolderVerified = holderVerified;
        if (isVerified(holderVerified)) {
          verifiedSeenAt = Date.now();
          logSnapshot("holder", holderRecord, { normalizedState: holderState, verifiedObserved: true });
          return holderRecord;
        }
        if (holderState === "abandoned") {
          const lastSeenAt = lastHolderSeenAt ? new Date(lastHolderSeenAt).toISOString() : "unknown";
          throw new Error(
            `Verifier abandoned proof exchange (lastSeenAt=${lastSeenAt}, lastRecord=${summarizeRecord(
              lastHolderRecord
            )})`
          );
        }
        if (holderState === "done" && !isVerified(holderVerified) && doneSeenAt === null) {
          doneSeenAt = Date.now();
          doneSeenSource = "holder";
          this.addMessage(`Verifier record reached done (source=holder, ts=${new Date(doneSeenAt).toISOString()})`);
        }
      } else if (lastHolderSeenAt) {
        if (!missingSeenAt) {
          missingSeenAt = Date.now();
          this.addMessage(
            `Proof exchange record missing (exchangeId=${exchangeId}, lastState=${lastHolderState ?? "unknown"})`
          );
        }
      }

      if (verifierControl && verifierConnectionId && verifierProofExchangeId) {
        if (!loggedDemoAssist) {
          this.addMessage(
            `Demo verifier assist: polling verifier state (connection_id=${verifierConnectionId}${
              verifierProofExchangeId ? `, proof_exchange_id=${verifierProofExchangeId}` : ""
            })`
          );
          loggedDemoAssist = true;
        }
        if (!verifyTriggered) {
          verifyTriggered = true;
          verifyTriggerId = verifierProofExchangeId;
          this.addMessage(
            `Demo verifier assist: triggering verifier /proofs/verify (proof_exchange_id=${verifierProofExchangeId})`
          );
          void fetchJson(`${verifierControl}/proofs/verify`, {
            method: "POST",
            body: JSON.stringify({
              proof_exchange_id: verifierProofExchangeId,
              connection_id: verifierConnectionId,
              timeout_ms: 120_000,
            }),
          })
            .then((resp) => {
              const record = (resp as any)?.record || (resp as any)?.result || resp;
              const verifierState = normalizeState(
                record?.state || record?.presentation_state || (resp as any)?.state || "request-sent"
              );
              const verifierVerified = record?.verified;
              this.addMessage(
                `Demo verifier assist: /proofs/verify response (state=${verifierState || "unknown"}, verified=${String(
                  verifierVerified
                )})`
              );
              if (isVerified(verifierVerified)) {
                verifiedSeenAt = Date.now();
              }
            })
            .catch((e) => {
              this.addMessage(
                `Demo verifier assist: /proofs/verify failed (proof_exchange_id=${verifierProofExchangeId}, error=${
                  e instanceof Error ? e.message : String(e)
                })`
              );
            });
        } else if (verifyTriggerId && verifierProofExchangeId !== verifyTriggerId) {
          this.addMessage(
            `Demo verifier assist: proof_exchange_id updated after verify trigger (from=${verifyTriggerId} to=${verifierProofExchangeId})`
          );
        }
        const verifierResp = await fetchJson(`${verifierControl}/proofs/verify-or-status`, {
          method: "POST",
          body: JSON.stringify({
            proof_exchange_id: verifierProofExchangeId,
            connection_id: verifierConnectionId,
            timeout_ms: 2000,
          }),
        }).catch((e) => ({ __error: e instanceof Error ? e.message : String(e) }));

        if ((verifierResp as any)?.__error) {
          this.addMessage(`Demo verifier assist: verifier status error: ${(verifierResp as any).__error}`);
        } else {
          const record = (verifierResp as any)?.record || (verifierResp as any)?.result || verifierResp;
          const resolvedId = (verifierResp as any)?.proof_exchange_id || record?.proof_exchange_id;
          if (resolvedId && resolvedId !== verifierProofExchangeId) {
            verifierProofExchangeId = resolvedId;
            this.addMessage(`Demo verifier assist: resolved proof_exchange_id=${resolvedId}`);
          }
          const verifierState = normalizeState(
            record?.state || record?.presentation_state || (verifierResp as any)?.state || "request-sent"
          );
          if (record) {
            lastVerifierRecord = record;
          }
          if (verifierState && verifierState !== lastVerifierState) {
            lastVerifierState = verifierState;
            logSnapshot("verifier", record, { normalizedState: verifierState });
          }
          const verifierVerified = record?.verified;
          if (isVerified(verifierVerified)) {
            this.addMessage(
              `Demo verifier assist: verifier reports verified=true (state=${verifierState || "unknown"}). Proceeding.`
            );
            verifiedSeenAt = Date.now();
            return { state: "done", verified: true, record };
          }
          if (verifierState === "done" && doneSeenAt === null) {
            doneSeenAt = Date.now();
            doneSeenSource = "verifier";
            this.addMessage(
              `Verifier record reached done (source=verifier, ts=${new Date(doneSeenAt).toISOString()})`
            );
          }
          if (verifierState === "abandoned") {
            const holderSummary = summarizeRecord(lastHolderRecord);
            throw new Error(
              `Verifier abandoned proof exchange (verifierState=abandoned, lastHolderRecord=${holderSummary})`
            );
          }
        }
      } else if (verifierControl && verifierConnectionId && !loggedMissingVerifierId) {
        this.addMessage(
          "Demo verifier assist: proof_exchange_id missing; skipping verifier polling and waiting on holder state"
        );
        loggedMissingVerifierId = true;
      }
      if (missingSeenAt) {
        if (verifiedSeenAt) {
          this.addMessage("Proof exchange record missing after verified=true observed; proceeding.");
          return lastHolderRecord || { state: "done", verified: true };
        }
        const missingForMs = Date.now() - missingSeenAt;
        if (missingForMs >= missingGraceMs) {
          const lastSeenAt = lastHolderSeenAt ? new Date(lastHolderSeenAt).toISOString() : "unknown";
          throw new Error(
            `Verifier record disappeared before verified=true (missingForMs=${missingForMs}, lastSeenAt=${lastSeenAt}, lastState=${
              lastHolderState ?? "unknown"
            }, lastVerified=${String(lastHolderVerified)}) lastRecord=${summarizeRecord(lastHolderRecord)}`
          );
        }
      }
      if (doneSeenAt !== null && !isVerified(lastHolderVerified)) {
        const waitedMs = Date.now() - doneSeenAt;
        if (waitedMs >= verifiedGraceMs) {
          const doneIso = new Date(doneSeenAt).toISOString();
          const holderSummary = summarizeRecord(lastHolderRecord);
          const verifierSummary = summarizeRecord(lastVerifierRecord);
          throw new Error(
            `Verified grace window elapsed without verified=true (doneSeenAt=${doneIso}, waitedMs=${waitedMs}, graceMs=${verifiedGraceMs}, doneSource=${
              doneSeenSource ?? "unknown"
            }, lastHolderRecord=${holderSummary}, lastVerifierRecord=${verifierSummary})`
          );
        }
      }
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error(
      `Timed out waiting for verifier response (holderState=${lastHolderState ?? "unknown"}, verifierState=${
        lastVerifierState ?? "unknown"
      })`
    );
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "WaitForVerificationViaAcaPyTask",
      value: {
        verified: this.verified,
        state: this.finalState,
      },
    };
  }
}

class VerifierAcaPyEvaluationTask extends BaseRunnableTask {
  private _pipelineResults: any;

  constructor(name: string, description?: string) {
    super(name, description);
    this._pipelineResults = {};
  }

  async run(input?: any): Promise<void> {
    super.run();
    this._pipelineResults = input || {};
    this.addMessage("Verifier conformance flow (ACA-Py holder) completed");
    if (this._pipelineResults?.verified === true) {
      this.setAccepted();
    } else {
      const state = this._pipelineResults?.state ? `state=${this._pipelineResults.state}` : "state=unknown";
      this.addError(`Verifier did not verify presentation (${state})`);
      this.setFailed();
    }
    this.setCompleted();
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "VerifierAcaPyEvaluationTask",
      value: {
        message: "Verifier conformance (PE v2, DIDComm v2) executed",
        report: {
          protocol: "didcomm/v2",
          proofFormat: "PE v2 (DIF, Ed25519Signature2020)",
          verified: this._pipelineResults?.verified ?? false,
          state: this._pipelineResults?.state,
        },
      },
    };
  }
}

export default class VerifierAcaPyPipeline {
  private _dag: DAG;
  private controller: AgentController;
  private oobUrl: string | null;
  private verifierController?: AgentController;

  constructor(controller: AgentController, oobUrl?: string, verifierController?: AgentController) {
    this.controller = controller;
    this.oobUrl = oobUrl || null;
    this.verifierController = verifierController;
    this._dag = this._make(controller);
  }

  setOobUrl(url: string) {
    this.oobUrl = url;
    this._dag = this._make(this.controller);
  }

  dag(): DAG {
    return this._dag;
  }

  async init() {
    this._dag = this._make(this.controller);
  }

  private getAdapter(): AcaPyAgentAdapter {
    const adapter = this.controller.getAdapter?.();
    if (!adapter) {
      throw new Error("Agent adapter is missing");
    }
    if (!(adapter instanceof AcaPyAgentAdapter)) {
      throw new Error("Verifier ACA-Py pipeline requires an ACA-Py adapter");
    }
    return adapter;
  }

  private _make(controller: AgentController): DAG {
    const dag = new DAG("Verifier Conformance Test (ACA-Py Holder)");
    if (!this.oobUrl) {
      return dag;
    }
    const adapter = this.getAdapter();
    const demoVerifierAdapter = (() => {
      if (!this.verifierController) return undefined;
      const a = this.verifierController.getAdapter?.();
      return a instanceof AcaPyAgentAdapter ? a : undefined;
    })();

    const receiveTask = new ReceiveOobViaAcaPyTask(
      adapter,
      this.oobUrl,
      "Accept DIDComm v2 Invitation",
      "Consume verifier OOB v2 invitation using ACA-Py holder"
    );
    const awaitProofTask = new AwaitProofRequestTask(
      adapter,
      "Await Proof Request",
      "Wait for verifier to send PE v2 proof request",
      demoVerifierAdapter
    );
    const sendPresentationTask = new SendPresentationViaAcaPyTask(
      adapter,
      "Send Presentation",
      "Reply with Ayra Business Card presentation"
    );
    const waitVerificationTask = new WaitForVerificationViaAcaPyTask(
      adapter,
      "Wait for Verification",
      "Wait for verifier decision",
      demoVerifierAdapter
    );
    const evaluationTask = new VerifierAcaPyEvaluationTask(
      "Evaluate Verifier Test",
      "Summarize verifier conformance results"
    );

    const receiveNode = new TaskNode(receiveTask);
    dag.addNode(receiveNode);

    const requestNode = new TaskNode(awaitProofTask);
    requestNode.addDependency(receiveNode);
    dag.addNode(requestNode);

    const presentationNode = new TaskNode(sendPresentationTask);
    presentationNode.addDependency(requestNode);
    dag.addNode(presentationNode);

    const verificationNode = new TaskNode(waitVerificationTask);
    verificationNode.addDependency(presentationNode);
    dag.addNode(verificationNode);

    const evaluationNode = new TaskNode(evaluationTask);
    evaluationNode.addDependency(verificationNode);
    dag.addNode(evaluationNode);

    return dag;
  }
}
