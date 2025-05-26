import PostedWorkerPipeline from "./postedWorkerPipeline";
import IssueCredentialPipeline from "./issueCredentialPipeline";
import NYCGANMeetingPipeline from "./authMeetingPipeline";
import HolderTestPipeline from "./holderTestPipeline";
import VerifierTestPipeline from "./verifierTestPipeline";
import TRQPTesterPipeline from "./trqpTesterPipeline";

export { 
  PostedWorkerPipeline, 
  IssueCredentialPipeline,
  NYCGANMeetingPipeline,
  HolderTestPipeline,
  VerifierTestPipeline,
  TRQPTesterPipeline
};

export enum PipelineType {
  POSTED_WORKER = "POSTED_WORKER",
  ISSUE_CREDENTIAL = "ISSUANCE",
  NYC_GAN_MEETING = "NYC_GAN_MEETING",
  HOLDER_TEST = "HOLDER_TEST",
  VERIFIER_TEST = "VERIFIER_TEST",
  TRQP_TEST = "TRQP_TEST"
}
