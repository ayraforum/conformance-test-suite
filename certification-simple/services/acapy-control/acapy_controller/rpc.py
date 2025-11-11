from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException

from acapy_controller.process_manager import AcaPyProcessManager
from app.schemas.agents import (
  AgentStartRequest,
  AgentStartResponse,
  AgentStopResponse,
  CredentialOfferRequest,
  CredentialOfferResponse,
  InvitationResponse,
  ProofExchangeResponse,
  ProofRequest,
)


class RpcRouter:
  def __init__(self, manager: AcaPyProcessManager) -> None:
    self.manager = manager
    self.router = APIRouter()
    self._register_routes()

  def _register_routes(self) -> None:
    self.router.post("/agent/start", response_model=AgentStartResponse)(self.start_agent)
    self.router.post("/agent/stop", response_model=AgentStopResponse)(self.stop_agent)
    self.router.post("/connections/create-invitation", response_model=InvitationResponse)(self.create_invitation)
    self.router.post("/proofs/request", response_model=ProofExchangeResponse)(self.request_proof)
    self.router.post("/credentials/offer", response_model=CredentialOfferResponse)(self.offer_credential)

  async def start_agent(self, body: AgentStartRequest):
    try:
      profile_path = Path(__file__).resolve().parent.parent / "profiles" / f"{body.profile}.yaml"
      profile = await self.manager.start(profile_path)
      return AgentStartResponse(status="started", profile=body.profile, admin_url=profile.admin_url)
    except Exception as exc:  # pylint: disable=broad-except
      raise HTTPException(status_code=500, detail=str(exc)) from exc

  async def stop_agent(self):
    await self.manager.stop()
    return AgentStopResponse(status="stopped")

  async def create_invitation(self):
    if not self.manager.is_running:
      raise HTTPException(status_code=400, detail="Agent not started")

    payload = await self.manager.create_invitation()
    return InvitationResponse(
      invitation_url=payload["invitation_url"],
      connection_id=payload["connection_id"],
      invitation=payload["invitation"],
    )

  async def request_proof(self, body: ProofRequest):
    if not self.manager.is_running:
      raise HTTPException(status_code=400, detail="Agent not started")

    response = await self.manager.request_proof(body.dict())
    return ProofExchangeResponse(
      proof_exchange_id=response["proof_exchange_id"],
      state=response["state"],
      record=response,
    )

  async def offer_credential(self, body: CredentialOfferRequest):
    if not self.manager.is_running:
      raise HTTPException(status_code=400, detail="Agent not started")

    payload = await self.manager.offer_credential(body.dict())
    return CredentialOfferResponse(
      credential_exchange_id=payload["cred_ex_record"]["cred_ex_id"],
      state=payload["cred_ex_record"]["state"],
      record=payload["cred_ex_record"],
    )
