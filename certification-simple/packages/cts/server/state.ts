import { DAG } from "@demo/core/pipeline/src/dag";
import { BaseAgent, AgentConfiguration, AgentController } from "@demo/core";
import {
  HolderTestPipeline,
  VerifierTestPipeline,
  RegistryTestPipeline,
  IssueCredentialPipeline,
} from "./pipelines";
import { PipelineType } from "./pipelines";

export type Pipeline = {
  init(): Promise<void>;
  dag(): DAG;
};

export type State = {
  dag?: DAG;
  config?: AgentConfiguration;
  pipeline?: Pipeline;
  currentInvitation?: string;
  agent?: BaseAgent;
  controller?: AgentController;
  issuerController?: AgentController;
  issuerAgentType?: "credo" | "acapy";
  credentialFormat?: "anoncreds" | "w3c";
  verifyTRQP?: boolean;
};

const _state: State = {};

export const setDAG = (dag: DAG) => {
  _state.dag = dag;
};

export const setPipeline = (pipeline: Pipeline) => {
  console.log("[STATE] Setting pipeline:", pipeline?.constructor?.name);
  _state.pipeline = pipeline;
};

export const setAgent = (agent: BaseAgent) => {
  _state.agent = agent;
};

export const setController = (controller: AgentController) => {
  _state.controller = controller;
};
export const setIssuerController = (controller?: AgentController) => {
  _state.issuerController = controller;
};

export const setIssuerAgentType = (
  type?: "credo" | "acapy"
): void => {
  _state.issuerAgentType = type;
};

export const setCredentialFormat = (
  format: "anoncreds" | "w3c"
): void => {
  _state.credentialFormat = format;
};

export const setConfig = (config: AgentConfiguration) => {
  _state.config = config;
};

export const setVerifyTRQP = (flag?: boolean) => {
  _state.verifyTRQP = flag;
};

export { _state as state };

export const selectPipeline = (type: PipelineType): Pipeline => {
  console.log("[STATE] Selecting pipeline type:", type);
  var pipe: Pipeline;
  switch (type) {
    case PipelineType.HOLDER_TEST:
      if (!_state.controller) {
        throw new Error("agent controller not defined");
      }
      pipe = new HolderTestPipeline(
        _state.controller,
        _state.verifyTRQP ?? false
      );
      break;
    case PipelineType.ISSUER_TEST:
      const issuerController = _state.issuerController ?? _state.controller;
      if (!issuerController) {
        throw new Error("agent controller not defined");
      }
      if (_state.issuerAgentType === "acapy" && _state.credentialFormat === "w3c") {
        const { IssueAcaPyW3CPipeline } = require("./pipelines");
        pipe = new IssueAcaPyW3CPipeline(issuerController);
      } else {
        pipe = new IssueCredentialPipeline(issuerController);
      }
      break;
    case PipelineType.VERIFIER_TEST:
      if (!_state.agent) {
        throw new Error("agent not defined");
      }
      pipe = new VerifierTestPipeline(_state.agent);
      break;
    case PipelineType.REGISTRY_TEST:
      if (!_state.agent) {
        throw new Error("agent not defined");
      }
      pipe = new RegistryTestPipeline(_state.agent);
      break;
    default:
      throw new Error(`could not find pipeline type ${type}`);
  }
  setPipeline(pipe);
  setDAG(pipe.dag());
  return pipe;
};
