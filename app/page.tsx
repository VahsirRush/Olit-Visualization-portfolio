"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useData } from "@/lib/useData";
import { fmtInt, fmtMoney, fmtPct } from "@/lib/format";
import { KpiCards } from "@/components/Kpis";
import { Fig, Part, Plate } from "@/components/Layout";
import { isAtRisk } from "@/components/three/SellerBubbles3D";
import { CategoryScatter, DaysByState, Donut, MonthlyChart, ScoreBars, TopCategories } from "@/components/FlatCharts";

const loading = () => <div className="scene" aria-busy="true" />;
const ReviewMap3D = dynamic(() => import("@/components/three/ReviewMap3D"), { ssr: false, loading });
const StateColumns3D = dynamic(() => import("@/components/three/StateColumns3D"), { ssr: false, loading });
const DeliverySurface3D = dynamic(() => import("@/components/three/DeliverySurface3D"), { ssr: false, loading });
const SellerBubbles3D = dynamic(() => import("@/components/three/SellerBubbles3D"), { ssr: false, loading });

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const longMonth = (s: string) => { const a = String(s).split("-"); return a.length > 1 ? `${MONTHS[+a[1] - 1]} ${a[0]}` : s; };
const QUOTA = [110, 90, 90, 60]; // matches the sample the review plate draws

