import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.json({ message: 'Pipeline kickoff initiated' });

    // Run the pipeline asynchronously in the background
    console.log('Pipeline execution would start here');
    // TODO: Implement actual pipeline execution
  } catch (error) {
    console.error('Error initiating pipeline:', error);
    return res.status(500).json({ 
      message: 'Failed to initiate pipeline', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
