/**
 * Alternative implementation that doesn't use ngrok and only works with local connections.
 * This is used as a fallback when ngrok is not working properly.
 * 
 * @returns A local URL for testing
 */
export const initializeLocalMode = async (): Promise<string> => {
  console.log('\n========== LOCAL MODE ACTIVATED ==========');
  console.log('WARNING: ngrok is not working properly.');
  console.log('Falling back to local mode - connections will only work on the same network.');
  console.log('This means mobile wallets MUST be on the same WiFi network as this server.');
  console.log('For testing, you can still use the simulation options.');
  console.log('============================================\n');
  
  // Reset the ngrok URL to ensure we don't use it
  console.log('Clearing ngrok URL in local mode');
  ngrokUrl = null;
  baseUrl = DEFAULT_BASE_URL;
  
  // Since we're using a singleton pattern, if we go to local mode
  // we need to keep track of that to prevent reinitialization
  globalInitPromise = Promise.resolve(formatDomain(DEFAULT_BASE_URL));
  
  return formatDomain(DEFAULT_BASE_URL);
};

/**
 * Creates an .env.local file with ngrok disabled
 * This is a helper function for users who encounter persistent ngrok issues
 */
async function createLocalOnlyConfig(): Promise<void> {
  if (typeof window !== 'undefined') return;
  
  try {
    // Only do this on server side
    console.log('Creating local-only configuration...');
    
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env.local');
    
    // Check if .env.local exists
    let content = '';
    try {
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
        
        // Replace USE_NGROK=true with USE_NGROK=false
        content = content.replace(/USE_NGROK\s*=\s*true/g, 'USE_NGROK=false');
        
        // If USE_NGROK is not in file, add it
        if (!content.includes('USE_NGROK=')) {
          content += '\nUSE_NGROK=false # Disabled due to persistent ngrok issues\n';
        }
      } else {
        // Create minimal .env.local file
        content = 'USE_NGROK=false # Disabled due to persistent ngrok issues\n';
      }
      
      // Save the modified content
      fs.writeFileSync(envPath, content, 'utf8');
      console.log('Updated .env.local to disable ngrok');
    } catch (err) {
      console.error('Error modifying .env.local:', err);
    }
  } catch (error) {
    console.error('Error creating local-only config:', error);
  }
}

// Dynamic import function for ngrok that only runs on server-side
async function importNgrok() {
  if (typeof window !== 'undefined') {
    throw new Error('ngrok can only be imported on the server side');
  }
  
  try {
    // Use dynamic import with a variable to prevent bundling
    const moduleName = '@ngrok/ngrok';
    return await import(/* webpackIgnore: true */ moduleName);
  } catch (error) {
    console.error('Error importing ngrok:', error);
    throw error;
  }
}

/**
 * Forces a disconnect of all ngrok sessions on the dashboard
 */
async function forceNgrokReset(): Promise<void> {
  try {
    if (typeof window !== 'undefined') return;
    
    console.log('Attempting to force reset all ngrok sessions...');
    
    if (!NGROK_AUTH_TOKEN) {
      console.log('No auth token available for ngrok reset');
      return;
    }
    
    try {
      const ngrok = await importNgrok();
      
      // Kill any existing ngrok processes
      try {
        await ngrok.disconnect();
        console.log('Successfully disconnected all active ngrok tunnels');
      } catch (error) {
        console.log('No active tunnels to disconnect or error disconnecting');
      }
      
      // Add a delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Ngrok sessions should now be cleared');
    } catch (importError) {
      console.log('Could not import ngrok module', importError);
    }
  } catch (error) {
    console.error('Error during ngrok reset:', error);
  }
}

/**
 * Service for managing the agent and ngrok connections.
 * This service is based on the patterns used in the GAN verify-app.
 */
import { EventEmitter } from 'events';
import { formatDomain } from './urlUtils';
import { BaseAgent } from "@/lib/agent/baseAgent";
import { createAgentConfig } from "@/models/AgentConfig";
import {
    Agent,
    OutOfBandRecord,
    DidExchangeState,
    ConnectionRecord,
    ConnectionStateChangedEvent,
    ConnectionEventTypes,
} from "@credo-ts/core";
import { v4 as uuidv4 } from "uuid";

