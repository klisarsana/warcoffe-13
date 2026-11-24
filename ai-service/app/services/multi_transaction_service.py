from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime

from app.parsers.date import find_date_matches, parse_transaction_date
from app.schemas.transaction import (
    DraftItem,
    MultiDraftStatus,
    ParseTransactionRequest,
    ParseTransactionResponse,
    ParseTransactionsResponse,
)
from app.services.parse_transaction_service import parse_transaction


MAX_TRANSACTION_DRAFTS = 20
MAX_SOURCE_SEGMENTS = 100


@dataclass(frozen=True)
class TransactionBlock:
    transaction_date: str
    source_text: str


def _today_iso(now: datetime | None = None) -> str:
    return parse_transaction_date("", now)


def _clean_fragment(value: str) -> str:
    return value.strip(" \t\r\n,.;:-")


def split_transaction_blocks(
    text: str,
    now: datetime | None = None,
) -> list[TransactionBlock]:
    """Pecah teks menjadi blok berdasarkan tanggal yang muncul.

    Baris tanpa tanggal mengikuti tanggal terakhir. Teks sebelum tanggal
    pertama memakai tanggal hari ini. Satu baris yang memuat beberapa tanggal
    juga dipecah pada setiap tanggal.
    """
    current_date = _today_iso(now)
    current_parts: list[str] = []
    blocks: list[TransactionBlock] = []
    has_seen_date = False

    def flush() -> None:
        if not current_parts:
            return
        source_text = re.sub(
            r"\s+", " ", ", ".join(current_parts)
        ).strip(" ,")
        current_parts.clear()
        if source_text:
            blocks.append(
                TransactionBlock(
                    transaction_date=current_date,
                    source_text=source_text,
                )
            )

    segments = [
        segment.strip()
        for segment in re.split(r"[\r\n;]+", text or "")
        if segment.strip()
    ]

    for segment in segments[:MAX_SOURCE_SEGMENTS]:
        matches = find_date_matches(segment, now)
        if not matches:
            current_parts.append(segment)
            continue

        first_match = matches[0]
        prefix = _clean_fragment(segment[: first_match.start])

        if not has_seen_date:
            # Baris tanpa tanggal sebelum tanggal pertama tetap memakai hari ini.
            if current_parts:
                flush()

            # Teks pada baris yang sama sebelum tanggal pertama adalah milik
            # tanggal tersebut, misalnya "laku kopi 2 tanggal 20 November".
            current_date = first_match.value.isoformat()
            if prefix:
                current_parts.append(prefix)
            current_parts.append(
                segment[first_match.start : first_match.end]
            )
            has_seen_date = True
        else:
            if prefix:
                current_parts.append(prefix)
            flush()
            current_date = first_match.value.isoformat()
            current_parts.append(
                segment[first_match.start : first_match.end]
            )

        cursor = first_match.end
        for found in matches[1:]:
            prefix = _clean_fragment(segment[cursor : found.start])
            if prefix:
                current_parts.append(prefix)

            # Teks di antara dua tanggal masih milik tanggal sebelumnya.
            flush()
            current_date = found.value.isoformat()
            current_parts.append(segment[found.start : found.end])
            cursor = found.end

        suffix = _clean_fragment(segment[cursor:])
        if suffix:
            current_parts.append(suffix)

    flush()
    return blocks


def _merge_items(items: list[DraftItem]) -> list[DraftItem]:
    """Gabungkan item yang sama pada tanggal yang sama."""
    merged: dict[tuple[str, str, int | None], DraftItem] = {}

    for item in items:
        key = (
            item.matched_menu_item_id or item.item_name.lower(),
            item.variant_label,
            item.unit_price,
        )
        existing = merged.get(key)
        if existing is None:
            merged[key] = item.model_copy()
            continue

        line_total = (
            existing.line_total + item.line_total
            if existing.line_total is not None and item.line_total is not None
            else None
        )
        merged[key] = existing.model_copy(
            update={
                "quantity": existing.quantity + item.quantity,
                "line_total": line_total,
            }
        )

    return list(merged.values())


def _merge_successful_group(
    group: list[ParseTransactionResponse],
) -> ParseTransactionResponse:
    first = group[0]
    source_text = "\n".join(
        draft.source_text for draft in group if draft.source_text
    )
    confidence_values = [
        draft.confidence_score
        for draft in group
        if draft.confidence_score is not None
    ]
    confidence = (
        sum(confidence_values) / len(confidence_values)
        if confidence_values
        else None
    )

    if first.draft_type == "INCOME_SALE":
        items = _merge_items([item for draft in group for item in draft.items])
        known_totals = [item.line_total for item in items]
        total_amount = (
            sum(value for value in known_totals if value is not None)
            if items and all(value is not None for value in known_totals)
            else None
        )
        message = (
            f"Draft penjualan gabungan dari {len(group)} baris berhasil dibuat. "
            "Mohon periksa item, varian, dan total sebelum menyimpan."
        )
        expense_description = None
    else:
        amounts = [draft.total_amount for draft in group]
        total_amount = (
            sum(value for value in amounts if value is not None)
            if all(value is not None for value in amounts)
            else None
        )
        descriptions: list[str] = []
        for draft in group:
            description = (draft.expense_description or "").strip()
            if description and description not in descriptions:
                descriptions.append(description)
        expense_description = " + ".join(descriptions) or None
        items = []
        message = (
            f"Draft pengeluaran gabungan dari {len(group)} baris berhasil dibuat. "
            "Mohon periksa kategori dan nominal sebelum menyimpan."
        )

    return first.model_copy(
        update={
            "items": items,
            "total_amount": total_amount,
            "expense_description": expense_description,
            "confidence_score": (
                round(confidence, 4) if confidence is not None else None
            ),
            "source_text": source_text or first.source_text,
            "assistant_message": message,
            "missing_fields": [],
        }
    )


