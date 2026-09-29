// Generates screenshots + marketing images from the real app.
// Run after build: NODE_PATH=$(npm root -g) node tools/marketing-images.cjs
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const ROOT = path.join(__dirname, "..");
const APP = "file://" + path.join(ROOT, "dist/PourPrice.html");
const OUT = path.join(ROOT, "marketing/images");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, colorScheme: "light" });
  const p = await ctx.newPage();
  await p.goto(APP);
  await p.evaluate(() => {
    loadSample();
    const r = S.recipes[0]; r.price = 24;
    // a second recipe and a few batches so screens look lived-in
    const r2 = JSON.parse(JSON.stringify(r)); r2.id = uid(); r2.name = "Vanilla Bean – 9 oz jar"; r2.fragrances = [{ id: r.fragrances[1].id, pct: 100 }]; r2.fl = 9; r2.price = 22; S.recipes.push(r2);
    const t = todayISO();
    const mk = (rr, date, qty, lot, cold, hot, cure) => { const c = calcRecipe(rr, qty); S.batches.push({ id: uid(), recipeId: rr.id, recipeName: rr.name, date, qty, cureDays: cure, lot, waxTemp: "185", pourTemp: "135", notes: "", cold, hot, costEach: c.cost, fl: rr.fl, created: date, weights: { wax: c.totals.wax, fragrances: c.fragrances.map(f => ({ name: f.name, g: f.total })) } }); };
    mk(r, addDays(t, -30), 24, "LV-0907", 4, 5, 14); mk(r2, addDays(t, -18), 12, "VB-0911", 5, 4, 14);
    mk(r, addDays(t, -6), 24, "LV-0923", 4, 0, 14); mk(r2, addDays(t, -2), 12, "VB-0927", 0, 0, 14);
    S.settings.businessName = "Hearth & Wick"; S.lastBackup = new Date().toISOString(); save();
  });
  const shot = async (hash, file, setup) => { await p.goto(APP + hash); await p.waitForTimeout(150); if (setup) await setup(); await p.evaluate(() => document.querySelectorAll(".toast").forEach(t => t.remove())); await p.screenshot({ path: path.join(OUT, file) }); };
  const rid = await p.evaluate(() => S.recipes[0].id);
  await shot("#recipe/" + rid, "screenshot-recipe.png", async () => { await p.fill("#pq", "24"); await p.evaluate(() => document.activeElement.blur()); });
  await shot("#batches", "screenshot-batches.png");
  await shot("#materials", "screenshot-materials.png");
  await shot("#calc", "screenshot-calculator.png", async () => { await p.fill("#cw", "9"); await p.fill("#cq", "24"); await p.fill("#cl", "8"); });
  // dark mode
  await p.evaluate(() => { S.settings.theme = "dark"; save(); applyTheme(); });
  await shot("#recipe/" + rid, "screenshot-recipe-dark.png");
  await p.evaluate(() => { S.settings.theme = "auto"; save(); applyTheme(); });
  // phone
  const ph = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  const pp = await ph.newPage();
  await pp.goto(APP);
  const state = await p.evaluate(() => localStorage.getItem("pourprice-v1"));
  await pp.evaluate(s => localStorage.setItem("pourprice-v1", s), state);
  await pp.goto(APP + "#recipe/" + rid); await pp.reload(); await pp.waitForTimeout(150);
  await pp.evaluate(() => { document.querySelectorAll(".toast").forEach(t => t.remove()); window.scrollTo(0, document.querySelector("#rsum").getBoundingClientRect().top + scrollY - 110); });
  await pp.screenshot({ path: path.join(OUT, "screenshot-phone.png") });

  // promo graphics built from screenshots
  const img = f => "data:image/png;base64," + fs.readFileSync(path.join(OUT, f)).toString("base64");
  const icon = "data:image/png;base64," + fs.readFileSync(path.join(ROOT, "src/assets/icon-192.png")).toString("base64");
  const css = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#2b2118}
    .bg{position:absolute;inset:0;background:linear-gradient(135deg,#fff4e8 0%,#f7dcc4 100%)}
    .logo{display:flex;align-items:center;gap:12px;font-weight:800}.logo img{border-radius:12px}
    .shot{border-radius:14px;box-shadow:0 30px 60px rgba(90,45,10,.28);border:1px solid #e8ddd1;display:block}
    .price{display:inline-block;background:#b4541a;color:#fff;font-weight:900;border-radius:12px}
    ul{margin:0;padding:0;list-style:none} li{padding:4px 0} li:before{content:"✓ ";color:#b4541a;font-weight:900}`;
  const g = await b.newContext({ deviceScaleFactor: 1 });
  const gp = await g.newPage();
  const render = async (w, h, html, file) => { await gp.setViewportSize({ width: w, height: h }); await gp.setContent(`<html><head><style>${css}</style></head><body style="width:${w}px;height:${h}px;position:relative;overflow:hidden"><div class="bg"></div>${html}</body></html>`); await gp.waitForTimeout(100); await gp.screenshot({ path: path.join(OUT, file) }); };

  // Gumroad / Payhip cover 1280x720
  await render(1280, 720, `<div style="position:absolute;left:64px;top:70px;width:520px">
      <div class="logo" style="font-size:30px"><img src="${icon}" width="56" height="56">PourPrice</div>
      <div style="font-size:54px;font-weight:900;line-height:1.05;margin:28px 0 18px;letter-spacing:-1px">Know what every candle really costs.</div>
      <ul style="font-size:22px"><li>Wax &amp; fragrance calculator</li><li>True cost per candle</li><li>Profitable pricing after fees</li><li>Batch log &amp; stock tracking</li></ul>
      <div class="price" style="font-size:28px;padding:12px 22px;margin-top:26px">One-time $3 · no subscription</div></div>
    <img class="shot" src="${img("screenshot-recipe.png")}" style="position:absolute;left:640px;top:90px;width:760px">`, "cover-1280x720.png");
  // Open Graph 1200x630
  await render(1200, 630, `<div style="position:absolute;left:56px;top:56px;width:500px">
      <div class="logo" style="font-size:28px"><img src="${icon}" width="50" height="50">PourPrice</div>
      <div style="font-size:50px;font-weight:900;line-height:1.05;margin:26px 0 16px;letter-spacing:-1px">Price your candles for profit.</div>
      <div style="font-size:22px;color:#6f6257">Calculator · cost · pricing · batch book. Works offline.</div></div>
    <img class="shot" src="${img("screenshot-recipe.png")}" style="position:absolute;left:600px;top:80px;width:720px">`, "og-image.png");
  // Square thumbnail 1000x1000 (Gumroad thumbnail / Etsy / Instagram)
  await render(1000, 1000, `<div style="position:absolute;left:60px;right:60px;top:60px;text-align:center">
      <div class="logo" style="font-size:34px;justify-content:center"><img src="${icon}" width="60" height="60">PourPrice</div>
      <div style="font-size:60px;font-weight:900;line-height:1.05;margin:26px 0 10px;letter-spacing:-1px">Candle Cost &amp; Pricing Calculator</div>
      <div style="font-size:26px;color:#6f6257">+ batch log · stock tracking · works offline</div></div>
    <img class="shot" src="${img("screenshot-recipe.png")}" style="position:absolute;left:90px;top:400px;width:820px">
    <div class="price" style="position:absolute;right:50px;top:330px;font-size:34px;padding:14px 24px;transform:rotate(4deg)">$3</div>`, "thumbnail-1000.png");
  // Pinterest pin 1000x1500
  await render(1000, 1500, `<div style="position:absolute;left:70px;right:70px;top:80px">
      <div class="logo" style="font-size:34px"><img src="${icon}" width="60" height="60">PourPrice</div>
      <div style="font-size:78px;font-weight:900;line-height:1.02;margin:34px 0 18px;letter-spacing:-1.5px">Are you under&shy;charging for your candles?</div>
      <div style="font-size:32px;color:#6f6257;line-height:1.3">Most makers forget lids, labels, wicks, fees and their own time. This app adds it all up.</div></div>
    <img class="shot" src="${img("screenshot-recipe.png")}" style="position:absolute;left:70px;top:600px;width:860px">
    <img class="shot" src="${img("screenshot-phone.png")}" style="position:absolute;right:40px;top:660px;width:280px;border-radius:30px">
    <div class="price" style="position:absolute;left:70px;bottom:90px;font-size:40px;padding:18px 30px">One-time $3 – try the free demo</div>`, "pinterest-1000x1500.png");
  // Instagram / Facebook story 1080x1920
  await render(1080, 1920, `<div style="position:absolute;left:80px;right:80px;top:140px;text-align:center">
      <div class="logo" style="font-size:40px;justify-content:center"><img src="${icon}" width="70" height="70">PourPrice</div>
      <div style="font-size:88px;font-weight:900;line-height:1.02;margin:40px 0 24px;letter-spacing:-1.5px">What does ONE candle really cost you?</div>
      <div style="font-size:38px;color:#6f6257">Wax · oil · wick · jar · lid · label · fees · your time</div></div>
    <img class="shot" src="${img("screenshot-phone.png")}" style="position:absolute;left:290px;top:760px;width:500px;border-radius:40px">
    <div class="price" style="position:absolute;left:50%;transform:translateX(-50%);bottom:120px;font-size:44px;padding:20px 34px;white-space:nowrap">$3 once · link in bio</div>`, "story-1080x1920.png");
  await b.close();
  // copy screenshots used by landing page
  for (const f of ["screenshot-recipe.png", "screenshot-batches.png"]) fs.copyFileSync(path.join(OUT, f), path.join(ROOT, "src/assets", f));
  fs.copyFileSync(path.join(OUT, "og-image.png"), path.join(ROOT, "src/assets/og-image.png"));
  console.log("images ->", OUT);
})().catch(e => { console.error(e); process.exit(1); });
