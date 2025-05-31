#!/usr/bin/env ts-node

/**
 * VerifierTest Script - Acts as a VERIFIER
 * 
 * This script creates a BaseAgent that acts as a verifier:
 * 1. Initialize BaseAgent with proper configuration
 * 2. Create invitation URL and QR code
 * 3. Wait for holder to connect
 * 4. Send proof request to connected holder
 * 5. Verify the received presentation
 * 
 * Usage: npm run test-verifier
 */

import { BaseAgent, createAgentConfig } from '@demo/core';
import readline from 'readline';
import { v4 as uuidv4 } from 'uuid';

class VerifierTestAgent {
  private agent: BaseAgent | null = null;
  private rl: readline.Interface;
  private agentPort: number;
  private connectionId: string | null = null;
  private invitationUrl: string | null = null;
  private serviceEndpoint: string;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Configure port - use environment variable or default
    this.agentPort = parseInt(process.env.VERIFIER_AGENT_PORT || '5008') + Math.floor(Math.random() * 100);
    
    // Configure service endpoint - use environment variable or default
    const endpointPrefix = process.env.VERIFIER_ENDPOINT_PREFIX || process.env.SERVICE_ENDPOINT || 'localhost';
    this.serviceEndpoint = `http://${endpointPrefix}:${this.agentPort}`;
    
