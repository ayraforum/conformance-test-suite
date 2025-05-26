import { DAG } from "@demo/core/pipeline/src/dag";
import { AgentConfiguration } from "@demo/core/agent/core/BaseAgent";
import { BaseAgent } from "@demo/core/agent/core";
import {
  HolderTestPipeline,
  VerifierTestPipeline,
  RegistryTestPipeline,
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
};

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
  var pipe: Pipeline;
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
