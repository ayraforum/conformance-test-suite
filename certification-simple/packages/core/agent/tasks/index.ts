import { SetupConnectionTask } from "./setup-connection";
import { RequestProofTask, RequestProofOptions } from "./request-proof";

import {
  IssueCredentialTask,
  CredentialIssuanceOptions,
} from "./issue-credential";

import {
  SelfIssueCredentialTask,
  SelfIssueCredentialOptions,
} from "./self-issue-credential";

export {
  SetupConnectionTask,
  RequestProofTask,
  IssueCredentialTask,
  SelfIssueCredentialTask,
};

export type {
  RequestProofOptions,
  CredentialIssuanceOptions,
  SelfIssueCredentialOptions,
};
