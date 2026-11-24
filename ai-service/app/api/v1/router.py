from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.parse_transaction import router as parse_transaction_router


router = APIRouter()
router.include_router(health_router, tags=["health"])
router.include_router(parse_transaction_router, tags=["parse-transaction"])
