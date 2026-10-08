"""Technique 4 — pixel art (crisp retro sprites, drawn on a tiny grid, scaled by whole numbers)."""
import numpy as np
from PIL import Image, ImageDraw
from kit import *

def C(h): h = h.lstrip("#"); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
OUT = C("#2B1B17")
PAL = {  # base, shade, light, outline
    0: (C("#FFC933"), C("#E8861C"), C("#FFF1A0"), C("#8A3E12")),
    1: (C("#FF6B8B"), C("#C93A63"), C("#FFB8C6"), C("#6E1838")),
    2: (C("#9466F0"), C("#5E3DB8"), C("#CDB4FF"), C("#2E1B66")),
    3: (C("#3FA0FF"), C("#1F62C9"), C("#AEDBFF"), C("#123A7A")),
    4: (C("#3CC86A"), C("#1E8A48"), C("#A9F2B9"), C("#0F4D28")),
}

def new(w, h): return np.zeros((h, w, 4), np.uint8)
def mask_poly(w, h, pts):
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).polygon(pts, fill=1); return np.array(m, bool)
def mask_ell(w, h, box):
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).ellipse(box, fill=1); return np.array(m, bool)
def shift(m, dx, dy):
    o = np.zeros_like(m); H, W = m.shape
    ys, ye = max(0, dy), min(H, H + dy); xs, xe = max(0, dx), min(W, W + dx)
    o[ys:ye, xs:xe] = m[ys - dy:ye - dy, xs - dx:xe - dx]; return o
def erode(m): return m & shift(m, 1, 0) & shift(m, -1, 0) & shift(m, 0, 1) & shift(m, 0, -1)
def dilate(m): return m | shift(m, 1, 0) | shift(m, -1, 0) | shift(m, 0, 1) | shift(m, 0, -1)

def paint(img, m, base, shade=None, light=None):
    img[m] = base
    if shade is not None:
        img[m & ~shift(m, -1, -1)] = shade          # bottom-right rim
    if light is not None:
        img[m & ~shift(m, 1, 1) & shift(m, -1, -1)] = light   # top-left rim
def outline(img, col=OUT):
    a = img[..., 3] > 0
    img[dilate(a) & ~a] = col
def bitmap(img, rows, x0, y0, cols):
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in cols: img[y0 + y, x0 + x] = cols[ch]
def to_png(img): return Image.fromarray(img, "RGBA")

# ---------------- bees 32x32 ----------------
SPEC = {"zhuzha": (C("#FFC933"), C("#E8861C"), C("#FFF1A0"), C("#5A3326")),
        "pushinka": (C("#FFE9BC"), C("#E2B47A"), C("#FFFFFF"), C("#C08850")),
        "boris": (C("#FF9C33"), C("#D2601A"), C("#FFD08A"), OUT),
        "lavanda": (C("#CDB4FF"), C("#9466F0"), C("#F1E8FF"), C("#5E3DB8"))}
def bee_sprite(sp):
    base, shade, light, stripe = SPEC[sp]
    W = 32; img = new(W, W)
    big = sp == "boris"
    wing = mask_ell(W, W, (2, 6, 13, 14)) | mask_ell(W, W, (18, 6, 29, 14))
    paint(img, wing, C("#CFEBFF"), C("#8DBBE8"), C("#FFFFFF"))
    body = mask_ell(W, W, (5, 8, 26, 29) if big else (6, 9, 25, 29))
    paint(img, body, base, shade, light)
    for y in ((19, 20, 23, 24, 27) if big else (21, 22, 25, 26)):
        img[y][body[y]] = stripe
        img[y][body[y] & ~shift(body, -1, -1)[y]] = stripe
    if sp == "pushinka":
        tuft = mask_ell(W, W, (12, 5, 19, 10))
        paint(img, tuft, base, shade, light)
    outline(img)
    # antennae
    for px, py in ((13, 8), (12, 7), (12, 6), (11, 5), (10, 4)):
        img[py, px] = OUT; img[py, 31 - px] = OUT
    for px, py in ((9, 2), (10, 2), (9, 3), (10, 3)):
        img[py, px] = OUT; img[py, 31 - px] = OUT
    img[30, 15] = OUT; img[30, 16] = OUT; img[31, 15] = OUT
    ey = 13 if big else 15
    for ex in (11, 19):
        img[ey:ey + 2, ex:ex + 2] = OUT; img[ey, ex] = C("#FFFFFF")
    for cx in (9, 21):
        img[ey + 3, cx:cx + 2] = C("#FF8FA6")
    for px, py in ((14, ey + 3), (15, ey + 4), (16, ey + 4), (17, ey + 3)):
        img[py, px] = OUT
    if sp == "lavanda":
        bitmap(img, [".p.", "pcp", ".p."], 20, 6, {"p": C("#FF8FC8"), "c": C("#FFE066")})
        img[5, 21] = OUT; img[7, 23] = OUT; img[9, 21] = OUT; img[7, 19] = OUT
    return img

