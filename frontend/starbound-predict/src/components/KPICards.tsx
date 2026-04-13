import { useQuery } from "@tanstack/react-query";
import { Rocket, Target, DollarSign, FlaskConical } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// Shape of the /data/kpis response
interface KPIData {
  total_missions: number;
  avg_success_rate: number | null;
  avg_mission_cost: number | null;
  avg_scientific_yield: number | null;
}

// Fetch KPI data from the backend
function fetchKPIs(): Promise<KPIData> {
  return fetch(`${API_BASE}/data/kpis`).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch KPIs");
    return r.json();
  });
}

// Map raw API response to display strings for each card
function buildKPICards(data: KPIData) {
  return [
    {
      label: "Total Missions",
      value: data.total_missions.toLocaleString(),
      icon: Rocket,
      glow: "glow-border-blue",
    },
    {
      label: "Avg Success Rate",
      value: data.avg_success_rate != null ? `${data.avg_success_rate.toFixed(1)}%` : "—",
      icon: Target,
      glow: "glow-border-purple",
    },
    {
      label: "Avg Mission Cost",
      value: data.avg_mission_cost != null ? `$${data.avg_mission_cost.toFixed(2)}B` : "—",
      icon: DollarSign,
      glow: "glow-border-cyan",
    },
    {
      label: "Scientific Yield",
      value: data.avg_scientific_yield != null ? `${data.avg_scientific_yield.toFixed(1)} pts` : "—",
      icon: FlaskConical,
      glow: "glow-border-blue",
    },
  ];
}

// Static card metadata used for placeholders (loading / error states)
const PLACEHOLDER_CARDS = [
  { label: "Total Missions",   icon: Rocket,       glow: "glow-border-blue"   },
  { label: "Avg Success Rate", icon: Target,       glow: "glow-border-purple" },
  { label: "Avg Mission Cost", icon: DollarSign,   glow: "glow-border-cyan"   },
  { label: "Scientific Yield", icon: FlaskConical, glow: "glow-border-blue"   },
];

const KPICards = () => {
  const { data, isLoading, isError } = useQuery<KPIData>({
    queryKey: ["kpis"],
    queryFn: fetchKPIs,
  });

  const showPlaceholder = isLoading || isError || !data;
  const kpis = showPlaceholder ? null : buildKPICards(data);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {showPlaceholder
        ? PLACEHOLDER_CARDS.map((kpi, i) => (
            <div
              key={kpi.label}
              className={`relative rounded-xl border bg-card p-6 transition-all duration-300 hover:scale-105 hover:brightness-110 ${kpi.glow}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold gradient-text">{isLoading ? "…" : "—"}</p>
            </div>
          ))
        : kpis!.map((kpi, i) => (
            <div
              key={kpi.label}
              className={`relative rounded-xl border bg-card p-6 transition-all duration-300 hover:scale-105 hover:brightness-110 ${kpi.glow}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-3xl font-bold gradient-text">{kpi.value}</p>
            </div>
          ))}
    </div>
  );
};

export default KPICards;
