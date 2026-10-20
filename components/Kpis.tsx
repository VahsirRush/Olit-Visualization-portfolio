import type { Kpis } from "@/lib/types";
import { fmtInt, fmtMoney, fmtPct } from "@/lib/format";

export function KpiCards({ k }: { k: Kpis }) {
  const items = [
    { v: fmtMoney(k.revenue), l: "Revenue" },
    { v: fmtInt(k.orders), l: "Orders" },
    { v: `${k.avgScore.toFixed(2)} of 5`, l: "Average review score" },
    { v: fmtPct(k.onTimeRate), l: "Delivered on time" },
  ];
  return (
    <div className="figures">
      {items.map((i) => (
        <div key={i.l}><div className="v">{i.v}</div><div className="l">{i.l}</div></div>
      ))}
    </div>
  );
}
