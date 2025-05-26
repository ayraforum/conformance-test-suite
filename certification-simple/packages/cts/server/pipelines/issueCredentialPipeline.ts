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
  _dag?: DAG;
  _agent: BaseAgent;

  constructor(agent: BaseAgent) {
    this._agent = agent;
  }

  dag(): DAG {
    if (!this._dag) {
      throw new Error("DAG not initialized");
    }
    return this._dag;
  }

  async init() {
    const did = await this.createDid(this._agent);
    this._dag = this._make(this._agent, did);
  }

  async createDid(agent: BaseAgent): Promise<string> {
    enum RegistryOptions {
      indy = "did:indy",
      cheqd = "did:cheqd",
    }

    const unqualifiedIndyDid = "HYfhCRaKhccZtr7v8CHTe8";
    const cheqdDid = "did:cheqd:testnet:d37eba59-513d-42d3-8f9f-d1df0548b675";
    const indyDid = `did:indy:${indyNetworkConfig.indyNamespace}:${unqualifiedIndyDid}`;

    const did =
      RegistryOptions.indy === RegistryOptions.indy ? indyDid : cheqdDid;
    await this._agent.agent.dids.import({
      did,
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
    return did;
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

    const requestPostedWorkerNotification = new IssueCredentialTask(
      agent,
      {
        ...issueCredentialOptions,
      },
      "Issue GAN Employee Credential",
      "Issue GAN Employee Credential"
    );

    console.log("adding nodes to task");

    // Add tasks to the DAG
    const connectionNode = new TaskNode(setupConnectionTask);
    dag.addNode(connectionNode);

    const postedWorkerNode = new TaskNode(requestPostedWorkerNotification);
    postedWorkerNode.addDependency(connectionNode);
    dag.addNode(postedWorkerNode);

    return dag;
  }
}
