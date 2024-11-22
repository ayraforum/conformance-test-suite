'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export default function ConfigurePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [testStarted, setTestStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const startTest = async () => {
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/start-container', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_TOKEN',
        },
        body: JSON.stringify({
          profile: 'profile1',
          systemName: 'Test System',
          endpointUrl: 'http://localhost:3000',
          runId: 'test-run-123',
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const { containerId } = await response.json();

      const socketInstance = io('https://external-backend.example.com', {
        transports: ['websocket'],
        auth: { token: 'YOUR_API_TOKEN' },
      });

      socketInstance.on('connect', () => {
        console.log('Connected to WebSocket');
        socketInstance.emit('subscribeToRun', 'test-run-123');
      });

      socketInstance.on('log', (log) => {
        setLogs((prevLogs) => [...prevLogs, log]);
      });

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from WebSocket');
      });

      socketInstance.on('connect_error', (err) => {
        console.error('Connection error:', err);
      });

      setSocket(socketInstance);
      setTestStarted(true);
    } catch (error) {
      console.error('Error starting test:', error);
    } finally {
      setLoading(false);
    }
  };


  // Cleanup the socket connection when the component unmounts
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-4">Configure and Start Test</h1>
      {!testStarted ? (
        <button
          onClick={startTest}
          className={`p-4 bg-blue-500 text-white rounded ${loading && 'opacity-50 cursor-not-allowed'}`}
          disabled={loading}
        >
          {loading ? 'Starting...' : 'Start Test'}
        </button>
      ) : (
        <div className="w-full max-w-lg bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-bold mb-2">Test Logs</h2>
          <div className="h-64 overflow-y-auto bg-black text-white p-2 rounded">
            {logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
