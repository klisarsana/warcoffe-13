from __future__ import annotations

from dataclasses import dataclass

from rapidfuzz import fuzz, process

from app.core.config import settings
from app.ml.catalog import find_catalog_item_by_name, load_catalog
from app.utils.text import apply_aliases, clean_item_candidate, normalize_for_match


@dataclass(frozen=True)
class MenuMatch:
    item: dict | None
    matched_name: str
    score: float


def _normalize_name(value: str) -> str:
    return apply_aliases(normalize_for_match(value))


def _pseudo_item(name: str) -> dict:
    return {
        "id": None,
        "name": name,
        "category_name": "Lainnya",
        "temperature_mode": "NONE",
        "default_price": None,
        "hot_price": None,
        "cold_price": None,
    }


def _candidate_items(menu_hints: list[str]) -> list[dict]:
    if not menu_hints:
        return load_catalog()

    items: list[dict] = []
    seen: set[str] = set()
    for hint in menu_hints:
        catalog_item = find_catalog_item_by_name(hint)
        item = catalog_item if catalog_item is not None else _pseudo_item(hint)
        key = _normalize_name(item["name"])
        if key in seen:
            continue
        seen.add(key)
        items.append(item)
    return items


def match_menu_item(candidate: str, menu_hints: list[str]) -> MenuMatch | None:
    cleaned = clean_item_candidate(candidate)
    normalized_candidate = _normalize_name(cleaned)
    if not normalized_candidate:
        return None

    items = _candidate_items(menu_hints)
    if not items:
        return None

    normalized_to_item = {_normalize_name(item["name"]): item for item in items}

    exact = normalized_to_item.get(normalized_candidate)
    if exact is not None:
        return MenuMatch(item=exact, matched_name=exact["name"], score=1.0)

    choices = list(normalized_to_item.keys())
    best = process.extractOne(
        normalized_candidate,
        choices,
        scorer=fuzz.WRatio,
        score_cutoff=0,
    )
    if best is None:
        return None

    matched_key, raw_score, _ = best
    token_score = fuzz.token_set_ratio(normalized_candidate, matched_key)
    score = max(float(raw_score), float(token_score))

    # Beri sedikit penalti jika kandidat jauh lebih pendek dari nama menu,
    # agar "teh" tidak otomatis dianggap "Teh Botol Original".
    candidate_tokens = normalized_candidate.split()
    matched_tokens = matched_key.split()
    if len(candidate_tokens) == 1 and len(matched_tokens) > 1 and candidate_tokens[0] not in matched_tokens:
        score -= 8.0

    if score < settings.menu_match_threshold:
        return None

    item = normalized_to_item[matched_key]
    return MenuMatch(item=item, matched_name=item["name"], score=score / 100.0)


def select_unit_price(item: dict | None, variant_label: str) -> int | None:
    if item is None:
        return None

    if variant_label == "Panas":
        for key in ("hot_price", "default_price", "cold_price"):
            value = item.get(key)
            if isinstance(value, int) and value > 0:
                return value
    elif variant_label == "Dingin":
        for key in ("cold_price", "default_price", "hot_price"):
            value = item.get(key)
            if isinstance(value, int) and value > 0:
                return value
    else:
        for key in ("default_price", "hot_price", "cold_price"):
            value = item.get(key)
            if isinstance(value, int) and value > 0:
                return value
    return None
