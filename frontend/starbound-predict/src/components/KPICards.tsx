import { useQuery } from "@tanstack/react-query";
import CountUp from "@/components/CountUp";
import { fetchKPIs, type KPIData } from "@/lib/api";

interface Readout {
  label: string;
  value: number | null;
  decimals: number;
  prefix?: string;
  suffix?: string;
}

function readouts(d?: KPIData): Readout[] {
  return [
    { label: "Missions in the dataset", value: d?.total_missions ?? null, decimals: 0 },
    { label: "Average success rate", value: d?.avg_success_rate ?? null, decimals: 1, suffix: "%" },
    { label: "Average cost index (0–1 scale)", value: d?.avg_mission_cost ?? null, decimals: 2 },
    { label: "Average scientific yield", value: d?.avg_scientific_yield ?? null, decimals: 1, suffix: " pts" },
  ];
}

/** One telemetry strip rather than four separate cards. */
const KPICards = () => {
  const { data, isLoading, isError } = useQuery({ queryKey: ["kpis"], queryFn: fetchKPIs });

  return (
    <div>
      <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius)] border border-line bg-panel/70 backdrop-blur lg:grid-cols-4">
        {readouts(data).map((r, i) => (
          <div
            key={r.label}
            className={`flex flex-col-reverse gap-2 p-6 sm:p-8 ${i % 2 === 1 ? "border-l border-line" : ""} ${
              i >= 2 ? "border-t border-line lg:border-t-0" : ""
            } ${i === 2 ? "lg:border-l" : ""}`}
          >
            <dt className="text-sm text-ink-muted">{r.label}</dt>
            <dd className="font-display text-[clamp(1.6rem,3vw,2.5rem)] font-semibold tabular-nums tracking-tight text-ink">
              {r.value != null ? (
                <CountUp value={r.value} decimals={r.decimals} prefix={r.prefix} suffix={r.suffix} />
              ) : (
                <span className={isLoading ? "animate-pulse text-ink-muted" : "text-ink-muted"}>—</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {isError && (
        <p className="mt-4 text-sm text-abort">
          Couldn't load the dataset figures. Start the API with <code className="text-ink">uvicorn app:app --reload</code> and refresh.
        </p>
      )}
    </div>
  );
};

export default KPICards;
