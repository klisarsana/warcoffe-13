from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal


PaymentMethod = Literal["TUNAI", "QRIS", "TRANSFER"]

_METHOD_PATTERNS: tuple[tuple[PaymentMethod, re.Pattern[str]], ...] = (
    (
        "QRIS",
        re.compile(r"\b(?:qris|scan\s+qr|qr\s*code|qr)\b", re.IGNORECASE),
    ),
    (
        "TRANSFER",
        re.compile(
            r"\b(?:transfer(?:\s+bank)?|bank\s+transfer|tf)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "TUNAI",
        re.compile(r"\b(?:tunai|cash|kontan)\b", re.IGNORECASE),
    ),
)

_PAYMENT_PHRASE_RE = re.compile(
    r"\b(?:qris|scan\s+qr|qr\s*code|qr|transfer(?:\s+bank)?|bank\s+transfer|tf|tunai|cash|kontan)\b",
    re.IGNORECASE,
)
_PAYMENT_CONNECTOR_RE = re.compile(
    r"\b(?:pembayaran|dibayar|membayar|bayar|via|lewat|melalui|pakai|pake|menggunakan|dengan|secara)\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class PaymentMatch:
    method: PaymentMethod
    start: int
    end: int


def find_payment_match(text: str) -> PaymentMatch | None:
    """Cari metode pembayaran yang disebut paling awal di teks."""
    matches: list[PaymentMatch] = []
    for method, pattern in _METHOD_PATTERNS:
        found = pattern.search(text or "")
        if found is not None:
            matches.append(
                PaymentMatch(
                    method=method,
                    start=found.start(),
                    end=found.end(),
                )
            )

    if not matches:
        return None
    return min(matches, key=lambda item: item.start)


def detect_payment_method(text: str) -> PaymentMethod:
    """Kembalikan metode pembayaran dari teks, default TUNAI."""
    match = find_payment_match(text)
    return match.method if match is not None else "TUNAI"


def strip_payment_method_phrases(text: str) -> str:
    """Buang frasa metode pembayaran agar tidak mengganggu item/deskripsi."""
    cleaned = _PAYMENT_PHRASE_RE.sub(" ", text or "")
    cleaned = _PAYMENT_CONNECTOR_RE.sub(" ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip(" ,.;:-")
