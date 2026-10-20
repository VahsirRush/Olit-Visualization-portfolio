export type Kpis = { revenue: number; orders: number; avgScore: number; onTimeRate: number };
export type Monthly = {
  actual: { month: string; revenue: number }[];
  forecast: { month: string; revenue: number }[];
  note: string;
};
export type Slice = { name: string; value: number };
export type ScoreRow = { score: number; count: number };
export type Category = { name: string; revenue: number; avgScore: number; items: number };
export type StateRow = {
  state: string; lat: number; lng: number; revenue: number; orders: number;
  avgScore: number | null; lateRate: number | null; avgDays: number | null;
};
export type Surface = {
  delayLabels: string[]; freightCentres: number[];
  z: (number | null)[][]; n: number[][]; note: string;
};
export type Seller = { id: string; orders: number; revenue: number; rating: number; avgDelay: number; lateRate: number };
export type Regression = {
  slope: number; intercept: number; r: number; r2: number; n: number;
  onTimeScore: number; lateScore: number; lateShare: number; note: string;
};
// [x, y, z, category, score, monthIndex, density, text, daysLate]
// daysLate is the order's real delivery delay in days (negative means early), or null if it was not delivered.
export type ReviewPoint = [number, number, number, number, number, number, number, string, number | null, string];
export type Reviews = {
  cats: string[]; months: string[]; method: string; fields: string[];
  lateShare: (number | null)[];
  points: ReviewPoint[]; edges: [number, number][];
};
export type Meta = {
  source: "sample" | "olist"; generated: string; orders: number;
  firstMonth: string; lastMonth: string; reviewsOnMap: number; reviewsWithComment: number; reviewMethod: string;
};
export type Data = {
  kpis: Kpis; monthly: Monthly; status: Slice[]; payment: Slice[]; scores: ScoreRow[];
  categories: Category[]; states: StateRow[]; surface: Surface; sellers: Seller[];
  regression: Regression; reviews: Reviews; meta: Meta;
};
