import { DAG } from "@demo/core/pipeline/src/dag";
import { AgentConfiguration } from "@demo/core/agent/core/BaseAgent";
import { BaseAgent } from "@demo/core/agent/core";
import {
  PostedWorkerPipeline,
  IssueCredentialPipeline,
  NYCGANMeetingPipeline,
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
  console.log("selectPipeline", type);
  console.log("IS NYC", type === PipelineType.NYC_GAN_MEETING);
  switch (type) {
    case PipelineType.POSTED_WORKER:
      if (!_state.agent) {
        throw new Error("agent not defined");
      }
      pipe = new PostedWorkerPipeline(_state.agent);
      break;
    case PipelineType.ISSUE_CREDENTIAL:
      if (!_state.agent) {
        throw new Error("agent not defined");
      }
      pipe = new IssueCredentialPipeline(_state.agent);
      break;
    case PipelineType.NYC_GAN_MEETING:
      console.log("NYC_GAN_MEETING");
      if (!_state.agent) {
        throw new Error("agent not defined");
      }
      pipe = new NYCGANMeetingPipeline(_state.agent);
      break;
    default:
      throw new Error(`could not find pipeline type ${type}`);
  }
  setPipeline(pipe);
  setDAG(pipe.dag());
  return pipe;
};
