"""Reference — the CURRENT Бзз art (real PNGs from assets/art, drawn with PIL in scripts/make_art.py)."""
import math
from PIL import Image, ImageDraw, ImageFilter
from kit import *

ART = os.path.join(HERE, "..", "..", "..", "assets", "art")
U = lambda n: data_uri(os.path.join(ART, n + ".png"))
PATHC = ["#E39A00", "#E04585", "#7A4FD6", "#1F7FE0", "#25A35C"]

def img(uri, w, h=None, extra=""):
    h = h or w
    return f'<img src="{uri}" width="{w}" height="{h:.0f}" style="display:block{extra}">'

def bee(sp, size): return img(U("bee_" + sp), size)

def cell_stack(kind, w):
    h = w * 173 / 200
    if kind == "bomb":
        return f'<div style="position:relative;width:{w}px;height:{h:.0f}px">{img(U("cell0"), w, h)}<div style="position:absolute;inset:0">{img(U("bomb"), w, h)}</div></div>'
    return img(U("cell_wild" if kind == "wild" else f"cell{kind}"), w, h)

def cell(kind, size): return cell_stack(kind, size)

def hive_png():
    comb, empty = Image.open(os.path.join(ART, "comb.png")).convert("RGBA"), Image.open(os.path.join(ART, "comb_empty.png")).convert("RGBA")
    s = 100; W, H = 520, 540
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    slots = [(0, 0), (1, -1), (1, 0), (0, 1), (-1, 1), (-1, 0), (0, -1)]
    for i, (q, r) in enumerate(slots):
        x, y = 1.5 * s * q * 0.97, SQ3 * s * (r + q / 2) * 0.97
        out.alpha_composite(empty if i in (3, 4) else comb, (int(W / 2 + x - 100), int(H / 2 + y - 86)))
    return out

def hive(size): return img(data_uri(hive_png()), size, size * 540 / 520)

def flower_png():
    S = 512; im = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.line([(256, 280), (250, 360), (258, 470)], fill=(47, 179, 106, 255), width=22, joint="curve")
    d.ellipse([262, 370, 380, 420], fill=(71, 201, 126, 255), outline=(30, 122, 71, 255), width=6)
    for i in range(6):
        a = math.radians(60 * i - 90); px, py = 256 + math.cos(a) * 80, 210 + math.sin(a) * 80
        d.ellipse([px - 62, py - 62, px + 62, py + 62], fill=(255, 111, 163, 255), outline=(204, 70, 120, 255), width=8)
    d.ellipse([200, 154, 312, 266], fill=(255, 194, 51, 255), outline=(224, 140, 0, 255), width=8)
    d.ellipse([222, 172, 256, 200], fill=(255, 236, 170, 255))
    return im.resize((256, 256), Image.LANCZOS)

def flower(size): return img(data_uri(flower_png()), size)
def drop(size): return img(U("honey"), size)

def icon(name, size, active=False):
    col = "#F08A00" if active else "#C9A982"
    u = U("tab_" + name)
    return f'<div style="width:{size}px;height:{size}px;background:{col};-webkit-mask:url({u}) center/contain no-repeat"></div>'

