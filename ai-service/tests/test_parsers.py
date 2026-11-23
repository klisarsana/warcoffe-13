from __future__ import annotations

from datetime import datetime

from app.parsers.date import (
    find_date_matches,
    parse_transaction_date,
    strip_date_phrases,
)
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


def test_date_explicit_month_names() -> None:
    now = datetime(2026, 11, 21, 10, 0, 0)
    assert parse_transaction_date("20 November 2026", now) == "2026-11-20"
    assert parse_transaction_date("20 Nov 2026", now) == "2026-11-20"
    assert parse_transaction_date("tanggal 20 november 2026", now) == "2026-11-20"
    assert parse_transaction_date("20 Desember 2026", now) == "2026-12-20"
    assert parse_transaction_date("20 Des 2026", now) == "2026-12-20"
    assert parse_transaction_date("20 Desember", now) == "2026-12-20"
    assert parse_transaction_date("2026-11-20", now) == "2026-11-20"
    assert parse_transaction_date("20-11-26", now) == "2026-11-20"
    assert parse_transaction_date("tanggal 20/11/2026", now) == "2026-11-20"
    assert parse_transaction_date("tgl 20-11-2026", now) == "2026-11-20"


def test_date_relative_phrases() -> None:
    now = datetime(2026, 11, 21, 10, 0, 0)
    assert parse_transaction_date("kemarin lusa", now) == "2026-11-19"
    assert parse_transaction_date("besok lusa", now) == "2026-11-23"
    assert parse_transaction_date("3 hari lalu", now) == "2026-11-18"
    assert parse_transaction_date("2 hari lagi", now) == "2026-11-23"
    assert parse_transaction_date("minggu lalu", now) == "2026-11-14"
    assert parse_transaction_date("minggu depan", now) == "2026-11-28"
    assert parse_transaction_date("bulan lalu", now) == "2026-10-21"
    assert parse_transaction_date("bulan depan", now) == "2026-12-21"
    assert parse_transaction_date("tahun lalu", now) == "2025-11-21"
    assert parse_transaction_date("tahun depan", now) == "2027-11-21"


def test_date_invalid_falls_back_to_today() -> None:
    now = datetime(2026, 11, 21, 10, 0, 0)
    assert parse_transaction_date("31/02/2026", now) == "2026-11-21"
    assert parse_transaction_date("tanpa tanggal", now) == "2026-11-21"


def test_strip_date_phrases() -> None:
    now = datetime(2026, 11, 21, 10, 0, 0)
    assert (
        strip_date_phrases("laku kopi 2 tanggal 20 november 2026", now)
        == "laku kopi 2"
    )
    assert strip_date_phrases("20/11/2026 laku kopi 2", now) == "laku kopi 2"
    assert (
        strip_date_phrases("laku kopi 2 tgl 20/11/2026", now)
        == "laku kopi 2"
    )
    assert strip_date_phrases("beli gas kemarin 35rb", now) == "beli gas 35rb"
    assert (
        strip_date_phrases("kemarin laku kopi 2 20/11/2026", now)
        == "laku kopi 2"
    )
    assert strip_date_phrases("laku kopi 2", now) == "laku kopi 2"


def test_find_all_dates_in_multi_date_text() -> None:
    now = datetime(2026, 11, 21, 10, 0, 0)
    matches = find_date_matches(
        "10 november terjual 5 kopi\n7 november terjual 3 indomie",
        now,
    )
    assert [match.value.isoformat() for match in matches] == [
        "2026-11-10",
        "2026-11-07",
    ]


def test_find_all_dates_skips_invalid_date() -> None:
    now = datetime(2026, 11, 21, 10, 0, 0)
    matches = find_date_matches("31/02/2026 lalu 20/11/2026", now)
    assert [match.value.isoformat() for match in matches] == ["2026-11-20"]
