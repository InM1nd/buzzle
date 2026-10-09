"""Compose bee-option-*.png boards + overview.png from Blender renders (Russian labels)."""
import io, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.abspath(os.path.join(HERE, ".."))
R = os.path.join(D, "renders")
FONT = "/workspace/apps/bee-game/assets/fonts/Nunito-Black.ttf"
FONTB = "/workspace/apps/bee-game/assets/fonts/Nunito-Bold.ttf"
BG = (255, 246, 227); CARD = (255, 233, 191); INK = (74, 44, 18); DIM = (140, 105, 70); ACC = (240, 138, 0)
f = lambda s, b=False: ImageFont.truetype(FONT if b else FONTB, s)

OPTIONS = json.load(open(os.path.join(HERE, "options.json")))
SIZES = json.load(open(os.path.join(D, "sizes.json"))) if os.path.exists(os.path.join(D, "sizes.json")) else {}

def kuwahara(img, r=5):
    a = np.asarray(img).astype(np.float32) / 255.0
    rgb, al = a[..., :3] * a[..., 3:4], a[..., 3]
    H, W = al.shape
    def integral(x):
        p = np.pad(x, ((r + 1, r), (r + 1, r)) + ((0, 0),) * (x.ndim - 2), mode="edge")
        return p.cumsum(0).cumsum(1)
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    I, I2, Ic, Ia = integral(lum), integral(lum ** 2), integral(rgb), integral(al)
    def box(S, y0, x0):  # sum over window [y0, y0+r] x [x0, x0+r] relative to pixel
        ys, xs = np.arange(H)[:, None] + r + 1 + y0, np.arange(W)[None, :] + r + 1 + x0
        return S[ys + r, xs + r] - S[ys - 1, xs + r] - S[ys + r, xs - 1] + S[ys - 1, xs - 1]
    n = (r + 1) ** 2
    best_v = np.full((H, W), np.inf, np.float32); out = np.zeros_like(rgb); outa = np.zeros_like(al)
    for y0, x0 in ((-r, -r), (-r, 0), (0, -r), (0, 0)):
        m = box(I, y0, x0) / n; v = box(I2, y0, x0) / n - m * m
        c = np.stack([box(Ic[..., k], y0, x0) for k in range(3)], -1) / n
        ca = box(Ia, y0, x0) / n
        sel = v < best_v
        best_v = np.where(sel, v, best_v); out[sel] = c[sel]; outa[sel] = ca[sel]
    outa = np.maximum(outa, 1e-4)
    res = np.concatenate([np.clip(out / outa[..., None], 0, 1), al[..., None]], -1)
    return Image.fromarray((res * 255).astype(np.uint8), "RGBA")

def paintify(im):
    """painterly 2.5D: Kuwahara brush blocks, warm shadow grading, soft brown contour, canvas grain."""
    big = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    rk = max(3, big.width // 128)
    k = kuwahara(kuwahara(big, rk), max(2, rk // 2)).resize(im.size, Image.LANCZOS)
    a = np.asarray(k).astype(np.float32)
    lum = (a[..., :3] @ np.array([0.299, 0.587, 0.114])) / 255
    warm = np.array([120, 60, 30], np.float32)
    a[..., :3] = a[..., :3] * (0.85 + 0.15 * lum[..., None]) + warm * (1 - lum[..., None]) * 0.12
    rng = np.random.default_rng(3); g = rng.normal(0, 6, a.shape[:2])
    g = np.asarray(Image.fromarray(((g + 128).clip(0, 255)).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) - 128
    a[..., :3] += g[..., None] * 0.8
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGBA")
    al = out.split()[3]
    edge = al.filter(ImageFilter.MaxFilter(5))
    line = Image.new("RGBA", out.size, (96, 52, 20, 0)); line.putalpha(edge.point(lambda v: int(v * 0.85)))
    line.alpha_composite(out)
    return line

def load(style, name):
    p = os.path.join(R, style, name + ".png")
    im = Image.open(p).convert("RGBA")
    if style == "paint":
        cache = os.path.join(R, style, name + ".painted.png")
        if os.path.exists(cache) and os.path.getmtime(cache) > os.path.getmtime(p):
            return Image.open(cache).convert("RGBA")
        im = paintify(im); im.save(cache)
    return im

def trim(im, pad=8):
    bb = im.getbbox()
    if not bb: return im
    return im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad)))

def fit(im, w, h):
    s = min(w / im.width, h / im.height)
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)

def rr(d, box, r, fill, outline=None, width=0):
    d.rounded_rectangle(box, r, fill=fill, outline=outline, width=width)

def shadowed(canvas, im, xy, blur=10, off=(0, 14), alpha=70):
    sh = Image.new("RGBA", im.size, (90, 50, 10, 0)); sh.putalpha(im.split()[3].point(lambda v: v * alpha // 255))
    pad = blur * 3
    big = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0)); big.alpha_composite(sh, (pad, pad))
    big = big.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(big, (xy[0] - pad + off[0], xy[1] - pad + off[1])); canvas.alpha_composite(im, xy)

def wrap(d, text, font, width):
    out, line = [], ""
    for w in text.split():
        t = (line + " " + w).strip()
        if d.textlength(t, font=font) > width and line: out.append(line); line = w
        else: line = t
    if line: out.append(line)
    return out

HIVE = Image.open("/tmp/b3d/hive_nobees.png").convert("RGBA").crop((48, 216, 1188, 1560))

def context(style):
    hv = HIVE.copy()
    spots = [("zhuzha", (150, 170), 330), ("boris", (650, 470), 360), ("lavanda", (300, 820), 320)]
    for sp, (x, y), w in spots:
        b = trim(load(style, f"ctx_{sp}"), 2); b = fit(b, w, w)
        shadowed(hv, b, (x, y), blur=14, off=(10, 60), alpha=60)
    return hv

