export const API_BASE: string = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* body was not JSON */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// ── /data/kpis ───────────────────────────────────────────────────────────────
export interface KPIData {
  total_missions: number;
  avg_success_rate: number | null;
  avg_mission_cost: number | null;
  avg_scientific_yield: number | null;
}
export const fetchKPIs = () => getJSON<KPIData>("/data/kpis");

// ── /data/charts ─────────────────────────────────────────────────────────────
export interface ChartsData {
  missions_over_time: { year: number; missions: number }[];
  top_launch_vehicles: { vehicle: string; launches: number }[];
  mission_type_distribution: { name: string; value: number }[];
  cost_vs_yield: { cost: number; yield: number }[];
}
export const fetchCharts = () => getJSON<ChartsData>("/data/charts");

// ── /model ───────────────────────────────────────────────────────────────────
export interface FeatureInfo {
  key: MissionKey;
  column: string;
  importance: number;
  min: number;
  max: number;
  median: number;
}
export interface ModelInfo {
  model_name: string;
  target: string;
  n_samples: number;
  trained_at: string | null;
  metrics: { r2?: number; mae?: number; rmse?: number; cv_r2?: number };
  features: FeatureInfo[];
}
export const fetchModelInfo = () => getJSON<ModelInfo>("/model");

// ── /predict ─────────────────────────────────────────────────────────────────
export type MissionKey =
  | "mission_cost"
  | "fuel_consumption"
  | "payload_weight"
  | "crew_size"
  | "mission_duration"
  | "distance";

export type MissionInput = Record<MissionKey, number>;

export interface Prediction {
  predicted_success_percent: number;
  model_name: string;
}
export const predict = (input: MissionInput) =>
  getJSON<Prediction>("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
