import HolderTestPipeline from "./holderTestPipeline";
import VerifierTestPipeline from "./verifierTestPipeline";
import RegistryTestPipeline from "./trqpTesterPipeline";

export { HolderTestPipeline, VerifierTestPipeline, RegistryTestPipeline };

export enum PipelineType {
  HOLDER_TEST = "HOLDER_TEST",
  VERIFIER_TEST = "VERIFIER_TEST",
  REGISTRY_TEST = "REGISTRY_TEST",
}
