import { DAG } from '@demo/core/pipeline/src/dag';
import { BaseAgent } from '@demo/core/agent/core';
import { PipelineType } from './pipelines';
import PostedWorkerPipeline from './pipelines/postedWorkerPipeline';
import IssueCredentialPipeline from './pipelines/issueCredentialPipeline';
import NYCGANMeetingPipeline from './pipelines/authMeetingPipeline';

export type Pipeline = PostedWorkerPipeline | IssueCredentialPipeline | NYCGANMeetingPipeline;

export type State = {
  dag: DAG | null;
  config: any;
  pipeline: Pipeline | null;
  agent: BaseAgent | null;
};

let state: State = {
  dag: null,
  config: null,
  pipeline: null,
  agent: null,
};

export function setDAG(dag: DAG) {
  state.dag = dag;
}

export function setPipeline(pipeline: Pipeline) {
  state.pipeline = pipeline;
}

export function setAgent(agent: BaseAgent) {
  state.agent = agent;
}

export function setConfig(config: any) {
  state.config = config;
}

export function getDAG(): DAG | null {
  return state.dag;
}

export function getPipeline(): Pipeline | null {
  return state.pipeline;
}

export function getAgent(): BaseAgent | null {
  return state.agent;
}

export function getConfig(): any {
  return state.config;
}

export async function selectPipeline(pipelineType: PipelineType): Promise<Pipeline> {
  const agent = getAgent();
  if (!agent) {
    throw new Error('Agent not initialized');
  }

  let pipeline: Pipeline;
  switch (pipelineType) {
    case PipelineType.POSTED_WORKER:
      pipeline = new PostedWorkerPipeline(agent);
      break;
    case PipelineType.ISSUE_CREDENTIAL:
      pipeline = new IssueCredentialPipeline(agent);
      break;
    case PipelineType.NYC_GAN_MEETING:
      pipeline = new NYCGANMeetingPipeline(agent);
      break;
    default:
      throw new Error(`Unknown pipeline type: ${pipelineType}`);
  }

  await pipeline.init();
  return pipeline;
} 