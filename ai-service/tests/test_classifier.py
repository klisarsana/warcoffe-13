from __future__ import annotations

import pytest

from app.ml.predictor import get_predictor


def test_predictor_available() -> None:
    predictor = get_predictor()
    if predictor is None:
        pytest.skip("Model belum dilatih. Jalankan scripts/train_model.py")
    assert predictor.classes


def test_predictor_clear_examples() -> None:
    predictor = get_predictor()
    if predictor is None:
        pytest.skip("Model belum dilatih. Jalankan scripts/train_model.py")

    cases = {
        "teh botol 1": "Minuman Kemasan",
        "pocari sweat": "Minuman Kemasan",
        "indomie telur 2": "Makanan",
        "kentang goreng": "Makanan",
        "kopi liong panas": "Minuman Racikan / Sachet",
        "milo dingin": "Minuman Racikan / Sachet",
    }
    for text, expected in cases.items():
        prediction = predictor.predict(text)
        assert prediction.label == expected, f"{text}: {prediction.label} != {expected}"
        assert 0.0 <= prediction.confidence <= 1.0
