"use client";
import { useEffect, useState } from "react";
import type { Data } from "./types";

const FILES = [
  "kpis", "monthly", "status", "payment", "scores", "categories", "states",
  "surface", "sellers", "regression", "reviews", "meta",
] as const;

export function useData(): { data: Data | null; error: string | null } {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(
      FILES.map(async (f) => {
        const r = await fetch(`/data/${f}.json`);
        if (!r.ok) throw new Error(`Could not load /data/${f}.json`);
        return r.json();
      })
    )
      .then((vals) => {
        if (!alive) return;
        const d: Record<string, unknown> = {};
        FILES.forEach((f, i) => (d[f] = vals[i]));
        setData(d as unknown as Data);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);
  return { data, error };
}
