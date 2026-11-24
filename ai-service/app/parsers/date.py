from __future__ import annotations

import re
from calendar import monthrange
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.config import settings


MONTHS: dict[str, int] = {
    "januari": 1,
    "jan": 1,
    "februari": 2,
    "pebruari": 2,
    "feb": 2,
    "maret": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "mei": 5,
    "juni": 6,
    "jun": 6,
    "juli": 7,
    "jul": 7,
    "agustus": 8,
    "agu": 8,
    "agt": 8,
    "ags": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "sept": 9,
    "oktober": 10,
    "okt": 10,
    "oct": 10,
    "november": 11,
    "nopember": 11,
    "nov": 11,
    "nop": 11,
    "desember": 12,
    "des": 12,
    "dec": 12,
}

_MONTH_PATTERN = "|".join(
    re.escape(name) for name in sorted(MONTHS, key=len, reverse=True)
)

_MONTH_DATE_WITH_YEAR_RE = re.compile(
    rf"\b(?:(?:tanggal|tgl)\s+)?(\d{{1,2}})[\s/-]+({_MONTH_PATTERN})\.?[\s/-]+(\d{{2,4}})\b",
    re.IGNORECASE,
)
_MONTH_DATE_NO_YEAR_RE = re.compile(
    rf"\b(?:(?:tanggal|tgl)\s+)?(\d{{1,2}})[\s/-]+({_MONTH_PATTERN})\.?\b",
    re.IGNORECASE,
)
_ISO_DATE_RE = re.compile(r"\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b")
_PREFIXED_NUMERIC_DATE_RE = re.compile(
    r"\b(?:tanggal|tgl)\s+(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b",
    re.IGNORECASE,
)
_NUMERIC_DATE_RE = re.compile(
    r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b"
)
_DAY_ONLY_RE = re.compile(r"\b(?:tanggal|tgl)\s+(\d{1,2})\b", re.IGNORECASE)


@dataclass(frozen=True)
class DateMatch:
    value: date
    start: int
    end: int


def _now() -> datetime:
    try:
        return datetime.now(ZoneInfo(settings.timezone))
    except Exception:
        # Fallback aman jika tzdata tidak tersedia di server.
        return datetime.utcnow() + timedelta(hours=7)


def _safe_date(year: int, month: int, day: int) -> date | None:
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _normalize_year(raw: str | None, current: date) -> int:
    if not raw:
        return current.year
    year = int(raw)
    return year + 2000 if year < 100 else year


def _shift_month(value: date, delta: int) -> date:
    month_index = value.year * 12 + (value.month - 1) + delta
    year, month_zero_based = divmod(month_index, 12)
    month = month_zero_based + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def _shift_year(value: date, delta: int) -> date:
    year = value.year + delta
    day = min(value.day, monthrange(year, value.month)[1])
    return date(year, value.month, day)


def _relative_candidates(text: str, current: datetime) -> list[DateMatch]:
    today = current.date()

    rules: list[tuple[str, date | None]] = [
        (r"\bkemarin\s+lusa\b", today - timedelta(days=2)),
        (r"\bbesok\s+lusa\b", today + timedelta(days=2)),
        (r"\bhari\s+ini\b", today),
        (r"\bhari\s+kemarin\b|\bkemarin\b", today - timedelta(days=1)),
        (r"\bbesok\b", today + timedelta(days=1)),
        (r"\blusa\b", today + timedelta(days=2)),
        (
            r"\b(?:minggu|pekan)\s+(?:lalu|kemarin)\b|\bseminggu\s+(?:yang\s+)?lalu\b",
            today - timedelta(days=7),
        ),
        (
            r"\b(?:minggu|pekan)\s+depan\b|\bseminggu\s+(?:lagi|ke\s+depan)\b",
            today + timedelta(days=7),
        ),
        (r"\bsebulan\s+(?:yang\s+)?lalu\b", _shift_month(today, -1)),
        (r"\bsebulan\s+(?:lagi|ke\s+depan)\b", _shift_month(today, 1)),
        (r"\bsetahun\s+(?:yang\s+)?lalu\b", _shift_year(today, -1)),
        (r"\bsetahun\s+(?:lagi|ke\s+depan)\b", _shift_year(today, 1)),
        (r"\bbulan\s+lalu\b", _shift_month(today, -1)),
        (r"\bbulan\s+depan\b", _shift_month(today, 1)),
        (r"\btahun\s+lalu\b", _shift_year(today, -1)),
        (r"\btahun\s+depan\b", _shift_year(today, 1)),
    ]

    candidates: list[DateMatch] = []
    for pattern, value in rules:
        if value is None:
            continue
        for found in re.finditer(pattern, text, re.IGNORECASE):
            candidates.append(
                DateMatch(value=value, start=found.start(), end=found.end())
            )

    day_offset = re.compile(
        r"\b(\d{1,2})\s+hari\s+(?:yang\s+)?(?:lalu|kemarin)\b",
        re.IGNORECASE,
    )
    for found in day_offset.finditer(text):
        amount = int(found.group(1))
        if amount > 0:
            candidates.append(
                DateMatch(
                    value=today - timedelta(days=amount),
                    start=found.start(),
                    end=found.end(),
                )
            )

    day_offset = re.compile(
        r"\b(\d{1,2})\s+hari\s+(?:lagi|ke\s+depan)\b",
        re.IGNORECASE,
    )
    for found in day_offset.finditer(text):
        amount = int(found.group(1))
        if amount > 0:
            candidates.append(
                DateMatch(
                    value=today + timedelta(days=amount),
                    start=found.start(),
                    end=found.end(),
                )
            )

    return candidates


