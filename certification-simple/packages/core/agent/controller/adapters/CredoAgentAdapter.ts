import { v4 as uuidv4 } from "uuid";
import {
  ConnectionEventTypes,
  type ConnectionRecord,
  type ConnectionStateChangedEvent,
  ProofEventTypes,
  ProofState,
  type ProofStateChangedEvent,
} from "@credo-ts/core";
import { Observable, ReplaySubject, lastValueFrom } from "rxjs";
import { catchError, filter, map, take, timeout } from "rxjs/operators";

import { BaseAgent } from "../../core";
import type {
  AgentAdapter,
  ControllerConnectionRecord,
  ControllerInvitation,
  ProofRequestPayload,
} from "../types";

export class CredoAgentAdapter implements AgentAdapter {
  constructor(private readonly agent: BaseAgent) {}

  isReady(): boolean {
    return Boolean(this.agent?.agent?.isInitialized);
  }

  getLabel(): string {
    return this.agent.config?.label ?? "Credo Reference Agent";
  }

  async createOutOfBandInvitation(): Promise<ControllerInvitation> {
    const record = await this.agent.agent.oob.createInvitation();
    return {
      id: record.id,
      url: record.outOfBandInvitation.toUrl({
        domain: this.agent.config?.domain ?? "",
      }),
      raw: record,
    };
  }

  buildInvitationUrl(invitation: ControllerInvitation): string {
    return invitation.url;
  }

  async waitForConnection(invitation: ControllerInvitation): Promise<ControllerConnectionRecord> {
    const outOfBandId = invitation.id;
    if (!outOfBandId) {
      throw new Error("Out-of-band id missing for invitation");
    }
    const connectionRecord = await new Promise<ConnectionRecord>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `Timed out waiting for connection record for out-of-band id ${outOfBandId}`
          )
        );
      }, 300000);

      const handleConnection = (event: ConnectionStateChangedEvent) => {
        if (event.payload.connectionRecord.outOfBandId !== outOfBandId) {
          return;
        }
        cleanup();
        resolve(event.payload.connectionRecord);
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.agent.agent.events.off(
          ConnectionEventTypes.ConnectionStateChanged,
          handleConnection
        );
      };

      this.agent.agent.events.on(
        ConnectionEventTypes.ConnectionStateChanged,
        handleConnection
      );

      void this.agent.agent.connections
        .findAllByOutOfBandId(outOfBandId)
        .then(([connectionRecord]) => {
          if (connectionRecord) {
            cleanup();
            resolve(connectionRecord);
          }
        })
        .catch((err) => {
          cleanup();
          reject(err);
        });
    });
    return { id: connectionRecord.id, raw: connectionRecord };
  }

  async waitUntilConnected(connectionId: string): Promise<void> {
    await this.agent.agent.connections.returnWhenIsConnected(connectionId);
  }

  async requestProofAndAccept(
    connectionId: string,
    proof: ProofRequestPayload
  ): Promise<void> {
    const parentThreadId = uuidv4();
    const proofRecordPromise = this.waitForProofExchangeRecord({
      parentThreadId,
      state: ProofState.PresentationReceived,
    });

    const protocolVersion = proof.protocolVersion ?? "v2";
    if (protocolVersion !== "v2") {
      throw new Error(
        `Credo adapter currently supports only proof protocol version v2 (received ${protocolVersion})`
      );
    }

    await this.agent.agent.proofs.requestProof({
      connectionId,
      parentThreadId,
      protocolVersion,
      proofFormats: proof.proofFormats,
    });

    const proofRecord = await proofRecordPromise;
    await this.agent.agent.proofs.acceptPresentation({
      proofRecordId: proofRecord.id,
    });

    return;
  }

  private waitForProofExchangeRecord(options: {
    parentThreadId: string;
    state: ProofState;
    timeoutMs?: number;
  }): Promise<any> {
    const observable = this.agent.agent.events.observable<ProofStateChangedEvent>(
      ProofEventTypes.ProofStateChanged
    );

    return this.waitForProofExchangeRecordSubject(observable, options);
  }

  private waitForProofExchangeRecordSubject(
    subject: ReplaySubject<any> | Observable<any>,
    {
      parentThreadId,
      state,
      timeoutMs = 120000,
    }: {
      parentThreadId: string;
      state: ProofState;
      timeoutMs?: number;
    }
  ): Promise<any> {
    const observable: Observable<any> =
      subject instanceof ReplaySubject ? subject.asObservable() : subject;

    return lastValueFrom(
      observable.pipe(
        filter(
          (event): event is ProofStateChangedEvent =>
            event?.type === ProofEventTypes.ProofStateChanged
        ),
        filter(
          (event) =>
            event.payload.proofRecord.parentThreadId === parentThreadId
        ),
        filter((event) => event.payload.proofRecord.state === state),
        timeout(timeoutMs),
        take(1),
        map((event) => event.payload.proofRecord),
        catchError((err) => {
          throw new Error(
            `ProofStateChangedEvent not emitted within ${timeoutMs}ms for parentThreadId ${parentThreadId}: ${err}`
          );
        })
      )
    );
  }
}
