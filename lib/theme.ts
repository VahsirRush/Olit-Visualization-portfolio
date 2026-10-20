"use client";
import { useEffect, useState } from "react";

// Colors for the 3D scenes. They match the CSS tokens in app/globals.css.
export const palettes = {
  light: {
    surface: "#faf7ef", text: "#17170f", muted: "#45433a", grid: "#cdc6b2",
    blue: "#2a78d6", orange: "#eb6834", aqua: "#1baf7a", gray: "#8c8b86",
    rampLow: "#cde2fb", rampHigh: "#184f95",
  },
  dark: {
    surface: "#171c18", text: "#ece9de", muted: "#c6c3b4", grid: "#343c35",
    blue: "#3987e5", orange: "#d95926", aqua: "#199e70", gray: "#8c8b86",
    rampLow: "#184f95", rampHigh: "#9ec5f4",
  },
} as const;
export type Palette = (typeof palettes)["light"] | (typeof palettes)["dark"];

function readDark(): boolean {
  if (typeof document === "undefined") return false;
  const t = document.documentElement.getAttribute("data-theme");
  if (t === "dark") return true;
  if (t === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function usePalette(): { dark: boolean; p: Palette } {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(readDark());
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return { dark, p: dark ? palettes.dark : palettes.light };
}

export function useReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setR(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return r;
}

export function lerpHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.min(1, Math.max(0, t))));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}
