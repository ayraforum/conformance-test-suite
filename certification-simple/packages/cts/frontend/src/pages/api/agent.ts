import { NextApiRequest, NextApiResponse } from 'next';
import { BaseAgent } from '@demo/core/agent/core';
import { indyNetworkConfig } from '@demo/core/agent/core';

let agent: BaseAgent | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      if (!agent) {
        agent = new BaseAgent({
          name: 'GAN Verifier App',
          label: 'GAN Verifier App',
          port: 5005,
          mediatorURL: 'https://dev.gan.technology/mediator',
          endpoints: ['http://localhost:5005'],
          config: {
            label: 'GAN Verifier App',
            walletConfig: {
              id: 'gan-verifier-demo',
              key: 'gan-verifier-demo-key',
            },
            autoUpdateStorageOnStartup: true,
          },
        });

        await agent.init();
      }
      res.status(200).json({ status: 'initialized' });
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      res.status(500).json({ error: 'Failed to initialize agent' });
    }
  } else if (req.method === 'DELETE') {
    try {
      if (agent) {
        await agent.agent.shutdown();
        agent = null;
      }
      res.status(200).json({ status: 'shutdown' });
    } catch (error) {
      console.error('Failed to shutdown agent:', error);
      res.status(500).json({ error: 'Failed to shutdown agent' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 