def _merge_drafts(
    drafts: list[ParseTransactionResponse],
) -> list[ParseTransactionResponse]:
    """Gabung draft sukses dengan tanggal, jenis, dan metode bayar yang sama."""
    groups: dict[
        tuple[str, str, str | None], list[ParseTransactionResponse]
    ] = {}
    for draft in drafts:
        if draft.status != "SUCCESS":
            continue
        key = (
            draft.transaction_date,
            draft.draft_type,
            draft.payment_method,
        )
        groups.setdefault(key, []).append(draft)

    merged_by_key = {
        key: _merge_successful_group(group) if len(group) > 1 else group[0]
        for key, group in groups.items()
    }

    result: list[ParseTransactionResponse] = []
    emitted: set[tuple[str, str, str | None]] = set()
    for draft in drafts:
        if draft.status != "SUCCESS":
            result.append(draft)
            continue

        key = (
            draft.transaction_date,
            draft.draft_type,
            draft.payment_method,
        )
        if key in emitted:
            continue
        emitted.add(key)
        result.append(merged_by_key[key])

    return result


def _aggregate_status(
    drafts: list[ParseTransactionResponse],
    *,
    limited: bool,
) -> MultiDraftStatus:
    if not drafts:
        return "INCOMPLETE"

    statuses = [draft.status for draft in drafts]
    success_count = statuses.count("SUCCESS")

    if success_count == len(drafts) and not limited:
        return "SUCCESS"
    if success_count > 0:
        return "PARTIAL"
    if "INCOMPLETE" in statuses:
        return "INCOMPLETE"
    if all(status == "OUT_OF_CONTEXT" for status in statuses):
        return "OUT_OF_CONTEXT"
    return "SERVICE_UNAVAILABLE"


def _aggregate_message(
    drafts: list[ParseTransactionResponse],
    *,
    limited: bool,
) -> str:
    total = len(drafts)
    success_count = sum(draft.status == "SUCCESS" for draft in drafts)
    incomplete_count = sum(draft.status == "INCOMPLETE" for draft in drafts)
    out_of_context_count = sum(
        draft.status == "OUT_OF_CONTEXT" for draft in drafts
    )

    if total == 0:
        message = (
            "Tidak ada kalimat transaksi yang dapat diproses. Masukkan tanggal "
            "dan item, misalnya: '10 November terjual 5 kopi'."
        )
    elif success_count == total:
        message = (
            f"{success_count} draft transaksi berhasil dibuat. Tanggal dan item "
            "mengikuti teks. Mohon periksa semuanya sebelum menyimpan."
        )
    elif success_count > 0:
        message = (
            f"{success_count} dari {total} draft siap disimpan. "
            f"{total - success_count} draft masih perlu diperiksa."
        )
    elif incomplete_count > 0:
        message = (
            f"{incomplete_count} draft belum lengkap. Lengkapi data yang kurang "
            "atau gunakan pencatatan manual."
        )
    elif out_of_context_count == total:
        message = (
            "Teks tidak terdeteksi sebagai transaksi penjualan atau pengeluaran. "
            "Sertakan tanggal dan nama item, misalnya: '10 November terjual 5 kopi'."
        )
    else:
        message = (
            "Layanan AI tidak dapat memproses teks saat ini. Silakan gunakan "
            "pencatatan manual di halaman Kasir (POS) atau Pengeluaran."
        )

    if limited:
        message += (
            f" Hanya {MAX_TRANSACTION_DRAFTS} draft pertama yang ditampilkan; "
            "pecah teks menjadi beberapa input bila perlu."
        )
    return message


def parse_transactions(
    request: ParseTransactionRequest,
    *,
    now: datetime | None = None,
) -> ParseTransactionsResponse:
    blocks = split_transaction_blocks(request.text, now)

    if not blocks:
        draft = parse_transaction(request)
        return ParseTransactionsResponse(
            status=_aggregate_status([draft], limited=False),
            drafts=[draft],
            assistant_message=_aggregate_message([draft], limited=False),
            requires_owner_confirmation=True,
        )

    parsed: list[ParseTransactionResponse] = []
    for block in blocks:
        block_request = ParseTransactionRequest(
            text=block.source_text,
            menu_catalog_hints=request.menu_catalog_hints,
        )
        parsed.append(
            parse_transaction(
                block_request,
                forced_date=block.transaction_date,
                source_text=block.source_text,
            )
        )

    drafts = _merge_drafts(parsed)
    limited = len(drafts) > MAX_TRANSACTION_DRAFTS
    if limited:
        drafts = drafts[:MAX_TRANSACTION_DRAFTS]

    return ParseTransactionsResponse(
        status=_aggregate_status(drafts, limited=limited),
        drafts=drafts,
        assistant_message=_aggregate_message(drafts, limited=limited),
        requires_owner_confirmation=True,
    )
