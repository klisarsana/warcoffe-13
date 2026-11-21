from __future__ import annotations

import re
from dataclasses import dataclass

from app.utils.text import QUANTITY_UNITS, normalize_for_match


NUMBER_WORDS = {
    "satu": 1,
    "dua": 2,
    "tiga": 3,
    "empat": 4,
    "lima": 5,
    "enam": 6,
    "tujuh": 7,
    "delapan": 8,
    "sembilan": 9,
    "sepuluh": 10,
    "sebelas": 11,
    "dua belas": 12,
}

_UNIT_PATTERN = "|".join(re.escape(unit) for unit in QUANTITY_UNITS)
_QTY_PATTERN = r"\d{1,2}|" + "|".join(
    re.escape(word) for word in sorted(NUMBER_WORDS, key=len, reverse=True)
)

QTY_WITH_UNIT_RE = re.compile(
    rf"\b(?P<qty>{_QTY_PATTERN})\s*(?P<unit>{_UNIT_PATTERN})\b",
    re.IGNORECASE,
)
QTY_STANDALONE_RE = re.compile(rf"\b(?P<qty>{_QTY_PATTERN})\b", re.IGNORECASE)


@dataclass(frozen=True)
class QuantityMatch:
    quantity: int
    start: int
    end: int
    raw: str


def _parse_quantity_value(raw: str) -> int | None:
    value = normalize_for_match(raw)
    if value.isdigit():
        number = int(value)
        return number if 0 < number <= 99 else None
    return NUMBER_WORDS.get(value)


def find_quantity(text: str) -> QuantityMatch | None:
    for pattern in (QTY_WITH_UNIT_RE, QTY_STANDALONE_RE):
        for match in pattern.finditer(text):
            quantity = _parse_quantity_value(match.group("qty"))
            if quantity is None:
                continue
            return QuantityMatch(
                quantity=quantity,
                start=match.start(),
                end=match.end(),
                raw=match.group(0).strip(),
            )
    return None


def strip_quantity(text: str, match: QuantityMatch | None = None) -> str:
    match = match if match is not None else find_quantity(text)
    if match is None:
        return text
    return re.sub(r"\s+", " ", f"{text[:match.start]} {text[match.end:]}").strip()
