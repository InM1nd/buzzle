"""Shared pieces for the Buzzle style mockups (HTML/CSS/SVG -> PNG via headless Chrome at 2x)."""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
BOARD = json.load(open(os.path.join(HERE, "board.json")))
CELLS = BOARD["cells"]            # cells[c][r] -> colour 0..4 (real board from the game's generator)
PATH = [(p["c"], p["r"]) for p in BOARD["path"]]   # 6-cell chain (colour 1)
BOMB = (5, 6)
WILD = (4, 1)
COLS, ROWS = 7, 8
SQ3 = math.sqrt(3)

FONTS = """
@font-face{font-family:'Pangolin';src:url('../fonts/Pangolin-Regular.ttf')}
@font-face{font-family:'Balsamiq Sans';src:url('../fonts/BalsamiqSans-Regular.ttf');font-weight:400}
@font-face{font-family:'Balsamiq Sans';src:url('../fonts/BalsamiqSans-Bold.ttf');font-weight:700}
@font-face{font-family:'Caveat';src:url('../fonts/Caveat-VariableFont_wght.ttf');font-weight:400 700}
@font-face{font-family:'Nunito';src:url('../fonts/Nunito-VariableFont_wght.ttf');font-weight:200 1000}
@font-face{font-family:'Unbounded';src:url('../fonts/Unbounded-VariableFont_wght.ttf');font-weight:200 900}
@font-face{font-family:'Inter Tight';src:url('../fonts/InterTight-VariableFont_wght.ttf');font-weight:100 900}
@font-face{font-family:'Exo 2';src:url('../fonts/Exo2-VariableFont_wght.ttf');font-weight:100 900}
@font-face{font-family:'Rubik';src:url('../fonts/Rubik-VariableFont_wght.ttf');font-weight:300 900}
"""