# ---------------- cells 24x21 ----------------
HEX = [(6, 0), (17, 0), (23, 10), (17, 20), (6, 20), (0, 10)]
G = {
 0: ["....#....", ".#.....#.", "...###...", "..#####..", "#.#####.#", "..#####..", "...###...", ".#.....#.", "....#...."],
 1: [".##...##.", "####.####", "#########", "#########", ".#######.", "..#####..", "...###...", "....#....", "........."],
 2: [".##...##.", "####.####", "####.####", ".##ooo##.", "..#ooo#..", ".##ooo##.", "####.####", "####.####", ".##...##."],
 3: ["....#....", "...###...", "...###...", "..#####..", ".#######.", ".####.##.", ".###.###.", "..#####..", "...###..."],
 4: [".....####", "...######", "..######.", ".######..", ".#####...", "..###....", ".#.......", "#........", "........."],
 9: ["....#....", "...###...", "#########", ".#######.", "..#####..", ".###.###.", ".##...##.", ".........", "........."],
}
def cell_sprite(kind, sel=False):
    img = new(24, 21)
    m = mask_poly(24, 21, HEX)
    if kind == "bomb":
        base, shade, light, ol = C("#5A5468"), C("#3A3548"), C("#857F96"), C("#1E1A28")
    elif kind == "wild":
        base, shade, light, ol = C("#FFFFFF"), C("#D9D2E8"), C("#FFFFFF"), C("#3A2A55")
    else:
        base, shade, light, ol = PAL[kind]
    inner = erode(m)
    img[m] = ol
    paint(img, inner, base, None, light)
    img[inner & ~shift(inner, 0, -1)] = shade; img[inner & ~shift(inner, 0, -2) & shift(inner, 0, -1)] = shade
    if kind == "wild":
        bands = [C("#FF6B8B"), C("#FFA03A"), C("#FFD93A"), C("#3CC86A"), C("#3FA0FF"), C("#9466F0")]
        for y in range(1, 20):
            img[y][inner[y]] = bands[min(5, (y - 1) * 6 // 19)]
        bitmap(img, G[9], 8, 6, {"#": C("#FFFFFF")})
        st = np.zeros((21, 24), bool)
        for y, row in enumerate(G[9]):
            for x, ch in enumerate(row):
                if ch == "#": st[6 + y, 8 + x] = True
        img[dilate(st) & ~st & inner] = C("#3A2A55")
    elif kind == "bomb":
        b = mask_ell(24, 21, (6, 6, 16, 16)); img[b] = C("#1E1A28"); img[7:9, 8:10] = C("#9A94AA")
        for px, py in ((15, 6), (16, 5), (17, 4), (17, 3)): img[py, px] = C("#C9A57A")
        bitmap(img, [".#.", "###", ".#."], 17, 1, {"#": C("#FFD93A")}); img[2, 18] = C("#FFFFFF")
    else:
        bitmap(img, G[kind], 7, 6, {"#": C("#FFFFFF"), "o": PAL[0][0]})
        gm = np.zeros((21, 24), bool)
        for y, row in enumerate(G[kind]):
            for x, ch in enumerate(row):
                if ch == "#": gm[6 + y, 7 + x] = True
        img[gm & ~shift(gm, 0, -1) & inner] = PAL[kind][2] if False else img[gm & ~shift(gm, 0, -1) & inner]
        img[shift(gm, 0, 1) & ~gm & inner] = PAL[kind][1]   # drop shadow under glyph
    if sel:
        img[m & ~inner] = C("#FFFFFF")
    return img

# ---------------- hive / flower / drop / icons ----------------
def hive_sprite():
    W = 28; img = new(W, W)
    widths = [26, 26, 22, 18, 12]
    for i, w in enumerate(widths):
        y = 19 - i * 4; x0 = (W - w) // 2
        m = np.zeros((W, W), bool); m[y:y + 5, x0:x0 + w] = True
        m[y, x0] = m[y, x0 + w - 1] = m[y + 4, x0] = m[y + 4, x0 + w - 1] = False
        paint(img, m, C("#FFC933") if i % 2 == 0 else C("#FFB01F"), C("#D47A16"), C("#FFF1A0"))
        img[y + 4][m[y + 4]] = C("#D47A16")
    top = np.zeros((W, W), bool); top[1:4, 11:17] = True; top[1, 11] = top[1, 16] = False
    paint(img, top, C("#FFB01F"), C("#D47A16"), C("#FFF1A0"))
    plank = np.zeros((W, W), bool); plank[24:27, 1:27] = True
    paint(img, plank, C("#A8662E"), C("#6E3E1A"), C("#D08A4A"))
    outline(img)
    bitmap(img, ["..##..", ".####.", "######", "######", "######"], 11, 19, {"#": C("#3A2218")})
    return img

def flower_sprite():
    W = 24; img = new(W, W)
    stem = np.zeros((W, W), bool); stem[11:23, 11:13] = True
    paint(img, stem, C("#3CC86A"), C("#1E8A48"))
    leaf = mask_ell(W, W, (13, 15, 20, 19)) | mask_ell(W, W, (4, 17, 11, 21))
    paint(img, leaf, C("#3CC86A"), C("#1E8A48"), C("#A9F2B9"))
    for cx, cy in ((12, 3), (18, 7), (16, 13), (8, 13), (6, 7)):
        paint(img, mask_ell(W, W, (cx - 3, cy - 3, cx + 3, cy + 3)), C("#FF6B8B"), C("#C93A63"), C("#FFB8C6"))
    paint(img, mask_ell(W, W, (9, 5, 15, 11)), C("#FFC933"), C("#E8861C"), C("#FFF1A0"))
    outline(img)
    return img

def drop_sprite():
    rows = ["......##......", ".....####.....", ".....####.....", "....######....", "...########...", "...########...", "..##########..",
            "..##########..", ".############.", ".############.", ".############.", "..##########..", "..##########..", "....######...."]
    img = new(16, 16); m = np.zeros((16, 16), bool)
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == "#": m[y + 1, x + 1] = True
    paint(img, m, C("#FFB01F"), C("#D2601A"), C("#FFE07A"))
    img[8:11, 4] = C("#FFFFFF"); img[7, 5] = C("#FFFFFF")
    outline(img)
    return img

HEX6 = [".####.", "######", "######", "######", ".####."]
HEX4 = [".##.", "####", "####", ".##."]
def icon_sprite(name, active):
    col = C("#FFC933") if active else C("#BDB5AA")
    sh = C("#E8861C") if active else C("#9C948A")
    ol = OUT if active else C("#7D766D")
    img = new(16, 16)
    if name == "hive":
        for x, y in ((5, 1), (2, 7), (8, 7)): bitmap(img, HEX6, x, y, {"#": col})
    elif name == "puzzle":
        for x, y in ((1, 10), (6, 6), (11, 2)): bitmap(img, HEX4, x, y, {"#": col})
        for px, py in ((5, 10), (10, 6)): img[py, px] = col
    elif name == "bee":
        bitmap(img, [".##....##.", "####..####", "####..####", ".##....##."], 3, 1, {"#": C("#E8F4FF") if active else C("#D6D0C8")})
        bm = mask_ell(16, 16, (4, 4, 11, 14)); img[bm] = col
        img[9][bm[9]] = sh; img[12][bm[12]] = sh
    elif name == "tasks":
        img[2:15, 3:13] = col; img[1:3, 6:10] = sh
        for px, py in ((5, 6), (6, 7), (7, 6), (8, 5)): img[py, px] = ol
        for px, py in ((5, 11), (6, 12), (7, 11), (8, 10)): img[py, px] = ol
        img[6, 10:12] = sh; img[11, 10:12] = sh
    outline(img, ol)
    return img

def img_tag(arr, scale, extra=""):
    h, w = arr.shape[:2]
    return f'<img src="{data_uri(to_png(arr))}" width="{w * scale}" height="{h * scale}" style="image-rendering:pixelated;display:block{extra}">'

def bee(sp, size): return img_tag(bee_sprite(sp), 6 if size > 150 else 4)
def cell(kind, size): return img_tag(cell_sprite(kind), 3)
def hive(size): return img_tag(hive_sprite(), 4)
def flower(size): return img_tag(flower_sprite(), 4)
def drop(size): return img_tag(drop_sprite(), 5)
def icon(name, size, active=False): return img_tag(icon_sprite(name, active), size // 16)

# ---------------- preview board, composed at native resolution ----------------
BG = C("#2A2140")
def board_native():
    CW, CS, RS, OFF = 24, 19, 22, 11
    W, H = CS * (PC - 1) + CW, RS * (PR - 1) + OFF + 21
    img = new(W, H)
    sel = set(CHAIN)
    centers = {}
    for c in range(PC):
        for r in range(PR):
            x, y = c * CS, r * RS + (OFF if c % 2 else 0)
            spr = cell_sprite(SNIP[c][r], (c, r) in sel).astype(float)
            if (c, r) not in sel and SNIP[c][r] not in ("bomb", "wild"):
                a = spr[..., 3:4] > 0
                spr[..., :3] = np.where(a, spr[..., :3] * .5 + np.array(BG[:3]) * .5, spr[..., :3])
            spr = spr.astype(np.uint8)
            a = spr[..., 3] > 0
            img[y:y + 21, x:x + 24][a] = spr[a]
            centers[(c, r)] = (x + 11, y + 10)
    # chain: 2px white line with dark outline, square nodes
    line = np.zeros((H, W), bool)
    pts = [centers[p] for p in CHAIN]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        n = max(abs(x1 - x0), abs(y1 - y0))
        for i in range(n + 1):
            x = round(x0 + (x1 - x0) * i / n); y = round(y0 + (y1 - y0) * i / n)
            line[y:y + 2, x:x + 2] = True
    for i, (x, y) in enumerate(pts):
        k = 2 if i < len(pts) - 1 else 3
        line[y - k + 1:y + k + 1, x - k + 1:x + k + 1] = True
    img[dilate(line) & ~line] = OUT
    img[line] = C("#FFFFFF")
    return img

def preview():
    b = img_tag(board_native(), 3)
    tabs = "".join(f'<div class="t4tab{" on" if i == 0 else ""}">{icon(k, 32, i == 0)}<span>{nm}</span></div>' for i, (k, nm) in enumerate(ICONS))
    stars = "".join(f'<i style="left:{x}px;top:{y}px"></i>' for x, y in ((40, 136), (352, 150), (212, 470), (70, 470), (340, 478), (190, 140)))
    return f'''<div style="position:absolute;inset:0;background:#2A2140"></div><div class="t4stars">{stars}</div>
<div class="t4box" style="left:18px;top:18px;width:250px"><span>ГОЛОВОЛОМКА ДНЯ</span><b>1 285</b></div>
<div class="t4box" style="right:18px;top:18px;width:96px;text-align:center"><span>ХОДЫ</span><b style="color:#FFC933">14</b></div>
<div style="position:absolute;left:18px;top:106px;display:flex;gap:8px"><span class="t4chip" style="background:#FF6B8B">КОМБО ×1,5</span><span class="t4chip" style="background:#3CC86A">6 → БОМБА!</span></div>
<div style="position:absolute;left:50px;top:160px">{b}</div>
<div style="position:absolute;left:0;right:0;bottom:104px;text-align:center;font:400 9px/1.4 'Press Start 2P';color:#8E84B0">ВЕДИ ПО 3+ СОТАМ</div>
<div style="position:absolute;left:12px;right:12px;bottom:12px;height:80px;background:#3A2F58;box-shadow:0 0 0 3px #15101F, inset 0 -4px 0 #2A2140, inset 0 3px 0 #54487A;display:flex;justify-content:space-around;align-items:center">{tabs}</div>'''

TECH = dict(n=4, title="Пиксель-арт", en="retro pixel",
            sub="Спрайты на крошечной сетке (соты 24×21, пчёлы 32×32 px), ограниченная палитра, ручная обводка и свет. Чётко на любом экране при целом масштабе.",
            pair=["A · Минимализм", "или отдельная ретро-ветка"],
            rn="PNG-спрайты. Важно: Android сглаживает картинки при растяжении, поэтому спрайты увеличиваем заранее в ×4–×6 (nearest), а не на устройстве.",
            size="замер ≈ 0,03 МБ PNG даже после увеличения ×6 — самый лёгкий вариант.",
            bee=bee, cell=cell, hive=hive, flower=flower, drop=drop, icon=icon, preview=preview,
            css=".t4box{position:absolute;height:72px;background:#3A2F58;box-shadow:0 0 0 3px #15101F, inset 0 -4px 0 #2A2140, inset 0 3px 0 #54487A;padding:14px 14px 0;font:400 9px/1 'Press Start 2P';color:#8E84B0}"
                ".t4box b{display:block;font:400 24px/1 'Press Start 2P';color:#FFFFFF;margin-top:12px;font-weight:400}"
                ".t4chip{color:#15101F;font:400 10px/1 'Press Start 2P';padding:8px 10px;box-shadow:0 0 0 3px #15101F, inset 0 -3px 0 rgba(0,0,0,.25)}"
                ".t4tab{display:flex;flex-direction:column;align-items:center;gap:8px;font:400 7.5px/1 'Press Start 2P';color:#8E84B0}.t4tab.on{color:#FFC933}"
                ".t4stars i{position:absolute;width:4px;height:4px;background:#FFE88A;box-shadow:4px 0 #FFE88A80,-4px 0 #FFE88A80,0 4px #FFE88A80,0 -4px #FFE88A80}")
