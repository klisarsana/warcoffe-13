from __future__ import annotations

from app.parsers.date import parse_transaction_date
from app.schemas.transaction import (
    DraftItem,
    ParseTransactionRequest,
    ParseTransactionResponse,
)
from app.services.category_classifier import predict_sale_category
from app.services.expense_extractor import extract_expense
from app.services.intent_detector import detect_intent
from app.services.item_extractor import extract_sale_items
from app.utils.text import normalize_text


def _base_response(
    *,
    status: str,
    draft_type: str,
    transaction_date: str,
    message: str,
    predicted_category: str = "-",
    classifier_model_used: str | None = None,
    confidence_score: float | None = None,
    items: list[DraftItem] | None = None,
    total_amount: int | None = None,
    expense_description: str | None = None,
    missing_fields: list[str] | None = None,
) -> ParseTransactionResponse:
    return ParseTransactionResponse(
        status=status,
        draft_type=draft_type,
        predicted_category=predicted_category,
        classifier_model_used=classifier_model_used,
        confidence_score=round(confidence_score, 4) if confidence_score is not None else None,
        transaction_date=transaction_date,
        items=items or [],
        total_amount=total_amount,
        expense_description=expense_description,
        missing_fields=missing_fields or [],
        assistant_message=message,
        requires_owner_confirmation=True,
    )


def parse_transaction(request: ParseTransactionRequest) -> ParseTransactionResponse:
    text = normalize_text(request.text)
    transaction_date = parse_transaction_date(text)

    if not text:
        return _base_response(
            status="INCOMPLETE",
            draft_type="UNKNOWN",
            transaction_date=transaction_date,
            message="Teks transaksi kosong. Mohon masukkan kalimat transaksi.",
            missing_fields=["text"],
        )

    intent = detect_intent(text, request.menu_catalog_hints)

    if intent.draft_type == "UNKNOWN":
        if intent.sale_signals or intent.expense_signals:
            return _base_response(
                status="INCOMPLETE",
                draft_type="UNKNOWN",
                transaction_date=transaction_date,
                message=(
                    "Jenis transaksi belum jelas. Sebutkan apakah ini penjualan "
                    "(misalnya: 'laku Kopi Liong 2') atau pengeluaran "
                    "(misalnya: 'beli gas Rp35.000')."
                ),
                confidence_score=intent.confidence,
                missing_fields=["draft_type"],
            )

        return _base_response(
            status="OUT_OF_CONTEXT",
            draft_type="UNKNOWN",
            transaction_date=transaction_date,
            message=(
                "Teks ini tidak terdeteksi sebagai transaksi. Contoh: "
                "'laku Kopi Liong 2' atau 'beli gas Rp35.000'."
            ),
            confidence_score=intent.confidence,
        )

    if intent.draft_type == "INCOME_SALE":
        extraction = extract_sale_items(text, request.menu_catalog_hints)
        category = predict_sale_category(text)

        if not extraction.items:
            return _base_response(
                status="INCOMPLETE",
                draft_type="INCOME_SALE",
                transaction_date=transaction_date,
                message=(
                    "Nama barang belum dikenali. Mohon sebutkan nama menu yang tersedia, "
                    "misalnya: 'laku Kopi Liong 2'."
                ),
                predicted_category=category.label,
                classifier_model_used=category.model_name,
                confidence_score=category.confidence,
                missing_fields=["items"],
            )

        if extraction.unmatched_without_price:
            return _base_response(
                status="INCOMPLETE",
                draft_type="INCOME_SALE",
                transaction_date=transaction_date,
                message=(
                    "Ada item yang belum dikenali dan tidak memiliki harga. "
                    "Mohon gunakan nama menu yang tersedia atau sertakan harganya, "
                    "misalnya: 'laku Kopi Liong 2 Rp10.000'."
                ),
                predicted_category=category.label,
                classifier_model_used=category.model_name,
                confidence_score=category.confidence,
                items=extraction.items,
                missing_fields=["items"],
            )

        known_totals = [item.line_total for item in extraction.items]
        total_amount = (
            sum(value for value in known_totals if value is not None)
            if all(value is not None for value in known_totals)
            else None
        )

        return _base_response(
            status="SUCCESS",
            draft_type="INCOME_SALE",
            transaction_date=transaction_date,
            message=(
                "Draft penjualan berhasil dibuat. Mohon periksa item, varian, dan "
                "total sebelum menyimpan."
            ),
            predicted_category=category.label,
            classifier_model_used=category.model_name,
            confidence_score=category.confidence,
            items=extraction.items,
            total_amount=total_amount,
        )

    expense = extract_expense(text)

    if expense.amount is None or expense.amount <= 0:
        return _base_response(
            status="INCOMPLETE",
            draft_type="EXPENSE",
            transaction_date=transaction_date,
            message=(
                "Nominal pengeluaran belum disebutkan. Mohon lengkapi, misalnya: "
                "'beli gas Rp35.000'."
            ),
            predicted_category=expense.category,
            classifier_model_used=expense.model_name,
            confidence_score=expense.confidence,
            expense_description=expense.description,
            missing_fields=["total_amount"],
        )

    return _base_response(
        status="SUCCESS",
        draft_type="EXPENSE",
        transaction_date=transaction_date,
        message=(
            "Draft pengeluaran berhasil dibuat. Mohon periksa kategori dan nominal "
            "sebelum menyimpan."
        ),
        predicted_category=expense.category,
        classifier_model_used=expense.model_name,
        confidence_score=expense.confidence,
        total_amount=expense.amount,
        expense_description=expense.description,
    )