BASE_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1120px;height:1240px;overflow:hidden}
body{-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.page{width:1120px;height:1240px;padding:44px 60px 0;position:relative;overflow:hidden}
.page-head{display:flex;align-items:flex-end;justify-content:space-between;height:120px;position:relative;z-index:2}
.page-head .kicker{font:700 13px/1 'Nunito';letter-spacing:.22em;text-transform:uppercase;opacity:.65;margin-bottom:10px}
.page-head p{font:500 15px/1.5 'Nunito';max-width:420px;text-align:right;opacity:.8}
.phones{display:flex;gap:64px;justify-content:center;margin-top:30px;position:relative;z-index:2}
.phone{width:436px;height:939px;border-radius:56px;padding:12px;position:relative;flex:none}
.screen{width:412px;height:915px;border-radius:44px;overflow:hidden;position:relative}
.cam{position:absolute;top:13px;left:50%;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#0b0b0d;z-index:50}
.status{height:38px;display:flex;align-items:center;justify-content:space-between;padding:4px 26px 0 30px;font:700 14px/1 'Nunito';position:relative;z-index:5}
.status .sic{display:flex;gap:6px;align-items:center}
.gesture{position:absolute;bottom:9px;left:50%;width:120px;height:4px;margin-left:-60px;border-radius:4px;z-index:50}
svg{display:block}
.abs{position:absolute}
"""

def status_bar(color):
    return f'''<div class="status" style="color:{color}"><span>9:41</span><span class="sic">
<svg width="17" height="12" viewBox="0 0 17 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="{color}"/><rect x="4.5" y="5.5" width="3" height="6.5" rx="1" fill="{color}"/><rect x="9" y="3" width="3" height="9" rx="1" fill="{color}"/><rect x="13.5" y="0" width="3" height="12" rx="1" fill="{color}"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5 .6 4.1a10.5 10.5 0 0 1 14.8 0Z" fill="{color}"/></svg>
<svg width="25" height="12" viewBox="0 0 25 12"><rect x=".5" y=".5" width="21" height="11" rx="3" fill="none" stroke="{color}" opacity=".5"/><rect x="2" y="2" width="15" height="8" rx="1.6" fill="{color}"/><rect x="22.5" y="4" width="2" height="4" rx="1" fill="{color}" opacity=".5"/></svg>
</span></div>'''

def page(css, body, title):
    return f"<!doctype html><html lang='ru'><head><meta charset='utf-8'><title>{title}</title><style>{FONTS}{BASE_CSS}{css}</style></head><body>{body}</body></html>"

# ---------------- geometry ----------------
def cell_center(c, r, s):
    h = SQ3 * s
    return s + c * 1.5 * s, h / 2 + r * h + (h / 2 if c % 2 else 0)

def board_size(s):
    return s * (1.5 * COLS + 0.5), SQ3 * s * (ROWS + 0.5)

def hex_pts(cx, cy, R, rot=0):
    return [(cx + R * math.cos(math.radians(60 * i + rot)), cy + R * math.sin(math.radians(60 * i + rot))) for i in range(6)]

def hex_path(cx, cy, R, rad=0.0, rot=0):
    """Flat-top hexagon path with rounded corners (rad = corner radius in px)."""
    pts = hex_pts(cx, cy, R, rot)
    if rad <= 0:
        return "M" + " L".join(f"{x:.2f},{y:.2f}" for x, y in pts) + "Z"
    d = ""
    n = len(pts)
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        def toward(a, b, t):
            L = math.hypot(b[0] - a[0], b[1] - a[1]); k = t / L
            return a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k
        a = toward(p1, p0, rad); b = toward(p1, p2, rad)
        d += (f"M{a[0]:.2f},{a[1]:.2f}" if i == 0 else f" L{a[0]:.2f},{a[1]:.2f}") + f" Q{p1[0]:.2f},{p1[1]:.2f} {b[0]:.2f},{b[1]:.2f}"
    return d + "Z"

HIVE_SLOTS = [(0, 0)]
for ring in (1, 2):
    for q in range(-ring, ring + 1):
        for r in range(max(-ring, -q - ring), min(ring, -q + ring) + 1):
            if max(abs(q), abs(r), abs(-q - r)) == ring:
                HIVE_SLOTS.append((q, r))
HIVE_LEVELS = [4, 3, 3, 2, 2, 2, 1, 1, 1] + [0] * 10

def hive_center(q, r, s):
    return 1.5 * s * q, SQ3 * s * (r + q / 2)

def hive_state(i):
    if HIVE_LEVELS[i] > 0: return "built"
    q, r = HIVE_SLOTS[i]
    for j, (q2, r2) in enumerate(HIVE_SLOTS):
        if HIVE_LEVELS[j] > 0 and max(abs(q - q2), abs(r - r2), abs(q + r - q2 - r2)) == 1:
            return "open"
    return "locked"

# ---------------- pollen glyphs (white/ink symbols, unit box centred at 0,0, radius ~1) ----------------
def glyph(kind, cx, cy, r, fill, stroke=None, sw=0):
    st = f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"' if stroke else ""
    if kind == 0:  # sun
        rays = "".join(f'<circle cx="{cx + math.cos(a) * r * .82:.2f}" cy="{cy + math.sin(a) * r * .82:.2f}" r="{r * .13:.2f}" fill="{fill}"/>' for a in [i * math.pi / 4 for i in range(8)])
        return f'<circle cx="{cx}" cy="{cy}" r="{r * .45:.2f}" fill="{fill}"{st}/>' + rays
    if kind == 1:  # heart
        k = r * 0.95
        return (f'<path d="M{cx},{cy + k * .78} C{cx - k * 1.15},{cy + k * .05} {cx - k * .85},{cy - k * .9} {cx},{cy - k * .38} '
                f'C{cx + k * .85},{cy - k * .9} {cx + k * 1.15},{cy + k * .05} {cx},{cy + k * .78}Z" fill="{fill}"{st}/>')
    if kind == 2:  # flower
        pet = "".join(f'<circle cx="{cx + math.cos(a) * r * .5:.2f}" cy="{cy + math.sin(a) * r * .5:.2f}" r="{r * .38:.2f}" fill="{fill}"{st}/>' for a in [math.radians(72 * i - 90) for i in range(5)])
        return pet + f'<circle cx="{cx}" cy="{cy}" r="{r * .22:.2f}" fill="{fill}"/>'
    if kind == 3:  # drop
        k = r
        return (f'<path d="M{cx},{cy - k * .95} C{cx + k * .2},{cy - k * .55} {cx + k * .62},{cy - k * .1} {cx + k * .62},{cy + k * .32} '
                f'A{k * .62},{k * .62} 0 0 1 {cx - k * .62},{cy + k * .32} C{cx - k * .62},{cy - k * .1} {cx - k * .2},{cy - k * .55} {cx},{cy - k * .95}Z" fill="{fill}"{st}/>')
    if kind == 4:  # leaf
        k = r
        return (f'<path d="M{cx - k * .7},{cy + k * .7} C{cx - k * .9},{cy - k * .3} {cx - k * .1},{cy - k * .95} {cx + k * .8},{cy - k * .8} '
                f'C{cx + k * .9},{cy + k * .1} {cx + k * .2},{cy + k * .9} {cx - k * .7},{cy + k * .7}Z" fill="{fill}"{st}/>')
    if kind == 9:  # star
        pts = []
        for i in range(10):
            a = math.radians(36 * i - 90); rr = r * (1 if i % 2 == 0 else .45)
            pts.append(f"{cx + math.cos(a) * rr:.2f},{cy + math.sin(a) * rr:.2f}")
        return f'<polygon points="{" ".join(pts)}" fill="{fill}"{st}/>'
    return ""

def path_points(s, ox=0, oy=0):
    return [(ox + cell_center(c, r, s)[0], oy + cell_center(c, r, s)[1]) for c, r in PATH]

# ---------------- simple tab icons (24x24, stroke) ----------------
TAB_ICONS = {
    "hive": '<path d="M12 2.8 19.5 7v8.6L12 20 4.5 15.6V7Z"/><path d="M4.5 11.3h15M9 7v8.6M15 7v8.6"/>',
    "puzzle": '<path d="M7 3.5 10.5 5.5v4L7 11.5 3.5 9.5v-4Z"/><path d="M17 3.5l3.5 2v4l-3.5 2-3.5-2v-4Z"/><path d="M12 12.5l3.5 2v4L12 20.5l-3.5-2v-4Z"/>',
    "bee": '<ellipse cx="12" cy="14" rx="5" ry="6"/><path d="M7.4 12h9.2M7.4 16h9.2"/><path d="M10 8.5C8 4 4 5 4.5 8s4 2.5 5.5.5M14 8.5C16 4 20 5 19.5 8s-4 2.5-5.5.5"/>',
    "tasks": '<rect x="4.5" y="3.5" width="15" height="17" rx="3"/><path d="m8 9 1.5 1.5L12 8M8 15l1.5 1.5L12 14M14.5 9.5h2M14.5 15.5h2"/>',
}
def tab_icon(name, size=24, color="currentColor", sw=2):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'stroke-linecap="round" stroke-linejoin="round">{TAB_ICONS[name]}</svg>')
TABS = [("hive", "Улей"), ("puzzle", "Головоломка"), ("bee", "Пчёлы"), ("tasks", "Задания")]

def flame(x, y, s=1.0, fill="#FF8A3D", inner="#FFD25A", stroke=None, sw=0):
    st = f' stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else ""
    return (f'<g transform="translate({x},{y}) scale({s})"><path d="M0,-11 C5,-5 10,-1 9,5 A9,8 0 0 1 -9,5 C-10,0 -6,-3 -4,-7 C-3,-3 -1,-2 0,-1 C1,-5 0,-8 0,-11Z" fill="{fill}"{st}/>'
            f'<path d="M0,0 C3,3 5,5 4,8 A4,3.6 0 0 1 -4,8 C-4,5 -2,3 0,0Z" fill="{inner}"/></g>')
