// pages/_app.tsx
import { useEffect } from 'react';
import BaseLayout from "@/layouts/BaseLayout";
import { AppProps } from 'next/app';
import dynamic from 'next/dynamic';

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

// Disable automatic static optimization to ensure client-side rendering
export default dynamic(() => Promise.resolve(MyApp), {
  ssr: false
});
