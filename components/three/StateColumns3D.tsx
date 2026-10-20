"use client";
import { useCallback, useMemo } from "react";
import type { StateRow } from "@/lib/types";
import { MIN_STATE_ORDERS, buildStates, usableStates } from "@/lib/scene3d";
import { fmtInt, fmtMoney, fmtPct } from "@/lib/format";
import { DataTable } from "./DataTable";
import { Stage, type SceneApi, type Ui } from "./Stage";

export default function StateColumns3D({ states }: { states: StateRow[] }) {
  const build = useCallback((host: HTMLDivElement, ui: Ui) => buildStates(host, ui, states) as SceneApi, [states]);
  const left = states.length - usableStates(states).length;
  const rows = useMemo(() => [...states].sort((a, b) => b.revenue - a.revenue).map((s) => [
    s.state, fmtMoney(s.revenue), fmtInt(s.orders), s.avgDays == null ? "-" : s.avgDays.toFixed(1),
    s.lateRate == null ? "-" : fmtPct(s.lateRate), s.avgScore == null ? "-" : s.avgScore.toFixed(2),
  ]), [states]);
  return (
    <>
      <div className="legend">
        <span className="item">Height: revenue (square-root scale, so small states stay visible)</span>
        <span className="item">Color: average review score. Higher <span className="ramp" /> lower</span>
      </div>
      <Stage ariaLabel="3D columns, one per state: delivery time across, share of late orders front to back, revenue as height" build={build}
        table={<DataTable columns={["State", "Revenue", "Orders", "Avg delivery days", "Orders late", "Avg score"]} rows={rows} />} />
      {left > 0 && <p className="note">{left} small states with fewer than {MIN_STATE_ORDERS} orders are left off the chart because their percentages swing too much. They are in the table.</p>}
    </>
  );
}
