from __future__ import annotations

import logging

from fastapi import APIRouter

from app.parsers.date import parse_transaction_date
from app.schemas.transaction import (
    ParseTransactionRequest,
    ParseTransactionResponse,
    ParseTransactionsResponse,
)
from app.services.multi_transaction_service import parse_transactions
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


@router.post("/parse-transactions", response_model=ParseTransactionsResponse)
def parse_transactions_endpoint(
    payload: ParseTransactionRequest,
) -> ParseTransactionsResponse:
    try:
        return parse_transactions(payload)
    except Exception as exc:  # pragma: no cover - jalur fallback darurat
        logger.exception("Gagal memproses parse-transactions: %s", exc)
        return ParseTransactionsResponse(
            status="SERVICE_UNAVAILABLE",
            drafts=[],
            assistant_message=(
                "Layanan AI sedang mengalami kendala internal. Silakan gunakan "
                "pencatatan manual di halaman Kasir (POS) atau Pengeluaran."
            ),
            requires_owner_confirmation=True,
        )
