import BaseRunnableTask from "@demo/core/pipeline/src/tasks/baseRunnableTask";
import { Results, RunnableState } from "@demo/core/pipeline/src/types";
import { AgentController } from "@demo/core";
import { AcaPyAgentAdapter } from "@demo/core";
import fs from "fs";
import path from "path";

type ConnectionRecord = {
  id?: string;
};

export class IssueAyraW3CTask extends BaseRunnableTask {
  private controller: AgentController;
  private credential?: unknown;
  private verified = false;

  constructor(controller: AgentController, name: string, description?: string) {
    super(name, description);
    this.controller = controller;
  }

  async prepare(): Promise<void> {
    super.prepare();
    if (!this.controller) {
      this.addError("controller wasn't defined");
      throw new Error("Agent controller is not defined");
    }
    if (!this.controller.isReady()) {
      this.addMessage("Controller not ready yet");
    }
  }

  private loadContext(): any {
    const defaultPath = path.resolve(__dirname, "..", "..", "schema", "AyraBusinessCardV1R0.jsonld");
    const envPath =
      process.env.AYRA_CONTEXT_PATH || process.env.NEXT_PUBLIC_AYRA_CONTEXT_PATH;
    const candidates: string[] = [];
    if (envPath) {
      candidates.push(envPath);
      candidates.push(path.resolve(envPath));
      candidates.push(path.resolve(process.cwd(), envPath));
      candidates.push(path.resolve(__dirname, "..", "..", envPath));
      candidates.push(path.resolve(__dirname, "..", "..", "..", "..", envPath));
    }
    candidates.push(defaultPath);

    const contextPath = candidates.find((p) => fs.existsSync(p));
    if (!contextPath) {
      throw new Error(`Ayra context not found. Tried: ${candidates.join(", ")}`);
    }

    const raw = fs.readFileSync(contextPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed["@context"] ?? parsed;
  }

  private buildCredential(issuerDid: string, subjectDid: string, inlineContext: any) {
    return {
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        inlineContext,
        "https://w3id.org/security/suites/ed25519-2020/v1",
      ],
      type: ["VerifiableCredential", "AyraBusinessCard"],
      issuer: { id: issuerDid },
      validFrom: "2025-01-01T00:00:00Z",
      validUntil: "2026-01-01T00:00:00Z",
      credentialSubject: {
        id: subjectDid,
        ayra_trust_network_did: "did:web:ayra.forum",
        ayra_assurance_level: 0,
        ayra_card_type: "businesscard",
        ayra_card_version: "1.0.0",
        ayra_card_type_version: "1.0.0",
        authority_trust_registry: "https://trust-reg.example/registry",
        ecosystem_id: "did:web:ecosystem.example",
        issuer_id: issuerDid,
        display_name: "Example Holder",
        company_display_name: "Example Corp",
        email: "holder@example.com",
        phone: "+1-555-0100",
        title: "Engineer",
      },
    };
  }

  async run(connectionRecord?: ConnectionRecord): Promise<void> {
    super.run();
    try {
      const adapter = this.controller.getAdapter() as any;
      if (!(adapter instanceof AcaPyAgentAdapter)) {
        throw new Error("W3C issuance requires ACA-Py adapter");
      }
      if (!connectionRecord?.id) {
        throw new Error("Connection id is required to issue credential");
      }

      const inlineContext = this.loadContext();
      const issuerDid = await adapter.createDidKey("ed25519");
      const fragment = issuerDid.split(":").pop();
      if (!fragment) {
        throw new Error(`Could not derive verification method fragment for ${issuerDid}`);
      }

      const credential = this.buildCredential(
        issuerDid,
        "did:key:z6MkhjQjDuoQk7G8hkpuySqQMzuyjaAhmMS6G6Lk2mSuk4zB",
        inlineContext
      );

      if (process.env.DEBUG_AYRA_CREDENTIAL === "true") {
        this.addMessage(
          `Issuing credential (DEBUG_AYRA_CREDENTIAL=true): ${JSON.stringify(
            credential,
            null,
            2
          )}`
        );
      }

      this.addMessage("Issuing Ayra Business Card (LDP VC) via Issue Credential v2 (ld-proof)");
      const issued: any = await adapter.issueLdProofCredential({
        connection_id: connectionRecord.id,
        comment: "Ayra Business Card (LDP)",
        credential_preview: {
          "@type": "issue-credential/2.0/credential-preview",
          attributes: [],
        },
        filter: {
          ld_proof: {
            credential,
            options: {
              proofType: "Ed25519Signature2020",
              verificationMethod: `${issuerDid}#${fragment}`,
              proofPurpose: "assertionMethod",
            },
          },
        },
      });

      this.credential = issued;
      this.verified = true;

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
      author: "IssueAyraW3CTask",
      value: {
        verified: this.verified,
        credential: this.credential,
      },
    };
  }
}
