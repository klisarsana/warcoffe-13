from __future__ import annotations

import re
from dataclasses import dataclass


MONEY_RE = re.compile(
    r"(?P<rp>rp\.?\s*\d[\d.,]*\s*(?:rb|ribu|k)?)"
    r"|(?P<suffix>\d[\d.,]*\s*(?:rb|ribu|k)\b)"
    r"|(?P<thousands>\d{1,3}(?:[.,]\d{3})+)"
    r"|(?P<plain>\d{4,})",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class MoneyMatch:
    raw: str
    amount: int
    start: int
    end: int


def _to_integer(raw: str, has_suffix: bool) -> int | None:
    value = raw.lower().replace("rp", "").replace(" ", "").strip(".,")
    if has_suffix:
        value = re.sub(r"(rb|ribu|k)$", "", value).strip()
    if not value:
        return None

    multiplier = 1000 if has_suffix else 1

    # Format ribuan Indonesia: 35.000 atau 35,000
    if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", value):
        value = re.sub(r"[.,]", "", value)
        return int(value) * multiplier

    # Angka desimal sederhana, misalnya 35.5 (jarang untuk Rupiah)
    if re.fullmatch(r"\d+[.,]\d+", value):
        decimal = value.replace(",", ".")
        return int(round(float(decimal) * multiplier))

    # Buang pemisah lain
    value = re.sub(r"[.,]", "", value)
    if not value.isdigit():
        return None
    return int(value) * multiplier


def find_money_matches(text: str) -> list[MoneyMatch]:
    matches: list[MoneyMatch] = []
    for match in MONEY_RE.finditer(text):
        raw = match.group(0)
        has_suffix = bool(match.group("suffix") or match.group("rp"))
        # "Rp35.000" tidak selalu memakai suffix rb/ribu/k.
        suffix_group = match.group("suffix") or match.group("rp") or ""
        has_multiplier_suffix = bool(re.search(r"(rb|ribu|k)\s*$", suffix_group, re.IGNORECASE))
        amount = _to_integer(raw, has_multiplier_suffix)
        if amount is None or amount <= 0:
            continue
        matches.append(
            MoneyMatch(
                raw=raw.strip(),
                amount=amount,
                start=match.start(),
                end=match.end(),
            )
        )
    return matches


def strip_money_matches(text: str, matches: list[MoneyMatch] | None = None) -> str:
    matches = matches if matches is not None else find_money_matches(text)
    if not matches:
        return text
    chars = list(text)
    for match in matches:
        for index in range(match.start, min(match.end, len(chars))):
            chars[index] = " "
    return re.sub(r"\s+", " ", "".join(chars)).strip()


def total_money(text: str) -> int | None:
    matches = find_money_matches(text)
    if not matches:
        return None
    return sum(match.amount for match in matches)


def first_money(text: str) -> int | None:
    matches = find_money_matches(text)
    return matches[0].amount if matches else None
