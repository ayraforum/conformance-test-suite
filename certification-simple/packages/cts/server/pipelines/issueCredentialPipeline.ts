import { BaseAgent, indyNetworkConfig } from "@demo/core/agent/core";
import { TaskNode } from "@demo/core/pipeline/src/nodes";
import BaseRunnableTask from "@demo/core/pipeline/src/tasks/baseRunnableTask";
import { Results } from "@demo/core/pipeline/src/types";

import {
  CredentialIssuanceOptions,
  IssueCredentialTask,
  SetupConnectionTask,
} from "@demo/core/agent/tasks";

import {
  PeerDidNumAlgo1CreateOptions,
  PeerDidNumAlgo0CreateOptions,
  PeerDidNumAlgo,
  KeyType,
  TypedArrayEncoder,
} from "@credo-ts/core";

import { DAG } from "@demo/core/pipeline/src/dag";

export default class IssueCredentialPipeline {
  _dag: DAG;
  _agent: BaseAgent;
  _did: string;

  constructor(agent: BaseAgent) {
    this._agent = agent;
    this._did = this.getDefaultDid();
    this._dag = this._make(agent, this._did);
  }

  private getDefaultDid(): string {
    const unqualifiedIndyDid = "HYfhCRaKhccZtr7v8CHTe8";
    const indyDid = `did:indy:${indyNetworkConfig.indyNamespace}:${unqualifiedIndyDid}`;
    return indyDid;
  }

  dag(): DAG {
    return this._dag;
  }

  async init() {
    // Import the DID if not already imported
    try {
      await this._agent.agent.dids.import({
        did: this._did,
        overwrite: true,
        privateKeys: [
          {
            keyType: KeyType.Ed25519,
            privateKey: TypedArrayEncoder.fromString(
              "afjd3mov1rysercure03020004000000"
            ),
          },
        ],
      });
    } catch (error) {
      console.error("Error importing DID:", error);
    }
  }

  _make(agent: BaseAgent, did: string): DAG {
    const dag = new DAG("Issue GAN Credential Pipeline");

    const setupConnectionTask = new SetupConnectionTask(
      agent,
      "Scan To Connect",
      "Set a DIDComm connection between GAN Verifier App and Holder"
    );
    const issueCredentialOptions: CredentialIssuanceOptions = {
      did: did,
    };

    const requestCredential = new IssueCredentialTask(
      agent,
      {
        ...issueCredentialOptions,
      },
      "Issue GAN Employee Credential",
      "Issue GAN Employee Credential"
    );

    // Add tasks to the DAG
    const connectionNode = new TaskNode(setupConnectionTask);
    dag.addNode(connectionNode);

    const requestCredentialNode = new TaskNode(requestCredential);
    requestCredentialNode.addDependency(connectionNode);
    dag.addNode(requestCredentialNode);

    return dag;
  }
}
 