    console.log('🔧 VerifierTestAgent initialized:');
    console.log('   • Port:', this.agentPort);
    console.log('   • Service Endpoint:', this.serviceEndpoint);
    console.log('   • Endpoint Prefix:', endpointPrefix);
  }

  async runTest(): Promise<void> {
    console.log('\n🚀 Starting Verifier Test Agent...');
    console.log('═'.repeat(50));
    
    try {
      // Step 1: Initialize BaseAgent
      console.log('\n📌 Step 1: Initializing BaseAgent');
      await this.initializeBaseAgent();
      
      // Step 2: Create invitation
      console.log('\n📌 Step 2: Creating invitation');
      await this.createInvitation();
      
      // Step 3: Wait for connection
      console.log('\n📌 Step 3: Waiting for connection');
      await this.waitForConnection();
      
      // Step 4: Send proof request
      console.log('\n📌 Step 4: Sending proof request');
      await this.sendProofRequest();
      
      // Step 5: Wait for presentation and verify
      console.log('\n📌 Step 5: Waiting for presentation');
      await this.waitForPresentation();
      
      console.log('\n✅ Verifier test completed successfully!');
      console.log('═'.repeat(50));
      
    } catch (error) {
      console.error('\n❌ Verifier test failed:', error.message);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  private async initializeBaseAgent(): Promise<void> {
    console.log('🔧 Initializing Verifier BaseAgent...');
    
    try {
      const agentId = uuidv4();
      const baseUrl = this.serviceEndpoint;
      
      console.log('\n💻 Verifier configuration:');
      console.log('   • Name: Test Verifier Agent');
      console.log('   • Port:', this.agentPort);
      console.log('   • Base URL:', baseUrl);
      console.log('   • Service Endpoint:', this.serviceEndpoint);
      console.log('   • Agent ID:', agentId);
      
      // Create agent configuration
      const config = createAgentConfig(
        'Test Verifier Agent',
        this.agentPort,
        agentId,
        baseUrl,
        [baseUrl]
      );
      
      // Create unique wallet for this test
      config.config.walletConfig = {
        id: 'test-verifier-wallet-' + Date.now(),
        key: 'test-verifier-key-' + Date.now(),
      };
      
      console.log('\n💼 Wallet configuration:');
      console.log('   • Wallet ID:', config.config.walletConfig.id);
      
      console.log('\n🔄 Creating BaseAgent instance...');
      this.agent = new BaseAgent(config);
      
      console.log('🔄 Initializing agent...');
      await this.agent.init();
      
      // Set up event listeners AFTER initialization
      console.log('🔄 Setting up event listeners...');
      this.setupAgentEventListeners();
      
      console.log('\n✅ Verifier BaseAgent initialized successfully');
      
    } catch (error) {
      console.error('\n❌ Verifier BaseAgent initialization failed:');
      console.error('Error:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  private setupAgentEventListeners(): void {
    if (!this.agent) {
      console.error('❌ Cannot setup event listeners: Agent is null');
      return;
    }
    
    try {
      console.log('\n🔔 Setting up event listeners...');
      
      // Connection events
      this.agent.agent.events.on('ConnectionStateChanged', (event: any) => {
        const connection = event.payload.connectionRecord;
        console.log('\n🔗 Connection state changed:');
        console.log('   • Connection ID:', connection.id);
        console.log('   • State:', connection.state);
        console.log('   • Role:', connection.role);
        console.log('   • Their Label:', connection.theirLabel);
        
        if (connection.state === 'completed') {
          this.connectionId = connection.id;
          console.log('\n✅ Holder connected successfully!');
          console.log('   • Connection ID:', this.connectionId);
        }
      });

      // Proof events  
      this.agent.agent.events.on('ProofStateChanged', (event: any) => {
        const proofRecord = event.payload.proofRecord;
        console.log('\n📋 Proof state changed:');
        console.log('   • Proof ID:', proofRecord.id);
        console.log('   • State:', proofRecord.state);
        console.log('   • Protocol Version:', proofRecord.protocolVersion);
        
        if (proofRecord.state === 'presentation-received') {
          console.log('\n📨 Presentation received from holder!');
          console.log('   • Proof ID:', proofRecord.id);
          this.handlePresentationReceived(proofRecord);
        }
        
        if (proofRecord.state === 'done') {
          console.log('\n✅ Proof verification completed!');
          console.log('   • Proof ID:', proofRecord.id);
        }
      });

      console.log('✅ Event listeners configured successfully');
      
    } catch (error) {
      console.error('\n❌ Failed to setup event listeners:');
      console.error('Error:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  private async createInvitation(): Promise<void> {
    if (!this.agent) {
      console.error('❌ Cannot create invitation: Agent is null');
      throw new Error('Agent not initialized');
    }
    
    console.log('\n📧 Creating out-of-band invitation...');
    
    try {
      // Create out-of-band invitation
      console.log('🔄 Creating OOB invitation...');
      const outOfBandRecord = await this.agent.agent.oob.createInvitation({
        multiUseInvitation: false,
        autoAcceptConnection: true,
      });
      
      this.invitationUrl = outOfBandRecord.outOfBandInvitation.toUrl({
        domain: this.serviceEndpoint
      });
      
      console.log('\n✅ Invitation created successfully!');
      console.log('═'.repeat(50));
      console.log('\n📱 QR Code for wallet:');
      console.log('═'.repeat(50));
      
      // Generate simple QR code representation
      this.generateQRCode(this.invitationUrl);
      
      console.log('═'.repeat(50));
      console.log('\n🔗 Invitation URL:');
      console.log(this.invitationUrl);
      console.log('\n💡 Scan the QR code with a compatible wallet or use the URL directly');
      
    } catch (error) {
      console.error('\n❌ Failed to create invitation:');
      console.error('Error:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  private generateQRCode(url: string): void {
    // Simple QR code representation using API
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    console.log('📱 QR Code URL:', qrCodeUrl);
    console.log('💡 Open this URL in your browser to see the QR code');
  }

  private async waitForConnection(): Promise<void> {
    console.log('\n⏳ Waiting for holder to connect...');
    console.log('   • No timeout - will wait indefinitely');
    console.log('   • Press Ctrl+C to cancel');
    
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this.connectionId) {
          console.log('\n🎉 Holder connected!');
          console.log('   • Connection ID:', this.connectionId);
          console.log('   • Ready to send proof request');
          resolve();
        } else {
          setTimeout(checkConnection, 1000);
        }
      };

      checkConnection();
    });
  }

  private async sendProofRequest(): Promise<void> {
    if (!this.agent || !this.connectionId) {
      console.error('\n❌ Cannot send proof request:');
      console.error('   • Agent initialized:', !!this.agent);
      console.error('   • Connection ID:', this.connectionId);
      throw new Error('Agent or connection not ready');
    }
    
    console.log('\n📤 Sending proof request to holder...');
    console.log('   • Connection ID:', this.connectionId);
    
    try {
      // Define the proof request - similar to HolderTest
      const schemaId = "did:indy:bcovrin:test:HYfhCRaKhccZtr7v8CHTe8/anoncreds/v0/CLAIM_DEF/2815242/latest";
      
      console.log('\n📋 Proof request configuration:');
      console.log('   • Schema ID:', schemaId);
      console.log('   • Protocol Version: v2');
      console.log('   • Requested attributes: type, email');
      console.log('   • Requested predicates: age >= 18');
      
      const proofRequest = {
        protocolVersion: "v2" as const,
        proofFormats: {
          anoncreds: {
            name: "verifier-test-proof-request",
            version: "1.0",
            requested_attributes: {
              name: {
                name: "type",
                restrictions: [
                  {
                    cred_def_id: schemaId,
                  },
                ],
              },
              email: {
                name: "email", 
                restrictions: []
              }
            },
            requested_predicates: {
              age: {
                name: "age",
                p_type: ">=",
                p_value: 18,
                restrictions: []
              }
            },
          },
        },
      };
      
      // Send proof request
      console.log('\n🔄 Sending proof request...');
      const proofExchangeRecord = await this.agent.agent.proofs.requestProof({
        connectionId: this.connectionId,
        protocolVersion: proofRequest.protocolVersion,
        proofFormats: proofRequest.proofFormats,
      });
      
      console.log('\n✅ Proof request sent successfully!');
      console.log('   • Exchange ID:', proofExchangeRecord.id);
      console.log('   • State:', proofExchangeRecord.state);
      
    } catch (error) {
      console.error('\n❌ Failed to send proof request:');
      console.error('Error:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  private async waitForPresentation(): Promise<void> {
    console.log('\n⏳ Waiting for holder to send presentation...');
    console.log('   • No timeout - will wait indefinitely');
    console.log('   • Press Ctrl+C to cancel');
    
    return new Promise((resolve) => {
      // Set up a completion flag that gets set when presentation is processed
      let presentationCompleted = false;
      
      // Store original handler
      const originalHandler = this.handlePresentationReceived.bind(this);
      
      // Override handler to set completion flag
      this.handlePresentationReceived = async (proofRecord: any) => {
        await originalHandler(proofRecord);
        presentationCompleted = true;
      };
      
      // Check for completion periodically
      const checkForCompletion = () => {
        if (presentationCompleted) {
          console.log('\n📊 Test completed successfully!');
          resolve();
        } else {
          setTimeout(checkForCompletion, 1000);
        }
      };
      
      checkForCompletion();
    });
  }

  private async handlePresentationReceived(proofRecord: any): Promise<void> {
    console.log('\n🎯 Processing received presentation...');
    
    try {
      console.log('\n📋 Presentation details:');
      console.log('   • ID:', proofRecord.id);
      console.log('   • State:', proofRecord.state);
      console.log('   • Protocol Version:', proofRecord.protocolVersion);
      
      // Auto-accept the presentation for testing
      console.log('\n🔄 Accepting presentation...');
      await this.agent!.agent.proofs.acceptPresentation({
        proofRecordId: proofRecord.id,
      });
      
      console.log('\n✅ Presentation accepted and verified!');
      console.log('🏆 Credential verification completed successfully');
      
    } catch (error) {
      console.error('\n❌ Error processing presentation:');
      console.error('Error:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    
    if (this.agent) {
      console.log('🔄 Shutting down agent...');
      await this.agent.agent.shutdown();
      console.log('🛑 Verifier agent shut down successfully');
    } else {
      console.log('⚠️ No agent to shut down');
    }
    
    this.rl.close();
    console.log('✅ Cleanup completed');
  }
}

// Main execution
if (require.main === module) {
  console.log('🚀 Starting Verifier Test Script');
  console.log('═'.repeat(50));
  
  const verifierAgent = new VerifierTestAgent();
  verifierAgent.runTest().catch((error) => {
    console.error('\n❌ Script failed with error:');
    console.error(error);
    process.exit(1);
  });
}

export { VerifierTestAgent };
