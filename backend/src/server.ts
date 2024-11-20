import Fastify from "fastify";
import {
  listContainers,
  startContainer,
  stopContainer,
  createAndRunContainer,
} from "./docker.service";

const fastify = Fastify();

// List all Docker containers
fastify.get("/containers", async (request, reply) => {
  const containers = await listContainers();
  return { containers };
});

// Start a Docker container by ID
fastify.post<{ Body: { id: string } }>("/containers/start", async (request, reply) => {
  const { id } = request.body;
  const result = await startContainer(id);
  return { result };
});

// Stop a Docker container by ID
fastify.post<{ Body: { id: string } }>("/containers/stop", async (request, reply) => {
  const { id } = request.body;
  const result = await stopContainer(id);
  return { result };
});

// Create and run a new container
fastify.post<{ Body: { image: string; name?: string } }>(
  "/containers/create",
  async (request, reply) => {
    const { image, name } = request.body;
    const result = await createAndRunContainer(image, name);
    return { result };
  }
);

// Start the server
const start = async () => {
  try {
    await fastify.listen({ port: 5000 });
    console.log("Backend running on http://localhost:5000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
