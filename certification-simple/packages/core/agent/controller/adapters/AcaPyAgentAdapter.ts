import { fetch } from "undici";

import type {
  AgentAdapter,
  ControllerConnectionRecord,
  ControllerInvitation,
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

  async createOutOfBandInvitation(): Promise<ControllerInvitation> {
    const payload = await this.post<InvitationApiResponse>(
      "/connections/create-invitation",
      {}
    );
    return {
      id: payload.connection_id,
      url: payload.invitation_url,
      raw: payload.invitation,
    };
  }

  buildInvitationUrl(invitation: ControllerInvitation): string {
    return invitation.url;
  }

  async waitForConnection(
    invitation: ControllerInvitation
  ): Promise<ControllerConnectionRecord> {
    if (!invitation.id) {
      throw new Error("Invitation id is required to wait for connection");
    }
    const record = await this.post<ConnectionRecordApiResponse>(
      "/connections/wait",
      { connection_id: invitation.id }
    );
    return { id: record.connection_id, raw: record.record ?? record };
  }

  async waitUntilConnected(connectionId: string): Promise<void> {
    await this.post("/connections/wait", { connection_id: connectionId });
  }

  async requestProofAndAccept(
    connectionId: string,
    proof: ProofRequestPayload
  ): Promise<void> {
    const protocolVersion = proof.protocolVersion ?? "v2";
    await this.post("/proofs/request", {
      connection_id: connectionId,
      protocol_version: protocolVersion,
      proof_formats: proof.proofFormats,
    });
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
