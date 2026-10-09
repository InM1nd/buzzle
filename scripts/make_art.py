"""All game art for Buzzle, drawn in code (no external assets): pollen cells, hive combs, 12 bees,
UI icons, background tile, app icon / adaptive / monochrome / splash / notification icon."""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageFont
# v1.2: bees and the app icon / splash / notification icon now come from the low-poly Blender pipeline
# (scripts/bees3d/pack.py). The old flat bees and icons are only written with BZZ_LEGACY_BEES=1.
LEGACY = os.environ.get("BZZ_LEGACY_BEES") == "1"

ART = "assets/art"
os.makedirs(ART, exist_ok=True)
SS = 4

def rgba(h, a=255):
    h = h.lstrip("#"); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
def mix(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)) + (255,)
def lighten(c, t): return mix(c, (255, 255, 255), t)
def darken(c, t): return mix(c, (0, 0, 0), t)

def hex_pts(cx, cy, s, flat=True, rot=0):
    off = 0 if flat else 30
    return [(cx + s * math.cos(math.radians(60 * i + off + rot)), cy + s * math.sin(math.radians(60 * i + off + rot))) for i in range(6)]

def rounded_mask(size, pts, radius):
    """polygon mask with rounded corners (blur + threshold)."""
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    if radius > 0:
        m = m.filter(ImageFilter.GaussianBlur(radius)).point(lambda v: 255 if v > 128 else 0)
        m = m.filter(ImageFilter.GaussianBlur(1.2))
    return m

def vgrad(size, top, bottom, mid=None):
    w, h = size
    im = Image.new("RGBA", size)
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / max(1, h - 1)
        if mid is not None:
            c = mix(top, mid, t * 2) if t < 0.5 else mix(mid, bottom, (t - 0.5) * 2)
        else:
            c = mix(top, bottom, t)
        d.line([(0, y), (w, y)], fill=c)
    return im

def finish(im, size):
    return im.resize(size, Image.LANCZOS)

# ---------------- pollen cells (flat-top hex, 2s × √3s) ----------------
CELL_S = 100
CW, CH = 2 * CELL_S, int(round(math.sqrt(3) * CELL_S))
COLORS = ["#FFC233", "#FF6FA3", "#9B74F2", "#3FA2FF", "#47C97E"]

def symbol(d, kind, cx, cy, r, fill):
    if kind == 0:  # sun / circle with dots
        d.ellipse([cx - r * 0.45, cy - r * 0.45, cx + r * 0.45, cy + r * 0.45], fill=fill)
        for i in range(8):
            a = math.radians(45 * i)
            x, y = cx + math.cos(a) * r * 0.8, cy + math.sin(a) * r * 0.8
            d.ellipse([x - r * 0.12, y - r * 0.12, x + r * 0.12, y + r * 0.12], fill=fill)
    elif kind == 1:  # heart
        rr = r * 0.42
        d.ellipse([cx - 2 * rr, cy - rr * 1.5, cx, cy + rr * 0.5], fill=fill)
        d.ellipse([cx, cy - rr * 1.5, cx + 2 * rr, cy + rr * 0.5], fill=fill)
        d.polygon([(cx - 1.93 * rr, cy - 0.2 * rr), (cx + 1.93 * rr, cy - 0.2 * rr), (cx, cy + 1.9 * rr)], fill=fill)
    elif kind == 2:  # 5-petal flower
        for i in range(5):
            a = math.radians(72 * i - 90)
            x, y = cx + math.cos(a) * r * 0.48, cy + math.sin(a) * r * 0.48
            d.ellipse([x - r * 0.36, y - r * 0.36, x + r * 0.36, y + r * 0.36], fill=fill)
    elif kind == 3:  # drop
        d.ellipse([cx - r * 0.55, cy - r * 0.15, cx + r * 0.55, cy + r * 0.95], fill=fill)
        d.polygon([(cx - r * 0.5, cy + r * 0.25), (cx + r * 0.5, cy + r * 0.25), (cx, cy - r * 0.95)], fill=fill)
    elif kind == 4:  # leaf
        d.ellipse([cx - r * 0.5, cy - r * 0.85, cx + r * 0.5, cy + r * 0.85], fill=fill)
        d.line([(cx, cy - r * 0.6), (cx, cy + r * 0.95)], fill=(0, 0, 0, 0), width=int(r * 0.12))
    elif kind == 9:  # star
        pts = []
        for i in range(10):
            a = math.radians(36 * i - 90)
            rad = r * (0.95 if i % 2 == 0 else 0.42)
            pts.append((cx + math.cos(a) * rad, cy + math.sin(a) * rad))
        d.polygon(pts, fill=fill)

