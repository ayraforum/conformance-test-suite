# NGROK Configuration Guide

Guidelines for using NGROK with the Certification Simple docker-compose stack. Covers authtoken setup, free-plan tunnel rotation, and paid-plan reserved domains.

## 1. Prerequisites
- Docker Desktop or Docker Engine with the Compose plugin
- NGROK account (free or paid) – <https://dashboard.ngrok.com/signup>
- NGROK authtoken – <https://dashboard.ngrok.com/get-started/your-authtoken>

All commands assume you run them from the repository root while targeting the `certification-simple` folder.

## 2. Store Your Authtoken

The compose stack reads environment values from `certification-simple/.env`. Populate that file with at least the NGROK credentials:

`certification-simple/.env`
```ini
NGROK_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NGROK_REGION=us
```

You can still override values for a single terminal session (`export NGROK_AUTH_TOKEN=…`), but keeping everything in `.env` keeps the docker-compose workflow consistent for every run.

## 3. Free Plan Workflow (single tunnel at a time)

Free NGROK accounts are limited to one active tunnel. Alternate between issuer and verifier tunnels by editing the `.env` file and restarting the services.

### 3.1 Issuer phase
Set `certification-simple/.env` so only the server uses NGROK:

```ini
USE_NGROK=true
VERIFIER_USE_NGROK=false
NGROK_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NGROK_REGION=us
```

Start the issuer stack:
```bash
cd certification-simple
docker compose up --build server ui
```

- Watch the `server` logs for `ngrok tunnel established at https://*.ngrok-free.app`.
- Share the printed URL/QR codes while running issuance scenarios.

Shut everything down once you are finished testing the issuer flow:
```bash
docker compose down
```

### 3.2 Verifier phase
Adjust `certification-simple/.env` so only the verifier agent opens a tunnel:

```ini
USE_NGROK=false
VERIFIER_USE_NGROK=true
NGROK_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NGROK_REGION=us
```

Run the verifier together with the server dependency:
```bash
cd certification-simple
docker compose up --build server test-verifier
```

- The verifier container prints a fresh NGROK URL—use it for wallet connections.
- Stop the services when complete:
```bash
docker compose down
```

Repeat the cycle whenever you need a new tunnel. Free-plan hostnames change every session, so update any stored callback URLs after each restart.

## 4. Paid Plan Workflow (parallel tunnels with reserved domains)

Paid NGROK plans support multiple simultaneous tunnels and reserved domains. Configure both services with dedicated hostnames so URLs remain stable across restarts.

1. Reserve two domains in the NGROK dashboard (e.g. `issuer.your-org.ngrok.app`, `verifier.your-org.ngrok.app`).
2. Update `certification-simple/.env`:

```ini
USE_NGROK=true
VERIFIER_USE_NGROK=true
NGROK_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NGROK_REGION=us
SERVER_NGROK_DOMAIN=issuer.your-org.ngrok.app
VERIFIER_NGROK_DOMAIN=verifier.your-org.ngrok.app
NGROK_POOLING_ENABLED=false
```

3. Start all services and leave them running through issue and holder test flows:
```bash
cd certification-simple
docker compose up --build
```

4. When you are finished, bring everything down:
```bash
docker compose down
```

Both tunnels retain their reserved domains, keeping QR codes and webhook targets valid across restarts.

## 5. Key Environment Variables (`certification-simple/.env`)

| Variable | Purpose |
|----------|---------|
| `NGROK_AUTH_TOKEN` | Authenticates NGROK connections; required whenever a tunnel is enabled |
| `NGROK_REGION` | Optional region (`us`, `eu`, `ap`, etc.) |
| `USE_NGROK` | Enables NGROK for the main server/issuer flow |
| `SERVER_NGROK_DOMAIN` | Reserved domain for the server tunnel (paid plans) |
| `VERIFIER_USE_NGROK` | Enables NGROK for the test-verifier container |
| `VERIFIER_NGROK_DOMAIN` | Reserved domain for the verifier tunnel (paid plans) |
| `NGROK_POOLING_ENABLED` | Set to `false` for one-to-one reserved domains; leave `true` for pooled listeners |

## 6. Troubleshooting

- **`NGROK_AUTH_TOKEN not defined`** – confirm the token exists in `certification-simple/.env` or in exported shell variables before running `docker compose up`.
- **`ERR_NGROK_334` (duplicate tunnel)** – stop all services with `docker compose down`, ensure only one tunnel is enabled on the free plan, or disable pooling for paid plans.
- **Tunnel closes immediately** – verify your plan level supports the requested domain (free plans cannot attach custom `*.ngrok.app` hostnames).
- **Wallet cannot reach verifier** – confirm devices use the tunnel URL shown in the logs and that outbound HTTPS is allowed on the network.

These steps keep NGROK tunnels predictable whether you are rotating a single free-plan tunnel or running multiple reserved domains on a paid subscription.
