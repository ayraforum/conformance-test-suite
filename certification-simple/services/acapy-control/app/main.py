from __future__ import annotations

from fastapi import FastAPI

from acapy_controller.process_manager import AcaPyProcessManager
from acapy_controller.event_bus import EventBroker
from acapy_controller.rpc import RpcRouter

app = FastAPI(title="ACA-Py Control Service", version="0.1.0")
manager = AcaPyProcessManager()
event_broker = EventBroker()
rpc_router = RpcRouter(manager, event_broker)
app.include_router(rpc_router.router)

@app.post("/webhook")
async def webhook_handler(payload: dict):
  topic = payload.get("topic") or payload.get("state", "")
  body = payload.get("payload") or payload
  try:
    manager.handle_webhook(topic, body)
  except Exception:
    # best-effort; do not fail the webhook
    pass
  return {"status": "ok"}

# ACA-Py can be configured to POST to /webhook/topic/{topic}/...; accept that shape too.
@app.post("/webhook/topic/{topic}/")
async def webhook_topic_handler(topic: str, payload: dict):
  body = payload.get("payload") or payload
  try:
    manager.handle_webhook(topic, body)
  except Exception:
    pass
  return {"status": "ok"}
