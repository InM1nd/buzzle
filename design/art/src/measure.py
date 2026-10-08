"""Render each technique's asset set at app resolution on a transparent background, slice, and measure PNG / WebP bytes.
Extrapolates to the full in-game set (12 bees, 7 cell sprites + ring, 3 combs, ~17 icons, misc)."""
import importlib, io, os, subprocess, sys, json
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import kit
MODS = ["t1_flat", "t2_watercolor", "t3_clay", "t4_pixel", "t5_lineart", "t6_papercut"]
res = {}
for mn in MODS:
    m = importlib.import_module(mn); T = m.TECH
    items = []  # (html, w, h, group)
    for sp, *_ in kit.SPECIES: items.append((T["bee"](sp, 256 if mn != "t4_pixel" else 200), 256, 256, "bee"))
    for k in kit.CELL_KINDS: items.append((T["cell"](k, 200), 200, 200, "cell"))
    items.append((T["hive"](200), 200, 200, "big")); items.append((T["flower"](200), 200, 200, "big")); items.append((T["drop"](96), 96, 96, "small"))
    for nm, _ in kit.ICONS:
        for a in (True, False): items.append((T["icon"](nm, 96, a), 96, 96, "icon"))
    html, x, y, boxes, rowh = "", 20, 20, [], 0
    for h_, w, hh, g in items:
        if x + w + 40 > 1400: x, y = 20, y + rowh + 60; rowh = 0
        html += f'<div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{hh}px;display:flex;align-items:center;justify-content:center">{h_}</div>'
        boxes.append((x - 20, y - 20, x + w + 20, y + hh + 20, g)); x += w + 60; rowh = max(rowh, hh)
    H = y + rowh + 60
    page = f"<!doctype html><html><head><meta charset='utf-8'><style>{kit.CSS}html,body{{background:transparent!important;width:1400px;height:{H}px}}{T.get('css','')}</style></head><body><svg width='0' height='0' style='position:absolute'><defs>{T.get('defs','')}</defs></svg>{html}</body></html>"
    p = os.path.join("/tmp", f"measure-{mn}.html"); open(p, "w").write(page)
    out = f"/tmp/measure-{mn}.png"
    subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--default-background-color=00000000",
                    "--force-device-scale-factor=1", f"--window-size=1400,{H}", "--virtual-time-budget=4000", f"--screenshot={out}", "file://" + p],
                   check=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
    im = Image.open(out).convert("RGBA")
    tot = {"png": {}, "webp": {}}
    for (a, b, c, d, g) in boxes:
        cr = im.crop((a, b, c, d)); bb = cr.getbbox()
        if bb: cr = cr.crop(bb)
        for fmt, kw in (("png", dict(optimize=True)), ("webp", dict(quality=88, method=6))):
            buf = io.BytesIO(); cr.save(buf, fmt.upper(), **kw)
            tot[fmt][g] = tot[fmt].get(g, 0) + len(buf.getvalue())
    est = {f: int(3 * t["bee"] + t["cell"] * 8 / 7 + 2.5 * t["big"] + t["icon"] * 17 / 8 + t["small"] * 2) for f, t in tot.items()}
    res[mn] = {"measured": {f: sum(t.values()) for f, t in tot.items()}, "full_set_est": est}
    print(mn, json.dumps(res[mn]))
json.dump(res, open(os.path.join(HERE, "sizes.json"), "w"), indent=1)
