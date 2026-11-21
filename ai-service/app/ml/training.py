from __future__ import annotations

import json
import platform
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedGroupKFold, cross_val_score, train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC

from app.core.config import settings
from app.ml.dataset import generate_training_samples, load_manual_test


MODEL_LABELS = {
    "logreg": "TF-IDF (word + char n-gram) + Logistic Regression",
    "linearsvc": "TF-IDF (word + char n-gram) + Linear SVC",
}


@dataclass
class EvaluationMetrics:
    accuracy: float
    macro_precision: float
    macro_recall: float
    macro_f1: float
    weighted_f1: float
    latency_ms: float
    report: dict[str, Any] = field(default_factory=dict)
    confusion_matrix: list[list[int]] = field(default_factory=list)
    predictions: list[str] = field(default_factory=list)


@dataclass
class ModelExperiment:
    key: str
    label: str
    pipeline: Pipeline
    random_split: EvaluationMetrics
    group_split: EvaluationMetrics
    manual_test: EvaluationMetrics
    cv_macro_f1_mean: float
    cv_macro_f1_std: float


def build_pipeline(kind: str, C: float = 1.0) -> Pipeline:
    if kind not in MODEL_LABELS:
        raise ValueError(f"Model tidak dikenal: {kind}")

    features = FeatureUnion(
        [
            (
                "word",
                TfidfVectorizer(
                    analyzer="word",
                    ngram_range=(1, 2),
                    min_df=1,
                    sublinear_tf=True,
                    strip_accents="unicode",
                    lowercase=True,
                    token_pattern=r"(?u)\b\w+\b",
                ),
            ),
            (
                "char",
                TfidfVectorizer(
                    analyzer="char_wb",
                    ngram_range=(3, 5),
                    min_df=1,
                    sublinear_tf=True,
                    strip_accents="unicode",
                    lowercase=True,
                ),
            ),
        ]
    )

    if kind == "logreg":
        classifier = LogisticRegression(
            C=C,
            class_weight="balanced",
            max_iter=3000,
            solver="lbfgs",
            random_state=42,
        )
    else:
        classifier = LinearSVC(
            C=C,
            class_weight="balanced",
            max_iter=10000,
            random_state=42,
        )

    return Pipeline(
        [
            ("features", features),
            ("classifier", classifier),
        ]
    )


def _softmax(scores: np.ndarray) -> np.ndarray:
    shifted = scores - np.max(scores)
    exponent = np.exp(shifted)
    return exponent / np.sum(exponent)


def predict_with_confidence(pipeline: Pipeline, texts: list[str]) -> tuple[list[str], list[float]]:
    predictions = pipeline.predict(texts).tolist()
    if hasattr(pipeline, "predict_proba"):
        probabilities = pipeline.predict_proba(texts)
        confidences = probabilities.max(axis=1).tolist()
    elif hasattr(pipeline, "decision_function"):
        scores = pipeline.decision_function(texts)
        if scores.ndim == 1:
            probabilities = 1.0 / (1.0 + np.exp(-scores))
            confidences = np.maximum(probabilities, 1.0 - probabilities).tolist()
        else:
            confidences = [_softmax(row).max() for row in scores]
    else:
        confidences = [1.0 for _ in predictions]
    return predictions, [float(value) for value in confidences]


def evaluate_pipeline(
    pipeline: Pipeline,
    train_texts: list[str],
    train_labels: list[str],
    test_texts: list[str],
    test_labels: list[str],
) -> EvaluationMetrics:
    pipeline.fit(train_texts, train_labels)

    started = time.perf_counter()
    predictions, _ = predict_with_confidence(pipeline, test_texts)
    elapsed_ms = (time.perf_counter() - started) * 1000
    latency_ms = elapsed_ms / max(1, len(test_texts))

    labels = sorted(set(test_labels))
    return EvaluationMetrics(
        accuracy=float(accuracy_score(test_labels, predictions)),
        macro_precision=float(
            precision_score(test_labels, predictions, average="macro", zero_division=0)
        ),
        macro_recall=float(
            recall_score(test_labels, predictions, average="macro", zero_division=0)
        ),
        macro_f1=float(f1_score(test_labels, predictions, average="macro", zero_division=0)),
        weighted_f1=float(
            f1_score(test_labels, predictions, average="weighted", zero_division=0)
        ),
        latency_ms=float(latency_ms),
        report=classification_report(
            test_labels,
            predictions,
            labels=labels,
            output_dict=True,
            zero_division=0,
        ),
        confusion_matrix=confusion_matrix(test_labels, predictions, labels=labels).tolist(),
        predictions=predictions,
    )


