from __future__ import annotations

from datetime import datetime

from app.parsers.date import parse_transaction_date
from app.parsers.money import first_money, strip_money_matches, total_money
from app.parsers.quantity import find_quantity, strip_quantity


def test_money_formats() -> None:
    assert first_money("Rp35.000") == 35000
    assert first_money("Rp 35.000") == 35000
    assert first_money("35rb") == 35000
    assert first_money("35 ribu") == 35000
    assert first_money("35k") == 35000
    assert first_money("35000") == 35000
    assert first_money("2") is None


def test_money_sum_and_strip() -> None:
    text = "beli gas 35rb dan es batu 5rb"
    assert total_money(text) == 40000
    stripped = strip_money_matches(text)
    assert "35rb" not in stripped
    assert "5rb" not in stripped


def test_quantity_formats() -> None:
    assert find_quantity("2x").quantity == 2
    assert find_quantity("dua").quantity == 2
    assert find_quantity("2 porsi").quantity == 2
    assert find_quantity("tiga gelas").quantity == 3
    assert find_quantity("0") is None
    assert find_quantity("2026") is None


def test_quantity_strip() -> None:
    match = find_quantity("kopi 2")
    assert match is not None
    assert strip_quantity("kopi 2", match) == "kopi"


def test_date_keywords() -> None:
    now = datetime(2026, 11, 21, 10, 0, 0)
    assert parse_transaction_date("hari ini", now) == "2026-11-21"
    assert parse_transaction_date("kemarin", now) == "2026-11-20"
    assert parse_transaction_date("besok", now) == "2026-11-22"
    assert parse_transaction_date("tanggal 20", now) == "2026-11-20"
    assert parse_transaction_date("20/11/2026", now) == "2026-11-20"
