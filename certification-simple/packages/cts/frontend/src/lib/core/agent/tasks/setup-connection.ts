import BaseRunnableTask from "../../pipeline/src/tasks/baseRunnableTask";
import {
  OutOfBandRecord,
  ConnectionRecord,
  ConnectionStateChangedEvent,
  ConnectionEventTypes,
} from "@credo-ts/core";
import { RunnableState, Results } from "../../pipeline/src/types";
import { BaseAgent } from "../core";
import qrcord from "qrcode-terminal";
import eventEmitter from "../utils/eventEmitter";

export class SetupConnectionTask extends BaseRunnableTask {
  private _agent: BaseAgent;
  private _oobInvitation: OutOfBandRecord | undefined;
  private _connectionRecord: ConnectionRecord | undefined;

  constructor(agent: BaseAgent, name: string, description?: string) {
    super(name, description);
    this._agent = agent;
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

  get invitation(): OutOfBandRecord | undefined {
    return this._oobInvitation;
  }

  async run(): Promise<void> {
    super.run();
    if (!this._agent) {
      super.addError("agent wasn't defined");
      throw new Error("Agent is not defined");
    }
    this.addMessage("Initializing agent");

    const outOfBandInvitation = await this._agent.agent.oob.createInvitation();
    this._oobInvitation = outOfBandInvitation;
    eventEmitter.emit("invitation", outOfBandInvitation);
    const urlMessage = outOfBandInvitation.outOfBandInvitation.toUrl({
      domain: this._agent!.config!.domain ? this._agent!.config!.domain : "",
    });
    console.log("Verifier OOB Invitation URL:\n", urlMessage);
    qrcord.generate(urlMessage, { small: true });

    this.setRunState(RunnableState.PENDING);
    this.setStatus(RunnableState.PENDING);

    const getConnectionRecord = (outOfBandId: string) =>
      new Promise<ConnectionRecord>((resolve, reject) => {
        const timeoutId = setTimeout(
          () => reject(new Error("missing connection record")),
          30000000 //TODO: fix
        );

        this._agent.agent.events.on<ConnectionStateChangedEvent>(
          ConnectionEventTypes.ConnectionStateChanged,
          (e: ConnectionStateChangedEvent) => {
            if (e.payload.connectionRecord.outOfBandId !== outOfBandId) return;
            clearTimeout(timeoutId);
            resolve(e.payload.connectionRecord);
          }
        );

        // Also retrieve the connection record by invitation if the event has already fired
        void this._agent.agent.connections
          .findAllByOutOfBandId(outOfBandId)
          .then(([connectionRecord]: ConnectionRecord[]) => {
            if (connectionRecord) {
              clearTimeout(timeoutId);
              resolve(connectionRecord);
            }
          });
      });

    const connectionRecord = await getConnectionRecord(this._oobInvitation!.id);
    try {
      await this._agent.agent.connections.returnWhenIsConnected(
        connectionRecord.id
      );
    } catch (e) {
      console.error(e);
      return;
    }
    this._connectionRecord = connectionRecord;
    this.setCompleted();
    this.setAccepted();
    console.log("Connection established");
    console.log("Returning...");
  }

  async results(): Promise<Results> {
    return {
      value: this._connectionRecord,
      time: new Date(),
      author: this._agent.config!.label,
    } as Results;
  }
}
