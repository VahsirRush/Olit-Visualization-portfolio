"use client";
import { useCallback, useMemo } from "react";
import type { Surface } from "@/lib/types";
import { buildSurface } from "@/lib/scene3d";
import { fmtInt } from "@/lib/format";
import { DataTable } from "./DataTable";
import { Stage, type SceneApi, type Ui } from "./Stage";

export default function DeliverySurface3D({ surface }: { surface: Surface }) {
  const build = useCallback((host: HTMLDivElement, ui: Ui) => buildSurface(host, ui, surface) as SceneApi, [surface]);
  const rows = useMemo(() => {
    const out: (string | number)[][] = [];
    surface.delayLabels.forEach((l, i) => surface.freightCentres.forEach((f, j) => {
      const v = surface.z[i][j];
      out.push([l, `R$ ${f}`, v == null ? "-" : v.toFixed(2), fmtInt(surface.n[i][j])]);
    }));
    return out;
  }, [surface]);
  return (
    <>
      <div className="legend">
        <span className="item">Height and color: average review score. Higher score <span className="ramp" /> lower score</span>
        <span className="item">Dots mark cells with at least 10 orders. Empty cells are filled from their neighbours.</span>
      </div>
      <Stage ariaLabel="3D surface of average review score by delivery delay and freight cost" build={build}
        table={<DataTable columns={["Delivery vs estimate", "Freight cost", "Average score", "Orders"]} rows={rows} />} />
    </>
  );
}
