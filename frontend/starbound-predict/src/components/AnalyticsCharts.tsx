import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// ── Types matching the /data/charts response ──────────────────────────────────

interface MissionsOverTimePoint { year: number; missions: number }
interface LaunchVehiclePoint    { vehicle: string; launches: number }
interface MissionTypePoint      { name: string; value: number }
interface CostYieldPoint        { cost: number; yield: number }

interface ChartsData {
  missions_over_time:        MissionsOverTimePoint[];
  top_launch_vehicles:       LaunchVehiclePoint[];
  mission_type_distribution: MissionTypePoint[];
  cost_vs_yield:             CostYieldPoint[];
}

// Fetch all chart datasets in a single call
function fetchCharts(): Promise<ChartsData> {
  return fetch(`${API_BASE}/data/charts`).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch chart data");
    return r.json();
  });
}

// ── Shared style constants (unchanged) ───────────────────────────────────────

const COLORS = ["hsl(210, 100%, 55%)", "hsl(260, 60%, 50%)", "hsl(185, 100%, 50%)", "hsl(330, 70%, 55%)"];
const chartStyle = { fontSize: 12, fill: "hsl(215, 20%, 55%)" };

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-5 glow-border-blue transition-all duration-300 hover:brightness-110">
    <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
    <div className="h-[280px]">{children}</div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

const AnalyticsCharts = () => {
  const { data } = useQuery<ChartsData>({
    queryKey: ["charts"],
    queryFn: fetchCharts,
  });

  // Use live data from the API; fall back to empty arrays while loading
  const lineData  = data?.missions_over_time        ?? [];
  const barData   = data?.top_launch_vehicles       ?? [];
  const pieData   = data?.mission_type_distribution ?? [];
  const scatterData = data?.cost_vs_yield           ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="📈 Missions Over Time">
        <ResponsiveContainer>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 18%)" />
            <XAxis dataKey="year" tick={chartStyle} />
            <YAxis tick={chartStyle} />
            <Tooltip contentStyle={{ background: "hsl(230, 25%, 10%)", border: "1px solid hsl(230, 20%, 18%)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="missions" stroke="hsl(210, 100%, 55%)" strokeWidth={3} dot={{ fill: "hsl(210, 100%, 55%)", r: 4 }} activeDot={{ r: 6, fill: "hsl(185, 100%, 50%)" }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="🚀 Top Launch Vehicles">
        <ResponsiveContainer>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 18%)" />
            <XAxis dataKey="vehicle" tick={chartStyle} />
            <YAxis tick={chartStyle} />
            <Tooltip contentStyle={{ background: "hsl(230, 25%, 10%)", border: "1px solid hsl(230, 20%, 18%)", borderRadius: 8 }} />
            <Bar dataKey="launches" radius={[6, 6, 0, 0]}>
              {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="🛰 Mission Type Distribution">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "hsl(230, 25%, 10%)", border: "1px solid hsl(230, 20%, 18%)", borderRadius: 8 }} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="💰 Cost vs Scientific Yield">
        <ResponsiveContainer>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 18%)" />
            <XAxis dataKey="cost" name="Cost ($B)" tick={chartStyle} />
            <YAxis dataKey="yield" name="Yield (pts)" tick={chartStyle} />
            <Tooltip contentStyle={{ background: "hsl(230, 25%, 10%)", border: "1px solid hsl(230, 20%, 18%)", borderRadius: 8 }} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={scatterData} fill="hsl(260, 60%, 50%)" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default AnalyticsCharts;