export default function Page() {
  const { data, error } = useData();

  const copy = useMemo(() => {
    if (!data) return null;
    const { regression: r, states, sellers, reviews: R, kpis: k, meta: m } = data;
    const cost = Math.abs(r.slope).toFixed(2);
    const lateRate = 1 - k.onTimeRate;
    const lead = `${fmtInt(m.orders)} orders from a Brazilian online marketplace, ${longMonth(m.firstMonth)} to ${longMonth(m.lastMonth)}. About ${Math.round(lateRate * 100)}% arrived after the promised date${r.slope < 0 ? `, and each day of delay took roughly ${cost} stars off the review` : ""}. This page follows that delay from what customers write, to where it happens, to which sellers are behind it.`;

    const withDate = R.points.filter((q) => q[8] != null);
    const overall = withDate.length ? withDate.filter((q) => (q[8] as number) > 0).length / withDate.length : null;
    const delivShare = R.lateShare?.[1];
    const revDek = delivShare != null && overall != null
      ? <>Of the reviews that complain about late delivery, <span className="n">{Math.round(delivShare * 100)}%</span> came from orders that really arrived after the promised date; across all reviews with a comment, {Math.round(overall * 100)}% did. Where the two disagree, the complaint and the clock tell different stories.</>
      : "Reviews are grouped into themes by the words they use.";
    const nSample = R.cats.reduce((a, _, c) => a + Math.min(R.points.filter((q) => q[3] === c).length, QUOTA[c] ?? 60), 0);
    const revNote = `The plate draws a sample of ${fmtInt(nSample)} reviews so the text stays readable. They come from ${fmtInt(m.reviewsOnMap)} reviews with a comment${m.reviewsWithComment > m.reviewsOnMap ? ` (a random pick from all ${fmtInt(m.reviewsWithComment)})` : ""}, and the counts in the key cover those ${fmtInt(m.reviewsOnMap)}. Comments are translated from Portuguese to English; hover or click a ball to see the original wording. Halos use the order's real delivery date. Themes come from keyword rules on that text. Lines join each review to the two reviews in the same theme whose wording is most similar (${R.method}). Bigger balls sit in busier neighbourhoods of similar reviews.`;

    const st = [...states].sort((a, b) => b.revenue - a.revenue);
    const tot = states.reduce((a, s) => a + s.revenue, 0) || 1;
    const top3 = st.slice(0, 3).reduce((a, s) => a + s.revenue, 0) / tot;
    const slow = states.filter((s) => s.avgDays != null && s.orders >= 30).sort((a, b) => (b.avgDays ?? 0) - (a.avgDays ?? 0))[0];
    const geoH = slow ? `${st[0].state} earns ${fmtPct(st[0].revenue / tot, 0)} of revenue; ${slow.state} waits longest` : `${st[0].state} earns ${fmtPct(st[0].revenue / tot, 0)} of revenue`;
    const geoDek = slow ? `Customers in ${slow.state} wait ${slow.avgDays!.toFixed(1)} days on average and ${slow.lateRate != null ? fmtPct(slow.lateRate, 0) : "-"} of their orders arrive late. The top three states bring in ${fmtPct(top3, 0)} of revenue.` : "";

    const risk = sellers.filter(isAtRisk);
    const allEarly = sellers.every((s) => s.avgDelay <= 0);
    const sellDek = `The ${sellers.length} sellers with the most revenue. Orange sellers deliver more than 1 in 5 orders late, or are rated under 4.${allEarly ? " A plain average hides this: every one of them is early on average, because most orders arrive ahead of the estimate." : ""}`;

    const f: string[] = [];
    f.push(`Each extra day an order arrives after the estimate lowers its review score by about ${cost} points (on-time orders average ${r.onTimeScore.toFixed(2)}★, late orders ${r.lateScore.toFixed(2)}★; R² ${r.r2.toFixed(2)} across ${fmtInt(r.n)} delivered orders).`);
    f.push(`${st[0].state} brings in ${fmtPct(st[0].revenue / tot, 0)} of revenue, and the top three states bring in ${fmtPct(top3, 0)}.`);
    if (slow) f.push(`${slow.state} has the slowest deliveries, at ${slow.avgDays!.toFixed(1)} days on average, and ${slow.lateRate != null ? fmtPct(slow.lateRate, 0) : "-"} of its orders arrive late.`);
    f.push(`${risk.length} of the ${sellers.length} largest sellers deliver over 20% of their orders late or are rated under 4, so they are worth a review.`);
    const bad = R.points.filter((p) => p[4] <= 3);
    if (bad.length) f.push(`Among reviews with 3 stars or fewer, ${fmtPct(bad.filter((p) => p[3] === 1).length / bad.length, 0)} are about late delivery.`);

    return { cost, lead, revDek, revNote, geoH, geoDek, sellDek, findings: f };
  }, [data]);

  if (error) {
    return (
      <div className="wrap">
        <p className="err">{error}. Run <code>python3 pipeline/prepare.py</code> to create the data files in <code>public/data</code>.</p>
      </div>
    );
  }
  if (!data || !copy) return <div className="wrap"><p className="loading">Loading data…</p></div>;

  const { kpis, monthly, status, payment, scores, categories, states, surface, sellers, regression: r, reviews, meta } = data;

  return (
    <div className="wrap">
      <header className="masthead">
        <div className="mast-top"><span>Orders &amp; reviews · Brazilian online marketplace</span><span>Analysis by Rishav Sen</span></div>
        <h1>Olit - Data Visualization Portfolio</h1>
        <p className="deck">{copy.lead}</p>
        {meta.source === "sample" && (
          <p className="foot-note"><b>Sample data †</b> These figures come from synthetic orders made to test the page. The pipeline replaces them with the real Olist files; the layout and the method stay the same.</p>
        )}
        <KpiCards k={kpis} />
      </header>

      <Part id="h-reviews" num={1} howto={<><b>How to read plate 1.</b> Every ball is one customer review. Month runs left to right, star rating runs up, and each theme has its own lane. Lines join reviews that use similar words. A grey halo means the order really arrived after its promised date. Click a theme in the key to hide it, or press Play.</>}>
        <div><h2 id="h-reviews">What customers write is not always what happened</h2><p className="dek">{copy.revDek}</p></div>
        <Plate no={1} title="Customer reviews as a network, by month, stars and theme" caption={copy.revNote}>
          <ReviewMap3D reviews={reviews} />
        </Plate>
      </Part>

      <Part id="h-delivery" num={2} howto={<><b>How to read plate 2.</b> The surface shows the average review score for orders grouped by how far delivery ran from the promised date (left to right) and by freight cost (front to back). Darker blue is a lower score. Dots are groups with at least 10 orders; empty groups are filled in from their neighbours.</>}>
        <div>
          <h2 id="h-delivery">{r.slope < 0 ? `Each day late costs about ${copy.cost} stars` : "Delivery delay and review score"}</h2>
          <p className="formula">Score = {r.intercept.toFixed(2)} {r.slope < 0 ? "−" : "+"} {Math.abs(r.slope).toFixed(3)} × days late</p>
          <p className="sub">Correlation {r.r.toFixed(2)} · R² {r.r2.toFixed(2)} · {fmtInt(r.n)} delivered orders. On-time orders average {r.onTimeScore.toFixed(2)}★ and late orders {r.lateScore.toFixed(2)}★. A straight-line fit, so it shows the average effect, not each order.</p>
        </div>
        <Plate no={2} title="Average review score by delivery delay and freight cost">
          <DeliverySurface3D surface={surface} />
        </Plate>
        <div className="duo">
          <Fig no={3} title="Review scores" caption="How many reviews gave each star rating."><ScoreBars rows={scores} /></Fig>
          <Fig no={4} title="Delivery time by state" caption="Average days from purchase to delivery."><DaysByState rows={states} /></Fig>
        </div>
      </Part>

      <Part id="h-geo" num={3} howto={<><b>How to read plate 3.</b> Each column is a state. Further right means a longer wait for delivery; further toward the front means a larger share of orders arrived late. Tall columns earn more (the height scale is a square root, so small states stay visible). Darker blue is a lower average review score.</>}>
        <div><h2 id="h-geo">{copy.geoH}</h2><p className="dek">{copy.geoDek}</p></div>
        <Plate no={3} title="States by delivery time, late share, revenue and review score">
          <StateColumns3D states={states} />
        </Plate>
      </Part>

      <Part id="h-sellers" num={4} howto={<><b>How to read plate 4.</b> Each bubble is a seller. Further right means more orders (log scale); further toward the front means a larger share of that seller&apos;s orders arrived late; higher means a better average rating. Bigger bubbles earn more. The orange plane is the late rate for the whole marketplace.</>}>
        <div><h2 id="h-sellers">Sellers worth a second look</h2><p className="dek">{copy.sellDek}</p></div>
        <Plate no={4} title="Sellers by volume, late share, rating and revenue">
          <SellerBubbles3D sellers={sellers} onTimeRate={kpis.onTimeRate} />
        </Plate>
      </Part>

      <Part id="h-rev" num={5}>
        <div><h2 id="h-rev">What sells, and how it is paid for</h2><p className="dek">Monthly revenue with a short trend line, the product categories that earn the most, and the order and payment mix.</p></div>
        <Fig no={5} title="Monthly revenue" caption={monthly.note}><MonthlyChart data={monthly} /></Fig>
        <div className="duo">
          <Fig no={6} title="Top 10 categories by revenue"><TopCategories rows={categories} /></Fig>
          <Fig no={7} title="Revenue against review score" caption="Each dot is a product category (top 20 by revenue)."><CategoryScatter rows={categories} /></Fig>
        </div>
        <div className="duo">
          <Fig no={8} title="Order status"><Donut rows={status} label="Donut chart of order status" /></Fig>
          <Fig no={9} title="Payment type"><Donut rows={payment} label="Donut chart of payment type" /></Fig>
        </div>
      </Part>

      <Part id="h-find" num={6}>
        <div><h2 id="h-find">What this shows</h2></div>
        <ol className="find">{copy.findings.map((f) => <li key={f}><span>{f}</span></li>)}</ol>
        <p className="note">Total revenue in this data: {fmtMoney(kpis.revenue)}.</p>
      </Part>

      <footer className="colophon">
        <div><b>Method</b><br />Revenue counts item prices only, excluding freight, and leaves out canceled and unavailable orders. Delay compares the delivery date with the estimated delivery date. Review themes come from keyword rules on the original Portuguese comment text. The trend line is a straight-line fit to the last 12 months, not a model.</div>
        <div><b>Tools and data</b><br />Python (pandas, scikit-learn) prepares the data. Next.js and React run the page, Three.js draws the plates and Recharts the figures. Data: Brazilian E-Commerce Public Dataset by Olist, from Kaggle.</div>
      </footer>
    </div>
  );
}
