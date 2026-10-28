# Space Mission Analysis

Explore 500 simulated space missions (2025–2034) and predict a mission's success rate with a single **Random Forest** model.

- **Backend** – FastAPI (`app.py`) + scikit-learn (`ml_pipeline.py`)
- **Frontend** – React + Vite + Tailwind (`frontend/starbound-predict`), animated with Framer Motion, set in Unbounded and IBM Plex Sans (via Fontsource)

## Run it

```bash
# 1. Backend
pip install -r requirements.txt
python ml_pipeline.py          # trains the Random Forest → model.pkl + feature_importance.png
uvicorn app:app --reload       # http://127.0.0.1:8000  (docs at /docs)

# 2. Frontend (in another terminal)
cd frontend/starbound-predict
npm install
npm run dev                    # http://localhost:8080
```

Set `VITE_API_URL` if the API isn't on `http://127.0.0.1:8000`.

## The model

One model only: `RandomForestRegressor(n_estimators=300, min_samples_leaf=3)`. It was picked over Linear Regression and gradient boosting on 5-fold cross-validation (R² ≈ 0.83 vs 0.72 / 0.80), needs no feature scaling, and gives feature importances directly.

`model.pkl` is a bundle containing the fitted model plus its hold-out metrics, feature importances and the input ranges seen in training. The API serves those through `GET /model`, and the frontend uses them for the slider ranges and the "influence" bars.

## API

| Method | Path | What it returns |
|---|---|---|
| GET | `/` | Health check |
| GET | `/model` | Model name, metrics, feature importances and input ranges |
| POST | `/predict` | Predicted success % for six mission parameters |
| GET | `/data/kpis` | Dataset summary figures |
| GET | `/data/charts` | Chart-ready aggregates |

Note: in `cleaned_space_missions.csv`, mission cost and fuel consumption are already normalised to a 0–1 scale, so the predictor expects values in that range for those two inputs.