// Create an event emitter for agent events
export const agentEventEmitter = new EventEmitter();

// Configuration
const AGENT_PORT = Number(process.env.AGENT_PORT) || 3000;
const USE_NGROK = process.env.USE_NGROK === 'true';
const NGROK_AUTH_TOKEN = process.env.NGROK_AUTH_TOKEN;
// CRITICAL: Always default to port 3000 if not specified
const NGROK_PORT = Number(process.env.NGROK_PORT) || 3000;
const DEFAULT_BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Agent state
let ngrokUrl: string | null = null;
let baseUrl: string = DEFAULT_BASE_URL;
let currentInvitation: string | null = null;
let currentQrCode: string | null = null;
let agent: BaseAgent | null = null;

// Initialize once (singleton pattern)
let globalInitPromise: Promise<string> | null = null;

// Add connection state tracking
let isInitializing = false;
let isConnected = false;
let connectionPromise: Promise<string> | null = null;
let ngrokInstance: any = null;

/**
 * Initializes the agent with optional ngrok tunneling.
 * @returns The base URL for the agent
 */
export const initializeAgent = async (): Promise<string> => {
  // If already connected, return the existing URL
  if (isConnected && ngrokUrl) {
    console.log('Using existing ngrok connection:', ngrokUrl);
    return formatDomain(ngrokUrl);
  }

  // If already initializing, return the existing promise
  if (isInitializing && connectionPromise) {
    console.log('Connection already in progress, waiting for result...');
    return connectionPromise;
  }

  // Start new initialization
  isInitializing = true;
  console.log('Starting new ngrok connection...');
  
  connectionPromise = _initializeAgentImpl()
    .then(url => {
      isConnected = true;
      isInitializing = false;
      return url;
    })
    .catch(error => {
      isInitializing = false;
      isConnected = false;
      ngrokInstance = null;
      throw error;
    });

  return connectionPromise;
};

/**
 * Implementation of agent initialization
 */
async function _initializeAgentImpl(): Promise<string> {
  try {
    if (USE_NGROK && typeof window === 'undefined') {
      if (!NGROK_AUTH_TOKEN || NGROK_AUTH_TOKEN === 'your_ngrok_auth_token') {
        console.warn('NGROK_AUTH_TOKEN not defined or is set to the placeholder value');
        return initializeLocalMode();
      }

      // First, attempt to reset any existing ngrok sessions
      await forceNgrokReset();

      try {
        console.log("Connecting to ngrok...");
        
        // Import ngrok module
        const ngrok = await importNgrok();
        ngrokInstance = ngrok;
        
        if (!ngrok || typeof ngrok.forward !== 'function') {
          throw new Error('@ngrok/ngrok module is not properly initialized');
        }
        
        // Check if we already have an active connection
        if (ngrokUrl) {
          console.log(`Reusing existing ngrok tunnel: ${ngrokUrl}`);
          return formatDomain(ngrokUrl);
        }
        
        console.log('\n========== NGROK CONNECTION INFO ==========');
        console.log(`AGENT_PORT: ${AGENT_PORT}`);
        console.log(`NGROK_PORT: ${NGROK_PORT}`);
        console.log(`Target address: http://localhost:${NGROK_PORT}`);
        console.log('============================================\n');
        
        try {
          console.log(`Attempting to create ngrok tunnel for port ${NGROK_PORT}...`);
          const listener = await ngrok.forward({
            addr: NGROK_PORT,
            authtoken: NGROK_AUTH_TOKEN,
            onStatusChange: (status: string) => {
              console.log(`Ngrok status changed: ${status}`);
              if (status === 'connected') {
                isConnected = true;
              }
            },
          });
          
          ngrokUrl = listener.url();
          console.log(`Ngrok tunnel established at ${ngrokUrl}`);
          baseUrl = ngrokUrl || DEFAULT_BASE_URL;
          
          agentEventEmitter.emit('ngrok:connected', ngrokUrl);
          
          return formatDomain(ngrokUrl || DEFAULT_BASE_URL);
        } catch (connectError) {
          const errorMessage = String(connectError);
          if (errorMessage.includes('limited to 1 simultaneous') || 
              errorMessage.includes('ERR_NGROK_108')) {
            console.warn('\n============================================');
            console.warn('NGROK FREE TIER LIMITATION DETECTED');
            console.warn('Please check your ngrok dashboard at:');
            console.warn('https://dashboard.ngrok.com/tunnels/agents');
            console.warn('============================================\n');
          }
          throw connectError;
        }
      } catch (error) {
        console.error('Error connecting to ngrok:', error);
        return initializeLocalMode();
      }
    } else {
      console.log(`Using default base URL: ${DEFAULT_BASE_URL}`);
      return formatDomain(DEFAULT_BASE_URL);
    }
  } catch (error) {
    console.error('Error initializing agent:', error);
    return formatDomain(DEFAULT_BASE_URL);
  }
};