def cell(color_hex, sym, wild=False):
    W, H = CW * SS, CH * SS
    s = CELL_S * SS
    cx, cy = W / 2, H / 2
    base = rgba(color_hex)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    outer = rounded_mask((W, H), hex_pts(cx, cy, s * 0.94), 10 * SS)
    # rim (darker)
    rim = vgrad((W, H), darken(base, 0.05), darken(base, 0.3))
    out.paste(rim, (0, 0), outer)
    inner = rounded_mask((W, H), hex_pts(cx, cy - 2 * SS, s * 0.80), 8 * SS)
    if wild:
        body = Image.new("RGBA", (W, H))
        d = ImageDraw.Draw(body)
        rainbow = ["#FF6FA3", "#FFC233", "#47C97E", "#3FA2FF", "#9B74F2"]
        for y in range(H):
            t = y / H * (len(rainbow) - 1)
            i = min(int(t), len(rainbow) - 2)
            d.line([(0, y), (W, y)], fill=lighten(mix(rgba(rainbow[i]), rgba(rainbow[i + 1]), t - i), 0.25))
    else:
        body = vgrad((W, H), lighten(base, 0.35), darken(base, 0.08), base)
    out.paste(body, (0, 0), inner)
    # glossy highlight
    gl = Image.new("L", (W, H), 0)
    ImageDraw.Draw(gl).ellipse([cx - s * 0.55, cy - s * 0.78, cx + s * 0.45, cy - s * 0.18], fill=110)
    gl = ImageChops.multiply(gl.filter(ImageFilter.GaussianBlur(6 * SS)), inner)
    out = Image.alpha_composite(out, Image.merge("RGBA", (Image.new("L", (W, H), 255),) * 3 + (gl,)))
    # symbol
    sy = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    symbol(ImageDraw.Draw(sy), 9 if wild else sym, cx, cy + 4 * SS, s * 0.36, (255, 255, 255, 235 if wild else 200))
    out = Image.alpha_composite(out, sy)
    return finish(out, (CW, CH))

for i, c in enumerate(COLORS):
    cell(c, i).save(f"{ART}/cell{i}.png", optimize=True)
cell("#FFC233", 0, wild=True).save(f"{ART}/cell_wild.png", optimize=True)

def bomb_overlay():
    W, H = CW * SS, CH * SS
    cx, cy = W / 2, H / 2 + 6 * SS
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    r = 42 * SS
    # milky royal jelly blob
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([cx - r, cy - r * 0.85 + 6 * SS, cx + r, cy + r * 0.95 + 6 * SS], fill=(90, 40, 0, 90))
    im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(5 * SS)))
    d = ImageDraw.Draw(im)
    d.ellipse([cx - r, cy - r * 0.85, cx + r, cy + r * 0.95], fill=rgba("#FFF8EC"), outline=rgba("#E8C98E"), width=3 * SS)
    d.ellipse([cx - r * 0.55, cy - r * 0.6, cx - r * 0.05, cy - r * 0.2], fill=(255, 255, 255, 255))
    # crown
    cw, ch = 46 * SS, 26 * SS
    top = cy - r * 0.85 - ch * 0.75
    pts = [(cx - cw / 2, top + ch), (cx - cw / 2, top + ch * 0.25), (cx - cw / 4, top + ch * 0.6), (cx, top), (cx + cw / 4, top + ch * 0.6), (cx + cw / 2, top + ch * 0.25), (cx + cw / 2, top + ch)]
    d.polygon(pts, fill=rgba("#FFB300"), outline=rgba("#C77800"))
    for x in (cx - cw / 2, cx, cx + cw / 2):
        y = top + (0 if x == cx else ch * 0.25)
        d.ellipse([x - 4 * SS, y - 4 * SS, x + 4 * SS, y + 4 * SS], fill=rgba("#FF6FA3"))
    return finish(im, (CW, CH))
bomb_overlay().save(f"{ART}/bomb.png", optimize=True)

def ring():
    W, H = CW * SS, CH * SS
    cx, cy = W / 2, H / 2
    # thin bright outline sitting on the cell rim (selection)
    m = rounded_mask((W, H), hex_pts(cx, cy, CELL_S * SS * 0.95), 10 * SS)
    m2 = rounded_mask((W, H), hex_pts(cx, cy, CELL_S * SS * 0.85), 9 * SS)
    a = ImageChops.subtract(m, m2).point(lambda v: int(v * 0.95))
    im = Image.merge("RGBA", (Image.new("L", (W, H), 255),) * 3 + (a,))
    return finish(im, (CW, CH))
ring().save(f"{ART}/ring.png", optimize=True)

