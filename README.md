# Ayra Trust Network - Conformance Test Suite

Conformance tooling for Ayra Trust Network implementations built on the `certification-simple` stack (the production baseline).

**Current coverage**
- ✅ TRQP trust registry checks
- ✅ Holder conformance flow
- ✅ Issue flow (utility flow, not scored as a conformance flow)
- 🚧 Verifier conformance flow (being finished now)
- ✅ Credential format: AnonCreds
- 🚧 Credential format: W3C LDP (in progress)

## Overview

This repository contains conformance testing tools for validating digital identity implementations against Ayra Trust Network standards, focused on the `certification-simple` stack.

## Repository Structure

```
conformance-test-suite/
├── certification-simple/          # Primary CTS stack (Next.js + Express)
└── README.md                     # This file
```

## Certification-Simple Stack

**Architecture**: Monolithic Next.js application with integrated testing and Express API.

**Status**: Production baseline for TRQP, holder, and issue flows; verifier conformance flow is in progress; AnonCreds supported today with W3C LDP underway.

#### Purpose
- Rapid iteration on conformance testing concepts
- Quick setup for demos and local validation
- Direct agent testing without external harnesses
- Development and debugging workflow validation

#### Key Features
- Single Next.js application serving both frontend and backend
- Integrated Express.js server for API endpoints
- Built-in test pipeline orchestration with DAG-based execution
- Direct integration with Credo-TS agents
- Real-time WebSocket updates for test monitoring
- QR code generation for mobile wallet testing

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 9.1.0+
- Docker & Docker Compose (recommended)

### Quick Start (Certification-Simple)

```bash
# Clone the repository
git clone <repository-url>
cd conformance-test-suite

# Copy the sample env and edit the NGROK / agent settings
cp .env.example .env
# (update REFERENCE_AGENT, NGROK domains, tokens, etc.)

# Start the certification-simple stack with the default credo reference agent

docker compose up app

# OR Start the certification-simple stack with ACA-Py
docker compose up --build acapy-control acapy-ngrok app

# When finished
docker compose down
```

**Required Environment Variables (in the repo root `.env`):**
```bash
USE_NGROK=true                        # Enable NGROK tunneling for CTS services
NGROK_AUTH_TOKEN=your_token_here      # NGROK authentication token (required when USE_NGROK=true)
REFERENCE_AGENT=credo|acapy           # Which agent drives holder/verifier flows
REFERENCE_AGENT_NGROK_DOMAIN=ref.example.ngrok.app   # Domain for the reference agent tunnel
VERIFIER_TEST_NGROK_DOMAIN=verifier.example.ngrok.app # Domain for the test-verifier container
ISSUER_OVERRIDE_AGENT=credo|acapy|auto # (optional) force the issuer controller
ISSUER_OVERRIDE_NGROK_DOMAIN=issuer.example.ngrok.app # Domain for the override issuer tunnel
SERVER_NGROK_DOMAIN=cts-server.example.ngrok.app      # Domain for API callbacks
```

For NGROK domain planning, tunnel rotation, and the full list of optional variables see `certification-simple/NGROK_SETUP.md`.

### Reference Agents & Issuer Override

- `REFERENCE_AGENT` selects which controller powers the holder and verifier flows. `credo` uses the built-in Credo agent; `acapy` connects to the ACA-Py control service.
- `ISSUER_OVERRIDE_AGENT` (default `auto`) lets you force the credential issuer to Credo or ACA-Py independently of the reference agent. When set to `credo`, also provide `ISSUER_OVERRIDE_NGROK_DOMAIN` so the override agent has a unique tunnel; otherwise the UI QR codes collide.
- `REFERENCE_AGENT_NGROK_DOMAIN` is the hostname wallets use to reach the reference agent. When ACA-Py is the reference agent, the `acapy-ngrok` sidecar automatically advertises this domain.
- `VERIFIER_TEST_NGROK_DOMAIN` is only used by the standalone `test-verifier` container (the legacy CLI harness); it does not affect the UI flows.

### Access Points (default ports)
- Frontend: http://localhost:3000
- API Server: http://localhost:5005
- Test Interfaces: http://localhost:3000/holder, /verifier, /issuer, /registry

**Compatible Wallets Tested:**
- ✅ **BC Government Wallet** - Successfully tested with holder conformance flows
- 🧪 Other Credo-TS based wallets (ad hoc testing)
- 📱 Mobile wallets supporting DIDComm v1/v2 protocols

## Contributing

### Contribution Guidelines

1. **Fork and clone** the repository
2. **Create a feature branch** for your changes
3. **Test thoroughly** in development environment
4. **Document any breaking changes**
5. **Submit pull request** with clear description

### Code Quality Expectations

- Fast iteration with production hardening underway

## Security Considerations

> 🔒 **Security Notes**
> 
> Designed for controlled development environments; add hardening and authentication before internet exposure.

### Known Security Issues
- No authentication or authorization mechanisms
- Unvalidated user inputs in many areas
- Potential injection vulnerabilities
- Insecure default configurations
- Missing rate limiting and DoS protection
- Unencrypted sensitive data transmission
- Debug information exposed in production builds

### Security Recommendations
- Use only in isolated development environments
- Do not expose to public networks
- Do not process real credentials or sensitive data
- Implement proper security measures before any production use

## License

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.

---

## Support and Feedback

### Getting Help
- 📚 **Documentation**: Check README files under `certification-simple/`
- 🐛 **Issues**: Report bugs and issues via GitHub Issues
- 💬 **Discussions**: Use GitHub Discussions for questions and feedback

### Feedback Welcome
Tell us what works and what could be smoother:
- What works well?
- What breaks frequently?
- What features are missing?
- How can the architecture be improved?
