import { NextApiRequest, NextApiResponse } from 'next';
import { selectPipeline } from '@/lib/state';
import { PipelineType } from '@/lib/pipelines';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const pipelineName = req.query.pipeline as string;
    console.log('Selecting pipeline', pipelineName);
    selectPipeline(pipelineName as PipelineType);
    res.json({ message: 'Pipeline selected' });
  } catch (error) {
    console.error('Error selecting pipeline:', error);
    return res.status(500).json({ 
      message: 'Failed to select pipeline', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 