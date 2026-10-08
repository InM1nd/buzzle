"""Shared layout + geometry for the Buzzle art-technique boards (HTML/SVG -> PNG via headless Chrome at 2x)."""
import math, os, sys, base64, io
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "src"))
from common import CELLS, hex_path, hex_pts, glyph  # noqa: E402

SQ3 = math.sqrt(3)
W, H = 1280, 860
SPECIES = [("zhuzha", "Жужа", "маскот"), ("pushinka", "Пушинка", "обычная"), ("boris", "Шмель Борис", "редкая"), ("lavanda", "Лаванда", "обычная")]
CELL_NAMES = ["Солнце", "Сердце", "Цветок", "Капля", "Лист", "Бомба", "Радуга"]
CELL_KINDS = [0, 1, 2, 3, 4, "bomb", "wild"]
ICONS = [("hive", "Улей"), ("puzzle", "Головоломка"), ("bee", "Пчёлы"), ("tasks", "Задания")]

# ---------- preview board: real 5x4 snippet (cols 0..4, rows 2..5) of the game's board ----------
PC, PR = 5, 4
SNIP = [[CELLS[c][r + 2] for r in range(PR)] for c in range(PC)]
SNIP[4][3] = "bomb"
SNIP[3][0] = "wild"
CHAIN = [(0, 0), (1, 0), (1, 1), (2, 1), (2, 2), (2, 3)]   # colour 1 (heart)

def pcenter(c, r, s):
    h = SQ3 * s
    return s + c * 1.5 * s, h / 2 + r * h + (h / 2 if c % 2 else 0)

def psize(s):
    return s * (1.5 * PC + 0.5), SQ3 * s * (PR + 0.5)

# ---------- shape geometry shared by all vector techniques ----------
# Every part: (role, kind, element) where element contains '§' for the style attributes; kind = 'fill' | 'line'
def ell_band(cx, cy, rx, ry, y1, y2):
    def xs(y):
        t = max(-1, min(1, (y - cy) / ry)); return rx * math.sqrt(1 - t * t)
    a, b = xs(y1), xs(y2)
    return (f"M{cx - a:.1f},{y1:.1f} L{cx + a:.1f},{y1:.1f} A{rx},{ry} 0 0 1 {cx + b:.1f},{y2:.1f} "
            f"L{cx - b:.1f},{y2:.1f} A{rx},{ry} 0 0 1 {cx - a:.1f},{y1:.1f}Z")

BEE = {
    "zhuzha":  dict(rx=54, ry=58),
    "pushinka": dict(rx=55, ry=58, tuft=True),
    "boris":   dict(rx=63, ry=60, big=True),
    "lavanda": dict(rx=52, ry=58, flower=True),
}

