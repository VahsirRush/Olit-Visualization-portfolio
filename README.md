# The cost of arriving late

Dashboard on Brazilian e-commerce orders from the Olist public dataset. It looks at late delivery, review text, states, and sellers.

Rishav Sen

## What is on the page

- Review network: month across, stars up, theme front to back
- Delivery surface: delay across, freight cost front to back, review score up
- State columns: delivery time across, late share front to back, revenue as height
- Seller bubbles: orders across, late share front to back, rating up
- Flat charts: monthly revenue, categories, order status, payment type, scores, delivery days by state

Review score is fit as a straight line on days late. That line is printed above the delivery surface.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

`public/data` already has the JSON the page loads. To rebuild it:

```bash
python3 -m pip install pandas numpy scikit-learn
```

Put these files in `data/raw/`:

- `olist_orders_dataset.csv`
- `olist_customers_dataset.csv`
- `olist_order_items_dataset.csv`
- `olist_order_payments_dataset.csv`
- `olist_order_reviews_dataset.csv`
- `olist_products_dataset.csv`
- `product_category_name_translation.csv`

Then run `python3 pipeline/prepare.py`.

The source files are the Brazilian E-Commerce Public Dataset by Olist on Kaggle. Check that license before you publish the data.

For review positions from sentence embeddings: `pip install sentence-transformers umap-learn`, then `python3 pipeline/prepare.py --embed`.

## Notes

- Revenue is item price only. Freight is left out. Canceled and unavailable orders are left out.
- Days late is the delivery date minus the estimated delivery date.
- Review themes are keyword rules on the Portuguese comment. A 4 or 5 star review is counted as Positive.
- Comments shown in English come from `pipeline/translate.py`. The Portuguese text is still there and shows on hover.
- The delivery surface fills cells with fewer than 10 orders from nearby cells. Dots are cells with real counts.
- The trend line is a straight fit on the last 12 months.
- Each 3D view has a table, for accessibility and for browsers without WebGL.
- Click a point to highlight it. Click it again, or click empty space, to clear it.
- The review plate draws a sample so the labels stay readable. The counts in the key use every review on the map.
- A seller is marked at risk when more than 20% of their orders are late, or their rating is under 4.
- States with fewer than 30 orders are left off the 3D columns. They stay in the table.

## Layout of the code

- `pipeline/prepare.py` writes the JSON in `public/data`.
- `lib/scene3d.ts` draws the four 3D views.
- `components/three/Stage.tsx` is the camera, the table toggle, and the fallback when WebGL is missing.
- `app/page.tsx` is the page copy. `components/Layout.tsx` and `app/globals.css` are the layout and styles.