/**
 * Sets up a connection listener that fires the callback when the connection
 * corresponding to the out-of-band record is completed.
 */
export const setupConnectionListener = async (
    agent: Agent,
    outOfBandRecord: OutOfBandRecord,
    cb: (...args: any) => void,
): Promise<void> => {
    agent.events.on<ConnectionStateChangedEvent>(
        ConnectionEventTypes.ConnectionStateChanged,
        ({ payload }) => {
            console.log("Connection state changed:", payload.connectionRecord);
            if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id)
                return;
            if (payload.connectionRecord.state === DidExchangeState.Completed) {
                console.log(
                    `Connection for out-of-band id ${outOfBandRecord.id} completed`,
                );
                console.log("Connection record:", payload.connectionRecord);
                cb();
            }
        },
    );
};

/**
 * Retrieves the connection record associated with the specified out-of-band ID.
 */
export const getConnectionRecord = (
    agent: Agent,
    outOfBandId: string,
): Promise<ConnectionRecord> =>
    new Promise<ConnectionRecord>((resolve, reject) => {
        console.log(
            "Getting connection record for out-of-band id:",
            outOfBandId,
        );
        const timeoutId = setTimeout(
            () => reject(new Error("Missing connection record")),
            50000,
        );

        agent.events.on<ConnectionStateChangedEvent>(
            ConnectionEventTypes.ConnectionStateChanged,
            (e) => {
                console.log("Received connection event");
                if (e.payload.connectionRecord.outOfBandId !== outOfBandId)
                    return;

                clearTimeout(timeoutId);
                resolve(e.payload.connectionRecord);
            },
        );

        void agent.connections
            .findAllByOutOfBandId(outOfBandId)
            .then(([connectionRecord]) => {
                if (connectionRecord) {
                    clearTimeout(timeoutId);
                    resolve(connectionRecord);
                }
            });
    });

/**
 * Creates a mock invitation URL for demonstration purposes.
 * This is useful when ngrok is not available but you need to show the flow.
 * 
 * Note: This invitation will not work with real wallet apps as the service
 * endpoint is not publicly accessible. Use only for demo or development.
 * 
 * @param label Label for the invitation
 * @param goalCode Goal code for the invitation
 * @returns A mock invitation URL
 */
export const createMockInvitation = (label: string, goalCode: string = 'aries.vc.verify'): {
  id: string;
  invitationUrl: string;
  outOfBandInvitation: any;
} => {
  // Generate a unique ID for this invitation
  const id = `mock-invitation-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  const domainUrl = formatDomain(DEFAULT_BASE_URL);
  
  // Create the invitation data structure
  const invitationData = {
    '@id': id,
    '@type': 'https://didcomm.org/out-of-band/1.1/invitation',
    label: `${label} (MOCK)`,
    goal_code: goalCode,
    accept: ['didcomm/aip1', 'didcomm/aip2;env=rfc19'],
    handshake_protocols: ['https://didcomm.org/didexchange/1.0'],
    services: [{
      id: `#inline-${id}`,
      type: 'did-communication',
      recipientKeys: [`did:key:${id}`],
      serviceEndpoint: domainUrl // Local URL, not reachable from mobile devices
    }]
  };
  
  // Encode the invitation as a base64 string
  const invitationBase64 = Buffer.from(JSON.stringify(invitationData)).toString('base64');
  
  // Format the invitation URL
  const invitationUrl = `${domainUrl}/invitation?oob=${invitationBase64}`;
  
  console.log(`Created MOCK invitation with URL: ${invitationUrl}`);
  console.log('WARNING: This mock invitation will not work with real wallets');
  
  const outOfBandInvitation = {
    id,
    type: 'https://didcomm.org/out-of-band/1.1/invitation',
    from: `did:key:${id}`,
    body: {
      goal_code: goalCode,
      label: `${label} (MOCK)`,
    },
    services: invitationData.services,
    outOfBandInvitation: {
      toUrl: (options: { domain?: string }) => {
        return `${formatDomain(options.domain || domainUrl)}/invitation?oob=${invitationBase64}`;
      }
    }
  };
  
  return {
    id,
    invitationUrl,
    outOfBandInvitation
  };
};

