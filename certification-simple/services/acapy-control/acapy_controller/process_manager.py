from __future__ import annotations

import asyncio
import logging
import signal
from pathlib import Path
from typing import Optional

import httpx
from httpx import HTTPStatusError
import time

from .config import ProfileConfig, load_profile

LOGGER = logging.getLogger(__name__)


class AcaPyProcessManager:
  """Launch and manage a single ACA-Py process plus its admin client."""

  def __init__(self) -> None:
    self._process: Optional[asyncio.subprocess.Process] = None
    self._profile: Optional[ProfileConfig] = None

  @property
  def admin_url(self) -> str:
    if not self._profile:
      raise RuntimeError("ACA-Py not started")
    return self._profile.admin_url

  @property
  def is_running(self) -> bool:
    return self._process is not None

  async def start(self, profile_path: Path) -> ProfileConfig:
    if self._process:
      await self.stop()

    profile = load_profile(profile_path)
    cmd = profile.to_cli_args()
    LOGGER.info("Starting ACA-Py with command: %s", " ".join(cmd))
    self._process = await asyncio.create_subprocess_exec(*cmd)
    self._profile = profile

    await self._wait_for_admin()
    return profile

  async def stop(self) -> None:
    if not self._process:
      return

    LOGGER.info("Stopping ACA-Py process")
    self._process.send_signal(signal.SIGTERM)
    try:
      await asyncio.wait_for(self._process.wait(), timeout=15)
    except asyncio.TimeoutError:
      LOGGER.warning("ACA-Py did not terminate in time; killing")
      self._process.kill()
      await self._process.wait()
    finally:
      self._process = None
      self._profile = None

  async def create_invitation(self, multi_use: bool = False) -> dict:
    if not self._profile:
      raise RuntimeError("ACA-Py not started")

    async with httpx.AsyncClient() as client:
      resp = await client.post(
        f"{self.admin_url}/connections/create-invitation",
        params={"multi_use": str(multi_use).lower()},
      )
      resp.raise_for_status()
      return resp.json()

  async def request_proof(self, body: dict) -> dict:
    if not self._profile:
      raise RuntimeError("ACA-Py not started")

    payload = self._build_presentation_request_payload(body)

    async with httpx.AsyncClient() as client:
      resp = await client.post(
        f"{self.admin_url}/present-proof-2.0/send-request",
        json=payload,
      )
      resp.raise_for_status()
      record = resp.json()
      proof_exchange_id = (
        record.get("proof_exchange_id")
        or record.get("presentation_exchange_id")
        or record.get("pres_ex_id")
      )
      if not proof_exchange_id:
        raise RuntimeError("ACA-Py response missing proof exchange id")
      record["proof_exchange_id"] = proof_exchange_id
      record.setdefault(
        "state",
        record.get("presentation_state")
        or record.get("presentation_exchange_state")
        or "request-sent",
      )
      return record

  async def offer_credential(self, body: dict) -> dict:
    if not self._profile:
      raise RuntimeError("ACA-Py not started")

    async with httpx.AsyncClient() as client:
      resp = await client.post(
        f"{self.admin_url}/issue-credential-2.0/send-offer",
        json=body,
      )
      resp.raise_for_status()
      return resp.json()

  async def wait_for_connection(self, connection_id: str, timeout_ms: int = 120000) -> dict:
    deadline = time.monotonic() + timeout_ms / 1000
    while time.monotonic() < deadline:
      record = await self.get_connection(connection_id)
      if not record:
        await asyncio.sleep(1)
        continue
      state = record.get("state") or record.get("rfc23_state")
      LOGGER.info("Connection %s state=%s", connection_id, state)
      if state in {"active", "completed"}:
        return record
      await asyncio.sleep(1)
    raise RuntimeError(f"Connection {connection_id} did not become active in time")

  async def get_connection(self, connection_id: str) -> dict:
    if not self._profile:
      raise RuntimeError("ACA-Py not started")
    async with httpx.AsyncClient() as client:
      resp = await client.get(f"{self.admin_url}/connections/{connection_id}")
      resp.raise_for_status()
      data = resp.json()
      return data.get("result") or data.get("connection") or data

  async def wait_for_proof(self, proof_exchange_id: str, timeout_ms: int = 120000, connection_id: Optional[str] = None) -> dict:
    deadline = time.monotonic() + timeout_ms / 1000
    while time.monotonic() < deadline:
      try:
        record = await self.get_proof(proof_exchange_id, connection_id=connection_id)
      except HTTPStatusError as err:
        if err.response.status_code == 404:
          LOGGER.info("Proof %s not yet available; retrying", proof_exchange_id)
          await asyncio.sleep(1)
          continue
        raise
      state = record.get("state") or record.get("presentation_state") or record.get("verified")
      if state in {"presentation-received", "done", "abandoned"}:
        return record
      await asyncio.sleep(1)
    raise RuntimeError(f"Proof exchange {proof_exchange_id} did not progress in time")

  async def verify_proof(self, proof_exchange_id: str, connection_id: Optional[str] = None) -> dict:
    if not self._profile:
      raise RuntimeError("ACA-Py not started")
    async with httpx.AsyncClient() as client:
      resp = await client.post(
        f"{self.admin_url}/present-proof-2.0/records/{proof_exchange_id}/verify-presentation"
      )
      resp.raise_for_status()
      return resp.json()

  async def get_proof(self, proof_exchange_id: str, connection_id: Optional[str] = None) -> dict:
    if not self._profile:
      raise RuntimeError("ACA-Py not started")
    async with httpx.AsyncClient() as client:
      resp = await client.get(
        f"{self.admin_url}/present-proof-2.0/records/{proof_exchange_id}"
      )
      if resp.status_code == 404 and connection_id:
        fallback = await client.get(
          f"{self.admin_url}/present-proof-2.0/records",
          params={"connection_id": connection_id},
        )
        fallback.raise_for_status()
        fallback_payload = fallback.json()
        records = fallback_payload.get("results") or fallback_payload.get("records") or []
        if records:
          records.sort(key=lambda r: r.get("updated_at") or r.get("created_at") or "", reverse=True)
          resolved = records[0]
          fallback_id = resolved.get("pres_ex_id") or resolved.get("presentation_exchange_id") or resolved.get("proof_exchange_id")
          chosen_id = fallback_id or proof_exchange_id
          LOGGER.warning(
            "Proof record %s not found; using latest record %s for connection %s",
            proof_exchange_id,
            chosen_id,
            connection_id,
          )
          resolved.setdefault("proof_exchange_id", chosen_id)
          resolved.setdefault("connection_id", connection_id)
          if chosen_id and chosen_id != proof_exchange_id:
            resp = await client.get(
              f"{self.admin_url}/present-proof-2.0/records/{chosen_id}"
            )
            resp.raise_for_status()
            data = resp.json()
            record = data.get("result") or data.get("record") or data
            record.setdefault("proof_exchange_id", chosen_id)
            return record
          return resolved
      resp.raise_for_status()
      data = resp.json()
      return data.get("result") or data.get("record") or data

  async def _wait_for_admin(self) -> None:
    if not self._profile:
      return

    url = f"{self._profile.admin_url}/status"
    async with httpx.AsyncClient(timeout=2.0) as client:
      for _ in range(40):
        try:
          resp = await client.get(url)
          if resp.status_code == 200:
            LOGGER.info("ACA-Py admin API is ready")
            return
        except httpx.HTTPError:
          await asyncio.sleep(0.5)
      raise RuntimeError("ACA-Py admin API did not become ready in time")

  def _build_presentation_request_payload(self, body: dict) -> dict:
    connection_id = body.get("connection_id")
    if not connection_id:
      raise ValueError("connection_id is required to send a proof request")

    payload: dict = {
      "connection_id": connection_id,
    }
    if comment := body.get("comment"):
      payload["comment"] = comment

    presentation_request = body.get("presentation_request")
    if not presentation_request:
      proof_formats = body.get("proof_formats") or {}
      presentation_request = {}
      anoncreds = proof_formats.get("anoncreds") or proof_formats.get("indy")
      if anoncreds:
        presentation_request["indy"] = anoncreds
      dif = proof_formats.get("dif")
      if dif:
        presentation_request["dif"] = dif

    if not presentation_request:
      raise ValueError("presentation_request or proof_formats must be provided")

    payload["presentation_request"] = presentation_request
    return payload
