"""
ML Pipeline for Space Mission Success Prediction (single model)

Trains ONE model — a Random Forest regressor — to predict
"Mission Success (%)" from six mission parameters, and saves it
together with the metadata the API serves (metrics, feature
importances and the input ranges seen in training).

Why Random Forest: in 5-fold cross-validation on this dataset it beat
Linear Regression and gradient boosting (R² ≈ 0.83 vs 0.72 / 0.80),
needs no feature scaling, and exposes feature importances directly.

Output:
  model.pkl               → dict bundle: model, features, metrics, importances, ranges
  feature_importance.png  → bar chart of feature importances

Run:
  python ml_pipeline.py
"""

import os
from datetime import datetime, timezone

import joblib
import matplotlib
import numpy as np
import pandas as pd

matplotlib.use("Agg")  # non-interactive backend for headless/server environments
import matplotlib.pyplot as plt  # noqa: E402
from sklearn.ensemble import RandomForestRegressor  # noqa: E402
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score  # noqa: E402
from sklearn.model_selection import cross_val_score, train_test_split  # noqa: E402

CSV_PATH = os.getenv("CSV_PATH", "cleaned_space_missions.csv")
MODEL_PATH = os.getenv("MODEL_PATH", "model.pkl")

MODEL_NAME = "Random Forest"

FEATURES = [
    "Mission Cost (billion USD)",
    "Fuel Consumption (tons)",
    "Payload Weight (tons)",
    "Crew Size",
    "Mission Duration (years)",
    "Distance from Earth (light-years)",
]

TARGET = "Mission Success (%)"


def build_model() -> RandomForestRegressor:
    """The one model this project uses."""
    return RandomForestRegressor(
        n_estimators=300,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )


def load_data(filepath: str) -> pd.DataFrame:
    """Load the cleaned CSV and fill any missing values."""
    df = pd.read_csv(filepath)
    print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")

    missing = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in dataset: {missing}")

    for col in FEATURES + [TARGET]:
        df[col] = df[col].fillna(df[col].median())
    return df


def plot_feature_importance(importances: dict[str, float], path: str = "feature_importance.png"):
    items = sorted(importances.items(), key=lambda kv: kv[1], reverse=True)
    plt.figure(figsize=(10, 6))
    plt.title(f"{MODEL_NAME} – Feature Importance")
    plt.bar([k for k, _ in items], [v for _, v in items])
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()
    print(f"Feature importance plot saved as '{path}'")


def main():
    df = load_data(CSV_PATH)
    X, y = df[FEATURES], df[TARGET]

    # Cross-validated score on the full dataset (more stable than one split)
    cv_r2 = cross_val_score(build_model(), X, y, cv=5, scoring="r2")
    print(f"5-fold CV R²: {cv_r2.mean():.4f} ± {cv_r2.std():.4f}")

    # Hold-out evaluation
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = build_model().fit(X_train, y_train)
    preds = model.predict(X_test)
    metrics = {
        "r2": round(float(r2_score(y_test, preds)), 4),
        "mae": round(float(mean_absolute_error(y_test, preds)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, preds))), 4),
        "cv_r2": round(float(cv_r2.mean()), 4),
    }
    print(f"Hold-out → R² {metrics['r2']}, MAE {metrics['mae']}, RMSE {metrics['rmse']}")

    # Refit on all data for the deployed model
    model = build_model().fit(X, y)

    importances = {f: round(float(v), 4) for f, v in zip(FEATURES, model.feature_importances_)}
    ranges = {
        f: {
            "min": round(float(X[f].min()), 4),
            "max": round(float(X[f].max()), 4),
            "median": round(float(X[f].median()), 4),
        }
        for f in FEATURES
    }

    bundle = {
        "model": model,
        "model_name": MODEL_NAME,
        "features": FEATURES,
        "target": TARGET,
        "metrics": metrics,
        "feature_importances": importances,
        "feature_ranges": ranges,
        "n_samples": int(len(df)),
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    joblib.dump(bundle, MODEL_PATH)
    print(f"Saved '{MODEL_PATH}' ({MODEL_NAME})")

    plot_feature_importance(importances)


if __name__ == "__main__":
    main()
