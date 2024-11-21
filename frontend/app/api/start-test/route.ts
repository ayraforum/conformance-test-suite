import { PrismaClient } from '@prisma/client';
import Docker from 'dockerode';

const prisma = new PrismaClient();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export async function POST(request: Request): Promise<Response> {
  try {
    const { profile, systemName, endpointUrl } = await request.json();

    // Start Docker container
    const container = await docker.createContainer({
      Image: 'test-runner-image', // Replace with your Docker image
      Cmd: ['run-test', profile, systemName, endpointUrl], // Adjust command
      Tty: false,
    });

    await container.start();

    // Stream logs from the container
    const logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
    });

    // Prepare a response to let the frontend know the container started
    return new Response(
      JSON.stringify({ message: 'Test started successfully.', containerId: container.id }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error starting test:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
