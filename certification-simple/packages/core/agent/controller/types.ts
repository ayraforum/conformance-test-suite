import type { RequestProofOptions } from "../tasks/request-proof";

export type ProofRequestPayload = RequestProofOptions["proof"];

export type ControllerInvitation = {
  id?: string;
  url: string;
  raw?: unknown;
};

export type ControllerConnectionRecord = {
  id: string;
  raw?: unknown;
};

export type ConnectionInitResult = {
  invitation: ControllerInvitation;
  invitationUrl: string;
  connectionRecordPromise: Promise<ControllerConnectionRecord>;
};

export interface AgentAdapter {
  isReady(): boolean;
  getLabel(): string;
  createOutOfBandInvitation(): Promise<ControllerInvitation>;
  buildInvitationUrl(invitation: ControllerInvitation): string;
  waitForConnection(invitation: ControllerInvitation): Promise<ControllerConnectionRecord>;
  waitUntilConnected(connectionId: string): Promise<void>;
  requestProofAndAccept(connectionId: string, proof: ProofRequestPayload): Promise<void>;
  shutdown?(): Promise<void>;
}
