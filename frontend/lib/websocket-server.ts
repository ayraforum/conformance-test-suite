import WebSocket from 'ws';
import Docker from 'dockerode';

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    const { containerId } = JSON.parse(message.toString());

    // Stream logs from the container
    const container = docker.getContainer(containerId);

    const logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
    });

    logStream.on('data', (chunk) => {
      ws.send(chunk.toString());
    });

    logStream.on('error', (err) => {
      ws.send(JSON.stringify({ error: err.message }));
    });

    logStream.on('end', () => {
      ws.send(JSON.stringify({ message: 'Test completed.' }));
      ws.close();
    });
  });
});

console.log('WebSocket server started on ws://localhost:8080');
