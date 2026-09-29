#!/usr/bin/env python3
"""Build PourPrice.

Outputs
  dist/PourPrice.html               full offline app (what buyers get)
  dist/PourPrice-v<ver>.zip         download for buyers: app + README + licence
  site/index.html                   sales page (from src/landing.html)
  site/demo/                        free demo (limited), installable PWA
  site/<phoneAppDir>/               full app as installable PWA for phones (unlisted URL, link given to buyers)

Edit build.config.json, then run:  python3 build.py
"""
import json, re, shutil, zipfile
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
SITE = ROOT / "site"
cfg = json.loads((ROOT / "build.config.json").read_text())
app_src = (SRC / "pourprice.html").read_text()
VERSION = re.search(r'const VERSION = "([^"]+)"', app_src).group(1)


def build_app(edition, pwa):
    build = {"edition": edition, "buyUrl": cfg["buyUrl"]}
    html = app_src
    if pwa:
        build["sw"] = "sw.js"
        html = html.replace(
            "<!--PWA_HEAD-->",
            '<link rel="manifest" href="manifest.webmanifest">\n'
            '<link rel="apple-touch-icon" href="icon-192.png">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">',
        )
    html = html.replace("/*BUILD_CONFIG*/", "const BUILD = " + json.dumps(build) + ";")
    assert "const BUILD = " in html
    return html


def write_pwa(folder: Path, edition, name):
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "index.html").write_text(build_app(edition, pwa=True))
    for icon in ("icon-192.png", "icon-512.png"):
        shutil.copy(SRC / "assets" / icon, folder / icon)
    (folder / "manifest.webmanifest").write_text(json.dumps({
        "name": name, "short_name": "PourPrice", "start_url": "./", "scope": "./",
        "display": "standalone", "background_color": "#fbf7f2", "theme_color": "#b4541a",
        "icons": [
            {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"},
        ],
    }, indent=2))
    cache = f"pourprice-{edition}-{VERSION}"
    (folder / "sw.js").write_text(f"""const CACHE = "{cache}";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); }});
self.addEventListener("activate", e => {{ e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); }});
self.addEventListener("fetch", e => {{
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => {{ const copy = r.clone(); if (r.ok && new URL(e.request.url).origin === location.origin) caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }}).catch(() => caches.match(e.request, {{ ignoreSearch: true }})));
}});
""")


def fill(text):
    for k, v in cfg.items():
        text = text.replace("{{" + k + "}}", v)
    text = text.replace("{{version}}", VERSION)
    left = re.findall(r"\{\{\w+\}\}", text)
    assert not left, f"unfilled placeholders: {left}"
    return text


def main():
    DIST.mkdir(exist_ok=True)
    full = build_app("full", pwa=False)
    (DIST / "PourPrice.html").write_text(full)

    readme = fill((SRC / "README-FIRST.txt").read_text())
    licence = fill((SRC / "LICENSE.txt").read_text())
    zpath = DIST / f"PourPrice-v{VERSION}.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("PourPrice/PourPrice.html", full)
        z.writestr("PourPrice/README-FIRST.txt", readme)
        z.writestr("PourPrice/LICENSE.txt", licence)

    # site: wipe generated folders only
    SITE.mkdir(exist_ok=True)
    for p in SITE.iterdir():
        if p.is_dir() and (p.name == "demo" or p.name.startswith("app-")):
            shutil.rmtree(p)
    write_pwa(SITE / "demo", "demo", "PourPrice (demo)")
    write_pwa(SITE / cfg["phoneAppDir"], "full", "PourPrice")
    # unlisted buyer copy: keep it out of search engines (don't name it in robots.txt – that would reveal it)
    phone = SITE / cfg["phoneAppDir"] / "index.html"
    phone.write_text(phone.read_text().replace("<head>", '<head>\n<meta name="robots" content="noindex, nofollow">', 1))
    (SITE / "index.html").write_text(fill((SRC / "landing.html").read_text()))
    for f in (SRC / "assets").iterdir():
        shutil.copy(f, SITE / f.name)
    print(f"Built PourPrice {VERSION}: {DIST/'PourPrice.html'}, {zpath}, site/")


if __name__ == "__main__":
    main()
