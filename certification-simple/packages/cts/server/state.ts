import { DAG } from "@demo/core/pipeline/src/dag";
import { AgentConfiguration } from "@demo/core/agent/core/BaseAgent";
import { BaseAgent } from "@demo/core/agent/core";
import {
  PostedWorkerPipeline,
  IssueCredentialPipeline,
  NYCGANMeetingPipeline,
  HolderTestPipeline,
  VerifierTestPipeline,
  TRQPTesterPipeline
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
  trqpDID?: string;
  trqpEndpoint?: string;
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

export const setTRQPDID = (did: string) => {
  _state.trqpDID = did;
};

export const setTRQPEndpoint = (endpoint: string) => {
  _state.trqpEndpoint = endpoint;
};

export { _state as state, setDAG, setPipeline };

export const selectPipeline = (type: PipelineType): Pipeline => {
  var pipe: Pipeline;
  console.log("selectPipeline", type);
  
  if (!_state.agent) {
    throw new Error("agent not defined");
  }

  switch (type) {
    case PipelineType.POSTED_WORKER:
      pipe = new PostedWorkerPipeline(_state.agent);
      break;
    case PipelineType.ISSUE_CREDENTIAL:
      pipe = new IssueCredentialPipeline(_state.agent);
      break;
    case PipelineType.NYC_GAN_MEETING:
      console.log("NYC_GAN_MEETING");
      pipe = new NYCGANMeetingPipeline(_state.agent);
      break;
    case PipelineType.HOLDER_TEST:
      console.log("HOLDER_TEST");
      pipe = new HolderTestPipeline(_state.agent);
      break;
    case PipelineType.VERIFIER_TEST:
      console.log("VERIFIER_TEST");
      pipe = new VerifierTestPipeline(_state.agent);
      break;
    case PipelineType.TRQP_TEST:
      console.log("TRQP_TEST");
      pipe = new TRQPTesterPipeline(_state.agent, _state.trqpDID, _state.trqpEndpoint);
      break;
    default:
      throw new Error(`could not find pipeline type ${type}`);
  }
  setPipeline(pipe);
  setDAG(pipe.dag());
  return pipe;
};
