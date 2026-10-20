"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePalette } from "@/lib/theme";

export type SceneApi = { preset: (name: string) => void; dispose: () => void; apply?: () => void };
export type Ui = { setTip: (html: string) => void; onCaption: (text: string) => void; onNarrow: (narrow: boolean) => void };
type Preset = "angled" | "top" | "side";

export function Stage({
  ariaLabel, big = false, build, table, overlay,
}: {
  ariaLabel: string; big?: boolean; build: (host: HTMLDivElement, ui: Ui) => SceneApi;
  table: ReactNode; overlay?: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const inst = useRef<SceneApi | null>(null);
  const [tip, setTip] = useState("");
  const [caption, setCaption] = useState("");
  const [narrow, setNarrow] = useState(false);
  const [preset, setPreset] = useState<Preset>("angled");
  const [showTable, setShowTable] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const { dark } = usePalette();

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  const showingTable = showTable || !webgl;

  // Build the scene, and rebuild it when the theme changes so the colors follow.
  useEffect(() => {
    const host = hostRef.current;
    if (showingTable || !host) return;
    setPreset("angled");
    let api: SceneApi;
    try {
      api = build(host, { setTip, onCaption: setCaption, onNarrow: setNarrow });
    } catch (e) {
      console.error("3D view could not start", e);
      setWebgl(false);
      return;
    }
    inst.current = api;
    return () => { api.dispose(); inst.current = null; };
  }, [build, dark, showingTable]);

  const pick = (p: Preset) => { setPreset(p); inst.current?.preset(p); };

  return (
    <div>
      {!showingTable && (
        <>
          <div className={`scene${big ? " big" : ""}${narrow ? " narrow" : ""}`} role="group" aria-label={ariaLabel}>
            <div ref={hostRef} className="scene-host" />
            {tip && <div className="tip" aria-live="polite" dangerouslySetInnerHTML={{ __html: tip }} />}
            {overlay}
          </div>
          <p className="axcap note">{caption ? `Axes. ${caption}` : ""}</p>
        </>
      )}
      {!webgl && <p className="note">3D is not available in this browser, so the table view is shown.</p>}
      {showingTable && table}
      <div className="scene-tools">
        {webgl && !showTable && (
          <>
            <button className="btn" aria-pressed={preset === "angled"} onClick={() => pick("angled")}>Angled</button>
            <button className="btn" aria-pressed={preset === "top"} onClick={() => pick("top")}>Top</button>
            <button className="btn" aria-pressed={preset === "side"} onClick={() => pick("side")}>Side</button>
            <button className="btn" onClick={() => inst.current?.preset(preset)}>Reset view</button>
          </>
        )}
        {webgl && (
          <button className="btn" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>{showTable ? "Show 3D" : "Show table"}</button>
        )}
        <span className="note" style={{ margin: 0 }}>Drag to rotate, scroll or pinch to zoom. Click a point to highlight it.</span>
      </div>
    </div>
  );
}
