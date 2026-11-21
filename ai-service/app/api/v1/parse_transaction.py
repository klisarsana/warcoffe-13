from __future__ import annotations

import logging

from fastapi import APIRouter

from app.parsers.date import parse_transaction_date
from app.schemas.transaction import ParseTransactionRequest, ParseTransactionResponse
from app.services.parse_transaction_service import parse_transaction


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/parse-transaction", response_model=ParseTransactionResponse)
def parse_transaction_endpoint(
    payload: ParseTransactionRequest,
) -> ParseTransactionResponse:
    try:
        return parse_transaction(payload)
    except Exception as exc:  # pragma: no cover - jalur fallback darurat
        logger.exception("Gagal memproses parse-transaction: %s", exc)
        return ParseTransactionResponse(
            status="SERVICE_UNAVAILABLE",
            draft_type="UNKNOWN",
            predicted_category="-",
            transaction_date=parse_transaction_date(payload.text),
            items=[],
            total_amount=None,
            missing_fields=[],
            assistant_message=(
                "Layanan AI sedang mengalami kendala internal. Silakan gunakan "
                "pencatatan manual di halaman Kasir (POS) atau Pengeluaran."
            ),
            requires_owner_confirmation=True,
        )
