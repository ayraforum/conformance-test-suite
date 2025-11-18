# Ayra Conformance Test Suite - Certification Simple

> ⚠️ **EXPERIMENTAL SOFTWARE - NOT PRODUCTION READY**
> 
> This is an **exploratory prototype** for conformance testing concepts. The codebase is **fragile, unstable, and subject to breaking changes**. This implementation was created for rapid prototyping and research purposes only.

> 🚨 **IMPORTANT DISCLAIMERS**
> 
> - **Highly Experimental**: This code is exploratory and may break unexpectedly
> - **Fragile Architecture**: Minor changes may cause system failures
> - **No Stability Guarantees**: APIs and functionality may change without notice
> - **Development Only**: Not suitable for production or critical environments
> - **Security Risks**: Contains known security vulnerabilities
> - **Data Loss Risk**: No persistence guarantees, data may be lost
> - **Limited Support**: Experimental codebase with minimal error handling

A **prototype** testing framework that explores validation concepts for digital wallet and verifier implementations in the **Ayra Trust Network**. This experimental CTS investigates approaches for testing SSI implementation compliance with network standards.

---

**Remember**: This is experimental research software. Expect issues, help improve concepts, and contribute to the learning process! 🧪🔬

For the complete documentation, please see the main repository README at `/Users/andor/workspace/github.com/ayraforum/conformance-test-suite/README.md` which contains full details about both the certification-simple and test-harness-integrated approaches.

## Quick Summary

This **certification-simple** approach is:
- ✅ Good for: Research, learning, concept exploration, local experimentation
- ❌ Bad for: Production, customer demos, security-sensitive operations, reliable testing

See the main repository README for detailed comparisons and full documentation.

## Running Locally (Docker Compose)

```bash
cd /path/to/conformance-test-suite
cp .env.example .env   # edit with your NGROK + reference agent settings
docker compose up --build acapy-control acapy-ngrok app
# ... run flows at http://localhost:3000 ...
docker compose down
```

The root `.env` is the single source of truth for NGROK domains and agent selection. The most important keys are:

| Variable | Description |
| --- | --- |
| `REFERENCE_AGENT` | `credo` (default) or `acapy`. Controls the agent used for holder and verifier flows in the UI. |
| `REFERENCE_AGENT_NGROK_DOMAIN` | Public hostname used by the reference agent tunnel. All QR codes for direct wallet interactions point here. |
| `ISSUER_OVERRIDE_AGENT` | Optional override for credential issuance (`credo`, `acapy`, or `auto`). Set to `credo` when you want ACA-Py to act as the verifier but you still rely on Credo to issue credentials. |
| `ISSUER_OVERRIDE_NGROK_DOMAIN` | Required when the override is `credo`, so the Credo issuer has its own inbound NGROK tunnel. |
| `VERIFIER_TEST_NGROK_DOMAIN` | Domain dedicated to the legacy `test-verifier` container. Does not affect the UI flows. |
| `SERVER_NGROK_DOMAIN` | Optional domain for the Express API callbacks/webhooks. |

If you leave `REFERENCE_AGENT=credo`, you only need one NGROK domain. When you experiment with `REFERENCE_AGENT=acapy` **and** keep the Credo override, you must provide two distinct domains so ngrok does not report `ERR_NGROK_334`.

## NGROK Setup Overview

- Use the root `.env` to configure tunnels. (The legacy `certification-simple/.env` is still read by some scripts but the compose services honor the root file.)
- Free-plan users must alternate issuer and verifier tunnels; follow the docker compose steps in [`NGROK_SETUP.md`](./NGROK_SETUP.md) to start and stop the services on the host.
- Paid-plan users can reserve domains and run both tunnels in parallel; instructions and example `.env` values are also in [`NGROK_SETUP.md`](./NGROK_SETUP.md).
