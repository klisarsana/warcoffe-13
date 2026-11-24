from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_root_health_alias_matches_api_v1_health() -> None:
    alias = client.get("/health")
    canonical = client.get("/api/v1/health")

    assert alias.status_code == 200
    assert canonical.status_code == 200
    assert alias.json() == canonical.json()
