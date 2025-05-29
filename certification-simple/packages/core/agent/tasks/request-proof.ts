import { Observable, firstValueFrom, lastValueFrom } from "rxjs";

import BaseRunnableTask from "../../pipeline/src/tasks/baseRunnableTask";
import { TRQPClient } from "@demo/trqp/src/client";

import { filter, timeout, catchError, take, map, tap } from "rxjs/operators";
import {
  Configuration,
  RegistryApi,
  LookupsApi,
} from "@demo/trqp/gen/api-client";

import { v4 } from "uuid";

import {
  Agent,
  BaseEvent,
  ConnectionRecord,
  CredentialStateChangedEvent,
  ProofExchangeRecord,
  ProofEventTypes,
  ConnectionEventTypes,
  ProofState,
  ProofStateChangedEvent,
  CredentialEventTypes,
  AgentMessageProcessedEvent,
  TrustPingEventTypes,
  AgentEventTypes,
  RequestProofOptions as RPOPtions,
  ConnectionDidRotatedEvent,
  TrustPingResponseReceivedEvent,
  ConnectionStateChangedEvent,
  TrustPingReceivedEvent,
} from "@credo-ts/core";
import { ReplaySubject } from "rxjs";
import { Results } from "../../pipeline/src/types";
import { BaseAgent } from "../core";
import { RunnableState } from "../../pipeline/src/types";

type RequestProofOptionsWithoutConnectionId = Omit<
  RPOPtions,
  "connectionId"
> & {
  connectionId?: string; // Make connectionId optional
};

const isProofStateChangedEvent = (e: BaseEvent): e is ProofStateChangedEvent =>
  e.type === ProofEventTypes.ProofStateChanged;
const isCredentialStateChangedEvent = (
  e: BaseEvent
): e is CredentialStateChangedEvent =>
  e.type === CredentialEventTypes.CredentialStateChanged;
const isConnectionStateChangedEvent = (
  e: BaseEvent
): e is ConnectionStateChangedEvent =>
  e.type === ConnectionEventTypes.ConnectionStateChanged;
const isConnectionDidRotatedEvent = (
  e: BaseEvent
): e is ConnectionDidRotatedEvent =>
  e.type === ConnectionEventTypes.ConnectionDidRotated;
const isTrustPingReceivedEvent = (e: BaseEvent): e is TrustPingReceivedEvent =>
  e.type === TrustPingEventTypes.TrustPingReceivedEvent;
const isTrustPingResponseReceivedEvent = (
  e: BaseEvent
): e is TrustPingResponseReceivedEvent =>
  e.type === TrustPingEventTypes.TrustPingResponseReceivedEvent;
const isAgentMessageProcessedEvent = (
  e: BaseEvent
): e is AgentMessageProcessedEvent =>
  e.type === AgentEventTypes.AgentMessageProcessed;

export type RequestProofOptions = {
  checkTrustRegistry: boolean;
  trqpURL?: string;
  proof: RequestProofOptionsWithoutConnectionId;
};

export class RequestProofTask extends BaseRunnableTask {
  private _agent: BaseAgent;
  private result: RunnableState;
  private _options: RequestProofOptions;

  constructor(
    agent: BaseAgent,
    options: RequestProofOptions,
    name: string,
    description?: string
  ) {
    super(name, description);
    this._agent = agent;
    this._options = options;
    this.result = RunnableState.NOT_STARTED;
  }

  async prepare(): Promise<void> {
    super.prepare();
    if (!this._agent) {
      super.addError("agent wasn't defined");
      throw new Error("Agent is not defined");
    }
    if (this._agent?.agent.isInitialized) {
      this.addMessage("Agent is initialized");
    }
  }

