import type {
  AgentAdapter,
  ConnectionInitResult,
  ControllerConnectionRecord,
  CredentialOfferPayload,
  CredentialOfferResult,
  ProofRequestPayload,
} from "./types";

export class AgentController {
  constructor(private readonly adapter: AgentAdapter) {}

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
      const connectionRecord = await this.adapter.waitForConnection(invitation);
      await this.adapter.waitUntilConnected(connectionRecord.id);
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
