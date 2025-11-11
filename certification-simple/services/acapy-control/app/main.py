from __future__ import annotations

from fastapi import FastAPI

from acapy_controller.process_manager import AcaPyProcessManager
from acapy_controller.rpc import RpcRouter

app = FastAPI(title="ACA-Py Control Service", version="0.1.0")
manager = AcaPyProcessManager()
rpc_router = RpcRouter(manager)
app.include_router(rpc_router.router)
