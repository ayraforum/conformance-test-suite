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
import {
  getUnqualifiedSchemaId,
  getUnqualifiedCredentialDefinitionId,
  parseIndyDid,
} from "@credo-ts/anoncreds";
import type {
  GetSchemaReturn,
  GetCredentialDefinitionReturn,
} from "@credo-ts/anoncreds";

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
  schemaId?: string;
  credentialDefinitionId?: string;
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

const schemaNameBase = "AyraCard";
const credentialDisplayName = "Ayra Card";
const credentialDefinitionTag = "ayra-card";

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
      const { namespaceIdentifier } = parseIndyDid(this._options.did);

      // Register Schema
      let schemaSeqNo: number | undefined;
      let schemaTemplate:
        | {
            name: string;
            version: string;
            attrNames: string[];
            issuerId: string;
          }
        | undefined;
      let schemaId = this._options.schemaId;
      if (!schemaId) {
        schemaTemplate = {
          name: `${schemaNameBase}-${v4().replace(/-/g, "")}`,
          version: "1.0.0",
          attrNames: ["type"],
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
        schemaId = schemaResult.schemaState.schemaId;
        console.log("Schema State", schemaResult);
        if (!schemaId) {
          throw new Error("Schema registration did not return an id");
        }
        const registeredSeqNo =
          schemaResult.schemaMetadata?.indyLedgerSeqNo ??
          schemaResult.schemaState?.schemaMetadata?.indyLedgerSeqNo;
        if (typeof registeredSeqNo === "number") {
          schemaSeqNo = registeredSeqNo;
        }
      } else {
        console.log(`Using provided schema id ${schemaId}`);
      }

      const schemaLedgerRecord = await this.waitForLedgerSchema(schemaId);
      const schemaLedgerInfo = schemaLedgerRecord?.schema;
      if (
        typeof schemaLedgerRecord?.schemaMetadata?.indyLedgerSeqNo === "number"
      ) {
        schemaSeqNo = schemaLedgerRecord.schemaMetadata.indyLedgerSeqNo;
      }
      if (typeof schemaSeqNo !== "number") {
        throw new Error("Unable to determine schema sequence number on ledger");
      }
      const legacySchemaId = schemaLedgerInfo
        ? getUnqualifiedSchemaId(
            namespaceIdentifier,
            schemaLedgerInfo.name,
            schemaLedgerInfo.version
          )
        : schemaTemplate
          ? getUnqualifiedSchemaId(
              namespaceIdentifier,
              schemaTemplate.name,
              schemaTemplate.version
            )
          : undefined;

      const ensuredSchemaId = schemaId;
      if (!ensuredSchemaId) {
        throw new Error("Schema ID is not available after registration");
      }

      let credentialDefinitionId = this._options.credentialDefinitionId;
      let legacyCredentialDefinitionId: string | undefined;
      if (!credentialDefinitionId) {
        const { credentialDefinitionState } =
          await this._agent.agent.modules.anoncreds.registerCredentialDefinition({
            credentialDefinition: {
              schemaId: ensuredSchemaId,
              issuerId: this._options.did,
              tag: credentialDefinitionTag,
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
        credentialDefinitionId = credentialDefinitionState.credentialDefinitionId;
        console.log("Credential Definition State", credentialDefinitionState);
        if (!credentialDefinitionId) {
          throw new Error("Credential definition registration did not return an id");
        }
        await this.waitForLedgerCredentialDefinition(credentialDefinitionId);
        legacyCredentialDefinitionId = getUnqualifiedCredentialDefinitionId(
          namespaceIdentifier,
          schemaSeqNo,
          credentialDefinitionTag
        );
      } else {
        console.log(`Using provided credential definition id ${credentialDefinitionId}`);
      }

      const ensuredCredDefId = credentialDefinitionId;
      if (!ensuredCredDefId) {
        throw new Error("Credential definition ID is not available after registration");
      }
      const effectiveCredentialDefinitionId =
        legacyCredentialDefinitionId ?? ensuredCredDefId;

      // Persist the identifiers for downstream pipelines (e.g. holder proof requests)
      if (ensuredSchemaId) {
        process.env.LATEST_SCHEMA_ID_DID_INDY = ensuredSchemaId;
      }
      if (legacySchemaId) {
        process.env.LATEST_SCHEMA_ID = legacySchemaId;
      }
      process.env.LATEST_CRED_DEF_ID_DID_INDY = ensuredCredDefId;
      process.env.LATEST_CRED_DEF_ID = effectiveCredentialDefinitionId;

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
                  value: credentialDisplayName,
                }
              ],
              credentialDefinitionId: effectiveCredentialDefinitionId,
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

  private async waitForLedgerSchema(schemaId: string, timeoutMs = 30000) {
    return this.pollLedger<GetSchemaReturn>(
      () => this._agent.agent.modules.anoncreds.getSchema({ schemaId }),
      `schema ${schemaId}`,
      timeoutMs
    );
  }

  private async waitForLedgerCredentialDefinition(credentialDefinitionId: string, timeoutMs = 30000) {
    return this.pollLedger<GetCredentialDefinitionReturn>(
      () =>
        this._agent.agent.modules.anoncreds.getCredentialDefinition({
          credentialDefinitionId,
        }),
      `credential definition ${credentialDefinitionId}`,
      timeoutMs
    );
  }

  private async pollLedger<T>(
    fetcher: () => Promise<T>,
    description: string,
    timeoutMs: number
  ): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;
    while (Date.now() < deadline) {
      attempt += 1;
      try {
        const result = await fetcher();
        if (attempt > 1) {
          console.log(`Retrieved ${description} from ledger after ${attempt} attempts`);
        }
        return result;
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    throw new Error(`Timed out waiting for ${description} to be available on the ledger`);
  }
}
