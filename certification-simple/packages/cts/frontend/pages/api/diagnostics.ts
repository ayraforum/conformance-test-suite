import { NextApiRequest, NextApiResponse } from 'next';
import { getNgrokUrl, getBaseUrl } from '../../src/services/agentService';

/**
 * Get the installed ngrok version
 */
function getNgrokVersion(): string {
  try {
    return 'unknown';
  } catch (e) {
    console.error('Error detecting ngrok version:', e);
    return 'detection failed';
  }
}

/**
 * Check active ngrok tunnels via API (if available)
 */
async function checkNgrokTunnels(): Promise<any> {
  try {
    const response = await fetch('http://localhost:4040/api/tunnels');
    const data = await response.json();
    return data;
  } catch (e) {
    return { tunnels: [], error: `Ngrok API not available: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * API handler for checking the status of the agent and ngrok connection
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get current versions
    const nodeVersion = process.version;
    const ngrokVersion = getNgrokVersion();
    
    // Get current connection status
    const ngrokUrl = await getNgrokUrl();
    const baseUrl = await getBaseUrl();
    
    // Check active tunnels
    const tunnelInfo = await checkNgrokTunnels();
    
    // Provide helpful diagnostics
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      versions: {
        node: nodeVersion,
        ngrok: ngrokVersion,
      },
      connections: {
        ngrokActive: !!ngrokUrl,
        ngrokUrl: ngrokUrl || null,
        baseUrl: baseUrl,
        usingLocalhost: !ngrokUrl && baseUrl.includes('localhost'),
      },
      ngrokSettings: {
        useNgrok: process.env.USE_NGROK === 'true',
        hasAuthToken: !!process.env.NGROK_AUTH_TOKEN && process.env.NGROK_AUTH_TOKEN !== 'your_ngrok_auth_token',
        ngrokPort: process.env.NGROK_PORT || 'not set',
      },
      tunnels: tunnelInfo
    };

    // Return diagnostics
    return res.status(200).json({
      status: ngrokUrl ? 'active' : 'local-only',
      message: ngrokUrl 
        ? 'Ngrok tunnel is active. Mobile wallet connections should work fine.' 
        : 'No ngrok tunnel detected. Connections will only work on devices on the same network.',
      diagnostics
    });
    
  } catch (error) {
    console.error('Error in diagnostics API:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Failed to get diagnostic information', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
