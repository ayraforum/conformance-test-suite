import { BaseAgent } from '@demo/core/agent/core';
import { createAgentConfig } from '@demo/core/agent/utils';
import { setAgent, setDag, setPipeline } from './state';
import { PipelineType } from './pipelines';

export async function run() {
  const agentConfig = createAgentConfig({
    name: 'GAN Verifier App',
    label: 'GAN Verifier App',
    port: 5005,
    config: {
      mediatorUrl: 'https://dev.gan.technology/mediator',
      mediatorInvitationUrl: 'https://dev.gan.technology/mediator/invitation',
      mediatorPollingInterval: 1000,
      mediatorTimeout: 30000,
      mediatorConnectionTimeout: 30000,
      mediatorConnectionRetries: 3,
      mediatorConnectionRetryDelay: 1000,
      mediatorConnectionRetryBackoff: 1.5,
      mediatorConnectionRetryMaxDelay: 10000,
      mediatorConnectionRetryMaxRetries: 10,
      mediatorConnectionRetryMaxBackoff: 10000,
      mediatorConnectionRetryMaxTimeout: 30000,
      mediatorConnectionRetryMaxInterval: 10000,
      mediatorConnectionRetryMaxJitter: 1000,
      mediatorConnectionRetryMaxJitterBackoff: 1.5,
      mediatorConnectionRetryMaxJitterMaxDelay: 10000,
      mediatorConnectionRetryMaxJitterMaxRetries: 10,
      mediatorConnectionRetryMaxJitterMaxBackoff: 10000,
      mediatorConnectionRetryMaxJitterMaxTimeout: 30000,
      mediatorConnectionRetryMaxJitterMaxInterval: 10000,
    },
  });

  const agent = new BaseAgent(agentConfig);
  await agent.initialize();
  setAgent(agent);

  const pipeline = await selectPipeline(PipelineType.POSTED_WORKER);
  setPipeline(pipeline);

  const dag = pipeline.dag();
  setDag(dag);

  return dag;
} 