# PourPrice launch guide: from this repo to your first sales

Total setup time is about 1–2 hours. Everything here is free to set up; you only pay fees per sale.

---

## Step 0: Make this repository private (important)
This GitHub repo is **public**, so anyone could download the paid app from it for free.

To fix it: GitHub → repo **Settings** → **General** → *Danger Zone* → **Change visibility** → **Private**.

The website (Step 3) is hosted separately, so it keeps working after you do this.

## Step 1: Create your store (Payhip recommended)
1. Sign up at https://payhip.com. The free plan charges 5% per sale and handles EU/UK VAT for you.
2. Connect Stripe and/or PayPal.
3. Create a **Digital Product**:
   - Price: **$3**
   - Title, description and images: copy them from `marketing/LISTINGS.md` §1.
   - Don't upload the file yet. You'll build it in Step 2 with the right links inside.
4. Copy the product link (e.g. `https://payhip.com/b/AbCd`).

Prefer Gumroad or Lemon Squeezy? Both work the same way, but you keep less per $3 sale (see `marketing/MARKET-RESEARCH.md`).

## Step 2: Configure and build
Edit `build.config.json`:

```json
{
  "buyUrl": "https://payhip.com/b/AbCd",          ← your product link
  "siteUrl": "https://pourprice.netlify.app",      ← your site URL from Step 3 (no trailing slash)
  "phoneAppDir": "app-35d8feb25584",               ← buyer-only phone link; change it to any random text if you like
  "supportEmail": "you@example.com",
  "price": "$3"
}
```

Then run:

```bash
python3 build.py
```

This creates:
- `dist/PourPrice-v1.0.0.zip`: **the file you sell**. It contains the app, a quick-start README and the licence.
- `site/`: your website. It includes the sales page, the free demo at `/demo/`, and the buyer-only phone app.

No Python? Ask anyone with a computer to run it. You could also skip this step: the current `site/` and ZIP work, but they contain placeholder links.

## Step 3: Put the website online (free)
**Netlify Drop** is easiest:
1. Go to https://app.netlify.com/drop.
2. Drag the **`site`** folder onto the page.
3. Rename the site under *Site configuration → Change site name* (e.g. `pourprice` gives you `pourprice.netlify.app`).
4. If the URL differs from `siteUrl` in Step 2, update `build.config.json`, run `python3 build.py` again, and drag `site` onto the site's **Deploys** tab.

Cloudflare Pages ("Upload assets") works the same way.

A custom domain (~$10/yr) is optional and looks more professional.

## Step 4: Finish the store
1. Upload `dist/PourPrice-v1.0.0.zip` as the product file.
2. Paste the thank-you/receipt message from `marketing/LISTINGS.md`, with your real phone link filled in.
3. **Make a test purchase.** Payhip lets you create a 100% discount code. Check that:
   - the download works
   - the file opens
   - the phone link works on your phone.

## Step 5: Etsy (second storefront, optional but recommended)
Etsy buyers already search for "candle cost calculator".
- Create a **digital** listing using `marketing/LISTINGS.md` §2 and upload the same ZIP.
- Etsy charges $0.20 per listing plus ~9.5% plus $0.25 per sale. You keep about $2.26 of each $3.
- Etsy sales don't use your Payhip link, but the phone link inside the ZIP's README still works for Etsy buyers.

---

## Where to post, and in what order

| Week | Channel | What to do | Why |
|---|---|---|---|
| 1 | **Etsy** | Publish the listing. Renew it or add small variations over time. | Buyers with purchase intent are already searching. |
| 1 | **Pinterest** | Create a "Candle Business Tips" board. Pin `pinterest-1000x1500.png` plus 4 screenshots with different titles (see `POSTS.md`). Add 2–3 pins a week. | Pins bring traffic for months. Candle-business content does well there. |
| 1 | **Reddit r/SideProject** | Post B from `POSTS.md`. | Early feedback, a few sales, no promo restrictions. |
| 1–2 | **Facebook candle groups** (5–10 groups) | The FB post from `POSTS.md`, **on each group's promo day only**. | Where hobby sellers hang out. Highest conversion. |
| 2 | **r/candlemaking, r/EtsySellers** | Message the mods first, then Post A (value-first). Answer every comment. | High-quality audience, but promotion is strict. |
| 2+ | **TikTok / Instagram Reels / Shorts** | The 3 scripts in `POSTS.md`, one every few days. Put the site link in your bio. | #candletok is huge. One video that takes off can mean hundreds of sales. |
| 3+ | **Partnerships** | Email 10 small candle-supply shops and YouTubers (template in `POSTS.md`). Offer a free copy or a discount code. | One supplier newsletter mention beats weeks of posting. |
| Ongoing | **"How do I price my candles?" threads** | Helpful answer first. Mention the tool only where it fits, and say it's yours. | Steady long-tail sales. |

**Also worth trying:**
- **Product Hunt**: launch on a Tuesday–Thursday.
- **Indie Hackers**: "Show IH" post.
- **Hacker News**: "Show HN" angle: *a single-file offline HTML app with no backend*.
- **Craft-fair vendor groups**: they need pricing help before market season (Oct–Dec).

**Timing:** candle sales peak in **Q4 (the holiday season)**. Makers are pricing stock right now, in autumn, so launch immediately.

---

## What to expect (honest numbers)
- On Payhip you keep about **$2.46 per sale**.
- **100 sales ≈ $246.** That's realistic within a few months with steady Pinterest, Facebook and Etsy activity.
- **1,000 sales** takes a viral video, a supplier partnership, or strong Etsy ranking.
- Etsy reviews build on each other. Politely ask happy buyers for a review.

Once you have reviews and testimonials, consider raising the price to **$5–7**. It's still far cheaper than the $8–15 spreadsheets competitors sell.

---

## Updating the app later
1. Change `src/pourprice.html`.
2. Bump `VERSION` in the file.
3. Run `python3 build.py`.
4. Run the tests (see `README.md`).
5. Re-upload the ZIP and redeploy `site`.

Buyers keep their data, because it lives in their browser. Tell them to export a backup before switching to a new file.

## Licensing notes
- PourPrice runs entirely in the browser with no server, so there's no copy protection. That's deliberate: at $3, license keys cost more sales than piracy does.
- The licence file forbids sharing, and the phone link is unlisted and hidden from search engines.
- If the phone link is ever shared widely, change `phoneAppDir`, rebuild, redeploy, and email your buyers the new link (Payhip lets you email all customers).
