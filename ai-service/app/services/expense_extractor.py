from __future__ import annotations

import re
from dataclasses import dataclass

from app.parsers.date import strip_date_phrases
from app.parsers.money import strip_money_matches, total_money
from app.services.category_classifier import predict_expense_category
from app.utils.text import normalize_text, strip_filler


@dataclass(frozen=True)
class ExpenseExtraction:
    description: str
    amount: int | None
    category: str
    confidence: float
    model_name: str


def extract_expense(text: str) -> ExpenseExtraction:
    description = strip_filler(normalize_text(text))
    description = strip_date_phrases(description)
    description = strip_money_matches(description)
    description = re.sub(r"\s+", " ", description).strip(" ,.;:-")
    if not description:
        description = normalize_text(text)

    amount = total_money(text)
    category = predict_expense_category(text)

    return ExpenseExtraction(
        description=description,
        amount=amount,
        category=category.label,
        confidence=category.confidence,
        model_name=category.model_name,
    )
