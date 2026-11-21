from __future__ import annotations

import random
import re
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from app.core.config import settings
from app.ml.catalog import load_catalog
from app.utils.text import normalize_text


SALE_PREFIXES = ("laku", "jual", "terjual", "pesan", "pelanggan pesan", "order", "catat laku")
FILLERS = ("", "", "", "tolong catat", "hari ini", "tadi")
QUANTITIES = ("1", "2", "3", "2x", "dua", "tiga")
PRICE_TEMPLATES = ("Rp{price}", "{price}", "{price}rb")
CATEGORY_HINTS = {
    "Minuman Kemasan": ("minuman kemasan", "kemasan", "minuman botol", "minuman kaleng"),
    "Minuman Racikan / Sachet": ("minuman racikan", "racikan", "sachet", "minuman seduh"),
    "Makanan": ("makanan", "makanan warung", "camilan", "porsi"),
}


@dataclass(frozen=True)
class TrainingSample:
    text: str
    label: str
    item_id: str
    template: str


def _format_price(value: int | None) -> str | None:
    if value is None:
        return None
    formatted = f"{int(value):,}".replace(",", ".")
    return formatted


def _pick_price(item: dict, rng: random.Random) -> str | None:
    prices = [
        item.get("default_price"),
        item.get("hot_price"),
        item.get("cold_price"),
    ]
    prices = [price for price in prices if isinstance(price, int) and price > 0]
    if not prices:
        return None
    price = rng.choice(prices)
    template = rng.choice(PRICE_TEMPLATES)
    if template == "{price}rb":
        return f"{max(1, round(price / 1000))}rb"
    return template.format(price=_format_price(price))


def _variant_for_item(item: dict, rng: random.Random) -> str | None:
    mode = item.get("temperature_mode")
    if mode == "HOT_ONLY":
        return rng.choice(("panas", "hangat", "panas", ""))
    if mode == "HOT_COLD":
        return rng.choice(("panas", "dingin", "es", "hot", "ice", ""))
    return None


def _introduce_typo(text: str, rng: random.Random) -> str:
    words = text.split()
    candidates = [index for index, word in enumerate(words) if len(re.sub(r"\W", "", word)) >= 4]
    if not candidates:
        return text
    index = rng.choice(candidates)
    word = words[index]
    letters = list(word)
    operation = rng.choice(("delete", "swap", "replace"))
    position = rng.randrange(1, max(2, len(letters) - 1))
    if operation == "delete" and len(letters) > 3:
        letters.pop(position)
    elif operation == "swap" and len(letters) > 3:
        left = position - 1
        right = min(position, len(letters) - 1)
        letters[left], letters[right] = letters[right], letters[left]
    else:
        letters[position] = rng.choice("abcdefghijklmnopqrstuvwxyz")
    words[index] = "".join(letters)
    return " ".join(words)


def _build_sample_text(item: dict, rng: random.Random) -> tuple[str, str]:
    name = item["name"]
    description = item.get("description", "")
    category = item["category_name"]
    category_hints = CATEGORY_HINTS.get(category, ("",))
    prefix = rng.choice(SALE_PREFIXES)
    filler = rng.choice(FILLERS)
    quantity = rng.choice(QUANTITIES)
    variant = _variant_for_item(item, rng)
    price = _pick_price(item, rng)
    unit = item.get("stock_unit", "porsi")
    category_hint = rng.choice(category_hints)

    variant_part = f" {variant}" if variant else ""
    price_part = f" {price}" if price else ""
    prefix_part = f"{prefix} " if prefix else ""
    filler_part = f"{filler} " if filler else ""

    templates = [
        ("name_only", f"{name}"),
        ("name_qty", f"{name} {quantity}"),
        ("qty_name", f"{quantity} {name}"),
        ("prefix_name_qty", f"{prefix_part}{name} {quantity}"),
        ("name_variant_qty", f"{name}{variant_part} {quantity}"),
        ("name_qty_variant", f"{name} {quantity}{variant_part}"),
        ("name_price", f"{name}{price_part}"),
        ("name_qty_price", f"{name} {quantity}{price_part}"),
        ("description", description),
        ("category_name", f"{category_hint} {name}"),
        ("filler_prefix_name_qty_variant", f"{filler_part}{prefix_part}{name}{variant_part} {quantity}"),
        ("name_qty_unit", f"{name} {quantity} {unit}"),
        ("qty_unit_name", f"{quantity} {unit} {name}"),
        ("prefix_name_variant", f"{prefix_part}{name}{variant_part}"),
        ("name_variant", f"{name}{variant_part}"),
    ]

    template_name, text = rng.choice(templates)
    text = normalize_text(text)
    text = re.sub(r"\s+", " ", text).strip()

    if rng.random() < 0.18:
        text = _introduce_typo(text, rng)

    if rng.random() < 0.15:
        text = text.capitalize()
    if rng.random() < 0.1:
        text = f"{text}."

    return template_name, text


def generate_training_samples(
    samples_per_item: int = 26,
    seed: int = 42,
) -> pd.DataFrame:
    catalog = load_catalog()
    rng = random.Random(seed)
    rows: list[TrainingSample] = []
    seen: set[tuple[str, str]] = set()

    for item in catalog:
        for _ in range(samples_per_item):
            template, text = _build_sample_text(item, rng)
            key = (text, item["category_name"])
            if not text or key in seen:
                continue
            seen.add(key)
            rows.append(
                TrainingSample(
                    text=text,
                    label=item["category_name"],
                    item_id=item["id"],
                    template=template,
                )
            )

    frame = pd.DataFrame([row.__dict__ for row in rows])
    frame = frame.drop_duplicates(subset=["text", "label"]).reset_index(drop=True)
    return frame


def load_manual_test(path: Path | None = None) -> pd.DataFrame:
    target = path or settings.manual_test_path
    if not target.exists():
        raise FileNotFoundError(f"Manual test set tidak ditemukan: {target}")
    frame = pd.read_csv(target)
    required = {"text", "label"}
    if not required.issubset(frame.columns):
        raise ValueError(f"Manual test set harus memiliki kolom {sorted(required)}")
    frame["text"] = frame["text"].astype(str).str.strip()
    frame["label"] = frame["label"].astype(str).str.strip()
    return frame.dropna(subset=["text", "label"]).reset_index(drop=True)


def save_training_data(frame: pd.DataFrame, path: Path | None = None) -> Path:
    target = path or settings.training_data_path
    target.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(target, index=False)
    return target


def build_and_save_dataset(samples_per_item: int = 26, seed: int = 42) -> pd.DataFrame:
    frame = generate_training_samples(samples_per_item=samples_per_item, seed=seed)
    save_training_data(frame)
    return frame


if __name__ == "__main__":
    dataset = build_and_save_dataset()
    print(f"[OK] {len(dataset)} sampel latih disimpan di {settings.training_data_path}")
    print(dataset["label"].value_counts().to_string())
