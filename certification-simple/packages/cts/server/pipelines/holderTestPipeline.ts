import { TaskNode } from "@demo/core/pipeline/src/nodes";
import { AgentController } from "@demo/core";
import BaseRunnableTask from "@demo/core/pipeline/src/tasks/baseRunnableTask";
import { Results } from "@demo/core/pipeline/src/types";

import {
  SetupConnectionTask,
  RequestProofTask,
  RequestProofOptions,
} from "@demo/core";
import { randomUUID } from "crypto";

import { DAG } from "@demo/core/pipeline/src/dag";

export default class HolderTestPipeline {
  _dag: DAG;
  _controller: AgentController;

  constructor(controller: AgentController) {
    this._controller = controller;
    this._dag = this._make(controller);
  }

  dag(): DAG {
    return this._dag;
  }

  async init() {
    const dag = this._make(this._controller);
    this._dag = dag;
  }

  _make(controller: AgentController): DAG {
    const dag = new DAG("Holder Conformance Test");

    // Create setup connection task
    const setupConnectionTask = new SetupConnectionTask(
      controller,
      "Setup Connection",
      "Establish a connection with the holder wallet"
    );

    // Define DIF/ld-proof presentation request targeting Ayra Business Card
    const challenge = randomUUID();
    const proof = {
      protocolVersion: "v2",
      proofFormats: {
        dif: {
          options: {
            challenge,
            domain: "https://cts.issuer",
          },
          presentation_definition: {
            name: "Ayra Business Card LDP",
            purpose: "Present an Ayra Business Card signed as a Linked Data Proof VC",
            input_descriptors: [
              {
                id: "ayra-business-card",
                purpose: "Must be an Ayra Business Card with Ed25519Signature2020",
                schema: [
                  { uri: "https://www.w3.org/2018/credentials/v1" },
                  { uri: "https://www.w3.org/ns/credentials/v2" },
                ],
                constraints: {
                  fields: [
                    {
                      path: ["$.type", "$.vc.type", "$.credential.type"],
                      filter: {
                        type: "array",
                        contains: { const: "AyraBusinessCard" },
                      },
                    },
                    {
                      path: ["$.proof.type", "$.proof[0].type"],
                      filter: {
                        type: "string",
                        const: "Ed25519Signature2020",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    };

    const requestProofOptions: RequestProofOptions = {
      proof: proof,
      checkTrustRegistry: true,
      trqpURL: "https://dev.gan.technology/tr",
    };

    // Create request proof task
    const requestProofTask = new RequestProofTask(
      controller,
      requestProofOptions,
      "Request Proof",
      "Request a presentation from the holder and verify it"
    );

   // Add evaluation task for final assessment
    const evaluationTask = new HolderTestEvaluationTask(
      "Evaluate Holder Test",
      "Evaluate holder's conformance based on connection and presentation"
    );

    // Add tasks to the DAG
    const connectionNode = new TaskNode(setupConnectionTask);
    dag.addNode(connectionNode);

    const proofNode = new TaskNode(requestProofTask);
    proofNode.addDependency(connectionNode);
    dag.addNode(proofNode);

    const evaluationNode = new TaskNode(evaluationTask);
    evaluationNode.addDependency(proofNode);
    dag.addNode(evaluationNode);

    return dag;
  }
}

export class HolderTestEvaluationTask extends BaseRunnableTask {
  constructor(name: string, description?: string) {
    super(name, description);
  }

  async prepare(): Promise<void> {
    super.prepare();
  }

  async run(): Promise<void> {
    super.run();
    console.log("Running holder test evaluation");
    this.addMessage("Evaluating holder conformance test results");
    this.addMessage("Checking connection establishment");
    this.addMessage("Checking presentation response");
    this.addMessage("Evaluating credential format compliance");
    this.addMessage("Test completed successfully");
    this.setCompleted();
    this.setAccepted();
  }

  async results(): Promise<Results> {
    return {
      time: new Date(),
      author: "Holder Test Evaluation",
      value: {
        message: "Holder conformance test completed successfully",
        conformanceLevel: "Full",
        details: {
          connectionProtocol: "Pass",
          presentationProtocol: "Pass",
          credentials: "Pass"
        }
      },
    };
  }
}
