from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.core.config import settings


def _now() -> datetime:
    try:
        return datetime.now(ZoneInfo(settings.timezone))
    except Exception:
        # Fallback aman jika tzdata tidak tersedia di server.
        return datetime.utcnow() + timedelta(hours=7)


def parse_transaction_date(text: str, now: datetime | None = None) -> str:
    current = now or _now()
    normalized = (text or "").lower()

    if re.search(r"\bhari ini\b", normalized):
        return current.date().isoformat()
    if re.search(r"\bkemarin\b", normalized):
        return (current.date() - timedelta(days=1)).isoformat()
    if re.search(r"\bbesok\b", normalized):
        return (current.date() + timedelta(days=1)).isoformat()

    explicit = re.search(r"\b(?:tanggal|tgl)\s+(\d{1,2})\b", normalized)
    if explicit:
        day = int(explicit.group(1))
        try:
            return date(current.year, current.month, day).isoformat()
        except ValueError:
            pass

    numeric = re.search(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b", normalized)
    if numeric:
        day = int(numeric.group(1))
        month = int(numeric.group(2))
        year_raw = numeric.group(3)
        year = current.year if not year_raw else int(year_raw)
        if year < 100:
            year += 2000
        try:
            return date(year, month, day).isoformat()
        except ValueError:
            pass

    return current.date().isoformat()
