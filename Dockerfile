# Use Ubuntu 22.04 as the base image
FROM ubuntu:22.04

# Set environment variable to avoid interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Update package lists and install prerequisites
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
    && rm -rf /var/lib/apt/lists/*

# Install Node.js LTS (v18) from NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Set the working directory
WORKDIR /workspace

# By default, start a bash shell.
CMD [ "bash" ]
