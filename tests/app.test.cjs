// End-to-end + maths tests for PourPrice. Run: python3 build.py && NODE_PATH=$(npm root -g) node tests/app.test.cjs
const { chromium } = require("playwright");
const path = require("path");
const http = require("http");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const FULL = "file://" + path.join(ROOT, "dist/PourPrice.html");
let fails = 0, passes = 0;
function ok(cond, msg){ if (cond){ passes++; } else { fails++; console.log("FAIL:", msg); } }
function near(a, b, msg, tol = 0.005){ ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b}`); }

function serve(dir){
  return new Promise(res => {
    const types = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json" };
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
      const f = path.join(dir, p);
      if (!f.startsWith(dir) || !fs.existsSync(f)) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); rsp.end(fs.readFileSync(f));
    }).listen(0, () => res(s));
  });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(FULL);

  // ---- pure maths ----
  const m = await page.evaluate(() => {
    const G = 28.349523125;
    const a = splitBlend(110, 10, "wax");       // wax 100, fo 10
    const b = splitBlend(100, 10, "total");     // fo 10, wax 90
    return { a, b, G };
  });
  near(m.a.wax, 100, "splitBlend wax-mode wax"); near(m.a.fo, 10, "splitBlend wax-mode fo");
  near(m.b.wax, 90, "splitBlend total-mode wax"); near(m.b.fo, 10, "splitBlend total-mode fo");

  // Calculator UI: 16 oz of wax at 10% FL (% of wax) should give 1.6 oz oil (industry example)
  await page.click("[data-mode=fill]");
  await page.fill("#cf", "17.6"); await page.fill("#cq", "1"); await page.fill("#cl", "10");
  const calcTxt = await page.textContent("#cres");
  ok(calcTxt.includes("16.00 oz") && calcTxt.includes("1.60 oz"), "calculator 17.6 oz blend @10% -> 16 oz wax + 1.6 oz oil: " + calcTxt);
  await page.click("[data-mode=vessel]");
  await page.fill("#cw", "10"); await page.fill("#cq", "10"); await page.fill("#cl", "0");
  ok((await page.textContent("#cres")).includes("86.00 oz"), "calculator 10 x 10 oz water @0.86 -> 86 oz wax");

  // ---- sample data & recipe costing ----
  await page.click("[data-sample]");
  await page.waitForSelector("#rl .item");
  const r = await page.evaluate(() => { const c = calcRecipe(S.recipes[0], 1); return { cost: c.cost, materials: c.materials, wax: c.wax, fo: c.fo, fill: c.fill, retail: c.retail, profit: c.profit, target: c.targetPrice, fr: c.fragrances.map(f => f.g) }; });
  // independent hand calculation
  const G = 28.349523125, LB = 453.59237;
  const fill = 9 * G * 0.86, wax = fill / 1.08, fo = wax * 0.08;
  const waxCost = wax * 95 / (50 * LB), lav = fo * 0.7 * 24 / (16 * G), van = fo * 0.3 * 22 / (16 * G);
  const mats = waxCost + lav + van + 0.12 + 1.5 + 9 / 24 + 0.15, cost = mats + 1.5;
  near(r.fill, fill, "fill weight"); near(r.wax, wax, "wax per candle"); near(r.fo, fo, "fo per candle");
  near(r.fr[0], fo * 0.7, "lavender share"); near(r.materials, mats, "materials cost", 1e-6); near(r.cost, cost, "total cost", 1e-6);
  near(r.retail, cost * 4, "retail = cost x2 x2", 1e-6); near(r.profit, cost * 3, "profit no fees", 1e-6); near(r.target, cost * 2, "price for 50% margin", 1e-6);

  // fees: 10% + 0.30 fixed; target margin 50% → price = (cost+0.3)/(1-0.1-0.5)
  const fee = await page.evaluate(() => { S.settings.feePct = 10; S.settings.feeFixed = 0.3; const c = calcRecipe(S.recipes[0], 1); const out = { p: c.price, fees: c.fees, profit: c.profit, target: c.targetPrice, cost: c.cost }; S.settings.feePct = 0; S.settings.feeFixed = 0; return out; });
  near(fee.fees, fee.p * 0.1 + 0.3, "fees", 1e-9); near(fee.profit, fee.p - fee.cost - fee.fees, "profit after fees", 1e-9);
  near(fee.target, (fee.cost + 0.3) / 0.4, "target price with fees", 1e-9);
  const tp = fee.target; near((tp - fee.cost - (tp * 0.1 + 0.3)) / tp, 0.5, "target price yields 50% margin", 1e-9);

  // ---- recipe page UI ----
  await page.click("#rl .item");
  await page.waitForSelector("#rsum");
  const sum = await page.textContent("#rsum");
  ok(sum.includes("$" + cost.toFixed(2)), "recipe summary shows cost $" + cost.toFixed(2) + " :: " + sum.slice(0, 200));
  await page.fill("#pq", "24");
  const planTxt = await page.textContent("#rplan");
  ok(planTxt.includes((wax * 24 / G).toFixed(2) + " oz"), "batch plan wax for 24: " + (wax * 24 / G).toFixed(2));
  ok(await page.evaluate(() => document.activeElement.id === "pq"), "plan qty keeps focus while typing");
  // FL warning above wax max (10)
  await page.fill("[data-k=fl]", "12");
  ok((await page.textContent("#rsum")).includes("above this wax's max"), "max FL warning");
  await page.fill("[data-k=fl]", "8");
  // add fragrance row -> blend auto-splits to 100
  await page.click("#addfr");
  const pcts = await page.evaluate(() => S.recipes[0].fragrances.map(f => +f.pct));
  near(pcts.reduce((a, b) => a + b, 0), 100, "fragrance rows re-split to 100%", 0.001);
  await page.click("[data-delfr='2']");
  // restore 70/30
  await page.fill("[data-fr='0'][data-fk=pct]", "70"); await page.fill("[data-fr='1'][data-fk=pct]", "30");
  // edit name persists
  await page.fill("[data-k=name]", "Lav Van 9oz");
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("pourprice-v1")).recipes[0].name === "Lav Van 9oz"), "recipe name saved to storage");

  // ---- log batch with stock deduction ----
  const before = await page.evaluate(() => S.materials.map(m => ({ n: m.name, s: m.stock })));
  await page.fill("#pq", "10");
  await page.click("#logb");
  await page.waitForSelector("#b_save");
  await page.fill("#b_lot", "A-001"); await page.fill("#b_date", "2026-09-01"); await page.fill("#b_cure", "14");
  await page.click("[data-stars=hot] button[data-v='4']");
  ok(await page.isChecked("#b_deduct"), "deduct checkbox on by default when stock tracked");
  await page.click("#b_save");
  await page.waitForSelector("table tbody tr[data-b]");
  const after = await page.evaluate(() => S.materials.map(m => ({ n: m.name, s: m.stock })));
  near(before[0].s - after[0].s, wax * 10, "wax stock deducted", 0.01);
  near(before[1].s - after[1].s, fo * 0.7 * 10, "lavender stock deducted", 0.01);
  ok(before[3].s - after[3].s === 10 && before[4].s - after[4].s === 10, "wicks & jars deducted by 10");
  ok(after[5].s === "", "untracked stock stays untracked");
  const rowTxt = await page.textContent("table tbody");
  ok(rowTxt.includes("A-001") && rowTxt.includes("★★★★☆") && rowTxt.includes("Ready"), "batch row shows lot, rating, status ready (2026-09-15 < today): " + rowTxt);
  const b0 = await page.evaluate(() => S.batches[0]);
  ok(addDaysTest(b0.date, 14) === "2026-09-15", "cure date");
  near(b0.costEach, cost, "batch cost snapshot", 0.0001);

  // recipe change does not alter logged batch
  await page.evaluate(() => { S.recipes[0].name = "Changed"; });
  ok((await page.evaluate(() => S.batches[0].recipeName)) === "Lav Van 9oz", "batch keeps recipe snapshot");

  // CSV export
  const [csv] = await Promise.all([page.waitForEvent("download"), page.click("#csv")]);
  const csvTxt = fs.readFileSync(await csv.path(), "utf8");
  ok(csvTxt.includes("A-001") && csvTxt.split("\r\n").length === 2, "CSV export content");

  // edit batch, then delete & restore stock
  await page.click("table tbody tr[data-b]");
  await page.fill("#b_notes", "Good melt pool at 2h");
  await page.click("#b_save");
  ok((await page.evaluate(() => S.batches[0].notes)) === "Good melt pool at 2h", "batch edit saved");
  await page.click("table tbody tr[data-b]");
  await page.click("#b_del"); await page.click("#cfok");
  const restored = await page.evaluate(() => S.materials.map(m => m.stock));
  ok(restored.every((s, i) => s === "" ? before[i].s === "" : Math.abs(s - before[i].s) < 0.01), "stock restored after deleting batch");
  ok((await page.evaluate(() => S.batches.length)) === 0, "batch deleted");

  // ---- materials: add wax priced per kg in grams mode ----
  await page.goto(FULL + "#settings");
  await page.selectOption("[data-s=unit]", "g");
  await page.selectOption("[data-s=currency]", "EUR");
  await page.goto(FULL + "#materials");
  await page.click("#newm");
  await page.fill("#m_name", "Rapeseed wax");
  await page.fill("#m_price", "40"); await page.fill("#m_qty", "10"); await page.selectOption("#m_unit", "kg");
  await page.fill("#m_stock", "5000");
  ok((await page.textContent("#m_uc")).includes("4.00"), "unit cost €4.00/kg: " + await page.textContent("#m_uc"));
  await page.click("#m_save");
  const nm = await page.evaluate(() => S.materials.find(m => m.name === "Rapeseed wax"));
  ok(nm && nm.stock === 5000 && Math.abs(unitCostTest(nm) - 0.004) < 1e-12, "grams material saved");
  // vessel water weight in grams stored as grams
  await page.click("#newm"); await page.selectOption("#m_type", "vessel");
  await page.fill("#m_name", "Tin 200ml"); await page.fill("#m_price", "10"); await page.fill("#m_qty", "10"); await page.fill("#m_ww", "200");
  await page.click("#m_save");
  ok((await page.evaluate(() => S.materials.find(m => m.name === "Tin 200ml").waterWeight)) === 200, "vessel water weight grams");
  // type switch keeps dialog working
  await page.click("#newm"); await page.selectOption("#m_type", "other"); await page.selectOption("#m_unit", "each");
  ok(await page.isVisible("#m_save"), "type switch rerenders dialog"); await page.click("[data-close]");

  // ---- XSS safety ----
  await page.click("#newm"); await page.fill("#m_name", "<img src=x onerror=window.__x=1>"); await page.fill("#m_price", "1"); await page.fill("#m_qty", "1");
  await page.click("#m_save");
  ok(!(await page.evaluate(() => window.__x)), "names are escaped");

  // ---- backup export / import ----
  await page.goto(FULL + "#settings");
  const [bk] = await Promise.all([page.waitForEvent("download"), page.click("#exp")]);
  const bkPath = await bk.path();
  const bkJson = JSON.parse(fs.readFileSync(bkPath, "utf8"));
  ok(bkJson.app === "PourPrice" && bkJson.data.materials.length === 10, "backup contains data");
  await page.click("#wipe"); await page.click("#cfok");
  ok((await page.evaluate(() => S.materials.length)) === 0, "erase all");
  await page.setInputFiles("#imp", bkPath); await page.click("#cfok");
  await page.waitForTimeout(200);
  ok((await page.evaluate(() => S.materials.length + ":" + S.settings.currency)) === "10:EUR", "import restores data");
  // bad import
  const bad = path.join(__dirname, "bad.json"); fs.writeFileSync(bad, '{"hello":1}');
  await page.setInputFiles("#imp", bad); await page.waitForTimeout(200);
  ok((await page.evaluate(() => S.materials.length)) === 10, "bad import rejected"); fs.unlinkSync(bad);

  // persistence across reload
  await page.reload();
  ok((await page.evaluate(() => S.materials.length)) === 10, "data persists after reload");

  // every tab renders without errors; mobile has no horizontal scroll
  await page.setViewportSize({ width: 360, height: 740 });
  for (const t of ["calc", "recipes", "batches", "materials", "settings"]) {
    await page.goto(FULL + "#" + t); await page.waitForTimeout(100);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 0, `no horizontal scroll on mobile (${t}): ${over}px`);
    ok(await page.evaluate(() => { const n = document.getElementById("tabs"); return n.scrollWidth <= n.clientWidth; }), `all tabs visible at 360px (${t})`);
  }
  await page.goto(FULL + "#recipes"); await page.click("#rl .item"); await page.waitForTimeout(100);
  ok((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, "no horizontal scroll on mobile (recipe)");

  // ---- demo edition over http ----
  const srv = await serve(path.join(ROOT, "site"));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const dp = await ctx.newPage();
  dp.on("pageerror", e => errors.push("demo: " + e.message));
  await dp.goto(base + "demo/");
  ok((await dp.textContent(".banner")).includes("Free demo"), "demo banner");
  await dp.click("[data-sample]"); await dp.waitForSelector("#rl .item");
  await dp.click("#newr"); await dp.waitForSelector("#rsum");
  await dp.goto(base + "demo/#recipes");
  await dp.click("#newr");
  ok(await dp.isVisible("text=Demo limit reached"), "demo recipe limit enforced");
  ok((await dp.evaluate(() => S.recipes.length)) === 2, "demo has 2 recipes");
  ok(await dp.evaluate(() => navigator.serviceWorker.getRegistration().then(r => !!r || new Promise(res => setTimeout(() => navigator.serviceWorker.getRegistration().then(x => res(!!x)), 1000)))), "service worker registered");
  const landing = await ctx.newPage();
  await landing.goto(base);
  ok((await landing.textContent("h1")).includes("candle"), "landing renders");
  const phone = await ctx.newPage(); await phone.goto(base + fs.readdirSync(path.join(ROOT, "site")).find(n => n.startsWith("app-")) + "/");
  ok(!(await phone.$(".banner")), "phone app is full edition");
  srv.close();

  ok(errors.length === 0, "no JS errors: " + errors.join(" | "));
  console.log(`\n${passes} passed, ${fails} failed`);
  await browser.close();
  process.exit(fails ? 1 : 0);

  function addDaysTest(iso, d){ const x = new Date(iso + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); }
  function unitCostTest(mm){ return mm.pricePaid / (mm.qtyPurchased * 1000); }
})().catch(e => { console.error(e); process.exit(1); });