def board(i, opt):
    st = opt["style"]
    W = 1700
    turn = st == "hero"
    H = 1880 + (380 if turn else 0)
    c = Image.new("RGBA", (W, H), BG + (255,)); d = ImageDraw.Draw(c)
    d.text((60, 44), f"Вариант {i} · {opt['title']}", font=f(60, True), fill=INK)
    y = 130
    for line in wrap(d, opt["pitch"], f(30), W - 120):
        d.text((62, y), line, font=f(30), fill=DIM); y += 40
    y += 20
    # hero row
    names = {"zhuzha": "Жужа", "boris": "Шмель Борис", "lavanda": "Лаванда"}
    cw = (W - 120 - 2 * 30) // 3
    for k, sp in enumerate(("zhuzha", "boris", "lavanda")):
        x = 60 + k * (cw + 30)
        rr(d, (x, y, x + cw, y + 560), 36, CARD)
        b = fit(trim(load(st, f"hero_{sp}")), cw - 60, 470)
        shadowed(c, b, (x + (cw - b.width) // 2, y + 20 + (470 - b.height) // 2), blur=16, off=(0, 22), alpha=55)
        tw = d.textlength(names[sp], font=f(34, True)); d.text((x + (cw - tw) / 2, y + 500), names[sp], font=f(34, True), fill=INK)
    y += 600
    # left column: flap strip (+ turntable) + notes; right: context
    lx, lw = 60, 900
    rx, rw = lx + lw + 40, W - (lx + lw + 40) - 60
    d.text((lx, y), "Взмах крыльев · 3 кадра", font=f(34, True), fill=INK)
    yy = y + 56
    rr(d, (lx, yy, lx + lw, yy + 330), 30, CARD)
    for k in range(3):
        fr = fit(trim(load(st, f"flap_{k}")), 270, 290)
        fx = lx + 20 + k * 290 + (270 - fr.width) // 2
        c.alpha_composite(fr, (fx, yy + 20 + (290 - fr.height) // 2))
    for k, lab in enumerate(("вверх", "середина", "вниз")):
        tw = d.textlength(lab, font=f(24)); d.text((lx + 20 + k * 290 + (270 - tw) / 2, yy + 300), lab, font=f(24), fill=DIM)
    yy += 360
    if turn:
        d.text((lx, yy), "Спрайт-лист: 8 ракурсов × 3 кадра крыльев (рендер Blender)", font=f(30, True), fill=INK)
        yy += 48
        rr(d, (lx, yy, lx + lw, yy + 300), 30, CARD)
        cell = (lw - 40) // 8
        for a in range(8):
            for k in range(3):
                fr = fit(trim(load(st, f"turn_{a}_{k}")), cell - 6, 90)
                c.alpha_composite(fr, (lx + 20 + a * cell + (cell - fr.width) // 2, yy + 10 + k * 95 + (90 - fr.height) // 2))
        yy += 330
    # notes
    rr(d, (lx, yy, lx + lw, H - 60), 30, (255, 255, 255))
    ny = yy + 26
    for head, key in (("Как сделать в RN", "rn"), ("Анимация", "anim"), ("Размер APK (измерено)", "size")):
        d.text((lx + 30, ny), head, font=f(28, True), fill=ACC); ny += 40
        text = opt[key] if key != "size" else SIZES.get(st, opt.get("size", "—"))
        for line in wrap(d, text, f(25), lw - 60):
            d.text((lx + 30, ny), line, font=f(25), fill=INK); ny += 34
        ny += 12
    # context
    d.text((rx, y), "В игре: улей, 3 пчелы в полёте", font=f(34, True), fill=INK)
    hv = context(st); hv = fit(hv, rw, H - (y + 56) - 60)
    m = Image.new("L", hv.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, hv.width - 1, hv.height - 1), 30, fill=255)
    c.paste(hv, (rx, y + 56), m)
    out = os.path.join(D, f"bee-option-{i}-{st}.png")
    c.convert("RGB").save(out, optimize=True)
    return out

def overview(paths):
    th = [Image.open(p) for p in paths]
    cols, tw = 3, 760
    ths = [fit(t, tw, 10000) for t in th]
    rowh = [max(t.height for t in ths[r * cols:(r + 1) * cols]) for r in range((len(ths) + cols - 1) // cols)]
    W = cols * tw + (cols + 1) * 40; H = 200 + sum(rowh) + 40 * (len(rowh) + 1) + 60 * len(rowh)
    c = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(c)
    d.text((40, 40), "Buzzle · объёмные пчёлы: 6 вариантов", font=f(64, True), fill=INK)
    d.text((44, 125), "Жужа, Шмель Борис и Лаванда · все рендеры из Blender (Cycles) в тёплой медовой палитре игры", font=f(30), fill=DIM)
    y = 200
    for r, h in enumerate(rowh):
        for k in range(cols):
            idx = r * cols + k
            if idx >= len(ths): break
            x = 40 + k * (tw + 40)
            d.text((x, y), f"{idx + 1}. {OPTIONS[idx]['title']}", font=f(32, True), fill=INK)
            c.paste(ths[idx], (x, y + 50))
        y += h + 60 + 40
    c.save(os.path.join(D, "overview.png"), optimize=True)

if __name__ == "__main__":
    only = sys.argv[1:] or [o["style"] for o in OPTIONS]
    paths = []
    for i, o in enumerate(OPTIONS, 1):
        p = os.path.join(D, f"bee-option-{i}-{o['style']}.png")
        if o["style"] in only: p = board(i, o); print("board", p)
        paths.append(p)
    if all(os.path.exists(p) for p in paths): overview(paths); print("overview ok")
