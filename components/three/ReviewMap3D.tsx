"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Reviews } from "@/lib/types";
import { buildReviews } from "@/lib/scene3d";
import { fmtInt, fmtMonth } from "@/lib/format";
import { DataTable } from "./DataTable";
import { Stage, type SceneApi, type Ui } from "./Stage";

const DOT = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-red)"];

export default function ReviewMap3D({ reviews }: { reviews: Reviews }) {
  const nM = reviews.months.length;
  const [active, setActive] = useState<boolean[]>(() => reviews.cats.map(() => true));
  const [monthMax, setMonthMax] = useState(nM - 1);
  const [playing, setPlaying] = useState(false);
  // The 3D engine reads these two values whenever it redraws.
  const rs = useRef({ active, monthMax });
  const api = useRef<SceneApi | null>(null);

  const build = useCallback((host: HTMLDivElement, ui: Ui) => {
    const a = buildReviews(host, ui, reviews, rs.current) as SceneApi;
    api.current = a;
    return a;
  }, [reviews]);

  useEffect(() => {
    rs.current.active = active;
    rs.current.monthMax = monthMax;
    api.current?.apply?.();
  }, [active, monthMax]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setMonthMax((m) => {
      if (m >= nM - 1) { setPlaying(false); return m; }
      return m + 1;
    }), 700);
    return () => clearInterval(t);
  }, [playing, nM]);

  const onPlay = () => {
    if (playing) { setPlaying(false); return; }
    if (monthMax >= nM - 1) setMonthMax(0);
    setPlaying(true);
  };

  const counts = useMemo(() => {
    const c = reviews.cats.map(() => 0);
    reviews.points.forEach((q) => { if (q[5] <= monthMax) c[q[3]]++; });
    return c;
  }, [reviews, monthMax]);
  const present = useMemo(() => reviews.cats.map((_, i) => reviews.points.some((q) => q[3] === i)), [reviews]);

  const rows = useMemo(() => {
    const out: (string | number)[][] = [];
    for (const q of reviews.points) {
      if (out.length >= 60) break;
      if (active[q[3]] && q[5] <= monthMax) out.push([reviews.cats[q[3]], q[4], fmtMonth(reviews.months[q[5]]), q[7] + (q[9] && q[9] !== q[7] ? ` [${q[9]}]` : "")]);
    }
    return out;
  }, [reviews, active, monthMax]);

  const overlay = (
    <>
      <div className="legendpanel" role="group" aria-label="Filter review themes">
        <div className="ttl2">Reviews by theme</div>
        {reviews.cats.map((c, i) => present[i] && (
          <button key={c} aria-pressed={active[i]} onClick={() => setActive((a) => a.map((v, j) => (j === i ? !v : v)))}>
            <span className="dot" style={{ background: DOT[i] }} />{c}
            <span className="n">{fmtInt(counts[i])}</span>
            {reviews.lateShare?.[i] != null && <span className="sh">{Math.round(reviews.lateShare[i]! * 100)}% late</span>}
          </button>
        ))}
        <div className="key"><span className="halo" />Order really arrived late</div>
      </div>
      <div className="timebar">
        <button className="btn" onClick={onPlay}>{playing ? "Pause" : "Play"}</button>
        <input type="range" min={0} max={nM - 1} value={monthMax} aria-label="Show reviews up to this month"
          onChange={(e) => { setPlaying(false); setMonthMax(+e.target.value); }} />
        <span>Up to {fmtMonth(reviews.months[monthMax])}</span>
      </div>
    </>
  );

  return (
    <Stage ariaLabel="3D network of customer reviews: month across, star rating up, theme front to back" big
      build={build} overlay={overlay}
      table={<DataTable columns={["Theme", "Stars", "Month", "Review text"]} rows={rows} />} />
  );
}
