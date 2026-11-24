from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ml.catalog import load_catalog  # noqa: E402


@pytest.fixture(scope="session")
def menu_hints() -> list[str]:
    return [item["name"] for item in load_catalog()]
