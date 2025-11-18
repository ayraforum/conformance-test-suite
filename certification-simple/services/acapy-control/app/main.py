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
