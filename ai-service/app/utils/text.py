from __future__ import annotations

import re
import unicodedata


SALE_KEYWORDS = (
    "laku",
    "terjual",
    "jual",
    "jualan",
    "pesan",
    "pesanan",
    "order",
    "pelanggan",
    "pembeli",
    "omzet",
    "penjualan",
    "terjual",
)

EXPENSE_KEYWORDS = (
    "beli",
    "bayar",
    "belanja",
    "pengeluaran",
    "keluar",
    "gas",
    "elpiji",
    "listrik",
    "token",
    "pdam",
    "air",
    "sewa",
    "gaji",
    "ongkos",
    "bensin",
    "parkir",
    "perlengkapan",
    "peralatan",
    "bahan",
    "kemasan",
    "cup",
    "plastik",
    "sabun",
    "tisu",
    "modal",
)

CATEGORY_WORDS = (
    "minuman kemasan",
    "minuman racikan",
    "minuman sachet",
    "minuman",
    "kemasan",
    "racikan",
    "sachet",
    "makanan",
    "makan",
    "minum",
)

FILLER_PHRASES = (
    "tolong catat",
    "tolong input",
    "tolong tambahkan",
    "tolong",
    "catat",
    "input",
    "tambahkan",
    "hari ini",
    "tadi",
    "baru saja",
    "bang",
    "kak",
    "mas",
    "mbak",
)

ALIASES = {
    "indomi": "indomie",
    "indomnie": "indomie",
    "telor": "telur",
    "tlur": "telur",
    "kopi": "kopi",
    "coffe": "kopi",
    "coffee": "kopi",
    "teh": "teh",
    "mocacino": "mocaccino",
    "mocachino": "mocaccino",
    "cappucino": "cappuccino",
    "capucino": "cappuccino",
    "nutri sari": "nutrisari",
    "goodday": "good day",
    "bengbeng": "beng beng",
    "teh tarik": "teh tarik",
    "es": "es",
    "ice": "es",
}

VARIANT_KEYWORDS = {
    "panas": "Panas",
    "hot": "Panas",
    "hangat": "Panas",
    "dingin": "Dingin",
    "cold": "Dingin",
    "ice": "Dingin",
    "es": "Dingin",
}

QUANTITY_UNITS = (
    "x",
    "pcs",
    "buah",
    "gelas",
    "porsi",
    "bungkus",
    "botol",
    "kotak",
    "kaleng",
    "tusuk",
    "pak",
    "biji",
    "dus",
    "kg",
    "liter",
    "gram",
)


def normalize_text(text: str) -> str:
    """Normalisasi dasar: NFKC, lowercase, rapikan spasi."""
    value = unicodedata.normalize("NFKC", str(text or ""))
    value = value.lower()
    value = re.sub(r"\s+", " ", value).strip()
    return value


def normalize_for_match(text: str) -> str:
    """Normalisasi agresif untuk pencocokan nama menu."""
    value = normalize_text(text)
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def apply_aliases(text: str) -> str:
    value = f" {normalize_for_match(text)} "
    for source, target in ALIASES.items():
        value = re.sub(rf"\b{re.escape(source)}\b", target, value)
    return re.sub(r"\s+", " ", value).strip()


def contains_any(text: str, keywords: tuple[str, ...]) -> list[str]:
    normalized = f" {normalize_for_match(text)} "
    found: list[str] = []
    for keyword in keywords:
        if re.search(rf"\b{re.escape(keyword)}\b", normalized):
            found.append(keyword)
    return found


def remove_phrases(text: str, phrases: tuple[str, ...]) -> str:
    value = f" {text} "
    for phrase in sorted(phrases, key=len, reverse=True):
        value = re.sub(rf"\b{re.escape(phrase)}\b", " ", value, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", value).strip()


def strip_filler(text: str) -> str:
    return remove_phrases(text, FILLER_PHRASES)


def strip_category_words(text: str) -> str:
    return remove_phrases(text, CATEGORY_WORDS)


def strip_quantity_units(text: str) -> str:
    return remove_phrases(text, QUANTITY_UNITS)


def detect_variant(text: str) -> str | None:
    normalized = f" {normalize_for_match(text)} "
    for keyword, label in VARIANT_KEYWORDS.items():
        if re.search(rf"\b{re.escape(keyword)}\b", normalized):
            return label
    return None


def remove_variant_words(text: str) -> str:
    return remove_phrases(text, tuple(VARIANT_KEYWORDS.keys()))


def clean_item_candidate(text: str) -> str:
    value = strip_filler(text)
    value = strip_category_words(value)
    value = remove_variant_words(value)
    value = strip_quantity_units(value)
    value = re.sub(r"\b(sebanyak|jumlah|total|senilai|seharga)\b", " ", value, flags=re.IGNORECASE)
    value = re.sub(r"\s+", " ", value).strip(" ,.;:-")
    return value


def tokenize(text: str) -> list[str]:
    return [token for token in normalize_for_match(text).split() if token]
