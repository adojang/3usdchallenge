# PourPrice 🕯️

**Know exactly what every candle costs, and what to charge.**

PourPrice is a $3 one-time-purchase app for candle makers. It combines:
- a wax and fragrance calculator
- a true cost-per-candle breakdown
- profitable pricing, after marketplace fees
- a batch log with cure dates and throw ratings
- stock tracking

It's a single offline HTML file with no backend and no account. Data stays on the user's device.

➡️ **To start selling, read [LAUNCH-GUIDE.md](LAUNCH-GUIDE.md).**

## What's here

| Path | What |
|---|---|
| `src/pourprice.html` | The app: one file of vanilla HTML/CSS/JS, no dependencies |
| `src/landing.html` | The sales page |
| `src/README-FIRST.txt`, `src/LICENSE.txt` | Included in the buyer's ZIP |
| `build.config.json` | Your store link, site URL, phone-link folder, support email |
| `build.py` | Builds `dist/` (the paid ZIP) and `site/` (sales page, free demo, buyer phone app) |
| `dist/PourPrice-v1.0.0.zip` | **The product you sell** |
| `site/` | Deploy this folder to Netlify, Cloudflare Pages or any static host |
| `marketing/` | Market research, store listings (Payhip/Gumroad/Etsy), social posts, video scripts, images |
| `tests/app.test.cjs` | 66 end-to-end and maths checks in a real browser (Playwright) |
| `tools/` | Scripts that render the icons and the marketing images |

## Build and test

```bash
python3 build.py                                           # builds dist/ and site/
NODE_PATH=$(npm root -g) node tests/app.test.cjs           # needs Playwright
NODE_PATH=$(npm root -g) node tools/marketing-images.cjs   # regenerates screenshots and promo images
```

## Editions
Both editions are built from the same source.
- **Full** (`dist/PourPrice.html`, and `site/<phoneAppDir>/` as an installable PWA): unlimited.
- **Demo** (`site/demo/`): up to 2 recipes and 3 batches, with a "buy" banner. The calculator works fully. Demo data can be exported and then imported into the full version.

## The maths
- **Fill weight** per vessel = water weight × fill factor (default 0.86, adjustable).
- **Fragrance load**, either:
  - % of wax (default, the supplier convention): `wax = blend ÷ (1 + FL)`, `oil = wax × FL`
  - % of total blend: `oil = blend × FL`, `wax = blend − oil`
- **Cost** = materials (priced from what you paid ÷ quantity bought) + labour (minutes × hourly rate) + overhead per candle.
- **Wholesale** = cost × 2, and **retail** = wholesale × 2. Both multipliers are adjustable.
- **Profit** = price − cost − (price × fee% + fixed fee).
- **Price for target margin** = (cost + fixed fee) ÷ (1 − fee% − margin).
