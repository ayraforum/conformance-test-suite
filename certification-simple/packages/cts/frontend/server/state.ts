import { DAG } from "../../../lib/core/pipeline/src/dag";
import { AgentConfiguration } from "../../../lib/core/agent/core/BaseAgent";
import { BaseAgent } from "../../../lib/core/agent/core";
import { HolderTestPipeline } from "../../src/lib/pipelines/holderTestPipeline";
import { VerifierTestPipeline } from "../../src/lib/pipelines/verifierTestPipeline";

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
};

export enum PipelineType {
  HOLDER_TEST = "HOLDER_TEST",
  VERIFIER_TEST = "VERIFIER_TEST",
  TRUST_REGISTRY_TEST = "TRUST_REGISTRY_TEST"
}

const _state: State = {};

const setDAG = (dag: DAG) => {
  _state.dag = dag;
};

const setPipeline = (pipeline: Pipeline) => {
  _state.pipeline = pipeline;
};

export const setAgent = (agent: BaseAgent) => {
  _state.agent = agent;
};

export const setConfig = (config: AgentConfiguration) => {
  _state.config = config;
};

export { _state as state, setDAG, setPipeline };

export const selectPipeline = (type: PipelineType): Pipeline => {
  let pipe: Pipeline;
  console.log("selectPipeline", type);
  
  switch (type) {
    case PipelineType.HOLDER_TEST:
      if (!_state.agent) {
        throw new Error("agent not defined");
      }
      pipe = new HolderTestPipeline(_state.agent);
      break;
    case PipelineType.VERIFIER_TEST:
      if (!_state.agent) {
        throw new Error("agent not defined");
      }
      pipe = new VerifierTestPipeline(_state.agent);
      break;
    case PipelineType.TRUST_REGISTRY_TEST:
      // For now, use the verifier pipeline for trust registry tests
      if (!_state.agent) {
        throw new Error("agent not defined");
      }
      pipe = new VerifierTestPipeline(_state.agent);
      break;
    default:
      throw new Error(`could not find pipeline type ${type}`);
  }
  
  setPipeline(pipe);
  return pipe;
};
