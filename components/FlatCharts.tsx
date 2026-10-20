"use client";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import type { Category, Monthly, Slice, ScoreRow, StateRow } from "@/lib/types";
import { fmtInt, fmtMoney, fmtMoneyAxis, fmtMonth, fmtPct } from "@/lib/format";

const tick = { fill: "var(--text-secondary)", fontSize: 12, fontFamily: "var(--sans)" };
const tip = {
  contentStyle: { background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 0, fontSize: 13, fontFamily: "var(--sans)", color: "var(--text-primary)" },
  labelStyle: { color: "var(--text-primary)", fontWeight: 600 },
  itemStyle: { color: "var(--text-secondary)" },
};
const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];

export function MonthlyChart({ data }: { data: Monthly }) {
  const rows: { month: string; revenue?: number; forecast?: number }[] = data.actual.map((r) => ({ month: r.month, revenue: r.revenue }));
  if (data.forecast.length && rows.length) {
    const last = rows[rows.length - 1];
    last.forecast = last.revenue;
    data.forecast.forEach((f) => rows.push({ month: f.month, forecast: f.revenue }));
  }
  const hasNov17 = rows.some((r) => r.month === "2017-11");
  return (
    <div className="chart tall" role="img" aria-label="Line chart of monthly revenue with a three-month forecast">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickFormatter={fmtMonth} tick={tick} interval="preserveStartEnd" minTickGap={24} stroke="var(--border)" />
          <YAxis tickFormatter={(v) => fmtMoneyAxis(Number(v))} tick={tick} width={64} stroke="var(--border)" />
          <Tooltip {...tip} labelFormatter={(l) => fmtMonth(String(l))} formatter={(v) => fmtMoney(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 13, color: "var(--text-secondary)" }} />
          {hasNov17 && <ReferenceLine x="2017-11" stroke="var(--text-muted)" strokeDasharray="4 4" label={{ value: "Nov 2017", fill: "var(--text-secondary)", fontSize: 12, position: "insideTopLeft" }} />}
          <Line name="Revenue" dataKey="revenue" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} connectNulls />
          <Line name="Trend forecast" dataKey="forecast" stroke="var(--series-2)" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function foldSmall(rows: Slice[], minShare = 0.02): Slice[] {
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  const big = rows.filter((r) => r.value / total >= minShare);
  const small = rows.filter((r) => r.value / total < minShare);
  if (small.length) big.push({ name: "other", value: small.reduce((a, r) => a + r.value, 0) });
  return big.slice(0, 5);
}

export function Donut({ rows, label }: { rows: Slice[]; label: string }) {
  const data = foldSmall(rows);
  const total = data.reduce((a, r) => a + r.value, 0) || 1;
  return (
    <div>
      <div className="chart donut" role="img" aria-label={label}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="var(--bg)" strokeWidth={2}>
              {data.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
            </Pie>
            <Tooltip {...tip} formatter={(v, n) => [`${fmtInt(Number(v))} (${fmtPct(Number(v) / total)})`, String(n)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="donutlegend">
        {data.map((r, i) => (
          <span className="item" key={r.name}><span className="dot" style={{ background: SERIES[i % SERIES.length] }} />{r.name.replace("_", " ")} {fmtPct(r.value / total)}</span>
        ))}
      </div>
    </div>
  );
}

export function TopCategories({ rows }: { rows: Category[] }) {
  const data = rows.slice(0, 10);
  return (
    <div className="chart tall" role="img" aria-label="Bar chart of the top 10 product categories by revenue">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => fmtMoneyAxis(Number(v))} tick={tick} stroke="var(--border)" />
          <YAxis type="category" dataKey="name" tick={tick} width={150} stroke="var(--border)" interval={0} />
          <Tooltip {...tip} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => fmtMoney(Number(v))} />
          <Bar dataKey="revenue" name="Revenue" fill="var(--series-1)" maxBarSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreBars({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="chart" role="img" aria-label="Bar chart of review counts by star rating">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="score" tickFormatter={(v) => `${v}★`} tick={tick} stroke="var(--border)" />
          <YAxis tickFormatter={(v) => fmtInt(Number(v))} tick={tick} width={56} stroke="var(--border)" />
          <Tooltip {...tip} cursor={{ fill: "var(--surface-2)" }} labelFormatter={(l) => `${l} star reviews`} formatter={(v) => fmtInt(Number(v))} />
          <Bar dataKey="count" name="Reviews" fill="var(--series-1)" maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DaysByState({ rows }: { rows: StateRow[] }) {
  const data = rows.filter((r) => r.avgDays != null).sort((a, b) => (b.avgDays ?? 0) - (a.avgDays ?? 0));
  return (
    <div className="chart" role="img" aria-label="Bar chart of average delivery days by state">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="state" tick={{ ...tick, fontSize: 10 }} interval={0} angle={-90} textAnchor="end" height={36} stroke="var(--border)" />
          <YAxis tick={tick} width={36} stroke="var(--border)" />
          <Tooltip {...tip} cursor={{ fill: "var(--surface-2)" }} formatter={(v) => `${Number(v).toFixed(1)} days`} />
          <Bar dataKey="avgDays" name="Average delivery days" fill="var(--series-1)" maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryScatter({ rows }: { rows: Category[] }) {
  return (
    <div className="chart tall" role="img" aria-label="Scatter plot of category revenue against average review score">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 10, right: 16, bottom: 20, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="revenue" name="Revenue" tickFormatter={(v) => fmtMoneyAxis(Number(v))} tick={tick} stroke="var(--border)" label={{ value: "Revenue", position: "bottom", fill: "var(--text-secondary)", fontSize: 12 }} />
          <YAxis type="number" dataKey="avgScore" name="Average score" domain={["dataMin - 0.1", "dataMax + 0.1"]} tickFormatter={(v) => Number(v).toFixed(2)} tick={tick} width={48} stroke="var(--border)" />
          <ZAxis range={[70, 70]} />
          <Tooltip {...tip} cursor={{ strokeDasharray: "3 3" }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as Category;
            return <div style={tip.contentStyle}><b>{p.name}</b><div>{fmtMoney(p.revenue)} · {p.avgScore.toFixed(2)}★</div></div>;
          }} />
          <Scatter data={rows} fill="var(--series-1)" stroke="var(--bg)" strokeWidth={2} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
