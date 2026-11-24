from __future__ import annotations

import re
from dataclasses import dataclass

from app.ml.predictor import get_predictor
from app.utils.text import normalize_for_match


@dataclass(frozen=True)
class CategoryResult:
    label: str
    confidence: float
    model_name: str


EXPENSE_CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Bahan Baku & Kemasan": (
        "bahan",
        "baku",
        "kopi",
        "gula",
        "susu",
        "es",
        "batu",
        "cup",
        "gelas plastik",
        "plastik",
        "kemasan",
        "sachet",
        "teh",
        "milo",
        "nutrisari",
        "chocolatos",
        "indomie",
        "mie",
        "telur",
        "minyak",
        "beras",
        "tepung",
        "saus",
        "kecap",
        "bumbu",
    ),
    "Gas, Listrik & Air": (
        "gas",
        "elpiji",
        "lpg",
        "listrik",
        "token",
        "pdam",
        "air",
        "tagihan",
    ),
    "Operasional Warung": (
        "sabun",
        "tisu",
        "kebersihan",
        "operasional",
        "kebersihan",
        "pel",
        "sapu",
        "tempat sampah",
        "service",
        "servis",
    ),
    "Perlengkapan & Peralatan": (
        "peralatan",
        "perlengkapan",
        "alat",
        "kursi",
        "meja",
        "blender",
        "kompor",
        "tabung",
        "rak",
        "lemari",
        "panci",
        "wajan",
        "sendok",
    ),
    "Transportasi & Belanja": (
        "ongkos",
        "bensin",
        "parkir",
        "transport",
        "transportasi",
        "kirim",
        "belanja",
        "pasar",
        "ojek",
        "grab",
        "gojek",
    ),
}

SALE_CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Makanan": (
        "indomie",
        "mie",
        "seblak",
        "sosis",
        "bakso",
        "baso",
        "otak",
        "kentang",
        "pisang",
        "roti",
        "dimsum",
        "takoyaki",
        "makanan",
        "goreng",
        "bakar",
        "rebus",
        "telur",
        "porsi",
    ),
    "Minuman Kemasan": (
        "kemasan",
        "botol",
        "kotak",
        "kaleng",
        "teh botol",
        "pocari",
        "c1000",
        "bear brand",
        "yakult",
        "larutan",
        "cincau",
        "adem sari",
        "nipis madu",
        "isoplus",
        "pucuk",
        "indomilk",
        "teh kotak",
    ),
    "Minuman Racikan / Sachet": (
        "kopi",
        "teh",
        "susu",
        "milo",
        "matcha",
        "nutrisari",
        "chocolatos",
        "good day",
        "sachet",
        "racikan",
        "seduh",
        "panas",
        "dingin",
        "es",
        "dalgona",
        "caffelatte",
        "ovaltine",
        "beng beng",
    ),
}


def _earliest_category(text: str, mapping: dict[str, tuple[str, ...]]) -> tuple[str, float] | None:
    normalized = f" {normalize_for_match(text)} "
    best: tuple[int, str] | None = None
    for category, keywords in mapping.items():
        for keyword in keywords:
            match = re.search(rf"\b{re.escape(keyword)}\b", normalized)
            if match is None:
                continue
            position = match.start()
            if best is None or position < best[0]:
                best = (position, category)
    if best is None:
        return None
    return best[1], 0.8


def predict_expense_category(text: str) -> CategoryResult:
    found = _earliest_category(text, EXPENSE_CATEGORY_KEYWORDS)
    if found is None:
        return CategoryResult("Lainnya", 0.5, "expense-keyword-rules-v1")
    return CategoryResult(found[0], found[1], "expense-keyword-rules-v1")


def predict_sale_category(text: str) -> CategoryResult:
    predictor = get_predictor()
    if predictor is not None:
        prediction = predictor.predict(text)
        return CategoryResult(
            label=prediction.label,
            confidence=prediction.confidence,
            model_name=prediction.model_label,
        )

    found = _earliest_category(text, SALE_CATEGORY_KEYWORDS)
    if found is None:
        return CategoryResult("Minuman Racikan / Sachet", 0.5, "sale-keyword-rules-v1")
    return CategoryResult(found[0], found[1], "sale-keyword-rules-v1")