def _explicit_candidates(text: str, current: datetime) -> list[DateMatch]:
    today = current.date()
    candidates: list[DateMatch] = []

    for found in _ISO_DATE_RE.finditer(text):
        value = _safe_date(
            int(found.group(1)),
            int(found.group(2)),
            int(found.group(3)),
        )
        if value is not None:
            candidates.append(
                DateMatch(value=value, start=found.start(), end=found.end())
            )

    for found in _MONTH_DATE_WITH_YEAR_RE.finditer(text):
        month = MONTHS.get(found.group(2).lower().rstrip("."))
        if month is None:
            continue
        value = _safe_date(
            _normalize_year(found.group(3), today),
            month,
            int(found.group(1)),
        )
        if value is not None:
            candidates.append(
                DateMatch(value=value, start=found.start(), end=found.end())
            )

    for found in _MONTH_DATE_NO_YEAR_RE.finditer(text):
        month = MONTHS.get(found.group(2).lower().rstrip("."))
        if month is None:
            continue
        value = _safe_date(today.year, month, int(found.group(1)))
        if value is not None:
            candidates.append(
                DateMatch(value=value, start=found.start(), end=found.end())
            )

    for found in _PREFIXED_NUMERIC_DATE_RE.finditer(text):
        value = _safe_date(
            _normalize_year(found.group(3), today),
            int(found.group(2)),
            int(found.group(1)),
        )
        if value is not None:
            candidates.append(
                DateMatch(value=value, start=found.start(), end=found.end())
            )

    for found in _NUMERIC_DATE_RE.finditer(text):
        value = _safe_date(
            _normalize_year(found.group(3), today),
            int(found.group(2)),
            int(found.group(1)),
        )
        if value is not None:
            candidates.append(
                DateMatch(value=value, start=found.start(), end=found.end())
            )

    for found in _DAY_ONLY_RE.finditer(text):
        value = _safe_date(today.year, today.month, int(found.group(1)))
        if value is not None:
            candidates.append(
                DateMatch(value=value, start=found.start(), end=found.end())
            )

    return candidates


def find_date_matches(text: str, now: datetime | None = None) -> list[DateMatch]:
    """Cari semua tanggal valid dan buang kandidat yang saling tumpang tindih."""
    current = now or _now()
    normalized = (text or "").lower()
    candidates = _relative_candidates(normalized, current) + _explicit_candidates(
        normalized, current
    )

    # Untuk posisi awal yang sama, pilih frasa terpanjang ("kemarin lusa"
    # sebelum "kemarin", "tanggal 20/11/2026" sebelum "tanggal 20").
    candidates.sort(key=lambda item: (item.start, -(item.end - item.start)))

    matches: list[DateMatch] = []
    last_end = -1
    for candidate in candidates:
        if candidate.start < last_end:
            continue
        matches.append(candidate)
        last_end = candidate.end

    return matches


def find_date_match(text: str, now: datetime | None = None) -> DateMatch | None:
    """Cari tanggal eksplisit/relatif pertama yang dapat ditafsirkan."""
    matches = find_date_matches(text, now)
    return matches[0] if matches else None


def parse_transaction_date(text: str, now: datetime | None = None) -> str:
    """Kembalikan tanggal transaksi dari teks, atau tanggal hari ini."""
    current = now or _now()
    match = find_date_match(text, current)
    return (match.value if match is not None else current.date()).isoformat()


def strip_date_phrases(text: str, now: datetime | None = None) -> str:
    """Buang semua frasa tanggal agar tidak mengganggu ekstraksi item."""
    current = now or _now()
    cleaned = text

    for match in reversed(find_date_matches(cleaned, current)):
        cleaned = f"{cleaned[:match.start]} {cleaned[match.end:]}"

    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip(" ,.;:-")
