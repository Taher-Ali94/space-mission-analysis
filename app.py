"""
app.py
------
FastAPI backend for serving the trained Space Missions ML model.

Endpoints:
  GET  /         → API health-check / status
  POST /predict  → accepts mission parameters, returns predicted success %

Run with:
  uvicorn app:app --reload

Then open http://localhost:8000/docs for the interactive API documentation.
"""

import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Application setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Space Mission Success Predictor",
    description=(
        "Predicts the success percentage of a space mission "
        "using a trained machine learning model."
    ),
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS middleware – allow any origin so a frontend can connect freely
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # restrict to specific domains in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Load model and scaler at startup
# ---------------------------------------------------------------------------

MODEL_PATH = "best_model.pkl"
SCALER_PATH = "scaler.pkl"

model = None
scaler = None


@app.on_event("startup")
def load_artifacts():
    """Load the trained model (and scaler if available) when the server starts."""
    global model, scaler

    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(
            f"Model file '{MODEL_PATH}' not found. "
            "Please run ml_pipeline.py first to train and save the model."
        )

    model = joblib.load(MODEL_PATH)
    print(f"Model loaded from '{MODEL_PATH}'.")

    if os.path.exists(SCALER_PATH):
        scaler = joblib.load(SCALER_PATH)
        print(f"Scaler loaded from '{SCALER_PATH}'.")
    else:
        print(
            f"Warning: scaler file '{SCALER_PATH}' not found. "
            "Raw feature values will be passed to the model."
        )


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class MissionInput(BaseModel):
    """Input parameters for a single space mission prediction."""

    mission_cost: float = Field(
        ..., gt=0, description="Mission cost in billion USD"
    )
    fuel_consumption: float = Field(
        ..., gt=0, description="Fuel consumption in tons"
    )
    payload_weight: float = Field(
        ..., gt=0, description="Payload weight in tons"
    )
    crew_size: int = Field(
        ..., ge=0, description="Number of crew members (0 for unmanned)"
    )
    mission_duration: float = Field(
        ..., gt=0, description="Mission duration in years"
    )
    distance: float = Field(
        ..., gt=0, description="Distance from Earth in light-years"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "mission_cost": 2.5,
                    "fuel_consumption": 300.0,
                    "payload_weight": 5.0,
                    "crew_size": 4,
                    "mission_duration": 1.5,
                    "distance": 0.00001,
                }
            ]
        }
    }


class PredictionOutput(BaseModel):
    """Prediction result returned to the client."""

    predicted_success_percent: float = Field(
        ..., description="Predicted mission success percentage (0–100)"
    )
    message: str = Field(..., description="Human-readable result summary")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/", summary="API Status")
def root():
    """Health-check endpoint – confirms that the API is running."""
    return {
        "status": "ok",
        "message": "Space Mission Success Predictor API is running.",
        "docs": "/docs",
    }


@app.post("/predict", response_model=PredictionOutput, summary="Predict Mission Success")
def predict(mission: MissionInput):
    """
    Accept mission parameters and return the predicted success percentage.

    The six input features are:
    - mission_cost        (billion USD)
    - fuel_consumption    (tons)
    - payload_weight      (tons)
    - crew_size           (count)
    - mission_duration    (years)
    - distance            (light-years)
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Please check the server logs.",
        )

    # Build a feature DataFrame in the same column order as training
    feature_names = [
        "Mission Cost (billion USD)",
        "Fuel Consumption (tons)",
        "Payload Weight (tons)",
        "Crew Size",
        "Mission Duration (years)",
        "Distance from Earth (light-years)",
    ]
    features = pd.DataFrame([[
        mission.mission_cost,
        mission.fuel_consumption,
        mission.payload_weight,
        mission.crew_size,
        mission.mission_duration,
        mission.distance,
    ]], columns=feature_names)

    # Apply the scaler if it was saved during training
    if scaler is not None:
        features = scaler.transform(features)

    # Generate prediction
    prediction = float(model.predict(features)[0])

    # Clamp to a sensible [0, 100] range
    prediction = max(0.0, min(100.0, prediction))

    return PredictionOutput(
        predicted_success_percent=round(prediction, 2),
        message=f"Predicted mission success: {round(prediction, 2)} %",
    )
