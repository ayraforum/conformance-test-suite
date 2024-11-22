import Docker from "dockerode";
import { broadcastToRun } from "../../../lib/broadcast";


const docker = new Docker({ socketPath: "/var/run/docker.sock" });

export async function POST(request: Request): Promise<Response> {
  try {
    console.log('Starting test execution...');
    const { profile, systemName, endpointUrl } = await request.json();
    console.log('Received parameters:', { profile, systemName, endpointUrl });

    // Ensure the image exists (pull it if not available)
    const imageName = "767397733622.dkr.ecr.us-east-1.amazonaws.com/ganfoundation-verify-frontend:0.1.0";

    // Check if image exists locally
    const images = await docker.listImages();
    const imageExists = images.some(img => img.RepoTags && img.RepoTags.includes(imageName));

    if (!imageExists) {
      console.log(`Image ${imageName} not found locally, pulling from registry...`);
      const pullStream = await docker.pull(imageName);

      await new Promise((resolve, reject) => {
        docker.modem.followProgress(pullStream,
          (err) => {
            if (err) {
              console.error('Error pulling Docker image:', err);
              reject(err);
            } else {
              console.log('Docker image pulled successfully');
              resolve(null);
            }
          },
          // Add progress logging (optional)
          (event) => console.log('Pull progress:', event)
        );
      });

    } else {
      console.log(`Image ${imageName} found locally, skipping pull`);
    }

    console.log('Creating Docker container...');
    const container = await docker.createContainer({
      Image: imageName,
      Tty: true,
    });

    console.log(`Starting container with ID: ${container.id}`);
    await container.start();
    console.log('Container started successfully');

// Stream logs
    const logStream = await container.logs({ follow: true, stdout: true, stderr: true });

    logStream.on("data", (chunk) => {
      const logMessage = chunk.toString();
      broadcastToRun(runId, logMessage);
    });

    logStream.on("end", () => {
      broadcastToRun(runId, JSON.stringify({ type: "completed", message: "Test completed." }));
    });

    return new Response(JSON.stringify({ message: "Test started successfully.", containerId: container.id }), {
      status: 200,
    });
} catch (error) {
    console.error('Error in test execution:', error);
    console.error('Stack trace:', error.stack);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

}
