from __future__ import annotations

from app.services.intent_detector import detect_intent


def test_sale_intent(menu_hints: list[str]) -> None:
    result = detect_intent("laku kopi liong panas 2", menu_hints)
    assert result.draft_type == "INCOME_SALE"


def test_expense_intent(menu_hints: list[str]) -> None:
    result = detect_intent("beli gas elpiji 35rb", menu_hints)
    assert result.draft_type == "EXPENSE"


def test_menu_without_verb_is_sale(menu_hints: list[str]) -> None:
    result = detect_intent("kopi liong 2", menu_hints)
    assert result.draft_type == "INCOME_SALE"


def test_out_of_context(menu_hints: list[str]) -> None:
    result = detect_intent("cuaca hari ini cerah", menu_hints)
    assert result.draft_type == "UNKNOWN"


def test_expense_with_menu_word(menu_hints: list[str]) -> None:
    result = detect_intent("beli kopi 2", menu_hints)
    assert result.draft_type == "EXPENSE"