def preview():
    s = 44; bw, bh = psize(s); w = 2 * s * 0.98; h = w * 173 / 200
    cells = ""
    sel = set(CHAIN)
    for c in range(PC):
        for r in range(PR):
            x, y = pcenter(c, r, s); k = SNIP[c][r]; on = (c, r) in sel
            op = 1 if on or k in ("bomb", "wild") else .5
            ring = f'<image href="{U("ring")}" x="{x - w / 2:.1f}" y="{y - h / 2:.1f}" width="{w:.1f}" height="{h:.1f}"/>' if on else ""
            src = U("cell_wild") if k == "wild" else U("cell0" if k == "bomb" else f"cell{k}")
            bomb = f'<image href="{U("bomb")}" x="{x - w / 2:.1f}" y="{y - h / 2:.1f}" width="{w:.1f}" height="{h:.1f}"/>' if k == "bomb" else ""
            cells += f'<g opacity="{op}"><image href="{src}" x="{x - w / 2:.1f}" y="{y - h / 2:.1f}" width="{w:.1f}" height="{h:.1f}"/>{bomb}{ring}</g>'
    pts = [pcenter(c, r, s) for c, r in CHAIN]
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    lc = PATHC[1]
    chain = (f'<path d="{d}" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>'
             f'<path d="{d}" fill="none" stroke="{lc}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
             + "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{7 if i < 5 else 9}" fill="{lc}" stroke="#fff" stroke-width="3"/>' for i, (x, y) in enumerate(pts)))
    board = f'<svg width="{bw:.0f}" height="{bh:.0f}" style="display:block;overflow:visible">{cells}{chain}</svg>'
    tabs = "".join(f'<div class="t0tab{" on" if i == 0 else ""}">{icon(k, 28, i == 0)}<span>{nm}</span></div>' for i, (k, nm) in enumerate(ICONS))
    flame = f'<img src="{U("flame")}" width="18" height="18">'
    return f'''<div style="position:absolute;inset:0;background:#FFF6E3"></div>
<div style="position:absolute;left:0;right:0;top:18px;text-align:center;font:800 12px/1 'Nunito';letter-spacing:.06em;color:#9C7A55">ГОЛОВОЛОМКА ДНЯ</div>
<div style="position:absolute;left:0;right:0;top:34px;text-align:center;font:900 40px/1 'Nunito';color:#4A2C12">1 285</div>
<div style="position:absolute;right:18px;top:16px;width:62px;height:58px;border-radius:20px;background:#F08A00;color:#fff;text-align:center;padding-top:8px;font:900 24px/1 'Nunito';box-shadow:0 4px 10px rgba(160,90,0,.25)">14<div style="font:800 10px/1 'Nunito';opacity:.9;margin-top:2px">ХОДОВ</div></div>
<div style="position:absolute;left:18px;top:96px;display:flex;gap:8px;align-items:center"><span style="display:flex;gap:4px;align-items:center;background:#fff;border-radius:14px;padding:0 10px;height:28px;font:800 13px/1 'Nunito';color:#C0560F">{flame}Комбо ×1,5</span></div>
<div style="position:absolute;right:18px;top:96px;background:{lc};border-radius:14px;padding:0 10px;height:28px;line-height:28px;font:800 13px/28px 'Nunito';color:#fff">цепочка 6 · бомба!</div>
<div style="position:absolute;left:16px;top:142px;background:#F7DFAE;border:3px solid #E8C27E;border-radius:26px;padding:6px">{board}</div>
<div style="position:absolute;left:0;right:0;bottom:104px;text-align:center;font:700 13px/1 'Nunito';color:#9C7A55">Ведите пальцем по 3+ сотам одного цвета</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:84px;background:#fff;box-shadow:0 -4px 16px rgba(120,70,10,.08);display:flex;justify-content:space-around;align-items:center">{tabs}</div>'''

TECH = dict(n=0, title="Текущий Бзз", en="как в APK v1.0.0",
            sub="Настоящие PNG из игры (assets/art): мягкие градиенты, лёгкий объём, белые значки, обводка в тон. Отдельного ассета цветка в игре нет — нарисован в том же стиле.",
            pair=["C · Бзз"],
            rn="Уже в APK: 40 PNG, нарисованы кодом (PIL, scripts/make_art.py) — любую технику ниже можно так же генерировать скриптом.",
            size="664 КБ сейчас. APK 23,3 МБ → запас до 24 МБ ≈ 0,7 МБ (считаем разницу, а не сумму).",
            caps={"hive": "Соты улья", "flower": "Цветок <i>· нет в игре</i>", "drop": "Мёд <i>· банка</i>"},
            bee=bee, cell=cell, hive=hive, flower=flower, drop=drop, icon=icon, preview=preview,
            css=".t0tab{display:flex;flex-direction:column;align-items:center;gap:5px;font:800 11px/1 'Nunito';color:#C9A982}.t0tab.on{color:#F08A00}")
