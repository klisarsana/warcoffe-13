from __future__ import annotations

import logging

from fastapi import APIRouter

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import answer_business_question


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/chat",
    response_model=ChatResponse,
    response_model_exclude_none=True,
)
def chat_endpoint(payload: ChatRequest) -> ChatResponse:
    try:
        return answer_business_question(payload)
    except Exception as exc:  # pragma: no cover - jalur fallback darurat
        logger.exception("Gagal memproses chat: %s", exc)
        return ChatResponse(
            status="SERVICE_UNAVAILABLE",
            answer=(
                "Layanan AI Business Assistant sedang mengalami kendala internal. "
                "Silakan coba lagi atau gunakan halaman Dashboard dan Laporan "
                "untuk melihat ringkasan data."
            ),
            error_code="CHAT_INTERNAL_ERROR",
        )