# ---------------- hive combs (flat-top) ----------------
def comb(kind):
    W, H = CW * SS, CH * SS
    s = CELL_S * SS
    cx, cy = W / 2, H / 2
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if kind == "honey":
        outer = rounded_mask((W, H), hex_pts(cx, cy, s * 0.97), 6 * SS)
        im.paste(vgrad((W, H), rgba("#E2A23B"), rgba("#A9661A")), (0, 0), outer)  # wax rim
        inner = rounded_mask((W, H), hex_pts(cx, cy + 2 * SS, s * 0.80), 6 * SS)
        im.paste(vgrad((W, H), rgba("#FFD15C"), rgba("#F08A00"), rgba("#FFB524")), (0, 0), inner)
        # honey drips from the top edge
        dr = Image.new("L", (W, H), 0)
        dd = ImageDraw.Draw(dr)
        for x, l in ((-0.35, 0.28), (0.05, 0.42), (0.38, 0.22)):
            px = cx + x * s
            dd.rounded_rectangle([px - 9 * SS, cy - s * 0.72, px + 9 * SS, cy - s * 0.72 + l * s], radius=9 * SS, fill=255)
        dr = ImageChops.multiply(dr, inner)
        im = Image.alpha_composite(im, Image.merge("RGBA", (Image.new("L", (W, H), 255), Image.new("L", (W, H), 225), Image.new("L", (W, H), 140), dr.point(lambda v: v * 0.55))))
        gl = Image.new("L", (W, H), 0)
        ImageDraw.Draw(gl).ellipse([cx - s * 0.5, cy - s * 0.6, cx + s * 0.1, cy - s * 0.25], fill=140)
        gl = ImageChops.multiply(gl.filter(ImageFilter.GaussianBlur(5 * SS)), inner)
        im = Image.alpha_composite(im, Image.merge("RGBA", (Image.new("L", (W, H), 255),) * 3 + (gl,)))
    else:
        outer = rounded_mask((W, H), hex_pts(cx, cy, s * 0.95), 6 * SS)
        inner = rounded_mask((W, H), hex_pts(cx, cy, s * 0.95 - 5 * SS), 6 * SS)
        col = rgba("#E9C98F") if kind == "empty" else rgba("#F1E2C4")
        fill = (255, 240, 205, 150) if kind == "empty" else (255, 245, 225, 90)
        im.paste(Image.new("RGBA", (W, H), fill), (0, 0), inner)
        ring_ = ImageChops.subtract(outer, inner)
        im.paste(Image.new("RGBA", (W, H), col), (0, 0), ring_)
        if kind == "empty":
            d = ImageDraw.Draw(im)
            L, T = 16 * SS, 5 * SS
            d.rounded_rectangle([cx - L, cy - T, cx + L, cy + T], radius=T, fill=rgba("#D9A85A"))
            d.rounded_rectangle([cx - T, cy - L, cx + T, cy + L], radius=T, fill=rgba("#D9A85A"))
    return finish(im, (CW, CH))
comb("honey").save(f"{ART}/comb.png", optimize=True)
comb("empty").save(f"{ART}/comb_empty.png", optimize=True)
comb("locked").save(f"{ART}/comb_locked.png", optimize=True)

# ---------------- bees ----------------
BEE_SPECS = {
    "zhuzha": dict(body="#FFC93C", stripe="#4A2C12"),
    "pushinka": dict(body="#FFEBB0", stripe="#C98B4B", fuzz=True),
    "boris": dict(body="#FFB13B", stripe="#3A2414", fuzz=True, wide=True, tail="#FFFFFF"),
    "solnyshko": dict(body="#FFD54A", stripe="#FF8A00", flower=("#FFC233", "#7A4A12", 12)),
    "klevera": dict(body="#FFB8D2", stripe="#C2185B", flower=("#FF6FA3", "#FFE4EE", 6)),
    "lavanda": dict(body="#D2BEFF", stripe="#6A3FC4", flower=("#9B74F2", "#F3EDFF", 5)),
    "vasilek": dict(body="#AED8FF", stripe="#1E5AA8", flower=("#3F7BFF", "#1B2E6B", 8)),
    "myatka": dict(body="#BDF2CC", stripe="#23935B", leaf=True),
    "iskorka": dict(body="#FFE066", stripe="#D99400", sparkle=True),
    "sonya": dict(body="#A9BCEB", stripe="#2E3A6B", sleepy=True, cap="#4C5FA8"),
    "zorkaya": dict(body="#F2C27B", stripe="#6B4423", goggles=True),
    "margo": dict(body="#FFD36B", stripe="#7A2E8E", crown=True),
}

def star_poly(cx, cy, r1, r2, n=5, rot=-90):
    return [(cx + math.cos(math.radians(rot + 180 / n * i)) * (r1 if i % 2 == 0 else r2), cy + math.sin(math.radians(rot + 180 / n * i)) * (r1 if i % 2 == 0 else r2)) for i in range(2 * n)]

