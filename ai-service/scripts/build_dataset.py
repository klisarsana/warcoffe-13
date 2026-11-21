from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402
from app.ml.dataset import build_and_save_dataset  # noqa: E402


if __name__ == "__main__":
    dataset = build_and_save_dataset()
    print(f"[OK] {len(dataset)} sampel latih disimpan di {settings.training_data_path}")
    print(dataset["label"].value_counts().to_string())
