import { BaseAgent, indyNetworkConfig } from "../core/agent/core";
import { TaskNode } from "../core/pipeline/src/nodes";
import { 
  SetupConnectionTask, 
  RequestProofTask, 
  RequestProofOptions,
  IssueCredentialTask,
  CredentialIssuanceOptions 
} from "../core/agent/tasks";
import { DAG } from "../core/pipeline/src/dag";
import { KeyType, TypedArrayEncoder } from "@credo-ts/core";

export class VerifierTestPipeline {
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
    const unqualifiedIndyDid = "HYfhCRaKhccZtr7v8CHTe8";
    const cheqdDid = "did:cheqd:testnet:d37eba59-513d-42d3-8f9f-d1df0548b675";
    const indyDid = `did:indy:${indyNetworkConfig.indyNamespace}:${unqualifiedIndyDid}`;

    // Use indy DID for verifier tests
    const did = indyDid;
    
    await this._agent.agent.dids.import({
      did,
      overwrite: true,
      privateKeys: [
        {
          keyType: KeyType.Ed25519,
          privateKey: TypedArrayEncoder.fromString("afjd3mov1rysercure03020004000000"),
        },
      ],
    });
    return did;
  }

  _make(agent: BaseAgent, did: string): DAG {
    const dag = new DAG("Verifier Conformance Test Pipeline");

    // Step 1: Setup Connection (Create QR Code)
    const setupConnectionTask = new SetupConnectionTask(
      agent,
      "Create Connection",
      "Generate QR code and establish DIDComm connection with holder wallet"
    );

    // Step 2: Issue Test Credential (for testing purposes)
    const issueCredentialOptions: CredentialIssuanceOptions = {
      did: did,
    };

    const issueCredentialTask = new IssueCredentialTask(
      agent,
      issueCredentialOptions,
      "Issue Test Credential",
      "Issue a test GAN Employee Credential to the holder for verification testing"
    );

    // Step 3: Request Proof/Presentation
    const requestProofOptions: RequestProofOptions = {
      checkTrustRegistry: true,
      trqpURL: process.env.TRQP_URL || "https://trustregistry.dev.continuumloop.com",
      proof: {
        protocolVersion: "v2",
        proofFormats: {
          anoncreds: {
            name: "GAN Employee Credential Verification",
            version: "1.0",
            requested_attributes: {
              name: {
                name: "name",
                restrictions: [
                  {
                    issuer_did: "did:web:samplenetwork.foundation",
                  },
                ],
              },
              role: {
                name: "role", 
                restrictions: [
                  {
                    issuer_did: "did:web:samplenetwork.foundation",
                  },
                ],
              },
              company: {
                name: "company",
                restrictions: [
                  {
                    issuer_did: "did:web:samplenetwork.foundation",
                  },
                ],
              },
              egf: {
                name: "egf",
                restrictions: [
                  {
                    issuer_did: "did:web:samplenetwork.foundation",
                  },
                ],
              },
            },
            requested_predicates: {},
          },
        },
      },
    };

    const requestProofTask = new RequestProofTask(
      agent,
      requestProofOptions,
      "Request Presentation",
      "Send presentation request to holder and verify the response"
    );

    // Add tasks to the DAG with dependencies
    const connectionNode = new TaskNode(setupConnectionTask);
    dag.addNode(connectionNode);

    const issueCredentialNode = new TaskNode(issueCredentialTask);
    issueCredentialNode.addDependency(connectionNode);
    dag.addNode(issueCredentialNode);

    const proofRequestNode = new TaskNode(requestProofTask);
    proofRequestNode.addDependency(issueCredentialNode);
    dag.addNode(proofRequestNode);

    return dag;
  }
}
