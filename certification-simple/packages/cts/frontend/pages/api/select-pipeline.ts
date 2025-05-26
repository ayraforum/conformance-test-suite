import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const pipelineName = req.query.pipeline as string;
    console.log('Selecting pipeline', pipelineName);
    // TODO: Implement actual pipeline selection
    res.json({ message: 'Pipeline selected', pipeline: pipelineName });
  } catch (error) {
    console.error('Error selecting pipeline:', error);
    return res.status(500).json({ 
      message: 'Failed to select pipeline', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
