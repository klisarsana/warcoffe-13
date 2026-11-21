from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _payload(text: str, menu_hints: list[str]) -> dict:
    return {"text": text, "menu_catalog_hints": menu_hints}


def test_health_endpoint() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "degraded"}
    assert "classes" in body


def test_sale_success(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json=_payload("laku Kopi Liong panas 2, Indomie Telur 1", menu_hints),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert body["draft_type"] == "INCOME_SALE"
    assert body["requires_owner_confirmation"] is True
    assert len(body["items"]) == 2
    assert body["total_amount"] == 21000
    names = {item["item_name"] for item in body["items"]}
    assert "Kopi Liong" in names
    assert "Indomie Telur" in names


def test_expense_success(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json=_payload("beli gas elpiji dan es batu Rp35.000", menu_hints),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert body["draft_type"] == "EXPENSE"
    assert body["total_amount"] == 35000
    assert body["predicted_category"] == "Gas, Listrik & Air"
    assert body["requires_owner_confirmation"] is True


def test_expense_incomplete(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json=_payload("beli kopi", menu_hints),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "INCOMPLETE"
    assert body["draft_type"] == "EXPENSE"
    assert "total_amount" in body["missing_fields"]


def test_out_of_context(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json=_payload("cuaca hari ini cerah", menu_hints),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "OUT_OF_CONTEXT"
    assert body["draft_type"] == "UNKNOWN"
    assert body["requires_owner_confirmation"] is True


def test_typo_item(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json=_payload("indomi telor 2", menu_hints),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert body["items"][0]["item_name"] == "Indomie Telur"


def test_empty_text_rejected() -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json={"text": "", "menu_catalog_hints": []},
    )
    assert response.status_code == 422
