import { useEffect } from 'react';
import { AppProps } from 'next/app';
import BaseLayout from "../src/layouts/BaseLayout";
import '../src/app/globals.css';

// Initialize agent through API
const initAgentClient = async () => {
  try {
    const response = await fetch('/api/agent', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to initialize agent');
    }
    console.log('Agent initialized successfully');
  } catch (err) {
    console.error('Failed to initialize agent:', err);
  }
};

// Cleanup agent through API
const cleanupAgent = async () => {
  try {
    const response = await fetch('/api/agent', {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to shutdown agent');
    }
    console.log('Agent shutdown successfully');
  } catch (err) {
    console.error('Failed to shutdown agent:', err);
  }
};

function MyApp({ Component, pageProps }: AppProps) {
  // Initialize the agent when the app starts (client-side only)
  useEffect(() => {
    initAgentClient();
    
    // Clean up agent when the app is closed
    return () => {
      cleanupAgent();
    };
  }, []);
  
  return (
    <BaseLayout>
      <Component {...pageProps} />
    </BaseLayout>
  );
}

export default MyApp;
