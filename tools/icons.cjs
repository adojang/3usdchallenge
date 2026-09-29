// Renders the app icon to PNG (src/assets/icon-192.png, icon-512.png)
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const s of [192, 512]) {
    await p.setViewportSize({ width: s, height: s });
    // full-bleed square (maskable-safe: artwork inside central 80%)
    await p.setContent(`<html><body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 64 64"><rect width="64" height="64" fill="#b4541a"/><g transform="translate(6.4 6.4) scale(.8)"><path d="M32 10c5 7 8 11 8 16a8 8 0 0 1-16 0c0-5 3-9 8-16z" fill="#ffd48a"/><rect x="20" y="36" width="24" height="18" rx="3" fill="#fff6ea"/></g></svg></body></html>`);
    await p.screenshot({ path: path.join(__dirname, "../src/assets/icon-" + s + ".png") });
  }
  await b.close();
})();
