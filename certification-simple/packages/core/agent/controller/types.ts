import type {
  OutOfBandRecord,
  ConnectionRecord,
  ProofExchangeRecord,
} from "@credo-ts/core";
import type { RequestProofOptions } from "../tasks/request-proof";

export type ProofRequestPayload = RequestProofOptions["proof"];

export type ConnectionInitResult = {
  invitation: OutOfBandRecord;
  invitationUrl: string;
  connectionRecordPromise: Promise<ConnectionRecord>;
};

export interface AgentAdapter {
  isReady(): boolean;
  getLabel(): string;
  createOutOfBandInvitation(): Promise<OutOfBandRecord>;
  buildInvitationUrl(invitation: OutOfBandRecord): string;
  waitForConnection(outOfBandId: string): Promise<ConnectionRecord>;
  waitUntilConnected(connectionId: string): Promise<void>;
  requestProofAndAccept(
    connectionId: string,
    proof: ProofRequestPayload
  ): Promise<ProofExchangeRecord>;
}
