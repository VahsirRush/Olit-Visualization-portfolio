"""Turn the Olist CSV files into the small JSON files the dashboard loads.

Put the Olist files in data/raw/ (see README), then run:

    python3 pipeline/prepare.py

Options:
    --raw data/raw        where the CSV files are
    --out public/data     where the JSON files go
    --max-reviews 6000    how many review points to draw on the 3D map
    --embed               use sentence-transformers + UMAP for the review map
                          (better themes, needs: pip install sentence-transformers umap-learn)
"""
import argparse
import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

# Approximate centre of each Brazilian state, used to place the 3D map columns.
STATE_COORDS = {
    "AC": (-9.0, -70.8), "AL": (-9.6, -36.8), "AM": (-3.5, -65.0), "AP": (1.4, -51.8),
    "BA": (-12.5, -41.7), "CE": (-5.2, -39.3), "DF": (-15.8, -47.9), "ES": (-19.6, -40.5),
    "GO": (-15.9, -49.8), "MA": (-5.0, -45.3), "MG": (-18.5, -44.5), "MS": (-20.5, -54.6),
    "MT": (-12.9, -55.9), "PA": (-3.8, -52.0), "PB": (-7.2, -36.8), "PE": (-8.4, -37.9),
    "PI": (-7.7, -42.7), "PR": (-24.6, -51.6), "RJ": (-22.2, -42.7), "RN": (-5.8, -36.6),
    "RO": (-10.9, -62.8), "RR": (2.0, -61.4), "RS": (-29.7, -53.5), "SC": (-27.3, -50.5),
    "SE": (-10.6, -37.4), "SP": (-22.2, -48.8), "TO": (-10.2, -48.3),
}

CATS = ["Positive", "Late delivery", "Product or item problem", "Other"]
DELIVERY_WORDS = ["atras", "entreg", "demor", "prazo", "não chegou", "nao chegou", "ainda não", "ainda nao"]
QUALITY_WORDS = ["defeit", "quebr", "qualidade", "estrag"]  # specific product words only; generic ones like "ruim"/"péssimo" fit any complaint
WRONG_WORDS = ["errad", "faltou", "diferente", "falta", "incomplet", "só parte", "so parte"]


def read(raw: Path, name: str, **kw) -> pd.DataFrame:
    p = raw / name
    if not p.exists():
        raise SystemExit(f"Missing file: {p}\nSee README.md for the list of files to download.")
    return pd.read_csv(p, **kw)


def categorize(text: str, score: int) -> int:
    """0 positive, 1 late delivery, 2 product or item problem, 3 other.
    A complaint goes to whichever theme has more matching words; delivery wins ties.
    Generic negative words alone ("ruim", "péssimo") are not enough, so they land in Other."""
    t = text.lower()
    if score >= 4:
        return 0
    deliv = sum(w in t for w in DELIVERY_WORDS)
    prod = sum(w in t for w in WRONG_WORDS) + sum(w in t for w in QUALITY_WORDS)
    if prod > deliv:
        return 2
    if deliv > 0:
        return 1
    return 3


def dump(out: Path, name: str, obj) -> None:
    (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))