def bee(spec, size=256, silhouette=None, wings=True, eyes=True):
    S = size * SS
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx, cy = S / 2, S * 0.56
    bw = S * (0.36 if spec.get("wide") else 0.31)
    bh = S * 0.34
    body, stripe = rgba(spec["body"]), rgba(spec["stripe"])
    outline = darken(stripe, 0.25)
    lw = int(S * 0.018)
    wings_on = wings
    # wings (behind)
    wings = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wings)
    for sx in (-1, 1):
        wx, wy = cx + sx * bw * 0.95, cy - bh * 0.75
        wl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(wl).ellipse([wx - S * 0.16, wy - S * 0.12, wx + S * 0.16, wy + S * 0.12], fill=(235, 248, 255, 215), outline=(150, 200, 235, 255), width=lw)
        wl = wl.rotate(-sx * 25, center=(wx, wy), resample=Image.BICUBIC)
        wings = Image.alpha_composite(wings, wl)
    if wings_on:
        im = Image.alpha_composite(im, wings)
    d = ImageDraw.Draw(im)
    # antennae
    for sx in (-1, 1):
        x0, y0 = cx + sx * bw * 0.35, cy - bh * 0.9
        x1, y1 = cx + sx * bw * 0.7, cy - bh * 1.35
        d.line([(x0, y0), ((x0 + x1) / 2 + sx * S * 0.02, (y0 + y1) / 2 - S * 0.03), (x1, y1)], fill=outline, width=lw, joint="curve")
        d.ellipse([x1 - S * 0.03, y1 - S * 0.03, x1 + S * 0.03, y1 + S * 0.03], fill=outline)
    # stinger
    d.polygon([(cx - S * 0.03, cy + bh * 0.95), (cx + S * 0.03, cy + bh * 0.95), (cx, cy + bh * 1.12)], fill=outline)
    # body
    bm = Image.new("L", (S, S), 0)
    ImageDraw.Draw(bm).ellipse([cx - bw, cy - bh, cx + bw, cy + bh], fill=255)
    bodyimg = vgrad((S, S), lighten(body, 0.25), darken(body, 0.08))
    sd = ImageDraw.Draw(bodyimg)
    for k, y in enumerate((0.28, 0.62)):
        yy = cy + bh * y
        sd.rectangle([0, yy - bh * 0.13, S, yy + bh * 0.13], fill=stripe)
    if spec.get("tail"):
        sd.rectangle([0, cy + bh * 0.85, S, S], fill=rgba(spec["tail"]))
    im.paste(bodyimg, (0, 0), bm)
    d = ImageDraw.Draw(im)
    d.ellipse([cx - bw, cy - bh, cx + bw, cy + bh], outline=outline, width=lw)
    if spec.get("fuzz"):
        for i in range(26):
            a = math.radians(i * 360 / 26)
            x, y = cx + math.cos(a) * bw, cy + math.sin(a) * bh
            r = S * 0.022
            d.ellipse([x - r, y - r, x + r, y + r], fill=lighten(body, 0.4), outline=outline, width=max(1, lw // 2))
    # body shine
    sh = Image.new("L", (S, S), 0)
    ImageDraw.Draw(sh).ellipse([cx - bw * 0.7, cy - bh * 0.85, cx - bw * 0.1, cy - bh * 0.45], fill=120)
    sh = ImageChops.multiply(sh.filter(ImageFilter.GaussianBlur(S * 0.02)), bm)
    im = Image.alpha_composite(im, Image.merge("RGBA", (Image.new("L", (S, S), 255),) * 3 + (sh,)))
    d = ImageDraw.Draw(im)
    # face
    ey = cy - bh * 0.32
    ex = bw * 0.38
    er = S * 0.055
    if spec.get("sleepy"):
        for sx in (-1, 1):
            x = cx + sx * ex
            d.arc([x - er, ey - er * 0.6, x + er, ey + er * 0.9], 200, 340, fill=outline, width=lw)
    elif eyes:
        for sx in (-1, 1):
            x = cx + sx * ex
            d.ellipse([x - er, ey - er * 1.1, x + er, ey + er * 1.1], fill=(40, 24, 10, 255))
            d.ellipse([x - er * 0.55, ey - er * 0.8, x - er * 0.05, ey - er * 0.3], fill=(255, 255, 255, 255))
            d.ellipse([x + er * 0.2, ey + er * 0.2, x + er * 0.45, ey + er * 0.45], fill=(255, 255, 255, 200))
    # cheeks
    for sx in (-1, 1):
        x = cx + sx * ex * 1.55
        d.ellipse([x - er * 0.75, ey + er * 0.9, x + er * 0.75, ey + er * 1.55], fill=(255, 120, 140, 150))
    # smile
    d.arc([cx - er * 0.9, ey + er * 0.2, cx + er * 0.9, ey + er * 1.6], 20, 160, fill=outline, width=lw)
    if spec.get("goggles"):
        gy = cy - bh * 0.8
        for sx in (-1, 1):
            x = cx + sx * ex * 0.95
            d.ellipse([x - er * 1.15, gy - er * 1.0, x + er * 1.15, gy + er * 1.0], fill=rgba("#9AD8FF"), outline=rgba("#6B4423"), width=lw)
            d.ellipse([x - er * 0.6, gy - er * 0.55, x - er * 0.1, gy - er * 0.1], fill=(255, 255, 255, 230))
        d.line([(cx - bw * 0.95, gy), (cx - ex * 0.95 - er * 1.15, gy)], fill=rgba("#6B4423"), width=lw)
        d.line([(cx + ex * 0.95 + er * 1.15, gy), (cx + bw * 0.95, gy)], fill=rgba("#6B4423"), width=lw)
    if spec.get("crown"):
        cw, ch = bw * 1.0, S * 0.11
        top = cy - bh - ch * 0.55
        pts = [(cx - cw / 2, top + ch), (cx - cw / 2, top + ch * 0.2), (cx - cw / 4, top + ch * 0.55), (cx, top - ch * 0.1), (cx + cw / 4, top + ch * 0.55), (cx + cw / 2, top + ch * 0.2), (cx + cw / 2, top + ch)]
        d.polygon(pts, fill=rgba("#FFB300"), outline=rgba("#B86E00"), width=lw)
        for x, y in ((cx - cw / 2, top + ch * 0.2), (cx, top - ch * 0.1), (cx + cw / 2, top + ch * 0.2)):
            d.ellipse([x - S * 0.018, y - S * 0.018, x + S * 0.018, y + S * 0.018], fill=rgba("#FF6FA3"))
    if spec.get("cap"):
        capc = rgba(spec["cap"])
        d.polygon([(cx - bw * 0.85, cy - bh * 0.7), (cx + bw * 0.6, cy - bh * 0.95), (cx + bw * 1.25, cy - bh * 0.25)], fill=capc, outline=darken(capc, 0.3))
        d.ellipse([cx + bw * 1.15, cy - bh * 0.32, cx + bw * 1.35, cy - bh * 0.12], fill=(255, 255, 255, 255))
        d.rounded_rectangle([cx - bw * 0.9, cy - bh * 0.78, cx + bw * 0.7, cy - bh * 0.62], radius=S * 0.02, fill=(255, 255, 255, 255))
        # Zzz
        for i, (zx, zy, zs) in enumerate(((0.78, 0.2, 0.05), (0.88, 0.1, 0.035))):
            x, y, z = S * zx, S * zy, S * zs
            d.line([(x, y), (x + z, y), (x, y + z), (x + z, y + z)], fill=rgba("#4C5FA8"), width=lw)
    if spec.get("flower"):
        petal, centre, n = spec["flower"]
        fx, fy, fr = cx + bw * 0.55, cy - bh * 0.88, S * 0.07
        for i in range(n):
            a = math.radians(360 / n * i)
            px, py = fx + math.cos(a) * fr * 0.85, fy + math.sin(a) * fr * 0.85
            pr = fr * (0.55 if n <= 6 else 0.42)
            d.ellipse([px - pr, py - pr, px + pr, py + pr], fill=rgba(petal), outline=darken(rgba(petal), 0.2), width=max(1, lw // 2))
        d.ellipse([fx - fr * 0.45, fy - fr * 0.45, fx + fr * 0.45, fy + fr * 0.45], fill=rgba(centre))
    if spec.get("leaf"):
        lx, ly = cx + bw * 0.45, cy - bh * 1.0
        leaf = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(leaf).ellipse([lx - S * 0.045, ly - S * 0.09, lx + S * 0.045, ly + S * 0.09], fill=rgba("#2FB36A"), outline=rgba("#1E7A47"), width=lw // 2)
        leaf = leaf.rotate(-35, center=(lx, ly), resample=Image.BICUBIC)
        im = Image.alpha_composite(im, leaf)
        d = ImageDraw.Draw(im)
    if spec.get("sparkle"):
        for (sx, sy, r) in ((0.16, 0.22, 0.05), (0.84, 0.3, 0.04), (0.8, 0.82, 0.035), (0.2, 0.78, 0.03)):
            d.polygon(star_poly(S * sx, S * sy, S * r, S * r * 0.35, 4, -90), fill=rgba("#FFD54A"), outline=rgba("#E09A00"))
    out = im.resize((size, size), Image.LANCZOS)
    if silhouette:
        a = out.getchannel("A")
        out = Image.merge("RGBA", (Image.new("L", out.size, silhouette[0]), Image.new("L", out.size, silhouette[1]), Image.new("L", out.size, silhouette[2]), a))
    return out

for name, spec in BEE_SPECS.items():
    if LEGACY: bee(spec).save(f"{ART}/bee_{name}.png", optimize=True)
    # animation parts (v1.1): body without wings and (unless sleepy) without eyes
    if LEGACY: bee(spec, wings=False, eyes=False).save(f"{ART}/bee_{name}_body.png", optimize=True)

def bee_wing(scale=2):
    """one unrotated wing; RN places/rotates/flaps two copies (geometry mirrored in src/ui/BeeSprite.tsx)."""
    base = 256 * SS
    lw = int(base * 0.018)
    W, H = int(base * 0.32) + 2 * lw, int(base * 0.24) + 2 * lw
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse([lw, lw, W - lw, H - lw], fill=(235, 248, 255, 215), outline=(150, 200, 235, 255), width=lw)
    return im.resize((int(W / SS * scale), int(H / SS * scale)), Image.LANCZOS)

def bee_eye(scale=2):
    base = 256 * SS
    er = base * 0.055
    W, H = int(er * 2 + 4), int(er * 2.2 + 4)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    x, ey = W / 2, H / 2
    d.ellipse([x - er, ey - er * 1.1, x + er, ey + er * 1.1], fill=(40, 24, 10, 255))
    d.ellipse([x - er * 0.55, ey - er * 0.8, x - er * 0.05, ey - er * 0.3], fill=(255, 255, 255, 255))
    d.ellipse([x + er * 0.2, ey + er * 0.2, x + er * 0.45, ey + er * 0.45], fill=(255, 255, 255, 200))
    return im.resize((int(W / SS * scale), int(H / SS * scale)), Image.LANCZOS)

if LEGACY:
    bee_wing().save(f"{ART}/bee_wing.png", optimize=True)
    bee_eye().save(f"{ART}/bee_eye.png", optimize=True)

# ---------------- icons ----------------
def icon_canvas(n=128):
    S = n * SS
    return Image.new("RGBA", (S, S), (0, 0, 0, 0)), S

def honey_icon():
    im, S = icon_canvas()
    d = ImageDraw.Draw(im)
    cx = S / 2
    # pot
    d.rounded_rectangle([S * 0.18, S * 0.32, S * 0.82, S * 0.9], radius=S * 0.2, fill=rgba("#F29A00"), outline=rgba("#A85B00"), width=int(S * 0.035))
    d.rounded_rectangle([S * 0.24, S * 0.40, S * 0.76, S * 0.62], radius=S * 0.06, fill=rgba("#FFE3A1"))
    d.rounded_rectangle([S * 0.26, S * 0.18, S * 0.74, S * 0.34], radius=S * 0.06, fill=rgba("#C9781A"), outline=rgba("#8A4E0C"), width=int(S * 0.03))
    d.rounded_rectangle([S * 0.3, S * 0.3, S * 0.48, S * 0.5], radius=S * 0.08, fill=rgba("#FFB524"))
    d.ellipse([S * 0.27, S * 0.66, S * 0.37, S * 0.78], fill=(255, 255, 255, 120))
    return finish(im, (96, 96))

def jelly_icon():
    im, S = icon_canvas()
    d = ImageDraw.Draw(im)
    cx, cy = S / 2, S * 0.6
    r = S * 0.3
    m = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(m)
    md.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    md.polygon([(cx - r * 0.86, cy - r * 0.5), (cx + r * 0.86, cy - r * 0.5), (cx, cy - r * 2.0)], fill=255)
    g = vgrad((S, S), rgba("#FFFFFF"), rgba("#D7B8FF"), rgba("#F6EBFF"))
    im.paste(g, (0, 0), m)
    edge = ImageChops.subtract(m, m.filter(ImageFilter.MinFilter(int(S * 0.035) | 1)))
    im.paste(Image.new("RGBA", (S, S), rgba("#9D6BE0")), (0, 0), edge)
    d = ImageDraw.Draw(im)
    d.ellipse([cx - r * 0.55, cy - r * 0.55, cx - r * 0.1, cy - r * 0.05], fill=(255, 255, 255, 255))
    return finish(im, (96, 96))

def star_icon(on=True):
    im, S = icon_canvas()
    d = ImageDraw.Draw(im)
    pts = star_poly(S / 2, S * 0.53, S * 0.46, S * 0.22)
    if on:
        d.polygon(pts, fill=rgba("#FFC233"), outline=rgba("#D98A00"), width=int(S * 0.04))
        d.polygon(star_poly(S * 0.42, S * 0.42, S * 0.12, S * 0.05), fill=(255, 255, 255, 200))
    else:
        d.polygon(pts, fill=rgba("#EADBC0"), outline=rgba("#D2BC94"), width=int(S * 0.04))
    return finish(im, (96, 96))

def flame_icon():
    im, S = icon_canvas()
    d = ImageDraw.Draw(im)
    cx = S / 2
    def flame(scale, col):
        r = S * 0.3 * scale
        cy = S * 0.66 + (1 - scale) * S * 0.1
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
        d.polygon([(cx - r * 0.95, cy - r * 0.3), (cx + r * 0.95, cy - r * 0.3), (cx + r * 0.2, cy - r * 2.2)], fill=col)
    flame(1.0, rgba("#FF6A1F")); flame(0.62, rgba("#FFB524")); flame(0.3, rgba("#FFF1B8"))
    return finish(im, (96, 96))

def chest_icon(open_=False):
    im, S = icon_canvas()
    d = ImageDraw.Draw(im)
    w = int(S * 0.035)
    d.rounded_rectangle([S * 0.12, S * 0.45, S * 0.88, S * 0.88], radius=S * 0.06, fill=rgba("#C27A3A"), outline=rgba("#6E3D14"), width=w)
    d.rounded_rectangle([S * 0.12, S * 0.22, S * 0.88, S * 0.5], radius=S * 0.12, fill=rgba("#D98E4A"), outline=rgba("#6E3D14"), width=w)
    for x in (0.3, 0.7):
        d.rectangle([S * (x - 0.04), S * 0.22, S * (x + 0.04), S * 0.88], fill=rgba("#FFC233"))
    d.rounded_rectangle([S * 0.43, S * 0.42, S * 0.57, S * 0.6], radius=S * 0.03, fill=rgba("#FFD54A"), outline=rgba("#A86A00"), width=w // 2)
    return finish(im, (96, 96))

def check_icon():
    im, S = icon_canvas()
    d = ImageDraw.Draw(im)
    d.ellipse([S * 0.06, S * 0.06, S * 0.94, S * 0.94], fill=rgba("#3DBE6A"))
    d.line([(S * 0.28, S * 0.52), (S * 0.44, S * 0.68), (S * 0.73, S * 0.36)], fill=(255, 255, 255, 255), width=int(S * 0.1), joint="curve")
    return finish(im, (96, 96))

def mono(draw_fn):
    im, S = icon_canvas()
    draw_fn(ImageDraw.Draw(im), S)
    return finish(im, (96, 96))

def tab_hive(d, S):
    s = S * 0.17
    for (q, r) in ((0, 0), (1, 0), (-1, 0), (0.5, -0.87 * 1.0), (-0.5, -0.87), (0.5, 0.87), (-0.5, 0.87)):
        pass
    for (x, y) in ((0, 0), (1.5, -0.866), (1.5, 0.866), (-1.5, -0.866), (-1.5, 0.866), (0, -1.732), (0, 1.732)):
        d.polygon(hex_pts(S / 2 + x * s, S / 2 + y * s, s * 0.9), fill=(255, 255, 255, 255))
def tab_puzzle(d, S):
    s = S * 0.2
    pts = [(-1.5, 0.866), (0, 0), (1.5, -0.866)]
    for (x, y) in pts:
        d.polygon(hex_pts(S / 2 + x * s * 0.95, S / 2 + y * s * 0.95, s * 0.86), outline=(255, 255, 255, 255), width=int(S * 0.06))
    d.line([(S / 2 + x * s * 0.95, S / 2 + y * s * 0.95) for x, y in pts], fill=(255, 255, 255, 255), width=int(S * 0.09), joint="curve")
    for x, y in pts:
        X, Y = S / 2 + x * s * 0.95, S / 2 + y * s * 0.95
        d.ellipse([X - S * 0.07, Y - S * 0.07, X + S * 0.07, Y + S * 0.07], fill=(255, 255, 255, 255))
def tab_bee(d, S):
    W = (255, 255, 255, 255)
    for sx in (-1, 1):
        d.ellipse([S / 2 + sx * S * 0.2 - S * 0.17, S * 0.12, S / 2 + sx * S * 0.2 + S * 0.17, S * 0.44], outline=W, width=int(S * 0.06))
    d.ellipse([S * 0.27, S * 0.3, S * 0.73, S * 0.9], fill=W)
    for y in (0.6, 0.75):
        d.rectangle([0, S * y - S * 0.035, S, S * y + S * 0.035], fill=(0, 0, 0, 0))
def tab_tasks(d, S):
    W = (255, 255, 255, 255)
    d.rounded_rectangle([S * 0.18, S * 0.14, S * 0.82, S * 0.9], radius=S * 0.1, outline=W, width=int(S * 0.07))
    d.rounded_rectangle([S * 0.36, S * 0.07, S * 0.64, S * 0.2], radius=S * 0.05, fill=W)
    for i, y in enumerate((0.38, 0.55, 0.72)):
        d.line([(S * 0.3, S * y), (S * 0.38, S * (y + 0.06)), (S * 0.48, S * (y - 0.05))], fill=W, width=int(S * 0.06), joint="curve")
        d.line([(S * 0.55, S * y), (S * 0.7, S * y)], fill=W, width=int(S * 0.06))
def gear(d, S):
    W = (255, 255, 255, 255)
    cx = cy = S / 2
    for i in range(8):
        a = math.radians(45 * i)
        x, y = cx + math.cos(a) * S * 0.33, cy + math.sin(a) * S * 0.33
        d.ellipse([x - S * 0.09, y - S * 0.09, x + S * 0.09, y + S * 0.09], fill=W)
    d.ellipse([cx - S * 0.3, cy - S * 0.3, cx + S * 0.3, cy + S * 0.3], fill=W)
    d.ellipse([cx - S * 0.12, cy - S * 0.12, cx + S * 0.12, cy + S * 0.12], fill=(0, 0, 0, 0))
def lock(d, S):
    W = (255, 255, 255, 255)
    d.arc([S * 0.3, S * 0.12, S * 0.7, S * 0.56], 180, 360, fill=W, width=int(S * 0.08))
    d.line([(S * 0.3, S * 0.34), (S * 0.3, S * 0.46)], fill=W, width=int(S * 0.08))
    d.line([(S * 0.7, S * 0.34), (S * 0.7, S * 0.46)], fill=W, width=int(S * 0.08))
    d.rounded_rectangle([S * 0.2, S * 0.44, S * 0.8, S * 0.9], radius=S * 0.08, fill=W)
def close(d, S):
    W = (255, 255, 255, 255)
    d.line([(S * 0.25, S * 0.25), (S * 0.75, S * 0.75)], fill=W, width=int(S * 0.11))
    d.line([(S * 0.75, S * 0.25), (S * 0.25, S * 0.75)], fill=W, width=int(S * 0.11))
def clock(d, S):
    W = (255, 255, 255, 255)
    d.ellipse([S * 0.1, S * 0.1, S * 0.9, S * 0.9], outline=W, width=int(S * 0.08))
    d.line([(S / 2, S / 2), (S / 2, S * 0.28)], fill=W, width=int(S * 0.08))
    d.line([(S / 2, S / 2), (S * 0.66, S * 0.6)], fill=W, width=int(S * 0.08))

honey_icon().save(f"{ART}/honey.png", optimize=True)
jelly_icon().save(f"{ART}/jelly.png", optimize=True)
star_icon(True).save(f"{ART}/star.png", optimize=True)
star_icon(False).save(f"{ART}/star_off.png", optimize=True)
flame_icon().save(f"{ART}/flame.png", optimize=True)
chest_icon().save(f"{ART}/chest.png", optimize=True)
check_icon().save(f"{ART}/check.png", optimize=True)
for name, fn in (("tab_hive", tab_hive), ("tab_puzzle", tab_puzzle), ("tab_bee", tab_bee), ("tab_tasks", tab_tasks), ("gear", gear), ("lock", lock), ("close", close), ("clock", clock)):
    mono(fn).save(f"{ART}/{name}.png", optimize=True)

# honey drop particle
im, S = icon_canvas(64)
d = ImageDraw.Draw(im)
cx, cy, r = S / 2, S * 0.62, S * 0.3
d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rgba("#FFB300"))
d.polygon([(cx - r * 0.86, cy - r * 0.5), (cx + r * 0.86, cy - r * 0.5), (cx, cy - r * 2.0)], fill=rgba("#FFB300"))
d.ellipse([cx - r * 0.5, cy - r * 0.5, cx - r * 0.05, cy - r * 0.05], fill=(255, 255, 255, 200))
finish(im, (48, 48)).save(f"{ART}/drop.png", optimize=True)

# background tile: faint honeycomb outline, seamless (s chosen so √3·s ≈ integer)
s = 30
TW, TH = int(3 * s), int(round(math.sqrt(3) * s))
im = Image.new("RGBA", (TW * SS, TH * SS), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
for (x, y) in ((0, 0), (TW, 0), (0, TH), (TW, TH), (TW / 2, TH / 2)):
    d.polygon(hex_pts(x * SS, y * SS, s * SS * 0.92), outline=(201, 140, 60, 26), width=2 * SS)
finish(im, (TW, TH)).save(f"{ART}/bg_tile.png", optimize=True)

# ---------------- app icon / splash ----------------
I = 1024
def icon_bg():
    bg = Image.new("RGBA", (I, I))
    d = ImageDraw.Draw(bg)
    for y in range(I):
        t = y / I
        d.line([(0, y), (I, y)], fill=mix(rgba("#FFD24D"), rgba("#FF9A1F"), t))
    # honeycomb pattern
    s = 120
    for col in range(-1, 8):
        for row in range(-1, 8):
            x = col * 1.5 * s
            y = row * math.sqrt(3) * s + (math.sqrt(3) * s / 2 if col % 2 else 0)
            d.polygon(hex_pts(x, y, s * 0.94), outline=(255, 255, 255, 60), width=10)
    return bg
bg = icon_bg()
icon = bg.copy()
b = bee(BEE_SPECS["zhuzha"], 760)
icon.alpha_composite(b, ((I - 760) // 2, (I - 760) // 2 + 10))
if LEGACY: icon.convert("RGB").save("assets/icon.png")
bg.convert("RGB").save("assets/android-icon-background.png")
fg = Image.new("RGBA", (I, I), (0, 0, 0, 0))
b2 = bee(BEE_SPECS["zhuzha"], 560)
fg.alpha_composite(b2, ((I - 560) // 2, (I - 560) // 2 + 10))
if LEGACY: fg.save("assets/android-icon-foreground.png")
monob = bee(BEE_SPECS["zhuzha"], 560, silhouette=(255, 255, 255))
mono_ = Image.new("RGBA", (I, I), (0, 0, 0, 0)); mono_.alpha_composite(monob, ((I - 560) // 2, (I - 560) // 2 + 10))
if LEGACY: mono_.save("assets/android-icon-monochrome.png")
def splash():
    """Zhuzha + "Buzzle" wordmark, kept inside the central circle Android 12+ shows on the splash screen."""
    S = 512
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    bb = bee(BEE_SPECS["zhuzha"], 250)
    im.alpha_composite(bb, ((S - 250) // 2, 96))
    font = ImageFont.truetype("assets/fonts/Nunito-Black.ttf", 76)
    text = "Buzzle"
    d = ImageDraw.Draw(im)
    l, t, r, b = d.textbbox((0, 0), text, font=font)
    x, y = (S - (r - l)) // 2 - l, 318 - t
    # soft shadow, honey outline, brown fill
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((x, y + 5), text, font=font, fill=(150, 80, 0, 110), stroke_width=7, stroke_fill=(150, 80, 0, 110))
    im = Image.alpha_composite(sh.filter(ImageFilter.GaussianBlur(3)), im)
    d = ImageDraw.Draw(im)
    d.text((x, y), text, font=font, fill=(110, 58, 12, 255), stroke_width=7, stroke_fill=(255, 201, 74, 255))
    return im
if LEGACY: splash().save("assets/splash-icon.png")
if LEGACY: icon.resize((48, 48), Image.LANCZOS).convert("RGB").save("assets/favicon.png")
nb = bee(BEE_SPECS["zhuzha"], 96, silhouette=(255, 255, 255))
if LEGACY: nb.save("assets/notification-icon.png")
print("art ok")
