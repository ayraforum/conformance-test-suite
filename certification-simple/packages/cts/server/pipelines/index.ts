import HolderTestPipeline from "./holderTestPipeline";
import VerifierTestPipeline from "./verifierTestPipeline";
import TRQPTesterPipeline from "./trqpTesterPipeline";
import IssueCredentialPipeline from "./issueCredentialPipeline";
import RegistryTestPipeline from "./trqpTesterPipeline";

export { HolderTestPipeline, VerifierTestPipeline, TRQPTesterPipeline, IssueCredentialPipeline, RegistryTestPipeline };

export enum PipelineType {
  HOLDER_TEST = "HOLDER_TEST",
  VERIFIER_TEST = "VERIFIER_TEST",
  ISSUER_TEST = "ISSUER_TEST",
  TRQP_TEST = "TRQP_TEST",
  REGISTRY_TEST = "REGISTRY_TEST"
}
