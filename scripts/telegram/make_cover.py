"""Telegram Mini App cover (1280x720 master + 640x360) and a 512 bot avatar.

Bees come from the low-poly Blender pipeline (scripts/bees3d/render_lowpoly.py with job "flap" for a
mid-flap pose and full + wingL/wingR passes); see design/telegram-cover-jobs.json.
    python3 scripts/telegram/make_cover.py /tmp/cover/r
Everything is drawn at 2x and downsampled; shadows are built from blurred alpha on full-size padded
layers (no rectangular edges).
"""
import math, os, random, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

R = sys.argv[1] if len(sys.argv) > 1 else "/tmp/cover/r"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART, FONTS, OUT = f"{ROOT}/assets/art", f"{ROOT}/assets/fonts", f"{ROOT}/design"
K = 2                       # supersampling
W, H = 1280 * K, 720 * K
BROWN, BROWN2 = (74, 44, 18), (122, 74, 30)

def font(w, px): return ImageFont.truetype(f"{FONTS}/Nunito-{w}.ttf", px)

def bee(tag):
    """Full render with the wings rebuilt as bright glass: Cycles' transmissive wings come out as ~11%
    grey on a transparent film, which looks dirty on warm backgrounds. Mask from the wing passes ->
    pale blue-white fill + darker rim + the render's own highlights, under the full render."""
    full = Image.open(f"{R}/{tag}_full.png").convert("RGBA")
    wings = Image.new("RGBA", full.size, (0, 0, 0, 0))
    for s_ in ("wingL", "wingR"):
        p = f"{R}/{tag}_{s_}.png"
        if os.path.exists(p): wings = Image.alpha_composite(wings, Image.open(p).convert("RGBA"))
    a = wings.getchannel("A")
    mask = a.point(lambda v: 255 if v > 3 else 0).filter(ImageFilter.GaussianBlur(1.2))
    e = max(2, full.width // 260)
    rim = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(2 * e + 1))).filter(ImageFilter.GaussianBlur(0.8))
    lum = wings.convert("L")
    hl = ImageChops.multiply(lum.point(lambda v: max(0, (v - 150) * 3)), mask)        # glossy streaks
    fill = Image.new("RGBA", full.size, (238, 247, 255, 0)); fill.putalpha(mask.point(lambda v: int(v * 0.62)))
    edge = Image.new("RGBA", full.size, (130, 178, 225, 0)); edge.putalpha(rim.point(lambda v: int(v * 0.9)))
    shine = Image.new("RGBA", full.size, (255, 255, 255, 0)); shine.putalpha(hl.point(lambda v: int(v * 0.8)))
    glass = Image.alpha_composite(Image.alpha_composite(fill, edge), shine)
    out = Image.alpha_composite(glass, full)
    return out.crop(out.getbbox())

def fit_h(im, h):
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)

def shadow_layer(size, sprite, pos, offset, blur, alpha, color=(120, 62, 0)):
    """Soft drop shadow from the sprite's alpha, on a full-size layer (no clipping rectangles)."""
    m = Image.new("L", size, 0)
    m.paste(sprite.getchannel("A"), (pos[0] + offset[0], pos[1] + offset[1]))
    m = m.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * alpha))
    lay = Image.new("RGBA", size, (*color, 0)); lay.putalpha(m)
    return lay

def place(canvas, sprite, center, shadow=(20, 34, 26, 0.33)):
    x, y = round(center[0] - sprite.width / 2), round(center[1] - sprite.height / 2)
    if shadow:
        ox, oy, bl, al = shadow
        canvas.alpha_composite(shadow_layer(canvas.size, sprite, (x, y), (ox * K, oy * K), bl * K, al))
    canvas.alpha_composite(sprite, (x, y))

def gradient_bg(w, h, c_in, c_out, center, radius):
    g = Image.radial_gradient("L").resize((w * 2, h * 2), Image.BILINEAR)  # 0 centre -> 255 edge
    cx, cy = center
    g = g.crop((round(w - cx), round(h - cy), round(w - cx) + w, round(h - cy) + h))
    g = g.point(lambda v: min(255, int(v * 255 / (255 * radius))))
    a = Image.new("RGB", (w, h), c_in); b = Image.new("RGB", (w, h), c_out)
    return Image.composite(b, a, g).convert("RGBA")

def hex_pts(cx, cy, r, flat=True, rot=0):
    o = 0 if flat else 30
    return [(cx + r * math.cos(math.radians(60 * i + o + rot)), cy + r * math.sin(math.radians(60 * i + o + rot))) for i in range(6)]

