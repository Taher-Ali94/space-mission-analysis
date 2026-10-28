import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import Rocket from "@/components/Rocket";
import { fetchModelInfo, predict, type MissionInput, type MissionKey } from "@/lib/api";

interface FieldDef {
  key: MissionKey;
  label: string;
  hint: string;
  unit?: string;
  integer?: boolean;
  /** Fallback range (from the dataset) used until /model responds */
  min: number;
  max: number;
  median: number;
}

const FIELDS: FieldDef[] = [
  { key: "mission_cost", label: "Mission cost", hint: "Cost on the dataset's 0–1 scale", min: 0, max: 1, median: 0.51 },
  { key: "payload_weight", label: "Payload weight", hint: "Total payload", unit: "t", min: 1, max: 100, median: 51 },
  { key: "crew_size", label: "Crew size", hint: "People on board", integer: true, min: 1, max: 99, median: 50 },
  { key: "mission_duration", label: "Mission duration", hint: "Planned length of the mission", unit: "yrs", min: 1.4, max: 29.5, median: 16.4 },
  { key: "distance", label: "Distance from Earth", hint: "How far the target is", unit: "ly", min: 0.35, max: 49.9, median: 26.2 },
  { key: "fuel_consumption", label: "Fuel consumption", hint: "Fuel use on the dataset's 0–1 scale", min: 0, max: 1, median: 0.52 },
];

const decimalsFor = (f: FieldDef) => (f.integer ? 0 : f.max <= 1 ? 2 : 1);
const stepFor = (f: FieldDef) => (f.integer ? 1 : f.max <= 1 ? 0.01 : 0.1);

function verdict(p: number) {
  if (p >= 90) return { tone: "text-go", text: "Nominal. This profile looks like the missions that succeeded." };
  if (p >= 80) return { tone: "text-hold", text: "Marginal. Similar missions often fell short of full success." };
  return { tone: "text-abort", text: "High risk. Few missions like this one succeeded." };
}

// ── Flight gauge: the rocket climbs to the predicted success % ──────────────
const ROCKET_W = 44;
const ROCKET_H = (ROCKET_W * 260) / 80;

