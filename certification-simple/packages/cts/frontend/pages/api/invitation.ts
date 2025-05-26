import { NextApiRequest, NextApiResponse } from 'next';
import { createHolderInvitation, createVerifierInvitation } from '../../src/services/agentService';

/**
 * API handler for generating agent invitations
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    let type, label;
    
    if (req.method === 'POST') {
      ({ type, label } = req.body);
    } else {
      // For GET requests, default to verifier type for holder testing
      type = req.query.type || 'verifier';
      label = req.query.label;
    }

    if (!type || (type !== 'holder' && type !== 'verifier')) {
      return res.status(400).json({ 
        message: 'Invalid invitation type. Must be "holder" or "verifier"' 
      });
    }

    let invitation;
    if (type === 'holder') {
      invitation = await createHolderInvitation(label || 'CTS Holder Test');
    } else {
      invitation = await createVerifierInvitation(label || 'CTS Verifier Test');
    }

    return res.status(200).json(invitation);
  } catch (error) {
    console.error('Error generating invitation:', error);
    return res.status(500).json({ 
      message: 'Failed to generate invitation', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
