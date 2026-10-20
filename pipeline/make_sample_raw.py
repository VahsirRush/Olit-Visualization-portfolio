"""Write a SYNTHETIC dataset in the same layout as the Olist CSV files.

This is for testing the pipeline and the dashboard before you have the real
files. Nothing here is real data. It writes a SAMPLE.txt marker so the
dashboard shows a "sample data" banner.

Usage:  python3 pipeline/make_sample_raw.py [--out data/raw] [--orders 9000]
"""
import argparse
from pathlib import Path

import numpy as np
import pandas as pd

STATES = {
    "SP": 0.42, "RJ": 0.13, "MG": 0.12, "RS": 0.06, "PR": 0.055, "SC": 0.04,
    "BA": 0.035, "DF": 0.022, "GO": 0.02, "ES": 0.02, "PE": 0.017, "CE": 0.013,
    "PA": 0.01, "MT": 0.009, "MA": 0.007, "MS": 0.007, "PB": 0.005, "RN": 0.005,
    "PI": 0.005, "AL": 0.004, "SE": 0.003, "TO": 0.003, "RO": 0.002, "AM": 0.002,
    "AC": 0.001, "AP": 0.001, "RR": 0.001,
}
# Extra transit days by state, so far states are slower.
STATE_EXTRA = {"SP": 0, "RJ": 3, "MG": 3, "RS": 6, "PR": 4, "SC": 5, "BA": 8, "DF": 6,
               "GO": 6, "ES": 5, "PE": 10, "CE": 11, "PA": 12, "MT": 9, "MA": 12,
               "MS": 8, "PB": 11, "RN": 11, "PI": 12, "AL": 11, "SE": 10, "TO": 11,
               "RO": 14, "AM": 15, "AC": 17, "AP": 17, "RR": 17}

CATEGORIES = [
    ("cama_mesa_banho", "bed_bath_table", 0.11), ("beleza_saude", "health_beauty", 0.10),
    ("esporte_lazer", "sports_leisure", 0.09), ("informatica_acessorios", "computers_accessories", 0.08),
    ("moveis_decoracao", "furniture_decor", 0.08), ("utilidades_domesticas", "housewares", 0.07),
    ("relogios_presentes", "watches_gifts", 0.06), ("telefonia", "telephony", 0.05),
    ("automotivo", "auto", 0.04), ("brinquedos", "toys", 0.04), ("cool_stuff", "cool_stuff", 0.035),
    ("ferramentas_jardim", "garden_tools", 0.035), ("perfumaria", "perfumery", 0.03),
    ("bebes", "baby", 0.03), ("eletronicos", "electronics", 0.03), ("papelaria", "stationery", 0.025),
    ("fashion_bolsas_e_acessorios", "fashion_bags_accessories", 0.025),
    ("pet_shop", "pet_shop", 0.02), ("eletrodomesticos", "small_appliances", 0.02),
    ("livros_interesse_geral", "books_general_interest", 0.015),
]
PRICE_SCALE = {"relogios_presentes": 2.0, "eletronicos": 1.6, "moveis_decoracao": 1.5,
               "informatica_acessorios": 1.4, "livros_interesse_geral": 0.5,
               "papelaria": 0.5, "cama_mesa_banho": 0.9}

DELIVERY = ["Produto chegou com muito atraso", "Entrega demorou demais, passou do prazo",
            "Ainda não chegou meu pedido", "Atraso na entrega, péssimo atendimento",
            "Demorou mais de um mês para entregar", "Prazo estourado e ninguém responde"]
QUALITY = ["Produto veio com defeito", "Chegou quebrado e de má qualidade",
           "Qualidade ruim, não recomendo", "Material péssimo, estragou rápido",
           "Veio com defeito de fábrica"]
WRONG = ["Veio produto errado", "Faltou um item no pedido", "Produto diferente do anunciado",
         "Recebi só parte do pedido, incompleto", "Cor errada, não é o que eu pedi"]
POSITIVE = ["Ótimo produto, chegou antes do prazo", "Recomendo, qualidade excelente",
            "Tudo certo, entrega rápida", "Muito bom, superou as expectativas",
            "Produto igual ao anunciado, adorei", "Chegou rápido e bem embalado"]
