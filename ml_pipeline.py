"""
ML Pipeline for Space Mission Success Prediction

This script builds a complete machine learning pipeline to predict
mission success percentage using features from the space missions dataset.

Steps:
1. Load and preprocess cleaned dataset
2. Feature selection
3. Train/test split
4. Train 3 models: Linear Regression, Random Forest, XGBoost
5. Evaluate and compare models
6. Save the best model and scaler
7. Plot feature importance
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, r2_score
from xgboost import XGBRegressor


# ─────────────────────────────────────────────
# 1. LOAD DATASET
# ─────────────────────────────────────────────

def load_data(filepath: str) -> pd.DataFrame:
    """Load the cleaned space missions CSV file."""
    df = pd.read_csv(filepath)
    print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    return df


# ─────────────────────────────────────────────
# 2. PREPROCESS DATA
# ─────────────────────────────────────────────

def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    """Handle missing values and extract date features."""

    # Fill missing numerical values with median
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())

    # Fill missing categorical values with mode
    cat_cols = df.select_dtypes(include=["object"]).columns.tolist()
    for col in cat_cols:
        col_mode = df[col].mode()
        if not col_mode.empty:
            df[col] = df[col].fillna(col_mode[0])

    # Convert Launch Date to datetime and extract Year
    if "Launch Date" in df.columns:
        df["Launch Date"] = pd.to_datetime(df["Launch Date"], errors="coerce")
        df["Year"] = df["Launch Date"].dt.year

    return df


# ─────────────────────────────────────────────
# 3. SELECT FEATURES AND TARGET
# ─────────────────────────────────────────────

FEATURES = [
    "Mission Cost (billion USD)",
    "Fuel Consumption (tons)",
    "Payload Weight (tons)",
    "Crew Size",
    "Mission Duration (years)",
    "Distance from Earth (light-years)",
]

TARGET = "Mission Success (%)"


def select_features(df: pd.DataFrame):
    """Return feature matrix X and target vector y."""
    missing = [col for col in FEATURES + [TARGET] if col not in df.columns]
    if missing:
        raise ValueError(f"Missing columns in dataset: {missing}")

    X = df[FEATURES].copy()
    y = df[TARGET].copy()
    return X, y


# ─────────────────────────────────────────────
# 4. SCALE FEATURES
# ─────────────────────────────────────────────

def scale_features(X_train, X_test):
    """Normalise features using MinMaxScaler fitted on training data only."""
    scaler = MinMaxScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    return X_train_scaled, X_test_scaled, scaler


# ─────────────────────────────────────────────
# 5. TRAIN MODELS
# ─────────────────────────────────────────────

def train_models(X_train, y_train) -> dict:
    """Train Linear Regression, Random Forest, and XGBoost models."""

    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
        "XGBoost": XGBRegressor(n_estimators=100, random_state=42, verbosity=0),
    }

    trained = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        trained[name] = model
        print(f"  ✔ {name} trained")

    return trained


# ─────────────────────────────────────────────
# 6. EVALUATE MODELS
# ─────────────────────────────────────────────

def evaluate_models(trained_models: dict, X_test, y_test) -> dict:
    """Evaluate all models and print a comparison table."""

    results = {}
    print("\n" + "=" * 55)
    print(f"{'Model':<22} {'MSE':>12} {'R² Score':>12}")
    print("=" * 55)

    for name, model in trained_models.items():
        preds = model.predict(X_test)
        mse = mean_squared_error(y_test, preds)
        r2 = r2_score(y_test, preds)
        results[name] = {"model": model, "mse": mse, "r2": r2}
        print(f"{name:<22} {mse:>12.4f} {r2:>12.4f}")

    print("=" * 55)
    return results


# ─────────────────────────────────────────────
# 7. SELECT BEST MODEL
# ─────────────────────────────────────────────

def best_model(results: dict):
    """Return the model with the lowest MSE."""
    best_name = min(results, key=lambda k: results[k]["mse"])
    print(f"\n🏆 Best model: {best_name} (MSE = {results[best_name]['mse']:.4f})")
    return best_name, results[best_name]["model"]


# ─────────────────────────────────────────────
# 8. PLOT FEATURE IMPORTANCE (RANDOM FOREST)
# ─────────────────────────────────────────────

def plot_feature_importance(rf_model, feature_names: list):
    """Plot and save feature importance for the Random Forest model."""
    importances = rf_model.feature_importances_
    indices = np.argsort(importances)[::-1]

    plt.figure(figsize=(10, 6))
    plt.title("Random Forest – Feature Importance")
    plt.bar(range(len(feature_names)), importances[indices], align="center")
    plt.xticks(
        range(len(feature_names)),
        [feature_names[i] for i in indices],
        rotation=45,
        ha="right",
    )
    plt.tight_layout()
    plt.savefig("feature_importance.png", dpi=150)
    plt.show()
    print("Feature importance plot saved as 'feature_importance.png'")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    # Load & preprocess
    df = load_data("cleaned_space_missions.csv")
    df = preprocess(df)

    # Feature / target split
    X, y = select_features(df)

    # Train / test split (80 / 20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    print(f"\nTrain size: {X_train.shape[0]} | Test size: {X_test.shape[0]}")

    # Scale
    X_train_s, X_test_s, scaler = scale_features(X_train, X_test)

    # Train
    print("\nTraining models …")
    trained = train_models(X_train_s, y_train)

    # Evaluate
    results = evaluate_models(trained, X_test_s, y_test)

    # Best model
    best_name, best = best_model(results)

    # Save artefacts
    joblib.dump(best, "best_model.pkl")
    joblib.dump(scaler, "scaler.pkl")
    print(f"\nSaved 'best_model.pkl' ({best_name}) and 'scaler.pkl'")

    # Feature importance plot
    plot_feature_importance(trained["Random Forest"], FEATURES)


if __name__ == "__main__":
    main()
