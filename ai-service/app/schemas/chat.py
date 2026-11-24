from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


ChatStatus = Literal["SUCCESS", "OUT_OF_CONTEXT", "SERVICE_UNAVAILABLE", "ERROR"]


class ChatBaseModel(BaseModel):
    model_config = ConfigDict(extra="ignore")


class TopSellingItem(ChatBaseModel):
    name: str
    qty: int = 0
    revenue: float = 0.0


class LowStockItem(ChatBaseModel):
    name: str
    current_stock: int = 0
    min_threshold: int = 0


class ChatContextSummary(ChatBaseModel):
    current_month: str = ""
    monthly_revenue: float = 0.0
    monthly_expenses: float = 0.0
    net_difference: float = 0.0
    transaction_count: int = 0
    top_selling_items: list[TopSellingItem] = Field(default_factory=list)
    low_stock_items: list[LowStockItem] = Field(default_factory=list)


class ChatRequest(ChatBaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    context_summary: ChatContextSummary = Field(default_factory=ChatContextSummary)

    @field_validator("question", mode="before")
    @classmethod
    def _strip_question(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class ChatResponse(ChatBaseModel):
    status: ChatStatus
    answer: str
    referenced_metrics: list[str] | None = None
    error_code: str | None = None


class GeminiChatOutput(ChatBaseModel):
    status: Literal["SUCCESS", "OUT_OF_CONTEXT"]
    answer: str
    referenced_metrics: list[str] = Field(default_factory=list)
