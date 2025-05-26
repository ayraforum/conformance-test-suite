import PostedWorkerPipeline from "./postedWorkerPipeline";
import IssueCredentialPipeline from "./issueCredentialPipeline";
export { PostedWorkerPipeline, IssueCredentialPipeline };
import NYCGANMeetingPipeline from "./authMeetingPipeline";
export { NYCGANMeetingPipeline };

export enum PipelineType {
  POSTED_WORKER = "POSTED_WORKER",
  ISSUE_CREDENTIAL = "ISSUANCE",
  NYC_GAN_MEETING = "NYC_GAN_MEETING",
}
