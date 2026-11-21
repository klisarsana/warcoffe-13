from __future__ import annotations

from app.services.menu_matcher import match_menu_item, select_unit_price


def test_exact_match(menu_hints: list[str]) -> None:
    result = match_menu_item("Kopi Liong", menu_hints)
    assert result is not None
    assert result.item is not None
    assert result.item["id"] == "mr-06"
    assert result.score == 1.0


def test_typo_match(menu_hints: list[str]) -> None:
    result = match_menu_item("indomi telor", menu_hints)
    assert result is not None
    assert result.item is not None
    assert result.item["id"] == "fd-03"


def test_partial_name_match(menu_hints: list[str]) -> None:
    result = match_menu_item("teh botol", menu_hints)
    assert result is not None
    assert result.item is not None
    assert result.item["id"] == "mk-01"


def test_variant_price(menu_hints: list[str]) -> None:
    teh_manis = match_menu_item("teh manis", menu_hints)
    assert teh_manis is not None
    assert teh_manis.item is not None
    assert select_unit_price(teh_manis.item, "Panas") == 3000
    assert select_unit_price(teh_manis.item, "Dingin") == 4000

    kopi_hitam = match_menu_item("kopi hitam", menu_hints)
    assert kopi_hitam is not None
    assert kopi_hitam.item is not None
    assert select_unit_price(kopi_hitam.item, "Panas") == 4000