def bee_parts(sp):
    g = BEE[sp]; cx, cy, rx, ry = 100, 120, g["rx"], g["ry"]
    top, bot = cy - ry, cy + ry
    wx = rx - 8
    P = [
        ("wing", "fill", f'<ellipse cx="{cx - wx}" cy="{top + 12}" rx="31" ry="21" transform="rotate(-30 {cx - wx} {top + 12})" §/>'),
        ("wing", "fill", f'<ellipse cx="{cx + wx}" cy="{top + 12}" rx="31" ry="21" transform="rotate(30 {cx + wx} {top + 12})" §/>'),
        ("antenna", "line", f'<path d="M{cx - 12},{top + 6} Q{cx - 18},{top - 18} {cx - 30},{top - 28}" §/>'),
        ("antenna", "line", f'<path d="M{cx + 12},{top + 6} Q{cx + 18},{top - 18} {cx + 30},{top - 28}" §/>'),
        ("tip", "fill", f'<circle cx="{cx - 30}" cy="{top - 28}" r="6.5" §/>'),
        ("tip", "fill", f'<circle cx="{cx + 30}" cy="{top - 28}" r="6.5" §/>'),
        ("stinger", "fill", f'<path d="M{cx - 8},{bot - 6} L{cx},{bot + 11} L{cx + 8},{bot - 6}Z" §/>'),
        ("body", "fill", f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" §/>'),
    ]
    bands = [(-3, 10), (20, 32), (41, 51)] if g.get("big") else [(12, 27), (37, 50)]
    for y1, y2 in bands:
        P.append(("stripe", "fill", f'<path d="{ell_band(cx, cy, rx, ry, cy + y1, cy + y2)}" §/>'))
    P.append(("shade", "fill", f'<path d="M{cx},{top} A{rx},{ry} 0 0 1 {cx},{bot}Z" §/>'))
    if g.get("tuft"):
        for dx, dy, r in ((-13, 4, 11), (0, -1, 13), (13, 4, 11)):
            P.append(("tuft", "fill", f'<circle cx="{cx + dx}" cy="{top + dy}" r="{r}" §/>'))
    ey = cy - 14 if not g.get("big") else cy - 30
    P += [
        ("eye", "fill", f'<circle cx="{cx - 17}" cy="{ey}" r="7.5" §/>'),
        ("eye", "fill", f'<circle cx="{cx + 17}" cy="{ey}" r="7.5" §/>'),
        ("eyehl", "fill", f'<circle cx="{cx - 14.5}" cy="{ey - 2.6}" r="2.6" §/>'),
        ("eyehl", "fill", f'<circle cx="{cx + 19.5}" cy="{ey - 2.6}" r="2.6" §/>'),
        ("cheek", "fill", f'<ellipse cx="{cx - 30}" cy="{ey + 13}" rx="7.5" ry="5.5" §/>'),
        ("cheek", "fill", f'<ellipse cx="{cx + 30}" cy="{ey + 13}" rx="7.5" ry="5.5" §/>'),
        ("mouth", "line", f'<path d="M{cx - 7},{ey + 11} Q{cx},{ey + 18} {cx + 7},{ey + 11}" §/>'),
    ]
    if g.get("flower"):
        fx, fy = cx + 30, top + 8
        for i in range(5):
            a = math.radians(72 * i - 90)
            P.append(("petal", "fill", f'<circle cx="{fx + math.cos(a) * 9:.1f}" cy="{fy + math.sin(a) * 9:.1f}" r="7.5" §/>'))
        P.append(("pcenter", "fill", f'<circle cx="{fx}" cy="{fy}" r="5.5" §/>'))
    return P

def hive_parts():
    P = [("plank", "fill", '<rect x="26" y="168" width="148" height="16" rx="6" §/>')]
    widths = [150, 146, 134, 114, 84]
    for i, w in enumerate(widths):
        y = 142 - i * 23
        P.append(("band" + str(i % 2), "fill", f'<rect x="{100 - w / 2}" y="{y}" width="{w}" height="30" rx="15" §/>'))
    P.append(("band1", "fill", '<ellipse cx="100" cy="42" rx="22" ry="14" §/>'))
    P.append(("door", "fill", '<path d="M84,170 V154 A16,16 0 0 1 116,154 V170Z" §/>'))
    return P

def ellipse_path(ox, oy, dist, rx, ry, ang):
    """ellipse (rx, ry) whose centre sits `dist` above (ox, oy), rotated by ang degrees about (ox, oy) - no transform attr"""
    t = math.radians(ang); c, s_ = math.cos(t), math.sin(t)
    rot = lambda x, y: (ox + x * c - y * s_, oy + x * s_ + y * c)
    p1, p2 = rot(0, -dist - ry), rot(0, -dist + ry)
    return f"M{p1[0]:.2f},{p1[1]:.2f} A{rx},{ry} {ang} 1 0 {p2[0]:.2f},{p2[1]:.2f} A{rx},{ry} {ang} 1 0 {p1[0]:.2f},{p1[1]:.2f}Z"

def flower_parts():
    P = [("stem", "line", '<path d="M100,104 C96,134 106,160 100,192" §/>'),
         ("leaf", "fill", '<path d="M101,158 C114,136 136,134 150,140 C140,160 120,168 101,158Z" §/>'),
         ("leaf", "fill", '<path d="M99,176 C88,160 68,156 54,160 C62,178 82,184 99,176Z" §/>')]
    for i in range(6):
        a = 60 * i
        P.append(("petal", "fill", f'<path d="{ellipse_path(100, 80, 28, 17, 27, a)}" §/>'))
    P.append(("center", "fill", '<circle cx="100" cy="80" r="19" §/>'))
    return P

def drop_parts():
    return [("drop", "fill", '<path d="M100,24 C116,56 152,90 152,126 A52,52 0 0 1 48,126 C48,90 84,56 100,24Z" §/>'),
            ("hl", "fill", '<ellipse cx="78" cy="122" rx="9" ry="18" transform="rotate(18 78 122)" §/>'),
            ("hl2", "fill", '<circle cx="86" cy="92" r="5" §/>')]

def pointy_hex(cx, cy, r, rad=0):
    return hex_path(cx, cy, r, rad, rot=30)

def icon_parts(name):
    """filled-friendly icon geometry in a 96x96 box"""
    if name == "hive":
        return [("main", "fill", f'<path d="{pointy_hex(48, 30, 17, 3)}" §/>'),
                ("main2", "fill", f'<path d="{pointy_hex(33, 56, 17, 3)}" §/>'),
                ("main", "fill", f'<path d="{pointy_hex(63, 56, 17, 3)}" §/>')]
    if name == "puzzle":
        return [("sub", "line", '<path d="M24,70 L48,48 L72,26" §/>'),
                ("main2", "fill", f'<path d="{hex_path(24, 70, 15, 3)}" §/>'),
                ("main", "fill", f'<path d="{hex_path(48, 48, 15, 3)}" §/>'),
                ("main2", "fill", f'<path d="{hex_path(72, 26, 15, 3)}" §/>')]
    if name == "bee":
        return [("sub", "fill", '<ellipse cx="32" cy="30" rx="14" ry="11" transform="rotate(-25 32 30)" §/>'),
                ("sub", "fill", '<ellipse cx="64" cy="30" rx="14" ry="11" transform="rotate(25 64 30)" §/>'),
                ("main", "fill", '<ellipse cx="48" cy="56" rx="21" ry="25" §/>'),
                ("detail", "fill", f'<path d="{ell_band(48, 56, 21, 25, 58, 66)}" §/>'),
                ("detail", "fill", f'<path d="{ell_band(48, 56, 21, 25, 72, 78)}" §/>')]
    if name == "tasks":
        return [("main", "fill", '<rect x="22" y="16" width="52" height="66" rx="11" §/>'),
                ("main2", "fill", '<rect x="35" y="9" width="26" height="15" rx="6" §/>'),
                ("detail", "line", '<path d="M33,44 l5,5 l9,-10 M33,64 l5,5 l9,-10" §/>'),
                ("detail", "line", '<path d="M55,46 h9 M55,66 h9" §/>')]
    raise KeyError(name)

def render_parts(parts, style_fn):
    out = []
    for role, kind, el in parts:
        st = style_fn(role, kind)
        if st is None:
            continue
        out.append(el.replace("§", st))
    return "".join(out)

def svg(inner, vb, w, h=None, extra=""):
    h = h or w
    return f'<svg width="{w}" height="{h}" viewBox="{vb}" {extra} style="overflow:visible">{inner}</svg>'

def data_uri(path_or_img):
    if isinstance(path_or_img, str):
        raw = open(path_or_img, "rb").read()
    else:
        b = io.BytesIO(); path_or_img.save(b, "PNG"); raw = b.getvalue()
    return "data:image/png;base64," + base64.b64encode(raw).decode()

# ---------- page ----------
CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1280px;height:860px;overflow:hidden;background:#ECE9E3}
body{-webkit-font-smoothing:antialiased;font-family:'Inter Tight';color:#1C1A17}
@font-face{font-family:'Inter Tight';src:url('../../fonts/InterTight-VariableFont_wght.ttf');font-weight:100 900}
@font-face{font-family:'Nunito';src:url('../../fonts/Nunito-VariableFont_wght.ttf');font-weight:200 1000}
@font-face{font-family:'Rubik';src:url('../../fonts/Rubik-VariableFont_wght.ttf');font-weight:300 900}
@font-face{font-family:'Pangolin';src:url('../../fonts/Pangolin-Regular.ttf')}
@font-face{font-family:'Unbounded';src:url('../../fonts/Unbounded-VariableFont_wght.ttf');font-weight:200 900}
.page{position:relative;width:1280px;height:860px;padding:38px 44px 0}
header{display:flex;justify-content:space-between;align-items:flex-end;height:118px;gap:40px}
.kicker{font:600 12px/1 'Inter Tight';letter-spacing:.2em;text-transform:uppercase;color:#8C857B;margin-bottom:12px}
h1{font:700 44px/1 'Inter Tight';letter-spacing:-.02em}
h1 small{font-weight:400;color:#A39B90;font-size:26px;letter-spacing:0;margin-left:10px}
.sub{font:450 15px/1.4 'Inter Tight';color:#5E584F;margin-top:12px;max-width:620px}
.notes{width:430px;display:flex;flex-direction:column;gap:9px;flex:none}
.note{display:flex;gap:12px;align-items:baseline;font:450 13.5px/1.4 'Inter Tight';color:#3D3934}
.note b{flex:none;width:58px;font:700 10.5px/1.6 'Inter Tight';letter-spacing:.14em;text-transform:uppercase;color:#9A9288}
.chip{display:inline-block;padding:2px 9px;border-radius:20px;background:#1C1A17;color:#fff;font-weight:600;font-size:12.5px;margin-right:4px}
.chip.soft{background:#DCD6CC;color:#3D3934}
main{display:flex;gap:32px;margin-top:22px}
.assets{width:760px;flex:none}
.lbl{font:650 11px/1 'Inter Tight';letter-spacing:.16em;text-transform:uppercase;color:#9A9288;margin:0 0 9px 2px}
.row{display:flex;gap:10px;margin-bottom:17px}
.tile{background:#F8F6F2;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;box-shadow:0 1px 0 rgba(0,0,0,.04)}
.tile .cap{position:absolute;bottom:11px;left:0;right:0;text-align:center;font:500 12px/1 'Inter Tight';color:#8C857B}
.tile .cap i{font-style:normal;color:#B5AEA4}
.tile .art{margin-top:-18px;display:flex;align-items:center;justify-content:center}
.icons{display:flex;justify-content:space-around;align-items:center;width:100%;padding:0 6px;margin-top:-14px}
.icons div{display:flex;flex-direction:column;align-items:center;gap:10px;font:500 11.5px/1 'Inter Tight';color:#8C857B}
.preview{width:400px;flex:none}
.shot{width:400px;height:614px;border-radius:30px;overflow:hidden;position:relative;box-shadow:0 18px 40px -18px rgba(40,30,20,.35)}
"""

def page(tech, body_css=""):
    """tech: dict(n, title, en, sub, pair, rn, size, bee(sp,size), cell(kind,size), hive(size), flower(size), drop(size), icon(name,size,active), preview(), defs)"""
    n = tech["n"]
    kick = "Текущий арт Бзз · для сравнения" if n == 0 else f"Техника {n} из 6 · как рисовать ассеты Buzzle"
    pairs = "".join(f'<span class="chip{" soft" if i else ""}">{p}</span>' for i, p in enumerate(tech["pair"]))
    bees = ""
    for i, (sp, name, rar) in enumerate(SPECIES):
        w, sz = (250, 196) if i == 0 else (160, 132)
        bees += f'<div class="tile" style="width:{w}px;height:236px"><div class="art">{tech["bee"](sp, sz)}</div><div class="cap">{name} <i>· {rar}</i></div></div>'
    cells = "".join(f'<div class="tile" style="width:100px;height:126px"><div class="art">{tech["cell"](k, 82)}</div><div class="cap">{nm}</div></div>'
                    for k, nm in zip(CELL_KINDS, CELL_NAMES))
    icons = "".join(f'<div>{tech["icon"](k, 56, i == 0)}<span>{nm}</span></div>' for i, (k, nm) in enumerate(ICONS))
    caps = {"hive": "Улей", "flower": "Цветок", "drop": "Капля мёда", **tech.get("caps", {})}
    row3 = (f'<div class="tile" style="width:150px;height:150px"><div class="art">{tech["hive"](112)}</div><div class="cap">{caps["hive"]}</div></div>'
            f'<div class="tile" style="width:120px;height:150px"><div class="art">{tech["flower"](100)}</div><div class="cap">{caps["flower"]}</div></div>'
            f'<div class="tile" style="width:110px;height:150px"><div class="art">{tech["drop"](78)}</div><div class="cap">{caps["drop"]}</div></div>'
            f'<div class="tile" style="width:350px;height:150px"><div class="icons">{icons}</div><div class="cap">Иконки вкладок</div></div>')
    en = f'<small>{tech["en"]}</small>' if tech.get("en") else ""
    body = f"""<div class="page">
<svg width="0" height="0" style="position:absolute"><defs>{tech.get("defs", "")}</defs></svg>
<header><div><div class="kicker">{kick}</div><h1>{tech["title"]}{en}</h1><div class="sub">{tech["sub"]}</div></div>
<div class="notes"><div class="note"><b>Пара</b><span>{pairs}</span></div><div class="note"><b>В RN</b><span>{tech["rn"]}</span></div><div class="note"><b>Вес</b><span>{tech["size"]}</span></div></div></header>
<main><section class="assets">
<div class="lbl">Пчёлы — маскот и виды</div><div class="row">{bees}</div>
<div class="lbl">Соты — 5 цветов пыльцы, бомба, радуга</div><div class="row">{cells}</div>
<div class="lbl">Улей · цветок · мёд · иконки</div><div class="row" style="margin-bottom:0">{row3}</div>
</section>
<section class="preview"><div class="lbl">В игре — фрагмент поля с цепочкой</div><div class="shot">{tech["preview"]()}</div></section></main></div>"""
    return f"<!doctype html><html lang='ru'><head><meta charset='utf-8'><style>{CSS}{body_css}{tech.get('css', '')}</style></head><body>{body}</body></html>"

def board_svg(s, cell_inner, chain_fn, dim=0.5, pad=0):
    """Compose the 5x4 preview board. cell_inner(kind, sel) -> markup centred at 0,0 for hex radius 50."""
    bw, bh = psize(s)
    k = s / 52.0
    out = []
    sel = set(CHAIN)
    for c in range(PC):
        for r in range(PR):
            x, y = pcenter(c, r, s)
            on = (c, r) in sel
            op = 1 if on or SNIP[c][r] in ("bomb", "wild") else dim
            out.append(f'<g transform="translate({x + pad:.1f},{y + pad:.1f}) scale({k:.4f})" opacity="{op}">{cell_inner(SNIP[c][r], on)}</g>')
    pts = [(pcenter(c, r, s)[0] + pad, pcenter(c, r, s)[1] + pad) for c, r in CHAIN]
    out.append(chain_fn(pts, s))
    return f'<svg width="{bw + 2 * pad:.0f}" height="{bh + 2 * pad:.0f}" style="overflow:visible;display:block">{"".join(out)}</svg>'
