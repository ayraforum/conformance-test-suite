# Ayra Conformance Test Suite - Certification Simple

Certification Simple is the production codebase for the Ayra CTS, used for quick local runs and deployments. It currently supports TRQP trust registry checks, the holder conformance flow, and the issue flow (utility). The verifier conformance flow is being finished.

**Current coverage**
- ✅ TRQP trust registry checks
- ✅ Holder conformance flow
- ✅ Issue flow (utility flow)
- ✅ Credential format: AnonCreds
- 🚧 Verifier conformance flow (in progress)
- 🚧 Credential format: W3C LDP (in progress)

For the complete documentation, see the main repository README at `../README.md`.

## Quick Summary

This certification-simple approach is:
- Great for research, learning, and local experimentation
- Handy for quick demos and validating wallet/verifier flows without extra services
- Best when you want fast iteration over conformance ideas with minimal setup
- The maintained baseline for production deployments

See the main repository README for detailed comparisons and full documentation.

## Running Locally (Docker Compose)

```bash
cd /path/to/conformance-test-suite
cp .env.example .env   # edit with your NGROK + reference agent settings
# Default Credo setup
docker compose up --build app
# ... run flows at http://localhost:3000 ...
docker compose down
```

The root `.env` is the single source of truth for NGROK domains and agent selection. The most important keys are:

| Variable | Description |
| --- | --- |
| `REFERENCE_AGENT` | `credo` (default) or `acapy`. Controls the agent used for holder and verifier flows in the UI. |
| `REFERENCE_AGENT_NGROK_DOMAIN` | Public hostname used by the reference agent tunnel. All QR codes for direct wallet interactions point here. |
| `REFERENCE_ISSUER_OVERRIDE_AGENT` | Optional override for credential issuance (`credo`, `acapy`, or `auto`). Set to `credo` when you want ACA-Py to act as the verifier but you still rely on Credo to issue credentials. |
| `ISSUER_OVERRIDE_NGROK_DOMAIN` | Required when the override is `credo`, so the Credo issuer has its own inbound NGROK tunnel. |
| `VERIFIER_TEST_NGROK_DOMAIN` | Domain dedicated to the legacy `test-verifier` container. Does not affect the UI flows. |
| `SERVER_NGROK_DOMAIN` | Optional domain for the Express API callbacks/webhooks. |

If you leave `REFERENCE_AGENT=credo`, you only need one NGROK domain. When you experiment with `REFERENCE_AGENT=acapy` **and** keep the Credo override, you must provide two distinct domains so ngrok does not report `ERR_NGROK_334`.

## NGROK Setup Overview

- Use the root `.env` to configure tunnels. (The legacy `certification-simple/.env` is still read by some scripts but the compose services honor the root file.)
- Free-plan users must alternate issuer and verifier tunnels; follow the docker compose steps in [`NGROK_SETUP.md`](./NGROK_SETUP.md) to start and stop the services on the host.
- Paid-plan users can reserve domains and run both tunnels in parallel; instructions and example `.env` values are also in [`NGROK_SETUP.md`](./NGROK_SETUP.md).

## DID:web Issuer (W3C LDP)

When you want ACA-Py to issue W3C LDP credentials with a `did:web` issuer, you must host a DID document over HTTPS. The `app` container can generate and serve the DID document, and the optional `ngrok` sidecar can expose it.

**Required .env values**
- `CTS_ISSUER_DID_METHOD=web`
- `CTS_ISSUER_DID_OPTIONS={"did":"did:web:ayra-cts-issuer.ngrok.app:issuer"}`
- `DID_WEB_NGROK_DOMAIN=ayra-cts-issuer.ngrok.app`

**Run with the ngrok sidecar**
```bash
COMPOSE_PROFILES=with-ngrok docker compose up --build app ngrok acapy-control acapy-holder-control
```

The DID document is served by the CTS API at:
- `https://ayra-cts-issuer.ngrok.app/issuer/did.json` (derived from the DID path)

The DID document generator runs on startup when `CTS_ISSUER_DID_METHOD` is `web` (or `webvh`). You can re-run it manually:
```bash
docker compose exec app pnpm --filter cts-3 run generate:did-doc
```
