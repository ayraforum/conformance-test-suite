# Multi-stage build for Conformance Test Suite
FROM node:20-alpine AS base

# Install system dependencies required for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    openssl \
    ca-certificates

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.1.0

# Copy package manager files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/cts/package.json ./packages/cts/
COPY packages/trqp/package.json ./packages/trqp/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build stage for all packages
FROM base AS builder

# Build packages in dependency order
RUN pnpm --filter @demo/trqp run build
RUN pnpm --filter @demo/core run build
RUN pnpm --filter cts-3 run build:server

# Production server stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    python3 \
    make \
    g++ \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.1.0

# Copy package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/cts/package.json ./packages/cts/
COPY packages/trqp/package.json ./packages/trqp/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/packages/core/build ./packages/core/build
COPY --from=builder --chown=nextjs:nodejs /app/packages/cts/server ./packages/cts/server
COPY --from=builder --chown=nextjs:nodejs /app/packages/trqp/build ./packages/trqp/build

# Copy necessary source files
COPY --chown=nextjs:nodejs packages/core/src ./packages/core/src
COPY --chown=nextjs:nodejs packages/cts/scripts ./packages/cts/scripts
COPY --chown=nextjs:nodejs packages/trqp/src ./packages/trqp/src

# Copy configuration files
COPY --chown=nextjs:nodejs tsconfig*.json ./
COPY --chown=nextjs:nodejs packages/core/tsconfig*.json ./packages/core/
COPY --chown=nextjs:nodejs packages/cts/tsconfig*.json ./packages/cts/
COPY --chown=nextjs:nodejs packages/trqp/tsconfig*.json ./packages/trqp/

# Create data directories
RUN mkdir -p /app/data/wallets /app/logs && \
    chown -R nextjs:nodejs /app/data /app/logs

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5005/api/health || exit 1

# Expose ports
EXPOSE 5005 5006

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["sh", "-c", "cd packages/cts && npm run start:server"]

# Frontend stage for Next.js app
FROM node:20-alpine AS frontend

RUN apk add --no-cache curl dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.1.0

# Copy package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/cts/package.json ./packages/cts/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy Next.js source
COPY packages/cts/src ./packages/cts/src
COPY packages/cts/public ./packages/cts/public
COPY packages/cts/next.config.ts ./packages/cts/
COPY packages/cts/tailwind.config.js ./packages/cts/
COPY packages/cts/postcss.config.mjs ./packages/cts/
COPY packages/cts/tsconfig*.json ./packages/cts/

# Build Next.js application
RUN cd packages/cts && npm run build

# Switch to non-root user
USER nextjs

# Health check for frontend
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "cd packages/cts && npm start"]

# Test stage
FROM base AS test

# Copy test files
COPY packages/cts/scripts ./packages/cts/scripts
COPY packages/*/tests ./packages/tests/

# Install test dependencies
RUN pnpm install

# Set test environment
ENV NODE_ENV=test

# Create test results directory
RUN mkdir -p /app/test-results

CMD ["npm", "run", "test-all"]

# Development stage
FROM base AS development

# Install development tools
RUN npm install -g nodemon ts-node

# Install all dependencies (including dev)
RUN pnpm install

# Expose all ports for development
EXPOSE 3000 5005 5006

# Start in development mode
CMD ["pnpm", "dev"]