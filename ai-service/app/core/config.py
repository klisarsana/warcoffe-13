from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[2]


def _env_path(name: str, default: Path) -> Path:
    raw = os.getenv(name, "").strip()
    return Path(raw).expanduser().resolve() if raw else default


def _env_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "Warcoffe 13 AI Service"
    version: str = "0.1.0"
    timezone: str = os.getenv("TIMEZONE", "Asia/Jakarta")
    menu_match_threshold: int = int(os.getenv("MENU_MATCH_THRESHOLD", "80"))
    allowed_origins: list[str] = field(default_factory=_env_origins)

    data_dir: Path = _env_path("AI_DATA_DIR", BASE_DIR / "data")
    model_dir: Path = _env_path("AI_MODEL_DIR", BASE_DIR / "models")

    @property
    def catalog_path(self) -> Path:
        return self.data_dir / "menu_catalog.json"

    @property
    def training_data_path(self) -> Path:
        return self.data_dir / "training_samples.csv"

    @property
    def manual_test_path(self) -> Path:
        return self.data_dir / "manual_test_samples.csv"

    @property
    def best_model_path(self) -> Path:
        return self.model_dir / "best_model.joblib"

    @property
    def metadata_path(self) -> Path:
        return self.model_dir / "model_metadata.json"

    @property
    def logreg_model_path(self) -> Path:
        return self.model_dir / "tfidf_logreg.joblib"

    @property
    def linearsvc_model_path(self) -> Path:
        return self.model_dir / "tfidf_linearsvc.joblib"


settings = Settings()