def round_list(a, k=3):
    return [None if (v is None or (isinstance(v, float) and np.isnan(v))) else round(float(v), k) for v in a]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="data/raw")
    ap.add_argument("--out", default="public/data")
    ap.add_argument("--max-reviews", type=int, default=6000)
    ap.add_argument("--min-month-orders", type=int, default=50)
    ap.add_argument("--min-seller-orders", type=int, default=20)
    ap.add_argument("--embed", action="store_true")
    ap.add_argument("--seed", type=int, default=11)
    a = ap.parse_args()
    raw, out = Path(a.raw), Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    date_cols = ["order_purchase_timestamp", "order_delivered_customer_date", "order_estimated_delivery_date"]
    orders = read(raw, "olist_orders_dataset.csv", parse_dates=date_cols)
    customers = read(raw, "olist_customers_dataset.csv")
    items = read(raw, "olist_order_items_dataset.csv")
    pay = read(raw, "olist_order_payments_dataset.csv")
    reviews = read(raw, "olist_order_reviews_dataset.csv")
    products = read(raw, "olist_products_dataset.csv")
    trans = read(raw, "product_category_name_translation.csv")

    # One review per order (keep the latest), one row per order for money and delivery.
    reviews = reviews.sort_values("review_creation_date").drop_duplicates("order_id", keep="last")
    order_money = items.groupby("order_id").agg(revenue=("price", "sum"), freight=("freight_value", "sum")).reset_index()
    o = (orders.merge(customers[["customer_id", "customer_state"]], on="customer_id", how="left")
               .merge(order_money, on="order_id", how="left")
               .merge(reviews[["order_id", "review_score", "review_comment_message"]], on="order_id", how="left"))
    o["revenue"] = o["revenue"].fillna(0.0)
    o["freight"] = o["freight"].fillna(0.0)
    o["delay"] = (o["order_delivered_customer_date"] - o["order_estimated_delivery_date"]).dt.total_seconds() / 86400
    o["delivery_days"] = (o["order_delivered_customer_date"] - o["order_purchase_timestamp"]).dt.total_seconds() / 86400
    o["month"] = o["order_purchase_timestamp"].dt.to_period("M").astype(str)
    valid = o[~o["order_status"].isin(["canceled", "unavailable"])]
    deliv = o[(o["order_status"] == "delivered") & o["delay"].notna()].copy()

    # ---- Number cards
    kpis = {
        "revenue": round(float(valid["revenue"].sum()), 2),
        "orders": int(len(valid)),
        "avgScore": round(float(reviews["review_score"].mean()), 3),
        "onTimeRate": round(float((deliv["delay"] <= 0).mean()), 4),
    }
    dump(out, "kpis.json", kpis)

    # ---- Monthly revenue and a simple forecast
    m = valid.groupby("month").agg(revenue=("revenue", "sum"), orders=("order_id", "count")).reset_index()
    m = m[m["orders"] >= a.min_month_orders].sort_values("month")
    monthly = [{"month": r.month, "revenue": round(float(r.revenue), 2)} for r in m.itertuples()]
    forecast = []
    if len(m) >= 6:
        tail = m.tail(12)
        xs = np.arange(len(tail))
        slope, icpt = np.polyfit(xs, tail["revenue"].to_numpy(), 1)
        last = pd.Period(m["month"].iloc[-1], freq="M")
        for k in range(1, 4):
            forecast.append({"month": str(last + k), "revenue": round(float(max(icpt + slope * (len(tail) - 1 + k), 0)), 2)})
    dump(out, "monthly.json", {"actual": monthly, "forecast": forecast,
                               "note": "Forecast is a straight-line trend through the last 12 months."})

    # ---- Order status and payment type
    status = o["order_status"].value_counts()
    dump(out, "status.json", [{"name": k, "value": int(v)} for k, v in status.items()])
    first_pay = pay.sort_values(["order_id", "payment_sequential"]).drop_duplicates("order_id")
    ptypes = first_pay["payment_type"].value_counts()
    dump(out, "payment.json", [{"name": k, "value": int(v)} for k, v in ptypes.items()])

    # ---- Review score counts
    sc = reviews["review_score"].value_counts().reindex([1, 2, 3, 4, 5], fill_value=0)
    dump(out, "scores.json", [{"score": int(k), "count": int(v)} for k, v in sc.items()])

    # ---- Categories
    it = (items.merge(products[["product_id", "product_category_name"]], on="product_id", how="left")
               .merge(trans, on="product_category_name", how="left")
               .merge(reviews[["order_id", "review_score"]], on="order_id", how="left"))
    it["category"] = it["product_category_name_english"].fillna(it["product_category_name"]).fillna("unknown")
    cat = it.groupby("category").agg(revenue=("price", "sum"), avgScore=("review_score", "mean"),
                                     items=("order_id", "count")).reset_index().sort_values("revenue", ascending=False)
    cat = cat[cat["category"] != "unknown"].head(20)
    dump(out, "categories.json", [{"name": r.category.replace("_", " "), "revenue": round(float(r.revenue), 2),
                                   "avgScore": round(float(r.avgScore), 3), "items": int(r.items)} for r in cat.itertuples()])

    # ---- States
    sdf = []
    for st, g in valid.groupby("customer_state"):
        if st not in STATE_COORDS:
            continue
        d = g[(g["order_status"] == "delivered") & g["delay"].notna()]
        sdf.append({"state": st, "lat": STATE_COORDS[st][0], "lng": STATE_COORDS[st][1],
                    "revenue": round(float(g["revenue"].sum()), 2), "orders": int(len(g)),
                    "avgScore": round(float(g["review_score"].mean()), 3) if g["review_score"].notna().any() else None,
                    "lateRate": round(float((d["delay"] > 0).mean()), 4) if len(d) else None,
                    "avgDays": round(float(d["delivery_days"].mean()), 2) if len(d) else None})
    dump(out, "states.json", sdf)

    # ---- Delivery surface: delay bins x freight bins -> average review score
    sf = deliv.dropna(subset=["review_score"]).copy()
    d_edges = [-1e9, -14, -7, 0, 3, 7, 14, 1e9]
    d_labels = ["14+ days early", "7-14 early", "0-7 early", "0-3 late", "3-7 late", "7-14 late", "14+ late"]
    sf["dbin"] = pd.cut(sf["delay"], bins=d_edges, labels=False)
    sf["fbin"] = pd.qcut(sf["freight"], q=5, labels=False, duplicates="drop")
    f_centres = sf.groupby("fbin")["freight"].mean().round(1).tolist()
    nf = len(f_centres)
    z, nn = [], []
    for di in range(len(d_labels)):
        row, nrow = [], []
        for fi in range(nf):
            g = sf[(sf["dbin"] == di) & (sf["fbin"] == fi)]
            row.append(round(float(g["review_score"].mean()), 3) if len(g) >= 10 else None)
            nrow.append(int(len(g)))
        z.append(row)
        nn.append(nrow)
    dump(out, "surface.json", {"delayLabels": d_labels, "freightCentres": f_centres, "z": z, "n": nn,
                               "note": "Cells with fewer than 10 orders are left empty."})

    # ---- Sellers
    seller_ord = (items.groupby(["order_id", "seller_id"]).agg(revenue=("price", "sum")).reset_index()
                       .merge(o[["order_id", "review_score", "delay", "order_status"]], on="order_id", how="left"))
    sg = []
    for sid, g in seller_ord.groupby("seller_id"):
        if len(g) < a.min_seller_orders:
            continue
        d = g[(g["order_status"] == "delivered") & g["delay"].notna()]
        if g["review_score"].notna().sum() == 0 or len(d) == 0:
            continue
        sg.append({"id": str(sid)[:8], "orders": int(len(g)), "revenue": round(float(g["revenue"].sum()), 2),
                   "rating": round(float(g["review_score"].mean()), 3),
                   "avgDelay": round(float(d["delay"].mean()), 2),
                   "lateRate": round(float((d["delay"] > 0).mean()), 4)})
    sg = sorted(sg, key=lambda r: r["revenue"], reverse=True)[:150]
    dump(out, "sellers.json", sg)

    # ---- Regression: review score on days late
    r = deliv.dropna(subset=["review_score"]).copy()
    r["late"] = r["delay"].clip(lower=0, upper=60)
    slope, icpt = np.polyfit(r["late"], r["review_score"], 1)
    corr = float(np.corrcoef(r["late"], r["review_score"])[0, 1])
    on_time = r[r["delay"] <= 0]["review_score"].mean()
    was_late = r[r["delay"] > 0]["review_score"].mean()
    dump(out, "regression.json", {
        "slope": round(float(slope), 4), "intercept": round(float(icpt), 4), "r": round(corr, 4),
        "r2": round(corr ** 2, 4), "n": int(len(r)),
        "onTimeScore": round(float(on_time), 3), "lateScore": round(float(was_late), 3),
        "lateShare": round(float((r["delay"] > 0).mean()), 4),
        "note": "Score = intercept + slope x days late (days late is zero for on-time orders, capped at 60).",
    })

    # ---- Review map
    rv = o[o["review_comment_message"].fillna("").str.strip().str.len() >= 8].copy()
    rv = rv.dropna(subset=["review_score"])
    n_commented = len(rv)
    rng = np.random.default_rng(a.seed)
    if len(rv) > a.max_reviews:
        rv = rv.iloc[rng.choice(len(rv), size=a.max_reviews, replace=False)]
    rv = rv.reset_index(drop=True)
    texts = rv["review_comment_message"].astype(str).tolist()

    if a.embed:
        from sentence_transformers import SentenceTransformer  # type: ignore
        import umap  # type: ignore
        model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        emb = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
        xyz = umap.UMAP(n_components=3, metric="cosine", random_state=a.seed).fit_transform(emb)
        method = "multilingual sentence embeddings + UMAP"
    else:
        from sklearn.decomposition import TruncatedSVD
        from sklearn.feature_extraction.text import TfidfVectorizer
        tf = TfidfVectorizer(max_features=4000, ngram_range=(1, 2), min_df=2, sublinear_tf=True)
        X = tf.fit_transform(texts)
        xyz = TruncatedSVD(n_components=3, random_state=a.seed).fit_transform(X)
        method = "TF-IDF + SVD (run with --embed for sentence embeddings)"
    # Scale each axis to about -1..1 using the 2nd and 98th percentiles, so outliers do not squash the map.
    lo, hi = np.percentile(xyz, 2, axis=0), np.percentile(xyz, 98, axis=0)
    xyz = np.clip((xyz - (lo + hi) / 2) / ((hi - lo) / 2 + 1e-9), -1.3, 1.3)

    from sklearn.neighbors import NearestNeighbors
    k = min(11, len(xyz))
    nbr = NearestNeighbors(n_neighbors=k).fit(xyz)
    _, idx = nbr.kneighbors(xyz)
    cat_idx = np.array([categorize(t, int(s)) for t, s in zip(texts, rv["review_score"])])
    density = np.array([(cat_idx[idx[i, 1:]] == cat_idx[i]).sum() for i in range(len(xyz))])
    edges = sorted({tuple(sorted((int(i), int(idx[i, 1])))) for i in range(len(xyz)) if k > 1})
    months = sorted(rv["month"].unique().tolist())
    mi = {mm: i for i, mm in enumerate(months)}
    from translate import translate_all
    en_map = translate_all(texts)
    pts = []
    for i in range(len(xyz)):
        pts.append([round(float(xyz[i, 0]), 3), round(float(xyz[i, 1]), 3), round(float(xyz[i, 2]), 3),
                    int(cat_idx[i]), int(rv.at[i, "review_score"]), mi[rv.at[i, "month"]],
                    int(density[i]), (en_map.get(texts[i]) or en_map.get(texts[i][:140]) or texts[i])[:140],
                    None if pd.isna(rv.at[i, "delay"]) else round(float(rv.at[i, "delay"]), 1),
                    texts[i][:140]])
    late_share = []
    for c in range(len(CATS)):
        d = [pt[8] for pt in pts if pt[3] == c and pt[8] is not None]
        late_share.append(round(sum(x > 0 for x in d) / len(d), 4) if d else None)
    dump(out, "reviews.json", {"cats": CATS, "months": months, "method": method,
                               "fields": ["x", "y", "z", "category", "score", "monthIndex", "density", "text", "daysLate", "textPt"],
                               "lateShare": late_share,
                               "points": pts, "edges": [list(e) for e in edges]})

    # ---- Meta
    is_sample = (raw / "SAMPLE.txt").exists()
    dump(out, "meta.json", {
        "source": "sample" if is_sample else "olist",
        "generated": date.today().isoformat(),
        "orders": int(len(o)),
        "firstMonth": str(o["month"].min()), "lastMonth": str(o["month"].max()),
        "reviewsOnMap": len(pts), "reviewsWithComment": n_commented, "reviewMethod": method,
    })
    print("done:", ("SAMPLE data" if is_sample else "Olist data"), "|", len(o), "orders |", len(pts), "review points")


if __name__ == "__main__":
    main()
