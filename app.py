"""
FastAPI Backend – Space Mission Success Prediction

Endpoints:
  GET  /             → API health / status
  POST /predict      → accepts mission parameters, returns predicted success %
  GET  /data/kpis    → KPI summaries derived from the cleaned CSV dataset
  GET  /data/charts  → Chart-ready datasets derived from the cleaned CSV dataset

Run locally:
  uvicorn app:app --reload
"""

import os
from contextlib import asynccontextmanager

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────

MODEL_PATH = os.getenv("MODEL_PATH", "best_model.pkl")
SCALER_PATH = os.getenv("SCALER_PATH", "scaler.pkl")
CSV_PATH = os.getenv("CSV_PATH", "cleaned_space_missions.csv")

# Comma-separated list of allowed CORS origins.
# Default to "*" for development; override in production.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS: list[str] = (
    ["*"] if _raw_origins.strip() == "*" else [o.strip() for o in _raw_origins.split(",")]
)

# Ordered to match the training feature matrix
FEATURE_ORDER = [
    "Mission Cost (billion USD)",
    "Fuel Consumption (tons)",
    "Payload Weight (tons)",
    "Crew Size",
    "Mission Duration (years)",
    "Distance from Earth (light-years)",
]

# CSV column names used by the data endpoints
COL_SUCCESS = "Mission Success (%)"
COL_COST = "Mission Cost (billion USD)"
COL_YIELD = "Scientific Yield (points)"  # optional – falls back to COL_SUCCESS
COL_VEHICLE = "Launch Vehicle"
COL_MISSION_TYPE = "Mission Type"


def _load_csv(path: str) -> pd.DataFrame:
    """Load and minimally preprocess the cleaned space-missions CSV.

    Parsing is kept lightweight:
    * Numeric columns: missing values filled with the column median.
    * Categorical columns: missing values filled with the column mode.
    * The CSV already contains a pre-computed ``Year`` integer column;
      no date parsing is required.

    Returns an empty DataFrame if the file is missing or unreadable.
    """
    if not os.path.exists(path):
        print(f"[warn] CSV file '{path}' not found – data endpoints will return empty results.")
        return pd.DataFrame()

    try:
        df = pd.read_csv(path)
    except Exception as exc:
        print(f"[warn] Could not read CSV '{path}': {exc}")
        return pd.DataFrame()

    # Fill missing numerics with median
    for col in df.select_dtypes(include=[np.number]).columns:
        df[col] = df[col].fillna(df[col].median())

    # Fill missing categoricals with mode
    for col in df.select_dtypes(include=["object"]).columns:
        mode_vals = df[col].mode()
        if not mode_vals.empty:
            df[col] = df[col].fillna(mode_vals[0])

    print(f"CSV loaded from '{path}': {df.shape[0]} rows, {df.shape[1]} columns")
    return df

# ─────────────────────────────────────────────
# APPLICATION STATE
# ─────────────────────────────────────────────