/**
 * Creates an Out-of-Band invitation using the agent.
 * Following the pattern from SetupConnectionTask in the GAN verify-app.
 * 
 * @param label Label for the invitation
 * @param goalCode Optional goal code for the invitation (default: 'aries.vc.verify')
 * @returns The invitation object and URL
 */
export const createOutOfBandInvitation = async (
  label: string, 
  goalCode: string = 'aries.vc.verify'
): Promise<{
  id: string;
  invitationUrl: string;
  outOfBandInvitation: any;
}> => {
  try {
    // Ensure we have a base URL - force refresh it to get the latest ngrok URL if available
    baseUrl = await initializeAgent();
    
    // If ngrok is not working, and we're in development mode, use a mock invitation
    if (!ngrokUrl && process.env.NODE_ENV === 'development') {
      console.warn('No ngrok URL available. Creating a mock invitation that will work for UI display but not for actual wallet connections.');
      return createMockInvitation(label, goalCode);
    }
    
    // Generate a unique ID for this invitation
    const id = `invitation-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // CRITICAL: For the serviceEndpoint, we must use the ngrok URL if available
    // This is what the mobile wallet will connect to
    const serviceEndpoint = ngrokUrl ? formatDomain(ngrokUrl) : formatDomain(baseUrl);
    console.log(`Using service endpoint for invitation: ${serviceEndpoint}`);
    
    // Create the invitation data structure with the correct service endpoint
    const invitationData = {
      '@id': id,
      '@type': 'https://didcomm.org/out-of-band/1.1/invitation',
      label: label,
      goal_code: goalCode,
      accept: ['didcomm/aip1', 'didcomm/aip2;env=rfc19'],
      handshake_protocols: ['https://didcomm.org/didexchange/1.0'],
      services: [{
        id: `#inline-${id}`,
        type: 'did-communication',
        recipientKeys: [`did:key:${id}`],
        serviceEndpoint: serviceEndpoint // This must be the public ngrok URL
      }]
    };
    
    // Encode the invitation as a base64 string
    const invitationBase64 = Buffer.from(JSON.stringify(invitationData)).toString('base64');
    
    // Format as per Aries OOB invitation spec
    // Use ngrok URL if available, otherwise use base URL
    const urlBase = ngrokUrl ? formatDomain(ngrokUrl) : formatDomain(baseUrl);
    const invitationUrl = `${urlBase}/invitation?oob=${invitationBase64}`;
    
    // For debugging:
    console.log('\n========== INVITATION DETAILS ==========');
    console.log(`- Base URL: ${baseUrl}`);
    console.log(`- Ngrok URL: ${ngrokUrl || 'Not available'}`);
    console.log(`- Service Endpoint: ${serviceEndpoint}`);
    console.log(`- Invitation URL: ${invitationUrl}`);
  console.log('======================================\n');
    
    // Create a mock object that mimics the structure from the agent framework
    // and store the actual invitationData for reference
    const outOfBandInvitation = {
      id,
      type: 'https://didcomm.org/out-of-band/1.1/invitation',
      from: `did:key:${id}`,
      body: {
        goal_code: goalCode,
        label: label,
      },
      services: invitationData.services, // Store services for reference
      outOfBandInvitation: {
        toUrl: (options: { domain?: string }) => {
          // Prioritize: 1. Provided domain, 2. ngrok URL, 3. base URL
          const domain = options.domain || ngrokUrl || baseUrl;
          return `${formatDomain(domain)}/invitation?oob=${invitationBase64}`;
        }
      }
    };
    
    // Store the current invitation for retrieval via API
    currentInvitation = invitationUrl;
    
    // Emit the invitation event for listeners
    agentEventEmitter.emit('invitation', { 
      invitation: outOfBandInvitation,
      url: invitationUrl
    });
    
    console.log(`Created invitation with domain: ${urlBase}`);
    console.log(`Invitation URL: ${invitationUrl}`);
    
    return { 
      id, 
      invitationUrl, 
      outOfBandInvitation 
    };
  } catch (error) {
    console.error('Error creating invitation:', error);
    throw error;
  }
};