def grouped_train_test_split(
    frame: pd.DataFrame,
    test_size: float = 0.2,
    seed: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    rng = np.random.default_rng(seed)
    test_indices: list[int] = []

    for _, group in frame.groupby("label"):
        item_ids = sorted(group["item_id"].unique().tolist())
        rng.shuffle(item_ids)
        count = max(1, int(round(len(item_ids) * test_size)))
        held_out = set(item_ids[:count])
        test_indices.extend(group.index[group["item_id"].isin(held_out)].tolist())

    mask = frame.index.isin(test_indices)
    return frame.loc[~mask].reset_index(drop=True), frame.loc[mask].reset_index(drop=True)


def _metrics_to_dict(metrics: EvaluationMetrics) -> dict[str, Any]:
    return {
        "accuracy": metrics.accuracy,
        "macro_precision": metrics.macro_precision,
        "macro_recall": metrics.macro_recall,
        "macro_f1": metrics.macro_f1,
        "weighted_f1": metrics.weighted_f1,
        "latency_ms": metrics.latency_ms,
        "report": metrics.report,
        "confusion_matrix": metrics.confusion_matrix,
    }


def train_and_evaluate(seed: int = 42) -> dict[str, Any]:
    dataset = generate_training_samples(seed=seed)
    manual = load_manual_test()

    random_train, random_test = train_test_split(
        dataset,
        test_size=0.2,
        random_state=seed,
        stratify=dataset["label"],
    )
    group_train, group_test = grouped_train_test_split(dataset, test_size=0.2, seed=seed)

    cv = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=seed)
    experiments: dict[str, ModelExperiment] = {}

    for kind in ("logreg", "linearsvc"):
        pipeline = build_pipeline(kind)

        random_metrics = evaluate_pipeline(
            pipeline,
            random_train["text"].tolist(),
            random_train["label"].tolist(),
            random_test["text"].tolist(),
            random_test["label"].tolist(),
        )
        group_metrics = evaluate_pipeline(
            build_pipeline(kind),
            group_train["text"].tolist(),
            group_train["label"].tolist(),
            group_test["text"].tolist(),
            group_test["label"].tolist(),
        )
        manual_metrics = evaluate_pipeline(
            build_pipeline(kind),
            random_train["text"].tolist(),
            random_train["label"].tolist(),
            manual["text"].tolist(),
            manual["label"].tolist(),
        )

        cv_scores = cross_val_score(
            build_pipeline(kind),
            dataset["text"],
            dataset["label"],
            groups=dataset["item_id"],
            cv=cv,
            scoring="f1_macro",
            n_jobs=1,
        )

        experiments[kind] = ModelExperiment(
            key=kind,
            label=MODEL_LABELS[kind],
            pipeline=pipeline,
            random_split=random_metrics,
            group_split=group_metrics,
            manual_test=manual_metrics,
            cv_macro_f1_mean=float(np.mean(cv_scores)),
            cv_macro_f1_std=float(np.std(cv_scores)),
        )

    best_key = max(
        experiments,
        key=lambda key: (
            experiments[key].manual_test.macro_f1,
            experiments[key].group_split.macro_f1,
            -experiments[key].manual_test.latency_ms,
        ),
    )

    # Latih ulang model final pada seluruh data agar siap dipakai inference.
    for experiment in experiments.values():
        experiment.pipeline.fit(dataset["text"], dataset["label"])

    settings.model_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(experiments["logreg"].pipeline, settings.logreg_model_path)
    joblib.dump(experiments["linearsvc"].pipeline, settings.linearsvc_model_path)
    joblib.dump(experiments[best_key].pipeline, settings.best_model_path)

    metadata = {
        "best_model": best_key,
        "best_model_label": MODEL_LABELS[best_key],
        "selection_metric": "macro_f1_manual_test",
        "classes": sorted(dataset["label"].unique().tolist()),
        "dataset": {
            "total_samples": int(len(dataset)),
            "samples_per_class": dataset["label"].value_counts().to_dict(),
            "random_train": int(len(random_train)),
            "random_test": int(len(random_test)),
            "group_train": int(len(group_train)),
            "group_test": int(len(group_test)),
            "manual_test": int(len(manual)),
        },
        "metrics": {
            key: {
                "label": experiment.label,
                "random_split": _metrics_to_dict(experiment.random_split),
                "group_split": _metrics_to_dict(experiment.group_split),
                "manual_test": _metrics_to_dict(experiment.manual_test),
                "cv_macro_f1_mean": experiment.cv_macro_f1_mean,
                "cv_macro_f1_std": experiment.cv_macro_f1_std,
            }
            for key, experiment in experiments.items()
        },
        "hyperparameters": {
            "tfidf_word_ngram_range": [1, 2],
            "tfidf_char_ngram_range": [3, 5],
            "tfidf_sublinear_tf": True,
            "class_weight": "balanced",
            "C": 1.0,
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "sklearn_version": sklearn.__version__,
        "python_version": platform.python_version(),
    }
    settings.metadata_path.write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    return {
        "dataset": dataset,
        "manual_test": manual,
        "random_train": random_train,
        "random_test": random_test,
        "group_train": group_train,
        "group_test": group_test,
        "experiments": experiments,
        "best_key": best_key,
        "metadata": metadata,
    }


def comparison_rows(result: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for key, experiment in result["experiments"].items():
        rows.append(
            {
                "model": experiment.label,
                "random_accuracy": experiment.random_split.accuracy,
                "random_macro_f1": experiment.random_split.macro_f1,
                "group_accuracy": experiment.group_split.accuracy,
                "group_macro_f1": experiment.group_split.macro_f1,
                "manual_accuracy": experiment.manual_test.accuracy,
                "manual_macro_f1": experiment.manual_test.macro_f1,
                "cv_macro_f1": experiment.cv_macro_f1_mean,
                "cv_std": experiment.cv_macro_f1_std,
                "latency_ms": experiment.manual_test.latency_ms,
            }
        )
    return rows


def main() -> None:
    result = train_and_evaluate()
    print("[OK] Model training selesai")
    print(f"Model terbaik: {result['metadata']['best_model_label']}")
    for row in comparison_rows(result):
        print(
            f"- {row['model']}: manual macro-F1={row['manual_macro_f1']:.3f}, "
            f"group macro-F1={row['group_macro_f1']:.3f}, "
            f"latency={row['latency_ms']:.2f} ms/sample"
        )
    print(f"Metadata: {settings.metadata_path}")


if __name__ == "__main__":
    main()
