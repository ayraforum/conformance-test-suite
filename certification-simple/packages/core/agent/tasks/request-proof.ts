import BaseRunnableTask from "../../pipeline/src/tasks/baseRunnableTask";
import { Configuration } from "@demo/trqp/gen/api-client";
import type { RequestProofOptions as CredoRequestProofOptions } from "@credo-ts/core";
import { Results } from "../../pipeline/src/types";
import { RunnableState } from "../../pipeline/src/types";
import { AgentController } from "../controller";
import type { ControllerConnectionRecord } from "../controller/types";

type RequestProofOptionsWithoutConnectionId = Omit<
  CredoRequestProofOptions,
  "connectionId"
> & {
  connectionId?: string;
};

export type RequestProofOptions = {
  checkTrustRegistry: boolean;
  trqpURL?: string;
  proof: RequestProofOptionsWithoutConnectionId;
  checkGANTR?: boolean;
};

export class RequestProofTask extends BaseRunnableTask {
  private controller: AgentController;
  private _options: RequestProofOptions;

  constructor(
    controller: AgentController,
    options: RequestProofOptions,
    name: string,
    description?: string
  ) {
    super(name, description);
    this.controller = controller;
    this._options = options;
  }

  async prepare(): Promise<void> {
    super.prepare();
    if (!this.controller) {
      super.addError("controller wasn't defined");
      throw new Error("Agent controller is not defined");
    }
    if (this.controller.isReady()) {
      this.addMessage("Agent is initialized");
    }
  }

  async run(connectionRecord?: any): Promise<void> {
    super.run();
    try {
      const record = connectionRecord as ControllerConnectionRecord;
      const connectionId = record.id;

      if (connectionId === undefined) {
        this.addError("Connection ID is required");
        throw new Error("Connection ID is required");
      }

      const connStr = connectionId as string;
      if (!this.controller) {
        this.addError("controller wasn't defined");
        throw new Error("Agent controller is not defined");
      }
      this.addMessage("Requesting proof via controller");

      await this.controller.requestProof(connStr, this._options.proof);
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
}
