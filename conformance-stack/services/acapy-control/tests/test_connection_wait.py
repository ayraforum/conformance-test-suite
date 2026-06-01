from __future__ import annotations

import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from acapy_controller.process_manager import AcaPyProcessManager


class ConnectionWaitTests(unittest.IsolatedAsyncioTestCase):
  async def test_active_webhook_does_not_return_stale_admin_record(self):
    manager = AcaPyProcessManager()
    manager._profile = object()
    manager._active_connections.add("conn-1")

    records = [
      {"connection_id": "conn-1", "state": "request", "rfc23_state": "request-sent"},
      {"connection_id": "conn-1", "state": "active", "rfc23_state": "completed"},
    ]

    async def get_connection(connection_id: str) -> dict:
      self.assertEqual(connection_id, "conn-1")
      return records.pop(0)

    manager.get_connection = get_connection  # type: ignore[method-assign]

    result = await manager.wait_for_connection("conn-1", timeout_ms=3000)

    self.assertEqual(result["state"], "active")
    self.assertEqual(records, [])


if __name__ == "__main__":
  unittest.main()
