# Use Ubuntu 22.04 as the base image
FROM ubuntu:22.04

# Set environment variable to avoid interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Update package lists and install prerequisites, Maven, Docker, and Docker Compose
RUN apt-get update && apt-get install -y \
    curl \
    git \
    ca-certificates \
    build-essential \
    apt-transport-https \
    gnupg2 \
    lsb-release \
    docker.io \
    docker-compose \
    maven \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js LTS (v18) from NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally via npm
RUN npm install -g pnpm@9.15.3

# Set the working directory
WORKDIR /workspace

# Copy the entire current directory (including your setup script) into the container
COPY . /workspace

# Ensure your setup script is executable. Here we assume it's named conformance-test-suite.sh
RUN chmod +x setup.sh
ENTRYPOINT ["bash"]
