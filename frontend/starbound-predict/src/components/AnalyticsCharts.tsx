import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { fetchCharts } from "@/lib/api";

// ── Chart styling, tied to the CSS palette ───────────────────────────────────
const C = {
  plasma: "hsl(200 100% 78%)",
  flame: "hsl(35 100% 58%)",
  go: "hsl(152 66% 62%)",
  lilac: "hsl(255 100% 82%)",
  grid: "hsl(229 45% 25% / 0.6)",
  tick: "hsl(227 26% 64%)",
  panel: "hsl(229 58% 16%)",
  line: "hsl(229 35% 34%)",
  ink: "hsl(225 64% 95%)",
};
const CATEGORY = [C.plasma, C.flame, C.go, C.lilac];
const tick = { fontSize: 12, fill: C.tick, fontFamily: "IBM Plex Sans Variable, sans-serif" };
const tooltip = {
  contentStyle: {
    background: C.panel,
    border: `1px solid ${C.line}`,
    borderRadius: 10,
    color: C.ink,
    fontFamily: "IBM Plex Sans Variable, sans-serif",
    fontSize: 13,
  },
  labelStyle: { color: C.tick },
  itemStyle: { color: C.ink },
  cursor: { fill: "hsl(229 45% 25% / 0.35)" },
};

const ChartCard = ({
  title,
  note,
  className = "",
  children,
}: {
  title: string;
  note: string;
  className?: string;
  children: ReactNode;
}) => (
  <figure className={`rounded-[var(--radius)] border border-line bg-panel/70 p-5 backdrop-blur sm:p-6 ${className}`}>
    <figcaption className="mb-5">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{note}</p>
    </figcaption>
    <div className="h-[260px]">{children}</div>
  </figure>
);

const AnalyticsCharts = () => {
  const { data, isError } = useQuery({ queryKey: ["charts"], queryFn: fetchCharts });

  const lineData = data?.missions_over_time ?? [];
  const barData = data?.top_launch_vehicles ?? [];
  const pieData = data?.mission_type_distribution ?? [];
  const scatterData = data?.cost_vs_yield ?? [];
  const pieTotal = pieData.reduce((n, d) => n + d.value, 0);

  return (
    <>
      {isError && (
        <p className="mb-6 text-sm text-abort">Couldn't load chart data. Check that the API is running, then refresh.</p>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <ChartCard title="Missions per year" note="Launch cadence holds steady at about 52 a year; 2034 is a partial year." className="lg:col-span-3">
          <ResponsiveContainer>
            <AreaChart data={lineData} margin={{ left: -16, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="area-plasma" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={C.plasma} stopOpacity={0.35} />
                  <stop offset="1" stopColor={C.plasma} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="year" tick={tick} axisLine={false} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltip} cursor={{ stroke: C.line }} />
              <Area type="monotone" dataKey="missions" name="Missions" stroke={C.plasma} strokeWidth={2.5} fill="url(#area-plasma)" activeDot={{ r: 5, fill: C.flame, stroke: "none" }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Launch vehicles" note="Missions flown on each vehicle." className="lg:col-span-2">
          <ResponsiveContainer>
            <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid stroke={C.grid} horizontal={false} />
              <XAxis type="number" tick={tick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="vehicle" tick={{ ...tick, fill: C.ink }} axisLine={false} tickLine={false} width={92} />
              <Tooltip {...tooltip} />
              <Bar dataKey="launches" name="Launches" radius={[0, 6, 6, 0]} barSize={22}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? C.flame : C.plasma} fillOpacity={i === 0 ? 1 : 0.75} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Mission types" note="Share of missions by purpose." className="lg:col-span-2">
          <div className="flex h-full items-center gap-4">
            <div className="h-full flex-1">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="92%" paddingAngle={2} stroke="none">
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY[i % CATEGORY.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-3 text-sm">
              {pieData.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY[i % CATEGORY.length] }} />
                  <span className="text-ink">{d.name}</span>
                  <span className="tabular-nums text-ink-muted">{pieTotal ? Math.round((d.value / pieTotal) * 100) : 0}%</span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard title="Cost against scientific yield" note="Each dot is one mission. Cost is on the dataset's 0–1 scale." className="lg:col-span-3">
          <ResponsiveContainer>
            <ScatterChart margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid stroke={C.grid} />
              <XAxis type="number" dataKey="cost" name="Cost index" tick={tick} axisLine={false} tickLine={false} domain={[0, 1]} />
              <YAxis type="number" dataKey="yield" name="Yield (pts)" tick={tick} axisLine={false} tickLine={false} />
              <ZAxis range={[28, 28]} />
              <Tooltip {...tooltip} cursor={{ strokeDasharray: "3 3", stroke: C.line }} />
              <Scatter data={scatterData} fill={C.plasma} fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
};

export default AnalyticsCharts;
