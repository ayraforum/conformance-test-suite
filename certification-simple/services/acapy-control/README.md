# ACA-Py Control Service

This service wraps an ACA-Py process and exposes a lightweight control API for the
Conformance Test Suite (CTS).  It is derived from the OWF/OATH backchannel but
has been reorganized to remove the legacy HTTP surface area and to make it easy
to embed into CTS.

## Layout

```
acapy-control/
├── app/                 # FastAPI application entrypoint
├── acapy_controller/    # ACA-Py process manager + admin helpers
├── profiles/            # Example ACA-Py config files (YAML)
├── requirements.txt
└── Dockerfile           # (coming next steps)
```

## Running locally

```bash
cd certification-simple/services/acapy-control
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 9001
```

The service exposes:

* `POST /agent/start` – launch ACA-Py with a named profile.
* `POST /agent/stop` – stop the managed ACA-Py instance.
* `POST /connections/create-invitation` – create an out-of-band invitation.
* `POST /proofs/request` – send a Present Proof v2 request.
* `POST /credentials/offer` – issue a V2 credential offer.
* `POST /connections/wait` – block until a given connection reaches `active`.
* `GET /events/stream` – server-sent event stream for neutral events (agent start/stop, invitations, proofs, credentials).

The FastAPI app is the integration point for CTS; the TypeScript controller will
issue RPCs against these endpoints to drive ACA-Py in the same way it currently
drives Credo.