/**
 * Creates an OOB invitation specifically for a Holder app to request a presentation
 * @param label The label to display in the invitation
 * @returns The invitation details
 */
export const createHolderInvitation = async (label: string = 'Ayra Holder Test') => {
  return createOutOfBandInvitation(label, 'aries.vc.holder.request');
};

/**
 * Creates an OOB invitation specifically for a Verifier app to request a presentation
 * @param label The label to display in the invitation
 * @returns The invitation details
 */
export const createVerifierInvitation = async (label: string = 'Ayra Verifier Test') => {
  return createOutOfBandInvitation(label, 'aries.vc.verifier.request');
};

/**
 * Gets the current URL of the ngrok tunnel
 */
export const getNgrokUrl = (): string | null => {
  return ngrokUrl;
};

/**
 * Gets the current base URL (ngrok or default)
 */
export const getBaseUrl = (): string => {
  return ngrokUrl || baseUrl;
};

/**
 * Gets the current invitation URL
 */
export const getCurrentInvitation = (): string | null => {
  return currentInvitation;
};

/**
 * Gets the current QR code data
 */
export const getCurrentQrCode = (): string | null => {
  return currentQrCode;
};

/**
 * Sets the current QR code data
 */
export const setCurrentQrCode = (qrCode: string): void => {
  currentQrCode = qrCode;
};

/**
 * Disconnects the ngrok tunnel if it's active
 */
export const shutdownAgent = async (): Promise<void> => {
  if (ngrokInstance && typeof window === 'undefined') {
    try {
      console.log('Disconnecting all ngrok tunnels...');
      
      try {
        await ngrokInstance.disconnect();
        console.log('Disconnected all ngrok tunnels');
      } catch (disconnectError) {
        console.error('Error disconnecting tunnels:', disconnectError);
      }
      
      ngrokUrl = null;
      ngrokInstance = null;
      isConnected = false;
      console.log('Ngrok cleanup completed');
    } catch (error) {
      console.error('Error cleaning up ngrok:', error);
    }
  }
};

// Initialize the agent when this module is imported on the server side
if (typeof window === 'undefined') {
  console.log('Server-side: Initializing agent singleton...');
  
  // Simply call initializeAgent() once to set up the singleton promise
  // This won't create multiple instances due to our singleton implementation
  initializeAgent().then(url => {
    console.log(`Agent initialized with base URL: ${url}`);
    console.log(`Ngrok status: ${ngrokUrl ? 'Connected' : 'Not connected'}`);
  }).catch(error => {
    console.error('Error initializing agent:', error);
  });
} else {
  // For client-side, try to fetch the current ngrok status
  console.log('Client-side: Checking ngrok status...');
  fetch('/api/diagnostics')
    .then(response => response.json())
    .then(data => {
      if (data?.diagnostics?.connections?.ngrokActive && data?.diagnostics?.connections?.ngrokUrl) {
        console.log(`Client: Setting ngrok URL from diagnostics: ${data.diagnostics.connections.ngrokUrl}`);
        ngrokUrl = data.diagnostics.connections.ngrokUrl;
        baseUrl = data.diagnostics.connections.baseUrl;
      }
    })
    .catch(error => {
      console.error('Error fetching diagnostics:', error);
    });
}
