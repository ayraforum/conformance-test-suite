import Docker from "dockerode";

const docker = new Docker(); // Uses default Docker socket or environment variables

export async function listContainers() {
  return docker.listContainers({ all: true });
}

export async function startContainer(containerId: string) {
  const container = docker.getContainer(containerId);
  await container.start();
  return container.inspect();
}

export async function stopContainer(containerId: string) {
  const container = docker.getContainer(containerId);
  await container.stop();
  return container.inspect();
}

export async function createAndRunContainer(image: string, name?: string) {
  const container = await docker.createContainer({
    Image: image,
    name,
    Tty: true,
  });
  await container.start();
  return container.inspect();
}
