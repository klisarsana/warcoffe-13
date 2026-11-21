from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from app.core.config import settings


@lru_cache(maxsize=1)
def load_catalog() -> list[dict]:
    path: Path = settings.catalog_path
    if not path.exists():
        raise FileNotFoundError(
            f"Katalog menu tidak ditemukan di {path}. Jalankan: npm run ai:export-catalog"
        )
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list):
        raise ValueError("Format menu_catalog.json harus berupa array")
    return data


@lru_cache(maxsize=1)
def catalog_by_normalized_name() -> dict[str, dict]:
    from app.utils.text import apply_aliases, normalize_for_match

    result: dict[str, dict] = {}
    for item in load_catalog():
        key = apply_aliases(normalize_for_match(item["name"]))
        result[key] = item
    return result


def category_names() -> list[str]:
    seen: list[str] = []
    for item in load_catalog():
        category = item.get("category_name", "Lainnya")
        if category not in seen:
            seen.append(category)
    return seen


def find_catalog_item_by_name(name: str) -> dict | None:
    from app.utils.text import apply_aliases, normalize_for_match

    key = apply_aliases(normalize_for_match(name))
    return catalog_by_normalized_name().get(key)
