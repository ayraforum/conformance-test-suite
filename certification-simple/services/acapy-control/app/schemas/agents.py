from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class AgentStartRequest(BaseModel):
  profile: Literal["issuer", "verifier"] = "issuer"
  use_ledger: bool = False


class AgentStartResponse(BaseModel):
  status: Literal["started"]
  profile: str
  admin_url: str


class AgentStopResponse(BaseModel):
  status: Literal["stopped"]


class InvitationResponse(BaseModel):
  invitation_url: str = Field(..., alias="invitation_url")
  connection_id: str
  invitation: dict


class ProofRequest(BaseModel):
  connection_id: str
  protocol_version: Literal["v2"] = "v2"
  proof_formats: Optional[dict] = None
  presentation_request: Optional[dict] = None
  comment: Optional[str] = None


class ProofExchangeResponse(BaseModel):
  proof_exchange_id: str
  state: Literal["request-sent", "presentation-received", "done", "abandoned"]
  record: dict

class ProofVerifyRequest(BaseModel):
  proof_exchange_id: str
  timeout_ms: Optional[int] = 120000
  connection_id: Optional[str] = None


class CredentialOfferRequest(BaseModel):
  connection_id: str
  credential_definition_id: str
  attributes: dict
  protocol_version: Literal["v2"] = "v2"


class CredentialOfferResponse(BaseModel):
  credential_exchange_id: str
  state: str
  record: dict


class WaitForConnectionRequest(BaseModel):
  connection_id: str
  timeout_ms: Optional[int] = 120000


class ConnectionRecordResponse(BaseModel):
  connection_id: str
  state: str
  record: dict
