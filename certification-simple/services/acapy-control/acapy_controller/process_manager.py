from __future__ import annotations

import asyncio
import logging
import signal
from pathlib import Path
from typing import Optional

import httpx

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

    async with httpx.AsyncClient() as client:
      resp = await client.post(
        f"{self.admin_url}/present-proof-2.0/send-request",
        json=body,
      )
      resp.raise_for_status()
      return resp.json()

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
