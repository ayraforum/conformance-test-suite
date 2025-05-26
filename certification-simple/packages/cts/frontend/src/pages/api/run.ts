import { NextApiRequest, NextApiResponse } from 'next';
import { run } from '@/lib/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.json({ message: 'Pipeline kickoff initiated' });

    // Run the pipeline asynchronously in the background
    (async () => {
      try {
        await run(); // Ensure that the run function is awaited to handle errors properly
        console.log('Pipeline execution completed');
      } catch (error) {
        console.error('Error during pipeline execution:', error);
      }
    })();
  } catch (error) {
    console.error('Error initiating pipeline:', error);
    return res.status(500).json({ 
      message: 'Failed to initiate pipeline', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 