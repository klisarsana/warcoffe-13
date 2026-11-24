from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import joblib

from app.core.config import settings
from app.ml.training import predict_with_confidence


@dataclass(frozen=True)
class CategoryPrediction:
    label: str
    confidence: float
    model_key: str
    model_label: str


class CategoryPredictor:
    def __init__(self, model_path, metadata_path):
        self.pipeline = joblib.load(model_path)
        self.metadata: dict[str, Any] = json.loads(metadata_path.read_text(encoding="utf-8"))

    @property
    def model_key(self) -> str:
        return str(self.metadata.get("best_model", "unknown"))

    @property
    def model_label(self) -> str:
        return str(self.metadata.get("best_model_label", self.model_key))

    @property
    def classes(self) -> list[str]:
        return list(self.metadata.get("classes", []))

    def predict(self, text: str) -> CategoryPrediction:
        predictions, confidences = predict_with_confidence(self.pipeline, [text])
        return CategoryPrediction(
            label=predictions[0],
            confidence=float(confidences[0]),
            model_key=self.model_key,
            model_label=self.model_label,
        )


@lru_cache(maxsize=1)
def get_predictor() -> CategoryPredictor | None:
    if not settings.best_model_path.exists() or not settings.metadata_path.exists():
        return None
    try:
        return CategoryPredictor(settings.best_model_path, settings.metadata_path)
    except Exception:
        return None
