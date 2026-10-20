"use client";
import { useCallback, useMemo } from "react";
import type { Seller } from "@/lib/types";
import { buildSellers } from "@/lib/scene3d";
import { fmtInt, fmtMoney, fmtPct } from "@/lib/format";
import { DataTable } from "./DataTable";
import { Stage, type SceneApi, type Ui } from "./Stage";

export const isAtRisk = (s: Seller) => s.lateRate > 0.2 || s.rating < 4;
const shortId = (s: Seller) => String(s.id).slice(0, 5);

export default function SellerBubbles3D({ sellers, onTimeRate }: { sellers: Seller[]; onTimeRate: number }) {
  const build = useCallback((host: HTMLDivElement, ui: Ui) => buildSellers(host, ui, sellers, onTimeRate) as SceneApi, [sellers, onTimeRate]);
  const risk = sellers.filter(isAtRisk).length;
  const rows = useMemo(() => sellers.slice(0, 40).map((s) => [
    shortId(s), fmtInt(s.orders), s.rating.toFixed(2), fmtPct(s.lateRate, 0), fmtMoney(s.revenue), isAtRisk(s) ? "At risk" : "Healthy",
  ]), [sellers]);
  return (
    <>
      <div className="legend">
        <span className="item"><span className="dot" style={{ background: "var(--series-1)" }} />Healthy ({sellers.length - risk})</span>
        <span className="item"><span className="dot" style={{ background: "var(--series-2)" }} />At risk: over 20% of orders late, or rated under 4 ({risk})</span>
        <span className="item">Bubble size: revenue</span>
      </div>
      <Stage ariaLabel="3D bubbles, one per seller: orders across, share of orders late front to back, rating up" build={build}
        table={<DataTable columns={["Seller", "Orders", "Rating", "Orders late", "Revenue", "Status"]} rows={rows} />} />
    </>
  );
}
