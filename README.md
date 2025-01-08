# Conformance Test Suite

A modern web application for managing and running conformance tests, built with Next.js frontend and Express.js backend.

## Overview

The Conformance Test Suite is a comprehensive testing platform that allows users to manage, configure, and monitor test runs for system conformance testing. The application features a modern web interface and a robust backend API.

## Project Structure

```
├── frontend/          # Next.js frontend application
├── backend/          # Express.js backend server
├── shared/           # Shared utilities and types
├── hurl/            # API testing configurations
└── docs/            # Documentation files
```

## Tech Stack

### Frontend
- Next.js 13+ with App Router
- TypeScript
- Modern UI components
- Real-time updates via WebSocket

### Backend
- Express.js
- TypeScript
- Socket.IO for real-time communication
- Swagger/OpenAPI documentation
- RESTful API architecture

## Getting Started

### Prerequisites
- Node.js (LTS version)
- pnpm package manager

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
```

2. Install dependencies:
```bash
pnpm install
```

3. Start the development servers:

For frontend:
```bash
cd frontend
pnpm dev
```

For backend:
```bash
cd backend
pnpm dev
```

## Features

- System Profile Configuration Management
- Real-time Test Run Monitoring
- Test Run History and Analytics
- API Documentation via Swagger UI
- WebSocket-based Live Updates

## Development

This project uses a monorepo structure managed with pnpm workspaces. The main packages are:

- `@conformance-test-suite/frontend`: Next.js web application
- `@conformance-test-suite/backend`: Express.js server
- `@conformance-test-suite/shared`: Shared utilities and types

## Contributing

Please read our [Contributing Guide](CONTRIBUTING) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

## Documentation

API documentation is available at `/api-docs` when running the backend server.

## Support

For support and questions, please file an issue in the repository's issue tracker.
