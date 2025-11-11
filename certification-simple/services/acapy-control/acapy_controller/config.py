from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

import yaml


@dataclass
class ProfileConfig:
  """Typed view over the ACA-Py profile YAML files."""

  label: str
  wallet_type: str
  wallet_name: str
  wallet_key: str
  admin_port: int
  http_port: int
  transport: List[str] = field(default_factory=lambda: ["http"])
  endpoints: List[str] = field(default_factory=list)
  seed: Optional[str] = None
  genesis_url: Optional[str] = None
  genesis_file: Optional[str] = None
  mediation: Optional[Dict[str, str]] = None
  extra_args: List[str] = field(default_factory=list)

  @property
  def admin_url(self) -> str:
    return f"http://127.0.0.1:{self.admin_port}"

  def to_cli_args(self) -> List[str]:
    args: List[str] = [
      "aca-py",
      "start",
      "--label",
      self.label,
      "--admin",
      "0.0.0.0",
      str(self.admin_port),
      "--wallet-type",
      self.wallet_type,
      "--wallet-name",
      self.wallet_name,
      "--wallet-key",
      self.wallet_key,
      "--auto-accept-invites",
      "--auto-provision",
      "--admin-insecure-mode",
    ]

    for transport in self.transport:
      args.extend(["--inbound-transport", transport, "0.0.0.0", str(self.http_port)])
      args.extend(["--outbound-transport", transport])

    if self.seed:
      args.extend(["--seed", self.seed])

    if self.genesis_file:
      args.extend(["--genesis-file", self.genesis_file])
    elif self.genesis_url:
      args.extend(["--genesis-url", self.genesis_url])

    for endpoint in self.endpoints:
      args.extend(["--endpoint", endpoint])

    args.extend(self.extra_args)
    return args


def load_profile(path: Path) -> ProfileConfig:
  data = yaml.safe_load(path.read_text())
  return ProfileConfig(
    label=data["label"],
    wallet_type=data["wallet"]["type"],
    wallet_name=data["wallet"]["name"],
    wallet_key=data["wallet"]["key"],
    admin_port=int(data["ports"]["admin"]),
    http_port=int(data["ports"]["http"]),
    transport=data.get("transport", ["http"]),
    endpoints=data.get("endpoints", []),
    seed=data.get("seed"),
    genesis_url=data.get("genesis_url"),
    genesis_file=data.get("genesis_file"),
    mediation=data.get("mediation"),
    extra_args=data.get("extra_args", []),
  )