def faint_hexes(canvas, area, r, color, width):
    lay = Image.new("RGBA", canvas.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    x0, y0, x1, y1 = area
    dx, dy = 1.5 * r, math.sqrt(3) * r
    c = 0
    x = x0
    while x < x1 + r:
        y = y0 + (dy / 2 if c % 2 else 0)
        while y < y1 + r:
            d.polygon(hex_pts(x, y, r * 0.94), outline=color, width=width)
            y += dy
        x += dx; c += 1
    return lay

def sparkle(d, x, y, s, col=(255, 255, 240, 255)):
    pts = []
    for i in range(8):
        rr = s if i % 2 == 0 else s * 0.22
        a = math.radians(45 * i - 90)
        pts.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    d.polygon(pts, fill=col)

def sparkles(size, spots):
    glow = Image.new("RGBA", size, (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    top = Image.new("RGBA", size, (0, 0, 0, 0)); td = ImageDraw.Draw(top)
    for x, y, s in spots:
        gd.ellipse([x - s * 1.1, y - s * 1.1, x + s * 1.1, y + s * 1.1], fill=(255, 245, 200, 150))
        sparkle(td, x, y, s)
    glow = glow.filter(ImageFilter.GaussianBlur(10 * K))
    return Image.alpha_composite(glow, top)

def honey_drips(size, x0, x1, top, band, drips, seed=3):
    """Glossy honey band along the top edge with hanging drips."""
    w, h = size
    m = Image.new("L", size, 0); d = ImageDraw.Draw(m)
    rnd = random.Random(seed)
    # wavy lower edge of the band
    pts = [(x0, top - 10)]
    n = 40
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        y = top + band + math.sin(i * 0.9 + 1.3) * band * 0.18 + math.sin(i * 0.37) * band * 0.12
        pts.append((x, y))
    pts.append((x1, top - 10))
    d.polygon(pts, fill=255)
    for (fx, ln, wd) in drips:
        x = x0 + (x1 - x0) * fx
        d.rounded_rectangle([x - wd / 2, top + band * 0.5, x + wd / 2, top + band + ln], radius=wd / 2, fill=255)
        r = wd * 0.78
        d.ellipse([x - r, top + band + ln - r * 1.1, x + r, top + band + ln + r * 0.9], fill=255)
        # little fillets where the drip leaves the band
        d.ellipse([x - wd * 1.1, top + band * 0.55, x + wd * 1.1, top + band * 1.25], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1.2 * K))
    # amber vertical gradient
    grad = Image.linear_gradient("L").resize((1, h)).resize(size)
    honey = Image.composite(Image.new("RGBA", size, (232, 132, 10, 255)), Image.new("RGBA", size, (252, 196, 58, 255)),
                            grad.point(lambda v: min(255, int(v * 2.4))))
    honey.putalpha(m)
    # inner shade + gloss highlights
    inner = m.filter(ImageFilter.GaussianBlur(9 * K))
    shade = ImageChops.subtract(m, inner).point(lambda v: int(v * 0.55))
    sh = Image.new("RGBA", size, (176, 82, 0, 0)); sh.putalpha(shade)
    gl = Image.new("L", size, 0); gd = ImageDraw.Draw(gl)
    for (fx, ln, wd) in drips:
        x = x0 + (x1 - x0) * fx
        gd.rounded_rectangle([x - wd * 0.28, top + band + 4 * K, x - wd * 0.08, top + band + ln - wd * 0.2], radius=wd * 0.12, fill=200)
        r = wd * 0.22
        gd.ellipse([x - wd * 0.45 - r, top + band + ln - r - wd * 0.15, x - wd * 0.45 + r, top + band + ln + r - wd * 0.15], fill=230)
    gd.line([(x0 + 20 * K, top + band * 0.45), (x1 - 20 * K, top + band * 0.45)], fill=120, width=int(5 * K))
    gl = ImageChops.multiply(gl.filter(ImageFilter.GaussianBlur(2 * K)), m)
    hi = Image.new("RGBA", size, (255, 248, 220, 0)); hi.putalpha(gl)
    out = Image.alpha_composite(honey, sh)
    out = Image.alpha_composite(out, hi)
    shadow = Image.new("RGBA", size, (140, 70, 0, 0)); shadow.putalpha(m.filter(ImageFilter.GaussianBlur(10 * K)).point(lambda v: int(v * 0.35)))
    return shadow, out

def cell_sprite(i, width):
    im = Image.open(f"{ART}/{'cell_wild' if i == 5 else 'cell%d' % i}.png").convert("RGBA")
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)

# ---------------------------------------------------------------- cover
def cover():
    bg = gradient_bg(W, H, (255, 232, 168), (244, 166, 42), (W * 0.30, H * 0.42), 1.05)
    bg.alpha_composite(faint_hexes(bg, (W * 0.50, -60 * K, W, H), 74 * K, (255, 236, 190, 70), 3 * K))
    c = bg
    # honey cell cluster (flat-top honeycomb) on the right
    cw = 168 * K
    ch = round(cw * 173 / 200)
    dx, dy = cw * 0.76, ch * 1.02
    ox, oy = W * 0.555, H * 0.07
    layout = {  # (col,row): colour
        (1, 1): 1, (1, 2): 0, (1, 3): 3,
        (2, 0): 2, (2, 1): 0, (2, 2): 4, (2, 3): 1,
        (3, 0): 3, (3, 1): 5, (3, 2): 2, (3, 3): 0, (3, 4): 4,
        (4, 0): 0, (4, 1): 1, (4, 2): 3, (4, 3): 2,
        (5, 0): 4, (5, 1): 2, (5, 2): 0, (5, 3): 1, (5, 4): 3,
    }
    cells = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for (col, row), ci in sorted(layout.items(), key=lambda kv: (kv[0][1], kv[0][0])):
        x = ox + col * dx
        y = oy + row * dy + (dy / 2 if col % 2 else 0)
        cells.alpha_composite(cell_sprite(ci, cw), (round(x), round(y)))
    c.alpha_composite(shadow_layer((W, H), cells, (0, 0), (10 * K, 18 * K), 16 * K, 0.30))
    c.alpha_composite(cells)

    # honey drips along the top right
    sh, honey = honey_drips((W, H), W * 0.47, W + 40 * K, -6 * K, 30 * K,
                            [(0.10, 38 * K, 18 * K), (0.28, 70 * K, 22 * K), (0.47, 30 * K, 16 * K), (0.66, 92 * K, 24 * K), (0.86, 48 * K, 20 * K)])
    c.alpha_composite(sh); c.alpha_composite(honey)

    # bees
    zh = fit_h(bee("zhuzha_30"), 505 * K)
    bo = fit_h(bee("boris_-34"), 225 * K)
    la = fit_h(bee("lavanda_40"), 205 * K)
    place(c, bo, (1105 * K, 225 * K), (16, 30, 18, 0.30))
    place(c, la, (662 * K, 566 * K), (16, 30, 18, 0.30))
    place(c, zh, (850 * K, 392 * K), (26, 44, 30, 0.36))

    # sparkles
    c.alpha_composite(sparkles((W, H), [(1188 * K, 118 * K, 15 * K), (1020 * K, 116 * K, 9 * K), (682 * K, 182 * K, 13 * K), (706 * K, 452 * K, 8 * K),
                                        (1012 * K, 600 * K, 11 * K), (1190 * K, 470 * K, 9 * K), (540 * K, 120 * K, 8 * K)]))

    # wordmark + subtitle (left)
    d = ImageDraw.Draw(c)
    title_f = font("Black", 166 * K)
    tx, ty = 84 * K, 188 * K
    txt = Image.new("RGBA", (W, H), (0, 0, 0, 0)); td = ImageDraw.Draw(txt)
    td.text((tx, ty), "Buzzle", font=title_f, fill=BROWN)
    glow = Image.new("RGBA", (W, H), (255, 246, 220, 0))
    glow.putalpha(txt.getchannel("A").filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(4 * K)).point(lambda v: int(v * 0.85)))
    c.alpha_composite(shadow_layer((W, H), txt, (0, 0), (0, 10 * K), 12 * K, 0.30, (110, 55, 0)))
    c.alpha_composite(glow)
    c.alpha_composite(txt)
    tb = d.textbbox((tx, ty), "Buzzle", font=title_f)
    sub_f = font("ExtraBold", 46 * K)
    sy = tb[3] + 34 * K
    for i, line in enumerate(["Уютный улей и", "медовая головоломка"]):
        d.text((tx + 6 * K, sy + i * 60 * K), line, font=sub_f, fill=BROWN2)
    master = c.convert("RGB").resize((1280, 720), Image.LANCZOS)
    master.save(f"{OUT}/telegram-cover-1280x720.png", optimize=True)
    master.resize((640, 360), Image.LANCZOS).save(f"{OUT}/telegram-cover-640x360.png", optimize=True)

