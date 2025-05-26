import { TaskNode } from "@demo/core/pipeline/src/nodes";
import { BaseAgent } from "@demo/core/agent/core";
import BaseRunnableTask from "@demo/core/pipeline/src/tasks/baseRunnableTask";
import { Results } from "@demo/core/pipeline/src/types";

import {
  SetupConnectionTask,
  RequestProofTask,
  RequestProofOptions,
} from "@demo/core/agent/tasks";

import { DAG } from "@demo/core/pipeline/src/dag";

export default class NYCGANMeetingPipeline {
  _dag: DAG;
  _agent: BaseAgent;

  constructor(agent: BaseAgent) {
    this._dag = this._make(agent);
    this._agent = agent;
  }

  dag(): DAG {
    return this._dag;
  }

  async init() {
    const dag = this._make(this._agent);
    this._dag = dag;
  }

  _make(agent: BaseAgent): DAG {
    const dag = new DAG("Invite To GAN NYC October 17 Meeting");

    const setupConnectionTask = new SetupConnectionTask(
      agent,
      "Scan To Connect",
      "Set a DIDComm connection between GAN Verifier App and Holder"
    );

    const schemaId =
      "HYfhCRaKhccZtr7v8CHTe8:2:Certified GAN Employee Credential 7dbb2fa5-8ea1-4af7-bfd7-9f02eba5bf4b:1.0.0";
    const proof = {
      protocolVersion: "v1",
      proofFormats: {
        indy: {
          name: "proof-request",
          protocolVersion: "2.0",
          nonce: "1234567890",
          version: "1.0",
          requested_attributes: {
            name: {
              name: "name",
              restrictions: [
                {
                  schema_id: schemaId,
                },
              ],
            },
            type: {
              name: "type",
              restrictions: [
                {
                  schema_id: schemaId,
                },
              ],
            },
            date: {
              name: "date",
              restrictions: [
                {
                  schema_id: schemaId,
                },
              ],
            },
            role: {
              name: "role",
              restrictions: [
                {
                  schema_id: schemaId,
                },
              ],
            },
            expiry: {
              name: "expiry",
              restrictions: [
                {
                  schema_id: schemaId,
                },
              ],
            },
            egf: {
              name: "egf",
              restrictions: [
                {
                  schema_id: schemaId,
                },
              ],
            },
            company_did: {
              name: "company_did",
              restrictions: [
                {
                  schema_id: schemaId,
                },
              ],
            },
            authorized_countries: {
              name: "authorized_countries",
              restrictions: [
                {
                  schema_id: schemaId,
                },
              ],
            },
            profile: {
              name: "profile",
              restrictions: [
                {
                  schema_id: schemaId,
                },
              ],
            },
          },
          requested_predicates: {},
        },
      },
    };

    const requestProofOptions: RequestProofOptions = {
      proof: proof,
      checkTrustRegistry: false,
    };

    const requestPostedWorkerNotification = new RequestProofTask(
      agent,
      {
        ...requestProofOptions,
        checkTrustRegistry: true,
        trqpURL: "https://dev.gan.technology/tr",
      },
      "Check GAN NYC November 17 Meeting Credential",
      "Check you have a GAN Meeting Credential to authenticate yourself into the building"
    );

    console.log("adding nodes to task");

    // Add tasks to the DAG
    const connectionNode = new TaskNode(setupConnectionTask);
    dag.addNode(connectionNode);

    const postedWorkerNode = new TaskNode(requestPostedWorkerNotification);
    postedWorkerNode.addDependency(connectionNode);
    dag.addNode(postedWorkerNode);

    //   const evaluationTask = new EvaluatePipelineTask(
    //      "Evaluate Entry",
    //      "Evaluate As Allowed Entry"
    //    );
    //    const evaluationNode = new TaskNode(evaluationTask);
    //    evaluationNode.addDependency(postedWorkerNode);
    //    dag.addNode(evaluationNode);

    return dag;
  }
}

export class EvaluatePipelineTask extends BaseRunnableTask {
  constructor(name: string, description?: string) {
    super(name, description);
  }

  async prepare(): Promise<void> {
    super.prepare();
  }

  async run(): Promise<void> {
    super.run();
    this.addMessage("Evaluating proof request");
    this.addMessage("All results looked good");
    this.setCompleted();
    this.setAccepted();
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "Evaluating",
      value: {
        message: "Proof request completed successfully",
      },
    };
  }
}
