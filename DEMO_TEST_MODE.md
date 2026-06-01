# Demo/Test Mode Runbook

This mode runs CTS with the local ACA-Py issuer, holder, verifier, the CTS UI/API, and a containerized ngrok sidecar for the public `did:web` issuer document.

Use this for local demos and end-to-end test runs where CTS drives the internal ACA-Py agents.

## Required `.env`

Use the current env names from `.env.example`. For the ACA-Py demo setup, these values are the important ones:

```bash
USE_NGROK=true
REFERENCE_AGENT=acapy
REFERENCE_ISSUER_OVERRIDE_AGENT=acapy
REFERENCE_VERIFIER_OVERRIDE_AGENT=auto

ACAPY_CONTROL_URL=http://acapy-control:9001
ACAPY_HOLDER_CONTROL_URL=http://acapy-holder-control:9003
ACAPY_VERIFIER_CONTROL_URL=http://acapy-verifier-control:9010

ACAPY_AUTO_SEND_INVITE_TO_INTERNAL_HOLDER=true
ACAPY_VERIFIER_AUTO_SEND_PROOF_REQUEST=true
ACAPY_VERIFIER_TRQP_ENFORCE=true

CTS_ISSUER_DID_METHOD=web
CTS_ISSUER_DID_OPTIONS={"did":"did:web:ayra-cts-issuer.ngrok.app:issuer"}
DID_WEB_NGROK_DOMAIN=ayra-cts-issuer.ngrok.app
SERVER_NGROK_DOMAIN=ayra-cts-issuer.ngrok.app

NEXT_PUBLIC_TRQP_KNOWN_ENDPOINT=https://sandbox-tr.ayra.network/
NEXT_PUBLIC_TRQP_SUGGEST_FROM_TR_ENABLED=true
```

Replace the ngrok domains and TRQP endpoint with the environment you are testing. Keep `CTS_ISSUER_DID_OPTIONS.did` and `DID_WEB_NGROK_DOMAIN` aligned. For `did:web:example.ngrok.app:issuer`, the DID document must be reachable at:

```text
https://example.ngrok.app/issuer/did.json
```

## Start

Start from a clean profile-aware Compose state:

```bash
docker compose --profile with-ngrok down --remove-orphans
docker compose --profile with-ngrok up --build app acapy-control acapy-holder-control acapy-verifier-control ngrok
```

The `ngrok` service is the DID document tunnel. The `acapy-ngrok` service is a separate ACA-Py DIDComm tunnel and is not the DID document tunnel.

## Verify Before Running Flows

Check that all expected services are running:

```bash
docker compose --profile with-ngrok ps
```

Check the public DID document:

```bash
curl -i https://ayra-cts-issuer.ngrok.app/issuer/did.json
```

Expected result:

```text
HTTP/2 200
```

If this returns `ERR_NGROK_3200` or says the endpoint is offline, the reserved ngrok domain exists but no active tunnel is attached. Start or recreate the profile-scoped `ngrok` service:

```bash
docker compose --profile with-ngrok rm -sf ngrok
docker compose --profile with-ngrok up --build ngrok
```

## Run Flows

Open:

```text
http://localhost:3000
```

Useful paths:

```text
http://localhost:3000/issuer
http://localhost:3000/verifier
http://localhost:3000/holder
http://localhost:3000/registry
```

For the Verifier flow, `ACAPY_VERIFIER_AUTO_SEND_PROOF_REQUEST=true` is required when using the internal ACA-Py demo verifier. Without it, CTS will stop at `Await Req` and wait for an external verifier to send the PE v2 proof request.

For the Issue flow with `CTS_ISSUER_DID_METHOD=web`, ACA-Py must be able to resolve the public DID document. If issuance fails with `DIDNotFound`, verify the `/issuer/did.json` URL first.

## Common Fixes

Stale profile container or missing Docker network:

```bash
docker compose --profile with-ngrok down --remove-orphans
docker compose --profile with-ngrok up --build app acapy-control acapy-holder-control acapy-verifier-control ngrok
```

Verifier flow stuck at `Await Req`:

```bash
ACAPY_VERIFIER_AUTO_SEND_PROOF_REQUEST=true
```

Public DID document offline:

```bash
docker compose --profile with-ngrok up --build ngrok
curl -i https://ayra-cts-issuer.ngrok.app/issuer/did.json
```

Local-only issuance without a public DID:

```bash
CTS_ISSUER_DID_METHOD=key
CTS_ISSUER_DID_OPTIONS=
```

Use `did:key` only for local checks that do not need the Ayra-style public `did:web` issuer.