# ---------------------------------------------------------------- avatar
def avatar():
    S = 512 * K
    a = gradient_bg(S, S, (255, 214, 102), (238, 140, 20), (S * 0.42, S * 0.36), 0.95)
    a.alpha_composite(faint_hexes(a, (0, 0, S, S), 52 * K, (255, 238, 190, 55), 3 * K))
    # inner honey disc
    disc = Image.new("RGBA", (S, S), (0, 0, 0, 0)); dd = ImageDraw.Draw(disc)
    r = S * 0.40
    dd.ellipse([S / 2 - r, S / 2 - r, S / 2 + r, S / 2 + r], fill=(255, 240, 196, 255))
    a.alpha_composite(shadow_layer((S, S), disc, (0, 0), (0, 8 * K), 14 * K, 0.30, (150, 70, 0)))
    inner = gradient_bg(S, S, (255, 248, 222), (255, 214, 120), (S * 0.45, S * 0.40), 0.75)
    inner.putalpha(disc.getchannel("A"))
    a.alpha_composite(inner)
    zh = fit_h(bee("zhuzha_16"), 360 * K)
    place(a, zh, (S / 2 + 4 * K, S / 2 + 4 * K), (10, 20, 14, 0.30))
    a.alpha_composite(sparkles((S, S), [(392 * K, 128 * K, 14 * K), (120 * K, 372 * K, 9 * K)]))
    a.convert("RGB").resize((512, 512), Image.LANCZOS).save(f"{OUT}/telegram-avatar-512.png", optimize=True)

cover()
avatar()
print("ok")