const FlightGauge = ({ result, loading }: { result: number | null; loading: boolean }) => {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(0);
  const [travel, setTravel] = useState(300);
  const [flying, setFlying] = useState(false);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTravel(el.clientHeight - ROCKET_H - 8);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const y = useTransform(progress, (v) => -(v / 100) * travel);
  const trail = useTransform(progress, (v) => (v / 100) * travel);

  useEffect(
    () =>
      progress.on("change", (v) => {
        if (readoutRef.current) readoutRef.current.textContent = v.toFixed(1);
      }),
    [progress],
  );

  useEffect(() => {
    if (result == null) return;
    if (reduce) {
      progress.set(result);
      return;
    }
    let cancelled = false;
    (async () => {
      setFlying(true);
      if (progress.get() > 0) await animate(progress, 0, { duration: 0.5, ease: "easeIn" });
      if (cancelled) return;
      await animate(progress, result, { duration: 2.6, ease: [0.5, 0, 0.15, 1] });
      if (!cancelled) setFlying(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [result, reduce, progress]);

  const v = result != null ? verdict(result) : null;

  return (
    <div className="flex h-full flex-col rounded-[var(--radius)] border border-line bg-panel/70 p-6 backdrop-blur">
      <div className="mb-4 min-h-[6.5rem]" aria-live="polite">
        <p className="text-sm text-ink-muted">Predicted mission success</p>
        <p className="font-display text-6xl font-semibold tabular-nums tracking-tight text-ink">
          {result == null ? <span className="text-ink-muted">—</span> : <><span ref={readoutRef}>0.0</span><span className="text-3xl text-ink-muted">%</span></>}
        </p>
        {v && !flying && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mt-2 text-sm leading-snug ${v.tone}`}>
            {v.text}
          </motion.p>
        )}
      </div>

      <div className="relative flex-1">
        {/* Altitude scale */}
        <div ref={trackRef} className="relative h-[340px] lg:h-full lg:min-h-[340px]">
          {[100, 90, 80, 50, 0].map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 flex items-center gap-2 text-xs tabular-nums text-ink-muted"
              style={{ bottom: `${(t / 100) * travel + ROCKET_H / 2}px` }}
            >
              <span className="w-8 text-right">{t}</span>
              <span className={`h-px flex-1 ${t === 90 ? "bg-go/50" : t === 80 ? "bg-hold/40" : "bg-line"}`} />
            </div>
          ))}

          {/* Trail */}
          <motion.div
            className="absolute bottom-[45px] w-[4px] rounded-full"
            style={{
              left: `calc(50% + 18px - 2px)`,
              height: trail,
              background: "linear-gradient(to top, hsl(var(--flame) / 0.05), hsl(var(--flame) / 0.6))",
            }}
          />

          {/* Rocket */}
          <motion.div className="absolute bottom-0" style={{ y, left: `calc(50% + 18px - ${ROCKET_W / 2}px)`, width: ROCKET_W }}>
            <motion.div
              animate={loading ? { x: [-1, 1, -1, 1, 0] } : { x: 0 }}
              transition={loading ? { duration: 0.12, repeat: Infinity } : { duration: 0.2 }}
            >
              <Rocket burning={loading || flying} thrust={loading ? 0.5 : 1} className="h-auto w-full" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ── Form ────────────────────────────────────────────────────────────────────
const PredictionForm = () => {
  const { data: model } = useQuery({ queryKey: ["model"], queryFn: fetchModelInfo, retry: 1 });

  // Merge live ranges/importances from the API over the fallbacks
  const fields = useMemo(
    () =>
      FIELDS.map((f) => {
        const info = model?.features.find((m) => m.key === f.key);
        return info
          ? { ...f, min: f.integer ? Math.floor(info.min) : info.min, max: f.integer ? Math.ceil(info.max) : info.max, median: info.median, importance: info.importance }
          : { ...f, importance: undefined as number | undefined };
      }),
    [model],
  );

  const [values, setValues] = useState<Record<MissionKey, string>>(
    () => Object.fromEntries(FIELDS.map((f) => [f.key, f.median.toFixed(decimalsFor(f))])) as Record<MissionKey, string>,
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (k: MissionKey, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setError(null);
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {} as MissionInput;
    for (const f of fields) {
      const n = Number(values[f.key]);
      if (values[f.key].trim() === "" || Number.isNaN(n) || n < 0) {
        setError(`Enter a number of 0 or more for ${f.label.toLowerCase()}.`);
        return;
      }
      if (f.key !== "mission_cost" && f.key !== "fuel_consumption" && f.key !== "crew_size" && n === 0) {
        setError(`${f.label} must be greater than 0.`);
        return;
      }
      body[f.key] = f.integer ? Math.round(n) : n;
    }

    setLoading(true);
    setError(null);
    try {
      const minSpin = new Promise((r) => setTimeout(r, 700)); // let the ignition read
      const [res] = await Promise.all([predict(body), minSpin]);
      setResult(res.predicted_success_percent);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Couldn't reach the prediction API. Start it with `uvicorn app:app --reload` on port 8000."
          : `Prediction failed: ${(err as Error).message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <form onSubmit={handlePredict} className="rounded-[var(--radius)] border border-line bg-panel/70 p-6 backdrop-blur sm:p-8" noValidate>
        <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {fields.map((f) => {
            const num = Number(values[f.key]);
            const sliderVal = Number.isFinite(num) ? Math.min(f.max, Math.max(f.min, num)) : f.median;
            return (
              <div key={f.key}>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <label htmlFor={f.key} className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{f.label}</span>
                    <span className="block text-xs text-ink-muted">{f.hint}</span>
                    {f.importance != null && (
                      <span className="mt-1.5 flex items-center gap-2 text-xs text-ink-muted" title="Share of the model's decisions driven by this input">
                        <span className="h-1 w-16 overflow-hidden rounded-full bg-line">
                          <span className="block h-full rounded-full bg-plasma" style={{ width: `${Math.max(3, f.importance * 100)}%` }} />
                        </span>
                        {Math.round(f.importance * 100)}% influence
                      </span>
                    )}
                  </label>
                  <div className="flex shrink-0 items-baseline gap-1">
                    <input
                      id={f.key}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={stepFor(f)}
                      value={values[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      className="w-20 rounded-md border border-line bg-night/60 px-2 py-1 text-right text-sm tabular-nums text-ink outline-none focus-visible:border-flame focus-visible:ring-1 focus-visible:ring-flame"
                    />
                    <span className="w-6 text-xs text-ink-muted">{f.unit ?? ""}</span>
                  </div>
                </div>
                <Slider
                  aria-label={f.label}
                  min={f.min}
                  max={f.max}
                  step={stepFor(f)}
                  value={[sliderVal]}
                  onValueChange={([v]) => set(f.key, v.toFixed(decimalsFor(f)))}
                />
              </div>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="mt-7 rounded-lg border border-abort/40 bg-abort/10 px-4 py-3 text-sm text-abort">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            {model
              ? `${model.model_name}, trained on ${model.n_samples} missions. On held-out missions it scores R² ${model.metrics.r2?.toFixed(2)} and is typically within ${model.metrics.mae?.toFixed(1)} points.`
              : "Sliders start at the median mission in the dataset."}
          </p>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-flame px-7 font-medium text-night transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-flame"
          >
            {loading ? "Predicting…" : "Predict success"}
          </button>
        </div>
      </form>

      <FlightGauge result={result} loading={loading} />
    </div>
  );
};

export default PredictionForm;
