export const fmtMoney = (v: number) =>
  v >= 1e6 ? `R$ ${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `R$ ${(v / 1e3).toFixed(1)}k` : `R$ ${v.toFixed(0)}`;
export const fmtInt = (v: number) => v.toLocaleString("en-US");
export const fmtPct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
export const fmtMonth = (m: string) => {
  const [y, mo] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(mo, 10) - 1]} ${y.slice(2)}`;
};
export const fmtMoneyAxis = (v: number) =>
  v >= 1e6 ? `R$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `R$${Math.round(v / 1e3)}k` : `R$${Math.round(v)}`;
