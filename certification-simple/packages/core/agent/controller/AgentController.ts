import type { ProofExchangeRecord } from "@credo-ts/core";
import type {
  AgentAdapter,
  ConnectionInitResult,
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
    const connectionRecordPromise = (async () => {
      const connectionRecord = await this.adapter.waitForConnection(
        invitation.id
      );
      await this.adapter.waitUntilConnected(connectionRecord.id);
      return connectionRecord;
    })();

    return { invitation, invitationUrl, connectionRecordPromise };
  }

  async requestProof(
    connectionId: string,
    proof: ProofRequestPayload
  ): Promise<ProofExchangeRecord> {
    if (!connectionId) {
      throw new Error("connectionId is required for requestProof");
    }
    if (!proof) {
      throw new Error("proof configuration is required for requestProof");
    }
    return this.adapter.requestProofAndAccept(connectionId, proof);
  }
}
