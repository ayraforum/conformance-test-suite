from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from acapy_controller.process_manager import AcaPyProcessManager
from acapy_controller.event_bus import EventBroker
from app.schemas.agents import (
  AgentStartRequest,
  AgentStartResponse,
  AgentStopResponse,
  CredentialOfferRequest,
  CredentialOfferResponse,
  InvitationResponse,
  ConnectionRecordResponse,
  ProofExchangeResponse,
  ProofRequest,
  WaitForConnectionRequest,
)


class RpcRouter:
  def __init__(self, manager: AcaPyProcessManager, events: EventBroker) -> None:
    self.manager = manager
    self.events = events
    self.router = APIRouter()
    self._register_routes()

  def _register_routes(self) -> None:
    self.router.post("/agent/start", response_model=AgentStartResponse)(self.start_agent)
    self.router.post("/agent/stop", response_model=AgentStopResponse)(self.stop_agent)
    self.router.post("/connections/create-invitation", response_model=InvitationResponse)(self.create_invitation)
    self.router.post("/proofs/request", response_model=ProofExchangeResponse)(self.request_proof)
    self.router.post("/credentials/offer", response_model=CredentialOfferResponse)(self.offer_credential)
    self.router.get("/events/stream")(self.stream_events)
    self.router.post("/connections/wait", response_model=ConnectionRecordResponse)(self.wait_for_connection)

  async def start_agent(self, body: AgentStartRequest):
    try:
      profile_path = Path(__file__).resolve().parent.parent / "profiles" / f"{body.profile}.yaml"
      profile = await self.manager.start(profile_path)
      response = AgentStartResponse(status="started", profile=body.profile, admin_url=profile.admin_url)
      await self.events.publish("agent_started", response.dict())
      return response
    except Exception as exc:  # pylint: disable=broad-except
      raise HTTPException(status_code=500, detail=str(exc)) from exc

  async def stop_agent(self):
    await self.manager.stop()
    response = AgentStopResponse(status="stopped")
    await self.events.publish("agent_stopped", response.dict())
    return response

  async def create_invitation(self):
    if not self.manager.is_running:
      raise HTTPException(status_code=400, detail="Agent not started")

    payload = await self.manager.create_invitation()
    response = InvitationResponse(
      invitation_url=payload["invitation_url"],
      connection_id=payload["connection_id"],
      invitation=payload["invitation"],
    )
    await self.events.publish("invitation_created", response.dict(by_alias=True))
    return response

  async def request_proof(self, body: ProofRequest):
    if not self.manager.is_running:
      raise HTTPException(status_code=400, detail="Agent not started")

    response = await self.manager.request_proof(body.dict())
    response = ProofExchangeResponse(
      proof_exchange_id=response["proof_exchange_id"],
      state=response["state"],
      record=response,
    )
    await self.events.publish("proof_request", response.dict())
    return response

  async def offer_credential(self, body: CredentialOfferRequest):
    if not self.manager.is_running:
      raise HTTPException(status_code=400, detail="Agent not started")

    payload = await self.manager.offer_credential(body.dict())
    response = CredentialOfferResponse(
      credential_exchange_id=payload["cred_ex_record"]["cred_ex_id"],
      state=payload["cred_ex_record"]["state"],
      record=payload["cred_ex_record"],
    )
    await self.events.publish("credential_offer", response.dict())
    return response

  async def wait_for_connection(self, body: WaitForConnectionRequest):
    if not self.manager.is_running:
      raise HTTPException(status_code=400, detail="Agent not started")
    record = await self.manager.wait_for_connection(body.connection_id, body.timeout_ms or 120000)
    response = ConnectionRecordResponse(
      connection_id=record.get("connection_id", body.connection_id),
      state=record.get("state") or record.get("rfc23_state") or "unknown",
      record=record,
    )
    await self.events.publish("connection_ready", response.dict())
    return response

  async def stream_events(self):
    queue = await self.events.subscribe()

    async def event_generator():
      try:
        while True:
          event = await queue.get()
          yield f"data: {json.dumps(event)}\n\n"
      finally:
        await self.events.unsubscribe(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