app_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model, scaler, and CSV dataset once at startup."""
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(
            f"Model file '{MODEL_PATH}' not found. "
            "Run ml_pipeline.py first to train and save the model."
        )

    app_state["model"] = joblib.load(MODEL_PATH)

    # Scaler is optional – training may not have produced one
    if os.path.exists(SCALER_PATH):
        app_state["scaler"] = joblib.load(SCALER_PATH)
    else:
        app_state["scaler"] = None

    # CSV is optional – data endpoints degrade gracefully when absent
    app_state["df"] = _load_csv(CSV_PATH)

    print(f"Model loaded from '{MODEL_PATH}'")
    yield
    app_state.clear()


# ─────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────

app = FastAPI(
    title="Space Mission Success Predictor",
    description=(
        "Predict the success percentage of a space mission "
        "using a trained machine-learning model."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Allow origins configured via the ALLOWED_ORIGINS environment variable.
# In development the default is "*"; set a specific list in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────


class MissionInput(BaseModel):
    """Input parameters for a space mission."""

    mission_cost: float = Field(..., gt=0, description="Mission cost in billion USD")
    fuel_consumption: float = Field(..., gt=0, description="Fuel consumption in tons")
    payload_weight: float = Field(..., gt=0, description="Payload weight in tons")
    crew_size: int = Field(..., ge=0, description="Number of crew members")
    mission_duration: float = Field(..., gt=0, description="Mission duration in years")
    distance: float = Field(..., gt=0, description="Distance from Earth in light-years")

    model_config = {
        "json_schema_extra": {
            "example": {
                "mission_cost": 5.0,
                "fuel_consumption": 200.0,
                "payload_weight": 50.0,
                "crew_size": 4,
                "mission_duration": 2.5,
                "distance": 0.5,
            }
        }
    }


class PredictionResponse(BaseModel):
    """Prediction result returned to the caller."""

    predicted_success_percent: float = Field(
        ..., description="Predicted mission success percentage (0–100)"
    )
    status: str = Field(default="success")


class StatusResponse(BaseModel):
    """API health-check response."""

    status: str
    model_loaded: bool
    message: str


class KPIResponse(BaseModel):
    """KPI summary computed from the cleaned CSV dataset."""

    total_missions: int = Field(..., description="Total number of missions in the dataset")
    avg_success_rate: float | None = Field(
        None, description="Average mission success rate (%)"
    )
    avg_mission_cost: float | None = Field(
        None, description="Average mission cost (billion USD)"
    )
    avg_scientific_yield: float | None = Field(
        None, description="Average scientific yield (points). Falls back to avg_success_rate when Scientific Yield (points) column is absent."
    )


class MissionsOverTimePoint(BaseModel):
    year: int
    missions: int


class LaunchVehiclePoint(BaseModel):
    vehicle: str
    launches: int


class MissionTypePoint(BaseModel):
    name: str
    value: int


class CostYieldPoint(BaseModel):
    cost: float
    yield_: float = Field(..., alias="yield")

    model_config = {"populate_by_name": True}


class ChartsResponse(BaseModel):
    """Chart-ready datasets derived from the cleaned CSV."""

    missions_over_time: list[MissionsOverTimePoint] = Field(
        default_factory=list,
        description="Number of missions launched per year",
    )
    top_launch_vehicles: list[LaunchVehiclePoint] = Field(
        default_factory=list,
        description="Top 5 launch vehicles by number of launches",
    )
    mission_type_distribution: list[MissionTypePoint] = Field(
        default_factory=list,
        description="Mission count broken down by mission type",
    )
    cost_vs_yield: list[CostYieldPoint] = Field(
        default_factory=list,
        description="Scatter data: mission cost (B USD) vs scientific yield / success (%)",
    )


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────


@app.get("/", response_model=StatusResponse, summary="API health check")
def root() -> StatusResponse:
    """Return the current status of the API and whether the model is loaded."""
    model_loaded = "model" in app_state and app_state["model"] is not None
    return StatusResponse(
        status="ok",
        model_loaded=model_loaded,
        message="Space Mission Success Predictor API is running.",
    )


@app.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predict mission success %",
)
def predict(payload: MissionInput) -> PredictionResponse:
    """
    Accept mission parameters and return the predicted success percentage.

    The input values are scaled with the same scaler used during training
    (if available) before being passed to the model.
    """
    model = app_state.get("model")
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded.")

    # Build a named DataFrame so the scaler does not raise feature-name warnings
    features = pd.DataFrame(
        [[
            payload.mission_cost,
            payload.fuel_consumption,
            payload.payload_weight,
            payload.crew_size,
            payload.mission_duration,
            payload.distance,
        ]],
        columns=FEATURE_ORDER,
    )

    # Apply scaler if it was saved during training
    scaler = app_state.get("scaler")
    if scaler is not None:
        features = scaler.transform(features)

    prediction: float = float(model.predict(features)[0])

    # Clamp to a sensible [0, 100] range
    prediction = max(0.0, min(100.0, prediction))

    return PredictionResponse(predicted_success_percent=round(prediction, 2))


@app.get(
    "/data/kpis",
    response_model=KPIResponse,
    summary="KPI summaries from the CSV dataset",
)
def get_kpis() -> KPIResponse:
    """
    Return high-level KPI values computed from the cleaned CSV dataset:

    * **total_missions** – row count.
    * **avg_success_rate** – mean of ``Mission Success (%)``.
    * **avg_mission_cost** – mean of ``Mission Cost (billion USD)``.
    * **avg_scientific_yield** – mean of ``Scientific Yield (points)``; falls back to
      ``Mission Success (%)`` when that column is absent.
    """
    df: pd.DataFrame = app_state.get("df", pd.DataFrame())

    if df.empty:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Dataset not available. "
                f"Ensure '{CSV_PATH}' exists and is readable."
            ),
        )

    total_missions: int = len(df)

    def _safe_mean(col: str) -> float | None:
        if col not in df.columns:
            return None
        val = df[col].dropna().mean()
        return round(float(val), 2) if not np.isnan(val) else None

    avg_success = _safe_mean(COL_SUCCESS)

    avg_cost = _safe_mean(COL_COST)

    # Prefer explicit Scientific Yield column; fall back to Mission Success
    avg_yield = _safe_mean(COL_YIELD) if COL_YIELD in df.columns else avg_success

    return KPIResponse(
        total_missions=total_missions,
        avg_success_rate=avg_success,
        avg_mission_cost=avg_cost,
        avg_scientific_yield=avg_yield,
    )


@app.get(
    "/data/charts",
    response_model=ChartsResponse,
    summary="Chart datasets from the CSV dataset",
)
def get_charts() -> ChartsResponse:
    """
    Return four chart-ready datasets derived from the cleaned CSV:

    * **missions_over_time** – mission count grouped by launch year.
    * **top_launch_vehicles** – top 5 vehicles by launch count.
    * **mission_type_distribution** – mission count by mission type.
    * **cost_vs_yield** – scatter points of cost (B USD) vs yield/success (%).
    """
    df: pd.DataFrame = app_state.get("df", pd.DataFrame())

    if df.empty:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Dataset not available. "
                f"Ensure '{CSV_PATH}' exists and is readable."
            ),
        )

    # ── missions over time ────────────────────────────────────────────────────
    missions_over_time: list[MissionsOverTimePoint] = []
    if "Year" in df.columns:
        by_year = (
            df.dropna(subset=["Year"])
            .groupby("Year")
            .size()
            .reset_index(name="missions")
            .sort_values("Year")
        )
        missions_over_time = [
            MissionsOverTimePoint(year=int(row["Year"]), missions=int(row["missions"]))
            for _, row in by_year.iterrows()
        ]

    # ── top launch vehicles ───────────────────────────────────────────────────
    top_launch_vehicles: list[LaunchVehiclePoint] = []
    if COL_VEHICLE in df.columns:
        counts = df[COL_VEHICLE].dropna().value_counts().head(5)
        top_launch_vehicles = [
            LaunchVehiclePoint(vehicle=str(vehicle), launches=int(count))
            for vehicle, count in counts.items()
        ]

    # ── mission type distribution ─────────────────────────────────────────────
    mission_type_distribution: list[MissionTypePoint] = []
    if COL_MISSION_TYPE in df.columns:
        counts = df[COL_MISSION_TYPE].dropna().value_counts()
        mission_type_distribution = [
            MissionTypePoint(name=str(name), value=int(count))
            for name, count in counts.items()
        ]

    # ── cost vs yield scatter ─────────────────────────────────────────────────
    cost_vs_yield: list[CostYieldPoint] = []
    if COL_COST in df.columns:
        yield_col = COL_YIELD if COL_YIELD in df.columns else COL_SUCCESS
        if yield_col in df.columns:
            scatter_df = df[[COL_COST, yield_col]].dropna()
            cost_vs_yield = [
                CostYieldPoint(cost=round(float(row[COL_COST]), 2), yield_=round(float(row[yield_col]), 2))
                for _, row in scatter_df.iterrows()
            ]

    return ChartsResponse(
        missions_over_time=missions_over_time,
        top_launch_vehicles=top_launch_vehicles,
        mission_type_distribution=mission_type_distribution,
        cost_vs_yield=cost_vs_yield,
    )
