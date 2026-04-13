"""
FastAPI Backend – Space Mission Success Prediction

Endpoints:
  GET  /         → API health / status
  POST /predict  → accepts mission parameters, returns predicted success %

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

# ─────────────────────────────────────────────
# APPLICATION STATE
# ─────────────────────────────────────────────

app_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the model and scaler once at startup."""
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
