# Ayra Trust Network - Conformance Test Suite

> ⚠️ **WORK IN PROGRESS - NOT READY FOR PRODUCTION**
> 
> This is an experimental conformance testing suite that is actively under development. The codebase is fragile, unstable, and subject to breaking changes. **DO NOT USE IN PRODUCTION ENVIRONMENTS**.

## Overview

This repository contains experimental conformance testing tools for validating digital identity implementations against Ayra Trust Network standards. The project explores two distinct architectural approaches for SSI (Self-Sovereign Identity) conformance testing.

> 🚨 **IMPORTANT DISCLAIMER**
> 
> - **Experimental Software**: This code is exploratory and may contain bugs, security vulnerabilities, or incomplete features
> - **No Stability Guarantees**: APIs, interfaces, and functionality may change without notice
> - **Development Use Only**: Intended for research, development, and testing purposes only
> - **No Production Support**: Not suitable for production environments or critical systems

## Repository Structure

```
conformance-test-suite/
├── certification-simple/          # Exploratory monolithic approach
├── test-harness-integrated/      # Production-oriented distributed approach
└── README.md                     # This file
```

## Two Architectural Approaches

### 1. 🧪 **Certification-Simple** (Exploratory)

**Location**: `./certification-simple/`

**Architecture**: Monolithic Next.js application with integrated testing

**⚠️ Status**: **HIGHLY EXPERIMENTAL** - Fragile and unstable codebase

#### Purpose
- Rapid prototyping and exploration of conformance testing concepts
- Quick iteration on test scenarios and user interfaces
- Research into direct agent testing approaches
- Development and debugging workflow validation

#### Key Features
- Single Next.js application serving both frontend and backend
- Integrated Express.js server for API endpoints
- Built-in test pipeline orchestration with DAG-based execution
- Direct integration with Credo-TS agents
- Real-time WebSocket updates for test monitoring
- QR code generation for mobile wallet testing

#### ⚠️ **Limitations & Warnings**
- **Fragile Architecture**: Code may break unexpectedly with minor changes
- **Limited Error Handling**: May not gracefully handle edge cases
- **Unstable APIs**: Internal interfaces subject to frequent changes
- **Basic Security**: Not hardened for production security requirements
- **Performance Issues**: Not optimized for concurrent users or heavy loads
- **Incomplete Features**: Many features are partially implemented
- **Technical Debt**: Quick prototyping has resulted in code quality issues

#### Use Cases
- ✅ Local development and testing
- ✅ Proof of concept demonstrations
- ✅ Research and experimentation
- ❌ Production deployments
- ❌ Multi-user environments
- ❌ Security-critical applications

---

### 2. 🏗️ **Test-Harness-Integrated** (Production-Oriented)

**Location**: `./test-harness-integrated/`

**Architecture**: Distributed microservices with external harness integration

**⚠️ Status**: **UNDER DEVELOPMENT** - More stable but still incomplete

#### Purpose
- Production-ready conformance testing infrastructure
- Integration with established industry testing harnesses
- Scalable multi-user testing environment
- Standardized testing protocols and reporting

#### Key Features
- Separate Next.js frontend and Express.js backend services
- Integration with Aries Agent Test Harness (AATH)
- Integration with OpenID Conformance Suite
- PostgreSQL database for persistent test results
- Scalable microservices architecture
- Standardized test protocols and reporting
- Multi-user support with authentication

#### Current Status
- 🚧 **In Active Development**
- 🔄 **Architecture Stabilizing**
- ⏳ **Features Being Implemented**
- 📋 **Testing Protocols Being Defined**

#### Planned Use Cases
- 🎯 Enterprise conformance testing
- 🎯 Certification and compliance validation
- 🎯 Multi-implementation interoperability testing
- 🎯 Automated CI/CD integration
- 🎯 Regulatory compliance reporting

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 9.1.0+
- Docker & Docker Compose (recommended)

### Quick Start (Certification-Simple)

> ⚠️ **Remember**: This is experimental software. Expect issues!

```bash
# Clone the repository
git clone <repository-url>
cd conformance-test-suite

# Copy the sample env and edit the NGROK / agent settings
cp .env.example .env
# (update REFERENCE_AGENT, NGROK domains, tokens, etc.)

# Start the certification-simple stack
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
- 🧪 Other Credo-TS based wallets (experimental support)
- 📱 Mobile wallets supporting DIDComm v1/v2 protocols

### Development Disclaimer

```
⚠️  DEVELOPMENT ENVIRONMENT ONLY  ⚠️

This software is provided "as-is" for development and research purposes.
- Expect bugs, crashes, and unexpected behavior
- Code may be restructured or removed without notice  
- No backwards compatibility guarantees
- Security vulnerabilities may exist
- Performance is not optimized
- Documentation may be outdated or incomplete
```

## Contributing

### Before Contributing

> 🚨 **Read This First**
> 
> This is experimental software under active development. Contributions are welcome, but please understand:
> - Code may be refactored or removed entirely
> - No guarantees about contribution longevity
> - Focus on learning and experimentation over production quality
> - Expect frequent breaking changes

### Contribution Guidelines

1. **Fork and clone** the repository
2. **Create a feature branch** for your changes
3. **Test thoroughly** in development environment
4. **Document any breaking changes**
5. **Submit pull request** with clear description

### Code Quality Expectations

- **Certification-Simple**: Experimental code quality accepted, focus on functionality
- **Test-Harness-Integrated**: Higher code quality standards, production considerations

## Architecture Comparison

| Aspect | Certification-Simple | Test-Harness-Integrated |
|--------|---------------------|-------------------------|
| **Complexity** | Low - Single application | High - Distributed services |
| **Setup Time** | Minutes | Hours |
| **Stability** | ⚠️ Very Low | 🔄 Improving |
| **Scalability** | Limited | High |
| **Standards** | Custom protocols | Industry standards |
| **Database** | In-memory/file | PostgreSQL |
| **Authentication** | None | Multi-user |
| **Deployment** | Single container | Multi-service |
| **Use Case** | Development/Research | Production/Enterprise |

## Security Considerations

> 🔒 **SECURITY WARNING**
> 
> **DO NOT USE IN PRODUCTION** - Both approaches have security limitations:

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
- 📚 **Documentation**: Check individual README files in each approach directory
- 🐛 **Issues**: Report bugs and issues via GitHub Issues
- 💬 **Discussions**: Use GitHub Discussions for questions and feedback

### Feedback Welcome
This is experimental software - your feedback helps improve it:
- What works well?
- What breaks frequently?
- What features are missing?
- How can the architecture be improved?

---

**Remember**: This is experimental software. Use at your own risk, expect issues, and help us make it better! 🚀
