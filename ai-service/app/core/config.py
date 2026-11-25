from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parents[2]

# Muat file env lokal sebelum Settings dievaluasi. Environment OS tetap menang
# karena override=False; .env.local diprioritaskan di atas .env.
load_dotenv(BASE_DIR / ".env.local", override=False)
load_dotenv(BASE_DIR / ".env", override=False)


def _env_path(name: str, default: Path) -> Path:
    raw = os.getenv(name, "").strip()
    return Path(raw).expanduser().resolve() if raw else default


def _env_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = float(raw)
    except ValueError:
        return default
    return value if value > 0 else default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value > 0 else default


@dataclass(frozen=True)
class Settings:
    app_name: str = "Warcoffe 13 AI Service"
    version: str = "0.1.0"
    timezone: str = os.getenv("TIMEZONE", "Asia/Jakarta")
    menu_match_threshold: int = int(os.getenv("MENU_MATCH_THRESHOLD", "80"))
    allowed_origins: list[str] = field(default_factory=_env_origins)

    gemini_api_key: str | None = field(
        default=os.getenv("GEMINI_API_KEY", "").strip() or None,
        repr=False,
    )
    # gemini-2.5-flash sudah retired untuk API key baru.
    gemini_model: str = (
        os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()
        or "gemini-3.5-flash-lite"
    )
    gemini_fallback_model: str = (
        os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.8-flash").strip()
        or "gemini-3.8-flash"
    )
    gemini_timeout_seconds: float = _env_float("GEMINI_TIMEOUT_SECONDS", 8.0)
    # Anggaran total seluruh proses chat; proxy Next.js menunggu 12 detik.
    gemini_total_budget_seconds: float = _env_float(
        "GEMINI_TOTAL_BUDGET_SECONDS", 10.0
    )
    # 512 cukup untuk jawaban 2-3 kalimat + JSON; thinking ikut dihitung.
    gemini_max_output_tokens: int = _env_int("GEMINI_MAX_OUTPUT_TOKENS", 512)

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
