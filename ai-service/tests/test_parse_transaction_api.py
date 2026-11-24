from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.parsers.date import parse_transaction_date


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


def test_sale_payment_method_qris(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json=_payload("terjual 5 kopi liong qris", menu_hints),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert body["payment_method"] == "QRIS"
    assert body["items"][0]["item_name"] == "Kopi Liong"
    assert body["items"][0]["quantity"] == 5
    assert body["total_amount"] == 25000


def test_sale_payment_method_transfer(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json=_payload("laku 2 kopi liong transfer bank", menu_hints),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert body["payment_method"] == "TRANSFER"
    assert body["items"][0]["item_name"] == "Kopi Liong"
    assert body["items"][0]["quantity"] == 2


def test_sale_payment_method_defaults_to_cash(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json=_payload("terjual 5 kopi liong", menu_hints),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert body["payment_method"] == "TUNAI"


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
    assert body["payment_method"] is None
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


def test_sale_uses_explicit_past_date(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json=_payload(
            "laku Kopi Liong panas 2 tanggal 20 November 2026",
            menu_hints,
        ),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert body["transaction_date"] == "2026-11-20"
    assert body["items"][0]["item_name"] == "Kopi Liong"


def test_sale_uses_explicit_future_date(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json=_payload("laku Indomie Telur 1 25/12/2026", menu_hints),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert body["transaction_date"] == "2026-12-25"
    assert body["items"][0]["item_name"] == "Indomie Telur"


def test_expense_uses_explicit_date(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json=_payload("beli gas elpiji 35rb 20/11/2026", menu_hints),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert body["transaction_date"] == "2026-11-20"
    assert body["total_amount"] == 35000
    assert "20/11/2026" not in body["expense_description"]


def test_empty_text_rejected() -> None:
    response = client.post(
        "/api/v1/parse-transaction",
        json={"text": "", "menu_catalog_hints": []},
    )
    assert response.status_code == 422


def test_multi_date_creates_one_draft_per_date(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transactions",
        json=_payload(
            "10 november terjual 5 kopi\n7 november terjual 3 indomie",
            menu_hints,
        ),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert body["requires_owner_confirmation"] is True
    assert len(body["drafts"]) == 2

    first, second = body["drafts"]
    assert first["transaction_date"] == "2026-11-10"
    assert first["draft_type"] == "INCOME_SALE"
    assert first["items"][0]["item_name"] == "Kopi Hitam"
    assert first["items"][0]["quantity"] == 5
    assert first["total_amount"] == 20000
    assert first["source_text"]

    assert second["transaction_date"] == "2026-11-07"
    assert second["items"][0]["item_name"].startswith("Indomie")
    assert second["items"][0]["quantity"] == 3
    assert second["total_amount"] == second["items"][0]["line_total"]


def test_multi_date_same_date_and_type_is_grouped(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transactions",
        json=_payload(
            "10 november terjual 5 kopi\n10 november terjual 3 kopi",
            menu_hints,
        ),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert len(body["drafts"]) == 1

    draft = body["drafts"][0]
    assert draft["transaction_date"] == "2026-11-10"
    assert len(draft["items"]) == 1
    assert draft["items"][0]["quantity"] == 8
    assert draft["total_amount"] == 32000


def test_multi_date_same_date_sale_and_expense_are_separate(
    menu_hints: list[str],
) -> None:
    response = client.post(
        "/api/v1/parse-transactions",
        json=_payload(
            "10 november terjual 5 kopi\n10 november beli gas 35rb",
            menu_hints,
        ),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert len(body["drafts"]) == 2

    by_type = {draft["draft_type"]: draft for draft in body["drafts"]}
    assert by_type["INCOME_SALE"]["transaction_date"] == "2026-11-10"
    assert by_type["INCOME_SALE"]["total_amount"] == 20000
    assert by_type["EXPENSE"]["transaction_date"] == "2026-11-10"
    assert by_type["EXPENSE"]["total_amount"] == 35000


def test_multi_date_same_date_different_payment_methods_are_separate(
    menu_hints: list[str],
) -> None:
    response = client.post(
        "/api/v1/parse-transactions",
        json=_payload(
            "10 november terjual 5 kopi qris\n"
            "10 november terjual 3 kopi tunai",
            menu_hints,
        ),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert len(body["drafts"]) == 2

    by_method = {draft["payment_method"]: draft for draft in body["drafts"]}
    assert by_method["QRIS"]["transaction_date"] == "2026-11-10"
    assert by_method["QRIS"]["items"][0]["quantity"] == 5
    assert by_method["TUNAI"]["transaction_date"] == "2026-11-10"
    assert by_method["TUNAI"]["items"][0]["quantity"] == 3


def test_multi_date_line_without_date_follows_last_date(
    menu_hints: list[str],
) -> None:
    response = client.post(
        "/api/v1/parse-transactions",
        json=_payload(
            "10 november terjual 5 kopi\nterjual 3 indomie",
            menu_hints,
        ),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert len(body["drafts"]) == 1

    draft = body["drafts"][0]
    assert draft["transaction_date"] == "2026-11-10"
    names = {item["item_name"] for item in draft["items"]}
    assert "Kopi Hitam" in names
    indomie = next(
        item for item in draft["items"] if item["item_name"].startswith("Indomie")
    )
    assert indomie["quantity"] == 3
    assert draft["total_amount"] == 20000 + indomie["line_total"]


def test_multi_date_partial_status(menu_hints: list[str]) -> None:
    response = client.post(
        "/api/v1/parse-transactions",
        json=_payload(
            "10 november terjual 5 kopi\n7 november beli gas",
            menu_hints,
        ),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "PARTIAL"
    assert len(body["drafts"]) == 2
    assert {draft["status"] for draft in body["drafts"]} == {
        "SUCCESS",
        "INCOMPLETE",
    }
    assert "1 dari 2 draft siap disimpan" in body["assistant_message"]


def test_multi_date_without_date_returns_single_draft(
    menu_hints: list[str],
) -> None:
    response = client.post(
        "/api/v1/parse-transactions",
        json=_payload("terjual 5 kopi", menu_hints),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert len(body["drafts"]) == 1
    assert body["drafts"][0]["draft_type"] == "INCOME_SALE"


def test_multi_date_at_end_of_line_owns_preceding_text(
    menu_hints: list[str],
) -> None:
    response = client.post(
        "/api/v1/parse-transactions",
        json=_payload(
            "laku Kopi Liong panas 2 tanggal 20 November 2026",
            menu_hints,
        ),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert len(body["drafts"]) == 1

    draft = body["drafts"][0]
    assert draft["transaction_date"] == "2026-11-20"
    assert draft["items"][0]["item_name"] == "Kopi Liong"
    assert draft["items"][0]["quantity"] == 2


def test_multi_date_text_before_first_date_uses_today(
    menu_hints: list[str],
) -> None:
    response = client.post(
        "/api/v1/parse-transactions",
        json=_payload(
            "terjual 2 kopi\n10 november terjual 5 kopi",
            menu_hints,
        ),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "SUCCESS"
    assert len(body["drafts"]) == 2

    first, second = body["drafts"]
    assert first["transaction_date"] == parse_transaction_date("")
    assert first["items"][0]["quantity"] == 2
    assert second["transaction_date"] == "2026-11-10"
    assert second["items"][0]["quantity"] == 5
