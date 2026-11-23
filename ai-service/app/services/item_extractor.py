from __future__ import annotations

import re
from dataclasses import dataclass

from app.parsers.date import strip_date_phrases
from app.parsers.money import find_money_matches, strip_money_matches
from app.parsers.quantity import find_quantity, strip_quantity
from app.schemas.transaction import DraftItem
from app.services.menu_matcher import match_menu_item, select_unit_price
from app.utils.text import (
    SALE_KEYWORDS,
    clean_item_candidate,
    detect_variant,
    normalize_text,
    remove_phrases,
    remove_variant_words,
    strip_filler,
)


SPLIT_RE = re.compile(r"[,;\n]|\bdan\b|\+", re.IGNORECASE)
IGNORED_CANDIDATES = {"", "rp", "total", "jumlah", "harga", "bayar", "laku", "jual", "terjual"}


@dataclass(frozen=True)
class ExtractionResult:
    items: list[DraftItem]
    unmatched_without_price: bool


def _split_segments(text: str) -> list[str]:
    return [segment.strip() for segment in SPLIT_RE.split(text) if segment.strip()]


def extract_sale_items(text: str, menu_hints: list[str]) -> ExtractionResult:
    items: list[DraftItem] = []
    unmatched_without_price = False
    text = strip_date_phrases(text)

    for raw_segment in _split_segments(text):
        segment = strip_filler(raw_segment)
        segment = remove_phrases(segment, SALE_KEYWORDS)
        segment = re.sub(
            r"\b(sebanyak|jumlah|total|senilai|seharga|dengan|untuk)\b",
            " ",
            segment,
            flags=re.IGNORECASE,
        )
        segment = normalize_text(segment)
        if not segment:
            continue

        money_matches = find_money_matches(segment)
        explicit_amount = money_matches[0].amount if money_matches else None
        segment_without_money = strip_money_matches(segment, money_matches)

        quantity_match = find_quantity(segment_without_money)
        quantity = quantity_match.quantity if quantity_match else 1
        segment_without_quantity = strip_quantity(segment_without_money, quantity_match)

        variant_label = detect_variant(segment_without_quantity) or "Standar"
        segment_without_variant = remove_variant_words(segment_without_quantity)

        candidate = clean_item_candidate(segment_without_variant)
        if candidate.lower() in IGNORED_CANDIDATES or len(candidate) < 2:
            continue

        match = match_menu_item(candidate, menu_hints)
        if match is not None:
            item_name = match.matched_name
            matched_id = match.item.get("id") if match.item else None
            confidence = match.score
            unit_price = select_unit_price(match.item, variant_label)
        else:
            item_name = candidate
            matched_id = None
            confidence = 0.4
            unit_price = None

        if explicit_amount is not None:
            if quantity > 1:
                unit_price = int(round(explicit_amount / quantity))
                line_total = unit_price * quantity
            else:
                unit_price = explicit_amount
                line_total = explicit_amount
        else:
            line_total = unit_price * quantity if unit_price is not None else None

        if match is None and explicit_amount is None:
            unmatched_without_price = True

        items.append(
            DraftItem(
                raw_item_text=raw_segment.strip(),
                matched_menu_item_id=matched_id,
                item_name=item_name,
                variant_label=variant_label,
                quantity=quantity,
                unit_price=unit_price,
                line_total=line_total,
                confidence=round(float(confidence), 4),
            )
        )

    return ExtractionResult(items=items, unmatched_without_price=unmatched_without_price)