  async run(connectionRecord?: any): Promise<void> {
    super.run();
    try {
      const record = connectionRecord as ConnectionRecord;
      const connectionId = record.id;

      if (connectionId === undefined) {
        this.addError("Connection ID is required");
        throw new Error("Connection ID is required");
      }

      const connStr = connectionId as string;
      if (!this._agent) {
        this.addError("agent wasn't defined");
        throw new Error("Agent is not defined");
      }
      this.addMessage("Initializing agent");

      const parentThreadId = v4();
      const waitForProofExchange = this.waitForProofExchangeRecord2(
        this._agent.agent,
        {
          parentThreadId,
          state: ProofState.PresentationReceived,
        }
      );

      console.log("Requesting proof", connStr);
      const exchangeRecord = await this._agent.agent.proofs.requestProof({
        protocolVersion: "v2",
        connectionId: connStr,
        parentThreadId,
        proofFormats: this._options.proof.proofFormats,
      });

      console.log("Waiting for updating exchange", exchangeRecord);
      const pe2 = await waitForProofExchange;

      console.log("Accepting Presentation...");
      const acceptPresentation =
        await this._agent.agent.proofs.acceptPresentation({
          proofRecordId: pe2.id,
        });

      console.log("Accept Presentation:", acceptPresentation);
      if (this._options.checkTrustRegistry) {
        try {
          console.log("verifying issuer against GAN Trust Registry....");
          console.log("creating client with ", this._options.trqpURL);
          const configuration = new Configuration({
            basePath: this._options.trqpURL,
          });

          const issuerDID = "did:web:samplenetwork.foundation";
          console.log(
            `Checking if issuer ${issuerDID} is listed in GAN Registry under GAN EGF and Authorization Namespace`
          );
          this.addMessage(
            `Checking if issuer ${issuerDID} is listed in GAN Registry under GAN EGF and Authorization Namespace`
          );

  //        const client = new TRQPClient(configuration);
  //        client.registryAPI
  //          .entitiesEntityVIDAuthorizationGet(
  //            "did:web:samplenetwork.foundation"
  //          )
  //          .then((resp) => {
  //            console.log(resp.data);
  //          });

  //        const resp =
  //          await client.registryAPI.entitiesEntityVIDAuthorizationGet(
  //            issuerDID
  //          );
//          if (resp.status === 200) {
//            console.log("Listed in GAN Registry", resp.data);
//            this.addMessage("Found listing in GAN Registry");
//          } else {
//            console.log("Not listed in GAN Registry!", resp.data);
//            throw new Error("Not listed in GAN Registry!");
//          }
        } catch (e) {
          console.error(e.code);
        }
      }
      this.setCompleted();
      this.setAccepted();
    } catch (e) {
      console.error(e);
      this.addError(e);
      this.setCompleted();
      this.setFailed();
      throw e;
    }
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "RequestProofTask",
      value: {
        message: "Proof request completed successfully",
        state: this.state,
      },
    };
  }

  waitForProofExchangeRecord(
    agent: Agent,
    options: {
      threadId?: string;
      parentThreadId?: string;
      state?: ProofState;
      previousState?: ProofState | null;
      timeoutMs?: number;
    }
  ): Promise<ProofExchangeRecord> {
    const observable = agent.events.observable<ProofStateChangedEvent>(
      ProofEventTypes.ProofStateChanged
    );

    // @ts-ignore
    return this.waitForProofExchangeRecordSubject(observable, options);
  }

  isProofStateChangedEvent = (e: BaseEvent): e is ProofStateChangedEvent =>
    e.type === ProofEventTypes.ProofStateChanged;
  isCredentialStateChangedEvent = (
    e: BaseEvent
  ): e is CredentialStateChangedEvent =>
    e.type === CredentialEventTypes.CredentialStateChanged;
  isConnectionStateChangedEvent = (
    e: BaseEvent
  ): e is ConnectionStateChangedEvent =>
    e.type === ConnectionEventTypes.ConnectionStateChanged;
  isConnectionDidRotatedEvent = (
    e: BaseEvent
  ): e is ConnectionDidRotatedEvent =>
    e.type === ConnectionEventTypes.ConnectionDidRotated;
  isTrustPingReceivedEvent = (e: BaseEvent): e is TrustPingReceivedEvent =>
    e.type === TrustPingEventTypes.TrustPingReceivedEvent;
  isTrustPingResponseReceivedEvent = (
    e: BaseEvent
  ): e is TrustPingResponseReceivedEvent =>
    e.type === TrustPingEventTypes.TrustPingResponseReceivedEvent;
  isAgentMessageProcessedEvent = (
    e: BaseEvent
  ): e is AgentMessageProcessedEvent =>
    e.type === AgentEventTypes.AgentMessageProcessed;

  waitForProofExchangeRecordSubject(
    subject: ReplaySubject<BaseEvent> | Observable<BaseEvent>,
    {
      threadId,
      parentThreadId,
      state,
      previousState,
      timeoutMs = 20000,
      count = 1,
    }: {
      threadId?: string;
      parentThreadId?: string;
      state?: ProofState;
      previousState?: ProofState | null;
      timeoutMs?: number;
      count?: number;
    }
  ) {
    const observable: Observable<BaseEvent> =
      subject instanceof ReplaySubject ? subject.asObservable() : subject;

    // @ts-ignore
    return firstValueFrom(
      observable.pipe(
        filter(isProofStateChangedEvent),
        filter(
          (e) =>
            previousState === undefined ||
            e.payload.previousState === previousState
        ),
        filter(
          (e) =>
            threadId === undefined ||
            e.payload.proofRecord.threadId === threadId
        ),
        // Fourth filter: Check parentThreadId
        filter(
          (e) =>
            parentThreadId === undefined ||
            e.payload.proofRecord.parentThreadId === parentThreadId
        ),
        filter(
          (e) =>
            e.payload.proofRecord.state === ProofState.Abandoned ||
            e.payload.proofRecord.state === ProofState.Declined ||
            e.payload.proofRecord.state === ProofState.Done ||
            e.payload.proofRecord.state === ProofState.PresentationSent
        ),
        take(count),
        timeout(timeoutMs),

        // Handle timeout or other errors
        catchError((err) => {
          console.error("Timeout or Error Occurred:", err);
          throw new Error(
            `ProofStateChangedEvent event not emitted within specified timeout: ${timeoutMs} ms
        previousState: ${previousState},
        threadId: ${threadId},
        parentThreadId: ${parentThreadId},
        state: ${state}`
          );
        }),

        // Map to proofRecord
        map((e) => e.payload.proofRecord),

        // Log the final proof record
        tap((proofRecord) => {
          console.log(
            "Final Proof Record:",
            JSON.stringify(proofRecord, null, 2)
          );
        })
      )
    );
  }

  waitForProofExchangeRecord2(
    agent: Agent,
    options: {
      threadId?: string;
      parentThreadId?: string;
      state?: ProofState;
      previousState?: ProofState | null;
      timeoutMs?: number;
    }
  ) {
    const observable = agent.events.observable<ProofStateChangedEvent>(
      ProofEventTypes.ProofStateChanged
    );

    return this.waitForProofExchangeRecordSubject2(observable, options);
  }

  waitForProofExchangeRecordSubject2(
    subject: ReplaySubject<BaseEvent> | Observable<BaseEvent>,
    {
      threadId,
      parentThreadId,
      state,
      previousState,
      timeoutMs = 1000000,
      count = 1,
    }: {
      threadId?: string;
      parentThreadId?: string;
      state?: ProofState;
      previousState?: ProofState | null;
      timeoutMs?: number;
      count?: number;
    }
  ) {
    const observable: Observable<BaseEvent> =
      subject instanceof ReplaySubject ? subject.asObservable() : subject;
    return lastValueFrom(
      observable.pipe(
        filter(isProofStateChangedEvent),
        filter(
          (e) =>
            previousState === undefined ||
            e.payload.previousState === previousState
        ),
        filter(
          (e) =>
            threadId === undefined ||
            e.payload.proofRecord.threadId === threadId
        ),
        filter(
          (e) =>
            parentThreadId === undefined ||
            e.payload.proofRecord.parentThreadId === parentThreadId
        ),
        filter(
          (e) => state === undefined || e.payload.proofRecord.state === state
        ),
        timeout(timeoutMs),
        catchError(() => {
          throw new Error(
            `ProofStateChangedEvent event not emitted within specified timeout: ${timeoutMs}
          previousState: ${previousState},
          threadId: ${threadId},
          parentThreadId: ${parentThreadId},
          state: ${state}
        }`
          );
        }),
        take(count),
        map((e) => e.payload.proofRecord)
      )
    );
  }
}
