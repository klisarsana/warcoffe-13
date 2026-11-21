from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings
from app.ml.predictor import get_predictor
from app.schemas.transaction import HealthResponse


router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    predictor = get_predictor()
    if predictor is None:
        return HealthResponse(
            status="degraded",
            service=settings.app_name,
            version=settings.version,
            model_loaded=False,
            best_model=None,
            classes=[],
        )
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.version,
        model_loaded=True,
        best_model=predictor.model_label,
        classes=predictor.classes,
    )
