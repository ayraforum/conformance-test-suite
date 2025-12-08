import type {
  AgentAdapter,
  ConnectionInitResult,
  ControllerConnectionRecord,
  CredentialOfferPayload,
  CredentialOfferResult,
  ProofRequestPayload,
} from "./types";
import { fetch } from "undici";

export class AgentController {
  constructor(private readonly adapter: AgentAdapter) {}

  getAdapter(): AgentAdapter {
    return this.adapter;
  }

  isReady(): boolean {
    return this.adapter.isReady();
  }

  get label(): string {
    return this.adapter.getLabel();
  }

  async establishConnection(): Promise<ConnectionInitResult> {
    if (!this.isReady()) {
      throw new Error(
        "Agent adapter is not ready. Ensure the underlying agent is initialized."
      );
    }

    const invitation = await this.adapter.createOutOfBandInvitation();
    const invitationUrl = this.adapter.buildInvitationUrl(invitation);
    const connectionRecordPromise = (async (): Promise<ControllerConnectionRecord> => {
      // If an internal ACA-Py holder control URL is provided, auto-receive the invitation
      const holderControlUrl = process.env.ACAPY_HOLDER_CONTROL_URL;
      const autoSendToHolder =
        ((process.env.ACAPY_AUTO_SEND_INVITE_TO_INTERNAL_HOLDER ||
          process.env.ACAPY_HOLDER_AUTO_ACCEPT ||
          "").toLowerCase() === "true");
      if (autoSendToHolder && holderControlUrl && invitation.raw) {
        console.log("[Issuer] Auto-sending invitation to internal holder at", holderControlUrl);
        try {
          await fetch(`${holderControlUrl.replace(/\/$/, "")}/connections/receive-invitation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invitation: invitation.raw }),
          });
          console.log("[Issuer] Invitation posted to internal holder");
        } catch (err) {
          console.warn("[Issuer] Failed to auto-send invitation to holder control", err);
        }
      }

      const connectionRecord = await this.adapter.waitForConnection(invitation);
      if (connectionRecord.id) {
        try {
          await this.adapter.waitUntilConnected(connectionRecord.id);
        } catch (err) {
          // If the agent cannot confirm in time, continue and let subsequent tasks surface errors.
          console.warn("Connection wait timed out or failed; continuing without confirmation", err);
        }
      }
      if (this.adapter.getConnectionRecord) {
        return this.adapter.getConnectionRecord(connectionRecord.id);
      }
      return connectionRecord;
    })();

    return { invitation, invitationUrl, connectionRecordPromise };
  }

  async requestProof(
    connectionId: string,
    proof: ProofRequestPayload
  ): Promise<void> {
    if (!connectionId) {
      throw new Error("connectionId is required for requestProof");
    }
    if (!proof) {
      throw new Error("proof configuration is required for requestProof");
    }
    return this.adapter.requestProofAndAccept(connectionId, proof);
  }

  async issueCredential(
    payload: CredentialOfferPayload
  ): Promise<CredentialOfferResult> {
    if (!payload.connectionId) {
      throw new Error("connectionId is required to issue a credential");
    }
    if (!payload.issuerDid) {
      throw new Error("issuerDid is required to issue a credential");
    }
    if (!payload.attributes?.length) {
      throw new Error("At least one attribute is required to issue a credential");
    }
    return this.adapter.issueCredential(payload);
  }
}
