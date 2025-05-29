import BaseRunnableTask from "../../pipeline/src/tasks/baseRunnableTask";
import { v4 } from "uuid";

import {
  ConnectionRecord,
  OfferCredentialOptions as OCOptions,
  CredentialProtocolVersionType, // Import the correct type
  AutoAcceptCredential,
} from "@credo-ts/core";
import { Results } from "../../pipeline/src/types";
import { BaseAgent } from "../core";
import { RunnableState } from "../../pipeline/src/types";
import { ReplaySubject, Observable, firstValueFrom } from "rxjs";
import { filter, timeout, catchError, take, map, tap } from "rxjs/operators";

type EventReplaySubject = ReplaySubject<BaseEvent>;

import {
  Agent,
  BaseEvent,
  CredentialEventTypes,
  CredentialState,
  CredentialStateChangedEvent,
} from "@credo-ts/core";

export type CredentialIssuanceOptions = {
  did: string;
};

function setupEventReplaySubjects(
  agents: Agent[],
  eventTypes: string[]
): ReplaySubject<BaseEvent>[] {
  const replaySubjects: EventReplaySubject[] = [];

  for (const agent of agents) {
    const replaySubject = new ReplaySubject<BaseEvent>();

    for (const eventType of eventTypes) {
      agent.events.observable(eventType).subscribe(replaySubject);
    }

    replaySubjects.push(replaySubject);
  }

  return replaySubjects;
}

const isCredentialStateChangedEvent = (
  e: BaseEvent
): e is CredentialStateChangedEvent =>
  e.type === CredentialEventTypes.CredentialStateChanged;

export class IssueCredentialTask extends BaseRunnableTask {
  private _agent: BaseAgent;
  private result: RunnableState;
  private _options: CredentialIssuanceOptions;

  constructor(
    agent: BaseAgent,
    options: CredentialIssuanceOptions,
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

      // Register Schema
      const schemaTemplate = {
        name: "Certified GAN Employee Credential " + v4(),
        version: "1.0.0",
        attrNames: [
          "type",
        ],
        issuerId: this._options.did,
      };
      const schemaResult =
        await this._agent.agent.modules.anoncreds.registerSchema({
          schema: schemaTemplate,
          options: {
            supportRevocation: false,
            endorserMode: "internal",
            endorserDid: this._options.did,
          },
        });

      if (schemaResult?.schemaState.state === "failed") {
        throw new Error(
          `Error creating schema: ${schemaResult.schemaState.reason}`
        );
      }

      console.log("Schema State", schemaResult);
      // Register Credential Definition
      const { credentialDefinitionState } =
        await this._agent.agent.modules.anoncreds.registerCredentialDefinition({
          credentialDefinition: {
            schemaId: schemaResult.schemaState.schemaId,
            issuerId: this._options.did,
            tag: "latest",
          },
          options: {
            supportRevocation: false,
            endorserMode: "internal",
            endorserDid: this._options.did,
          },
        });

      if (credentialDefinitionState.state !== "finished") {
        throw new Error(
          `Error registering credential definition: ${
            credentialDefinitionState.state === "failed"
              ? credentialDefinitionState.reason
              : "Not Finished"
          }}`
        );
      }
      const credentialDefinition = credentialDefinitionState;
      console.log("Credential Definition State", credentialDefinition);

      // Offer Credential with Correct Type Parameters
      const offerCredState =
        await this._agent.agent.credentials.offerCredential({
          connectionId: connectionRecord.id,
          // @ts-ignore
          protocolVersion: "v2" as CredentialProtocolVersionType, // Explicitly type the protocolVersion
          credentialFormats: {
            anoncreds: {
              attributes: [
                {
                  name: "type",
                  value: "Certified GAN Employee Credential",
                }
              ],
              credentialDefinitionId:
                credentialDefinition.credentialDefinitionId,
            },
          },
        });

      let issuerReplay = setupEventReplaySubjects(
        [this._agent.agent],
        [CredentialEventTypes.CredentialStateChanged]
      );

      // Wait for Issuance to Complete
      await this.waitForCredentialRecordSubject(issuerReplay[0], {
        state: CredentialState.RequestReceived,
        threadId: offerCredState.threadId,
      });

      const recordAccept = await this._agent.agent.credentials.acceptRequest({
        credentialRecordId: offerCredState.id,
        autoAcceptCredential: AutoAcceptCredential.Always,
        credentialFormats: {
          dataIntegrity: {},
        },
      });
      console.log("Credential Record", recordAccept);

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

  waitForCredentialRecordSubject(
    subject: ReplaySubject<BaseEvent> | Observable<BaseEvent>,
    {
      threadId,
      state,
      previousState,
      timeoutMs = 15000, // sign and store credential in W3c credential protocols take several seconds
    }: {
      threadId?: string;
      state?: CredentialState;
      previousState?: CredentialState | null;
      timeoutMs?: number;
    }
  ) {
    const observable =
      subject instanceof ReplaySubject ? subject.asObservable() : subject;

    return firstValueFrom(
      observable.pipe(
        filter(isCredentialStateChangedEvent),
        filter(
          (e) =>
            previousState === undefined ||
            e.payload.previousState === previousState
        ),
        filter(
          (e) =>
            threadId === undefined ||
            e.payload.credentialRecord.threadId === threadId
        ),
        filter(
          (e) =>
            state === undefined || e.payload.credentialRecord.state === state
        ),
        timeout(timeoutMs),
        catchError(() => {
          throw new Error(`CredentialStateChanged event not emitted within specified timeout: {
  previousState: ${previousState},
  threadId: ${threadId},
  state: ${state}
}`);
        }),
        map((e) => e.payload.credentialRecord)
      )
    );
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "IssueCredentialTask",
      value: {
        message: "Proof request completed successfully",
        state: this.state,
      },
    };
  }
}