FILLER = ["geladeira", "celular", "sofá", "tênis", "relógio", "notebook", "fone", "mochila", "panela",
          "cadeira", "livro", "camiseta", "perfume", "brinquedo", "bicicleta", "televisão", "impressora",
          "colchão", "cafeteira", "ventilador", "vendedor", "embalagem", "atendimento", "correios",
          "transportadora", "caixa", "nota fiscal", "troca", "reembolso", "garantia", "obrigado",
          "loja confiável", "voltarei a comprar", "nota dez", "cor", "tamanho", "bateria", "controle"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/raw")
    ap.add_argument("--orders", type=int, default=9000)
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    rng = np.random.default_rng(a.seed)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    n = a.orders

    # Purchase dates: Jan 2017 - Aug 2018, growing trend plus a November 2017 spike.
    months = pd.period_range("2017-01", "2018-08", freq="M")
    w = np.linspace(0.4, 1.6, len(months))
    w[list(months).index(pd.Period("2017-11"))] *= 1.9
    w = w / w.sum()
    m_idx = rng.choice(len(months), size=n, p=w)
    day = rng.integers(0, 28, size=n)
    secs = rng.integers(0, 86400, size=n)
    purchase = pd.to_datetime([f"{months[i].year}-{months[i].month:02d}-{d+1:02d}" for i, d in zip(m_idx, day)]) \
        + pd.to_timedelta(secs, unit="s")

    st_names = list(STATES)
    st_p = np.array(list(STATES.values()))
    st_p = st_p / st_p.sum()
    state = rng.choice(st_names, size=n, p=st_p)
    extra = np.array([STATE_EXTRA[s] for s in state])

    order_id = [f"o{i:06d}" for i in range(n)]
    customer_id = [f"c{i:06d}" for i in range(n)]
    base = rng.normal(8, 2.5, n).clip(2, 20) + extra
    est = np.round(base + rng.normal(10, 2, n).clip(4, 20)).astype(int)
    # Some orders run late; the chance grows with distance.
    late_p = 0.05 + extra / 90
    is_late = rng.random(n) < late_p
    late_by = np.where(is_late, rng.gamma(2.0, 4.5, n), 0)
    actual = np.round(base + rng.normal(4, 3, n).clip(0, 12) + late_by).clip(2, 80).astype(int)
    status = rng.choice(["delivered", "shipped", "canceled", "unavailable", "processing"],
                        size=n, p=[0.965, 0.012, 0.01, 0.005, 0.008])
    delivered_ts = purchase + pd.to_timedelta(actual, unit="D")
    delivered_ts = delivered_ts.where(status == "delivered", pd.NaT)
    est_ts = purchase + pd.to_timedelta(est, unit="D")

    orders = pd.DataFrame({
        "order_id": order_id, "customer_id": customer_id, "order_status": status,
        "order_purchase_timestamp": purchase,
        "order_delivered_customer_date": delivered_ts,
        "order_estimated_delivery_date": est_ts,
    })
    customers = pd.DataFrame({"customer_id": customer_id, "customer_state": state})

    # Products, sellers, items.
    cat_p = np.array([c[2] for c in CATEGORIES])
    cat_p = cat_p / cat_p.sum()
    n_prod = 1500
    prod_cat = rng.choice(len(CATEGORIES), size=n_prod, p=cat_p)
    products = pd.DataFrame({
        "product_id": [f"p{i:05d}" for i in range(n_prod)],
        "product_category_name": [CATEGORIES[i][0] for i in prod_cat],
    })
    trans = pd.DataFrame({
        "product_category_name": [c[0] for c in CATEGORIES],
        "product_category_name_english": [c[1] for c in CATEGORIES],
    })
    n_sell = 220
    seller_ids = [f"s{i:04d}" for i in range(n_sell)]
    seller_pop = rng.pareto(1.3, n_sell) + 0.2
    seller_pop = seller_pop / seller_pop.sum()
    seller_quality = rng.normal(0, 0.5, n_sell)  # some sellers are slower or worse
    sellers = pd.DataFrame({"seller_id": seller_ids,
                            "seller_state": rng.choice(st_names, size=n_sell, p=st_p)})

    n_items = rng.choice([1, 2, 3], size=n, p=[0.88, 0.09, 0.03])
    rows = []
    for i in range(n):
        s = rng.choice(n_sell, p=seller_pop)
        for k in range(n_items[i]):
            p = rng.integers(0, n_prod)
            scale = PRICE_SCALE.get(products.at[p, "product_category_name"], 1.0)
            price = round(float(np.exp(rng.normal(4.3, 0.75)) * scale), 2)
            freight = round(float(7 + 0.9 * extra[i] + price * 0.03 + rng.gamma(2, 3)), 2)
            rows.append((order_id[i], k + 1, products.at[p, "product_id"], seller_ids[s], price, freight, seller_quality[s]))
    items = pd.DataFrame(rows, columns=["order_id", "order_item_id", "product_id", "seller_id",
                                        "price", "freight_value", "_sq"])
    # Sellers with a poor quality value also ship a bit late. Fold that into the order delay.
    sq = items.groupby("order_id")["_sq"].first()
    penalty = np.maximum(sq.reindex(order_id).to_numpy(), 0) * 3
    orders["order_delivered_customer_date"] = orders["order_delivered_customer_date"] + pd.to_timedelta(np.round(penalty), unit="D")
    items = items.drop(columns="_sq")

    # Payments.
    ptype = rng.choice(["credit_card", "boleto", "voucher", "debit_card"], size=n, p=[0.74, 0.19, 0.055, 0.015])
    totals = items.groupby("order_id").apply(lambda g: (g["price"] + g["freight_value"]).sum(), include_groups=False)
    payments = pd.DataFrame({"order_id": order_id, "payment_sequential": 1,
                             "payment_type": ptype,
                             "payment_installments": rng.integers(1, 8, size=n),
                             "payment_value": totals.reindex(order_id).round(2).to_numpy()})

    # Reviews: the score falls as delivery runs past the estimate.
    delay = (orders["order_delivered_customer_date"] - orders["order_estimated_delivery_date"]).dt.days.fillna(0).to_numpy()
    late = np.maximum(delay, 0)
    score_raw = 4.65 - 0.17 * np.minimum(late, 25) + rng.normal(0, 0.9, n)
    score = np.clip(np.round(score_raw), 1, 5).astype(int)
    has_text = rng.random(n) < 0.42
    quality_issue = rng.random(n) < np.where(score <= 2, 0.22, 0.02)
    wrong_issue = rng.random(n) < np.where(score <= 2, 0.14, 0.01)
    msgs = []
    for i in range(n):
        if not has_text[i]:
            msgs.append("")
            continue
        if score[i] >= 4:
            t = rng.choice(POSITIVE)
        elif quality_issue[i]:
            t = rng.choice(QUALITY)
        elif wrong_issue[i]:
            t = rng.choice(WRONG)
        elif late[i] > 2 or rng.random() < 0.5:
            t = rng.choice(DELIVERY)
        else:
            t = rng.choice(QUALITY + WRONG)
        msgs.append(t + "".join(" " + w for w in rng.choice(FILLER, size=int(rng.integers(0, 4)))))
    rev_date = purchase + pd.to_timedelta(actual + 2, unit="D")
    reviews = pd.DataFrame({"review_id": [f"r{i:06d}" for i in range(n)], "order_id": order_id,
                            "review_score": score, "review_comment_message": msgs,
                            "review_creation_date": rev_date})

    orders.to_csv(out / "olist_orders_dataset.csv", index=False)
    customers.to_csv(out / "olist_customers_dataset.csv", index=False)
    items.to_csv(out / "olist_order_items_dataset.csv", index=False)
    payments.to_csv(out / "olist_order_payments_dataset.csv", index=False)
    reviews.to_csv(out / "olist_order_reviews_dataset.csv", index=False)
    products.to_csv(out / "olist_products_dataset.csv", index=False)
    sellers.to_csv(out / "olist_sellers_dataset.csv", index=False)
    trans.to_csv(out / "product_category_name_translation.csv", index=False)
    (out / "SAMPLE.txt").write_text("Synthetic sample data written by make_sample_raw.py. Not real.\n")
    print(f"wrote synthetic sample for {n} orders to {out}")


if __name__ == "__main__":
    main()
