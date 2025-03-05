# Conformance Test Suite

A modern web application for managing and running conformance tests, built with a Next.js frontend and Express.js backend.

## Overview

The Conformance Test Suite (CTS) underpins interoperability in the GAN Trust Network by enabling systems to be tested for compliance with GAN's technical interoperability profiles. It is designed to reduce complexity for developers, ensure system compatibility, and accelerate adoption of interoperable standards.

The CTS integrates existing open-source test suites, such as the Aries Agent Test Harness (AATH) and the OpenID Conformance Suite, to verify conformance. While initially focused on interoperability, the CTS will evolve to include security, performance, and certification testing.

## Project Structure

```
├── frontend/          # Next.js frontend application
├── backend/           # Express.js backend server
├── shared/            # Shared utilities and types
├── hurl/              # API testing configurations
└── docs/              # Documentation files
```

## Setup

See below for how to set things up, or if you'd like, just run the `./setup.sh` script (linux and osx) to get started.

**Windows Support Not Verified. Use At Your Own Risk**

## Getting Started

### Prerequisites
- Node.js (LTS version)
- pnpm package manager
- Community Test Harnesses (see below)
- Compatible System: OSX or Linux. 

#### Community Test Harnesses

The CTS uses the following test harnesses which must be installed/running on your local machine:

- Aries Agent Test Harness
  - https://github.com/openwallet-foundation/owl-agent-test-harness
- OpenID Conformance Suite
  - https://gitlab.com/openid/conformance-suite/

For the ATH, you will need to checkout the source code to your local machine. There is an environment variable in the backend `.env` file that points to the local path of the ATH.

For the OpenID Conformance Suite, you will need to checkout the source code to your local machine and ensure it's requirements are installed.

There is an environment variable in the backend `.env` file that points to the API endpoint of the OpenID Conformance Suite.

Example Commands:

#### Aries Agent Test Harness

```bash
# Clone the Aries Agent Test Harness
git clone https://github.com/openwallet-foundation/owl-agent-test-harness.git
```

#### OpenID Conformance Suite

```bash
# Clone the OpenID Conformance Suite
git clone https://gitlab.com/openid/conformance-suite.git

# Start the OpenID Conformance Suite dev environment
devenv up

# In another terminal, start the OpenID Conformance Suite server
mvn spring-boot:run
```
---

### Development Setup

This will start both the frontend and backend concurrently.

Development setup includes hot-reloading, source code mounting, and development dependencies:

1. Clone the repository:
   ```bash
   git clone git@github.com:GANfoundation/conformance-test-suite.git
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy the example environment files:
    ```bash
    cp frontend/.env.example frontend/.env
    cp backend/.env.example backend/.env
    ```

4. Start the postgres database required for the backend from the root directory:
   ```bash
   docker compose up -d
   ```

5. Run prisma migrations to create the database schema:
   ```bash
   pnpm --filter backend prisma-migrate
   ```

6. Start the development servers:
   ```bash
   pnpm dev
   ```

### Environment Variables

Update the environment variables as needed for your setup.

| Variable                      | Description                                         | Example                                                           |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| DATABASE_URL                  | PostgreSQL connection string for Prisma             | `postgresql://postgres:postgres@localhost:5432/cts?schema=public` |
| AATH_PATH                     | Local path to Aries Agent Test Harness installation | `/home/user/Projects/owl-agent-test-harness`                      |
| PORT                          | Backend server port                                 | `5001`                                                            |
| OID_CONFORMANCE_SUITE_API_URL | OpenID Conformance Suite API endpoint               | `https://localhost:8443/api`                                      |

Note: Never commit sensitive environment variables to version control. The `.env` files are included in `.gitignore` by default.

## Developer Experience

The project leverages pnpm workspaces for efficient dependency management and `concurrently` for running both the frontend and backend servers with a single command. The backend uses `nodemon` for hot reloading, ensuring a smooth development process.

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
- Prisma for PostgreSQL database interactions

## Key Features

- **Interoperability Testing**: Supports message-centric and API-centric profiles.
- **Profile Configuration**: Manage system and profile-specific test configurations.
- **Real-time Monitoring**: WebSocket-powered live updates during test runs.
- **Reporting**: In-app conformance reports.
- **Test Suite Integration**:
  - Aries Agent Test Harness
  - OpenID Conformance Suite

## Development Roadmap

The CTS roadmap includes:
- Expanded profile support, including advanced cryptographic standards like BBS+ signatures.
- Automated test execution in CI/CD pipelines.
- Certification lifecycle management for long-term ecosystem trust.
- Enhanced integrations with external tools (e.g., Jenkins, Postman).

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING) for details on how to get involved.

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.

## Documentation

- API documentation is available at `/api-docs` when running the backend server.
- Whitepaper: See `docs/whitepaper.pdf` for in-depth project details.

## Support

For support and questions, please file an issue in the repository's issue tracker.
