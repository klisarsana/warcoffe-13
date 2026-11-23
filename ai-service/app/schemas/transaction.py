from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


DraftStatus = Literal["SUCCESS", "INCOMPLETE", "OUT_OF_CONTEXT", "SERVICE_UNAVAILABLE"]
MultiDraftStatus = Literal[
    "SUCCESS",
    "PARTIAL",
    "INCOMPLETE",
    "OUT_OF_CONTEXT",
    "SERVICE_UNAVAILABLE",
]
DraftType = Literal["INCOME_SALE", "EXPENSE", "UNKNOWN"]


class ParseTransactionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str = Field(..., min_length=1, max_length=4000)
    menu_catalog_hints: list[str] = Field(default_factory=list, max_length=200)


class DraftItem(BaseModel):
    raw_item_text: str
    matched_menu_item_id: str | None = None
    item_name: str
    variant_label: str = "Standar"
    quantity: int = 1
    unit_price: int | None = None
    line_total: int | None = None
    confidence: float = 0.0


class ParseTransactionResponse(BaseModel):
    status: DraftStatus
    draft_type: DraftType
    predicted_category: str = "-"
    classifier_model_used: str | None = None
    confidence_score: float | None = None
    transaction_date: str
    source_text: str | None = None
    items: list[DraftItem] = Field(default_factory=list)
    total_amount: int | None = None
    expense_description: str | None = None
    missing_fields: list[str] = Field(default_factory=list)
    assistant_message: str
    requires_owner_confirmation: Literal[True] = True


class ParseTransactionsResponse(BaseModel):
    status: MultiDraftStatus
    drafts: list[ParseTransactionResponse] = Field(default_factory=list)
    assistant_message: str
    requires_owner_confirmation: Literal[True] = True


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    version: str
    model_loaded: bool
    best_model: str | None = None
    classes: list[str] = Field(default_factory=list)
