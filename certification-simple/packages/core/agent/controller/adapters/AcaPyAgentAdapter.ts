import { fetch } from "undici";

import type {
  AgentAdapter,
  ControllerConnectionRecord,
  ControllerInvitation,
  CredentialOfferPayload,
  CredentialOfferResult,
  ProofRequestPayload,
} from "../types";

const DEFAULT_PROFILE = "issuer" as const;

export type AcaPyAdapterOptions = {
  baseUrl: string;
  profile?: "issuer" | "verifier";
};

interface AgentStartResponse {
  status: string;
  profile: string;
  admin_url: string;
}

interface InvitationApiResponse {
  invitation_url: string;
  connection_id: string;
  out_of_band_id?: string;
  invitation: unknown;
}

interface ConnectionRecordApiResponse {
  connection_id: string;
  state: string;
  record: unknown;
}

export class AcaPyAgentAdapter implements AgentAdapter {
  private ready = false;
  private adminUrl?: string;

  private constructor(private readonly options: AcaPyAdapterOptions) {}

  static async create(options: AcaPyAdapterOptions): Promise<AcaPyAgentAdapter> {
    const adapter = new AcaPyAgentAdapter(options);
    await adapter.start();
    return adapter;
  }

  private get baseUrl(): string {
    return this.options.baseUrl.replace(/\/$/, "");
  }

  private ensureAdminUrl(): string {
    if (!this.adminUrl) {
      throw new Error("ACA-Py admin URL is not set");
    }
    return this.adminUrl.replace(/\/$/, "");
  }

  private async start(): Promise<void> {
    const response = await this.post<AgentStartResponse>("/agent/start", {
      profile: this.options.profile ?? DEFAULT_PROFILE,
    });
    this.adminUrl = response.admin_url;
    this.ready = true;
  }

  async shutdown(): Promise<void> {
    if (!this.ready) return;
    await this.post("/agent/stop", {});
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }

  getLabel(): string {
    return `ACA-Py (${this.options.profile ?? DEFAULT_PROFILE})`;
  }

  getAdminUrl(): string | undefined {
    return this.adminUrl;
  }

  async createOutOfBandInvitation(): Promise<ControllerInvitation> {
    const payload = await this.post<InvitationApiResponse>(
      "/connections/create-invitation",
      {}
    );
    return {
      id: payload.connection_id,
      outOfBandId:
        payload.out_of_band_id ||
        (payload as any).oob_id ||
        (payload.invitation as any)?.["@id"] ||
        (payload.invitation as any)?.["id"],
      url: payload.invitation_url,
      raw: payload.invitation,
    };
  }

  async createDidKey(keyType: "ed25519" | "bls12381g2" = "ed25519"): Promise<string> {
    const response = await this.post<{ did: string }>(
      "/wallet/did/create",
      {
        key_type: keyType,
      }
    );
    return response.did;
  }

  async issueLdpCredential(payload: unknown): Promise<unknown> {
    const admin = this.ensureAdminUrl();
    return this.rawPost(`${admin}/vc/credentials/issue`, payload);
  }

  async verifyLdpCredential(vc: unknown): Promise<unknown> {
    const admin = this.ensureAdminUrl();
    return this.rawPost(`${admin}/vc/credentials/verify`, { verifiableCredential: vc });
  }

  async issueLdProofCredential(payload: unknown): Promise<unknown> {
    const admin = this.ensureAdminUrl();
    return this.rawPost(`${admin}/issue-credential-2.0/send-offer`, payload);
  }

  private async rawPost(url: string, body: unknown): Promise<any> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `ACA-Py control request failed: ${response.status} ${response.statusText} - ${text}`
      );
    }
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  buildInvitationUrl(invitation: ControllerInvitation): string {
    return invitation.url;
  }

  async waitForConnection(
    invitation: ControllerInvitation
  ): Promise<ControllerConnectionRecord> {
    const payload: Record<string, string> = {};
    if (invitation.id) payload.connection_id = invitation.id;
    if (invitation.outOfBandId) payload.oob_id = invitation.outOfBandId;

    if (!payload.connection_id && !payload.oob_id) {
      throw new Error("Invitation did not include a connection or out-of-band id");
    }

    const record = await this.post<ConnectionRecordApiResponse>("/connections/wait", payload);
    return { id: record.connection_id, raw: record.record ?? record };
  }

  async waitUntilConnected(connectionId: string): Promise<void> {
    if (!connectionId) return;
    await this.post("/connections/wait", { connection_id: connectionId });
  }

  async requestProofAndAccept(
    connectionId: string,
    proof: ProofRequestPayload
  ): Promise<void> {
    const protocolVersion = proof.protocolVersion ?? "v2";
    const response = await this.post<{ proof_exchange_id: string }>(
      "/proofs/request",
      {
        connection_id: connectionId,
        protocol_version: protocolVersion,
        proof_formats: proof.proofFormats,
      }
    );
    await this.post("/proofs/verify", {
      proof_exchange_id: response.proof_exchange_id,
      connection_id: connectionId,
    });
  }

  async issueCredential(payload: CredentialOfferPayload): Promise<CredentialOfferResult> {
    if (!payload.credentialDefinitionId) {
      throw new Error(
        "ACA-Py adapter requires credentialDefinitionId to issue a credential. " +
          "Provide one in CredentialIssuanceOptions when using ACA-Py."
      );
    }
    const attributeMap: Record<string, string> = {};
    for (const { name, value } of payload.attributes) {
      attributeMap[name] = value;
    }
    const response = await this.post<{
      credential_exchange_id: string;
      record?: unknown;
    }>("/credentials/offer", {
      connection_id: payload.connectionId,
      credential_definition_id: payload.credentialDefinitionId,
      attributes: attributeMap,
      protocol_version: "v2",
    });
    return {
      schemaId: payload.schemaId,
      legacySchemaId: payload.schemaId,
      credentialDefinitionId: payload.credentialDefinitionId,
      legacyCredentialDefinitionId: payload.credentialDefinitionId,
      record: response.record,
    };
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const targetPath = path.startsWith("/") ? path : `/${path}`;
    const response = await fetch(`${this.baseUrl}${targetPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `ACA-Py control request failed: ${response.status} ${response.statusText} - ${text}`
      );
    }
    return (await response.json()) as T;
  }
}
