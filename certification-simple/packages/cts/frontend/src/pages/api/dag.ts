import { NextApiRequest, NextApiResponse } from 'next';
import { state } from '@/lib/state';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.json({ dag: state?.dag?.serialize() });
  } catch (error) {
    console.error('Error fetching DAG state:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch DAG state', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 