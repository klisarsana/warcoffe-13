from __future__ import annotations

from dataclasses import dataclass, field

from rapidfuzz import fuzz

from app.parsers.money import total_money
from app.utils.text import (
    EXPENSE_KEYWORDS,
    SALE_KEYWORDS,
    apply_aliases,
    contains_any,
    normalize_for_match,
    normalize_text,
)


@dataclass(frozen=True)
class IntentResult:
    draft_type: str
    confidence: float
    sale_signals: list[str] = field(default_factory=list)
    expense_signals: list[str] = field(default_factory=list)
    menu_hint_present: bool = False
    has_amount: bool = False


def _menu_hint_present(text: str, menu_hints: list[str]) -> bool:
    if not menu_hints:
        return False
    normalized_text = apply_aliases(normalize_for_match(text))
    for hint in menu_hints:
        normalized_hint = apply_aliases(normalize_for_match(hint))
        if not normalized_hint:
            continue
        if normalized_hint in normalized_text:
            return True
        if fuzz.partial_ratio(normalized_hint, normalized_text) >= 90:
            return True
    return False


def detect_intent(text: str, menu_hints: list[str]) -> IntentResult:
    sale_signals = contains_any(text, SALE_KEYWORDS)
    expense_signals = contains_any(text, EXPENSE_KEYWORDS)
    menu_hint_present = _menu_hint_present(text, menu_hints)
    has_amount = total_money(text) is not None

    if sale_signals and not expense_signals:
        return IntentResult(
            "INCOME_SALE",
            0.9,
            sale_signals,
            expense_signals,
            menu_hint_present,
            has_amount,
        )

    if expense_signals and not sale_signals:
        return IntentResult(
            "EXPENSE",
            0.9,
            sale_signals,
            expense_signals,
            menu_hint_present,
            has_amount,
        )

    if sale_signals and expense_signals:
        if len(sale_signals) > len(expense_signals):
            return IntentResult(
                "INCOME_SALE",
                0.75,
                sale_signals,
                expense_signals,
                menu_hint_present,
                has_amount,
            )
        if len(expense_signals) > len(sale_signals):
            return IntentResult(
                "EXPENSE",
                0.75,
                sale_signals,
                expense_signals,
                menu_hint_present,
                has_amount,
            )
        if menu_hint_present and not has_amount:
            return IntentResult(
                "INCOME_SALE",
                0.6,
                sale_signals,
                expense_signals,
                menu_hint_present,
                has_amount,
            )
        if has_amount and not menu_hint_present:
            return IntentResult(
                "EXPENSE",
                0.6,
                sale_signals,
                expense_signals,
                menu_hint_present,
                has_amount,
            )
        return IntentResult(
            "UNKNOWN",
            0.35,
            sale_signals,
            expense_signals,
            menu_hint_present,
            has_amount,
        )

    if menu_hint_present:
        return IntentResult(
            "INCOME_SALE",
            0.65,
            sale_signals,
            expense_signals,
            menu_hint_present,
            has_amount,
        )

    # Nominal tanpa konteks sama sekali, misalnya "35rb", dianggap ambigu.
    if has_amount and len(normalize_text(text).split()) >= 2:
        return IntentResult(
            "EXPENSE",
            0.55,
            sale_signals,
            expense_signals,
            menu_hint_present,
            has_amount,
        )

    return IntentResult(
        "UNKNOWN",
        0.2,
        sale_signals,
        expense_signals,
        menu_hint_present,
        has_amount,
    )
