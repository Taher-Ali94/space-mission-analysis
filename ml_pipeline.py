"""
ml_pipeline.py
--------------
Complete machine learning pipeline for the Space Missions dataset.

Steps:
  1. Load the cleaned dataset from 'cleaned_space_missions.csv'
  2. Handle any remaining missing values
  3. Convert 'Launch Date' to datetime and extract 'Year'
  4. One-hot encode categorical columns
  5. Select the six numerical features and the target variable
  6. Scale features with MinMaxScaler
  7. Split into 80% training/20% test sets
  8. Train three regression models:
       - Linear Regression
       - Random Forest Regressor
       - XGBoost Regressor
  9. Evaluate every model with Mean Squared Error (MSE) and R² score
 10. Print a side-by-side comparison table
 11. Save the best model as 'best_model.pkl' and the scaler as 'scaler.pkl'
 12. Plot feature importance for the Random Forest model
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")          # use non-interactive backend so the script works
import matplotlib.pyplot as plt
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from xgboost import XGBRegressor


# ---------------------------------------------------------------------------
# 1.  LOAD DATASET
# ---------------------------------------------------------------------------

def load_data(filepath: str = "cleaned_space_missions.csv") -> pd.DataFrame:
    """Load the cleaned Space Missions CSV file into a DataFrame."""
    df = pd.read_csv(filepath)
    print(f"Dataset loaded: {df.shape[0]} rows, {df.shape[1]} columns")
    return df


# ---------------------------------------------------------------------------
# 2.  PREPROCESSING
# ---------------------------------------------------------------------------

def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    """
    Handle missing values, parse dates, and encode categoricals.

    - Numerical columns  → fill with median
    - Categorical columns → fill with mode
    - 'Launch Date'       → convert to datetime, extract 'Year'
    - Categorical columns → one-hot encode
    """
    # --- Fill missing numerical values with the column median
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in num_cols:
        if df[col].isnull().any():
            df[col] = df[col].fillna(df[col].median())

    # --- Fill missing categorical values with the column mode
    #     (exclude numeric columns to get all text/categorical columns)
    cat_cols = [c for c in df.columns if c not in num_cols]
    for col in cat_cols:
        if df[col].isnull().any():
            df[col] = df[col].fillna(df[col].mode()[0])

    # --- Convert 'Launch Date' to datetime and extract 'Year'
    if "Launch Date" in df.columns:
        df["Launch Date"] = pd.to_datetime(df["Launch Date"], errors="coerce")
        df["Year"] = df["Launch Date"].dt.year
        # Drop the original datetime column – it can't be used directly in ML
        df = df.drop(columns=["Launch Date"])

    # --- One-hot encode remaining categorical (non-numeric) columns
    cat_cols = [c for c in df.columns if c not in df.select_dtypes(include=[np.number]).columns]
    if cat_cols:
        df = pd.get_dummies(df, columns=cat_cols, drop_first=True)

    print("Preprocessing complete.")
    return df


# ---------------------------------------------------------------------------
# 3.  FEATURE / TARGET SELECTION
# ---------------------------------------------------------------------------

FEATURE_COLS = [
    "Mission Cost (billion USD)",
    "Fuel Consumption (tons)",
    "Payload Weight (tons)",
    "Crew Size",
    "Mission Duration (years)",
    "Distance from Earth (light-years)",
]
TARGET_COL = "Mission Success (%)"


def select_features(df: pd.DataFrame):
    """
    Return (X, y) where X contains the six selected features
    and y is the target variable 'Mission Success (%)'.
    """
    missing = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing feature columns in dataset: {missing}")
    if TARGET_COL not in df.columns:
        raise ValueError(f"Target column '{TARGET_COL}' not found in dataset.")

    X = df[FEATURE_COLS].copy()
    y = df[TARGET_COL].copy()
    print(f"Features shape: {X.shape}, Target shape: {y.shape}")
    return X, y


# ---------------------------------------------------------------------------
# 4.  SCALING
# ---------------------------------------------------------------------------

def scale_features(X_train, X_test):
    """
    Fit a MinMaxScaler on the training set and transform both train and test.
    Returns the scaled arrays and the fitted scaler.
    """
    scaler = MinMaxScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    return X_train_scaled, X_test_scaled, scaler


# ---------------------------------------------------------------------------
# 5.  TRAIN MODELS
# ---------------------------------------------------------------------------

def train_models(X_train, y_train) -> dict:
    """
    Train Linear Regression, Random Forest, and XGBoost regressors.
    Returns a dict mapping model name → fitted model object.
    """
    models = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=100, random_state=42),
        "XGBoost": XGBRegressor(n_estimators=100, random_state=42, verbosity=0),
    }

    for name, model in models.items():
        model.fit(X_train, y_train)
        print(f"  Trained: {name}")

    return models


# ---------------------------------------------------------------------------
# 6.  EVALUATE MODELS
# ---------------------------------------------------------------------------

def evaluate_models(models: dict, X_test, y_test) -> pd.DataFrame:
    """
    Evaluate every model on the test set using MSE and R².
    Prints a comparison table and returns a DataFrame with the results.
    """
    results = []
    for name, model in models.items():
        y_pred = model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        results.append({"Model": name, "MSE": round(mse, 4), "R2": round(r2, 4)})

    results_df = pd.DataFrame(results).sort_values("MSE")

    print("\n" + "=" * 45)
    print("       MODEL COMPARISON (lower MSE = better)")
    print("=" * 45)
    print(results_df.to_string(index=False))
    print("=" * 45 + "\n")

    return results_df


# ---------------------------------------------------------------------------
# 7.  SAVE BEST MODEL & SCALER
# ---------------------------------------------------------------------------

def save_best_model(models: dict, results_df: pd.DataFrame, scaler: MinMaxScaler):
    """
    Identify the best model (lowest MSE), save it as 'best_model.pkl',
    and save the scaler as 'scaler.pkl'.
    """
    best_name = results_df.iloc[0]["Model"]   # already sorted by MSE ascending
    best_model = models[best_name]

    joblib.dump(best_model, "best_model.pkl")
    joblib.dump(scaler, "scaler.pkl")

    print(f"Best model: '{best_name}'  (saved as best_model.pkl)")
    print("Scaler saved as scaler.pkl")
    return best_name


# ---------------------------------------------------------------------------
# 8.  FEATURE IMPORTANCE PLOT (Random Forest)
# ---------------------------------------------------------------------------

def plot_feature_importance(rf_model: RandomForestRegressor,
                            feature_names: list,
                            save_path: str = "feature_importance.png"):
    """
    Plot and save the feature importance chart for the Random Forest model.
    """
    importances = rf_model.feature_importances_
    indices = np.argsort(importances)[::-1]          # sort descending

    plt.figure(figsize=(8, 5))
    plt.title("Random Forest – Feature Importance")
    plt.bar(
        range(len(feature_names)),
        importances[indices],
        color="steelblue",
        align="center",
    )
    plt.xticks(
        range(len(feature_names)),
        [feature_names[i] for i in indices],
        rotation=45,
        ha="right",
    )
    plt.ylabel("Importance Score")
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()
    print(f"Feature importance chart saved as '{save_path}'")


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    print("\n===  SPACE MISSIONS ML PIPELINE  ===\n")

    # 1. Load
    df = load_data("cleaned_space_missions.csv")

    # 2. Preprocess
    df = preprocess(df)

    # 3. Feature / target split
    X, y = select_features(df)

    # 4. Train/test split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    print(f"Train size: {X_train.shape[0]}  |  Test size: {X_test.shape[0]}")

    # 5. Scale features
    X_train_s, X_test_s, scaler = scale_features(X_train, X_test)

    # 6. Train all three models
    print("\nTraining models …")
    models = train_models(X_train_s, y_train)

    # 7. Evaluate
    results_df = evaluate_models(models, X_test_s, y_test)

    # 8. Save best model + scaler
    save_best_model(models, results_df, scaler)

    # 9. Feature importance plot for Random Forest
    plot_feature_importance(
        models["Random Forest"],
        feature_names=FEATURE_COLS,
    )

    print("\nPipeline complete!")


if __name__ == "__main__":
    main()
