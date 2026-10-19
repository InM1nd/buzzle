"""Halloween intro: source Gemini clip -> intro_v2 (masked jump cut, living sky, logo, fade to #171340).
python3 scripts/video/make_intro.py SRC.mp4 LOGO.png OUT.mp4"""
import subprocess, sys, math, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
SRC, LOGO, OUT = sys.argv[1:4]
W, H, FPS = 720, 1280, 24
TRIM = 0.4                # dead hover at the start
CUT = 190 / 24 - TRIM     # the whip-pan jump in output time (src frame 190)
DUR = 9.5
LOGO_IN, LOGO_T = CUT + 0.25, 0.5
FADE0, FADE1 = 8.9, 9.25
BG = np.array([23, 19, 64], float)
rng = np.random.default_rng(7)

raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", SRC, "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
src = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
N = int(round(DUR * FPS))

# stars of the final sky: small bright isolated spots, away from the moon
sky = src[-1].astype(float); lum = sky.mean(2)
peaks = (lum == ndimage.maximum_filter(lum, 7)) & (lum > 150) & (lum - ndimage.uniform_filter(lum, 15) > 45)
ys, xs = np.where(peaks)
moon = ((xs - W * 0.5) ** 2 + (ys - H * 0.2) ** 2) < (W * 0.3) ** 2
stars = [(x, y) for x, y in zip(xs[~moon], ys[~moon])][:160]
phase = rng.uniform(0, 2 * math.pi, len(stars)); freq = rng.uniform(0.6, 1.4, len(stars))
print("stars", len(stars))

def dot(r):
    g = np.mgrid[-r:r + 1, -r:r + 1]; d = np.sqrt(g[0] ** 2 + g[1] ** 2) / r
    return np.clip(1 - d, 0, 1) ** 2
STAR = dot(5)
SPARK = dot(14)
SPARK_S = dot(8)
# sparkles: a burst from the bee's exit point at the cut, drifting up and outward with drag
P = 70
p0 = np.stack([rng.normal(W * 0.5, 90, P), rng.normal(H * 0.42, 120, P)], 1)
ang = rng.uniform(0, 2 * math.pi, P); spd = rng.uniform(150, 650, P)
pv = np.stack([np.cos(ang) * spd, np.sin(ang) * spd - 180], 1)
psz = rng.uniform(0.5, 1.3, P); pcol = np.array([[255, 214, 110], [255, 236, 170], [255, 190, 80]])[rng.integers(0, 3, P)]

def add_sprite(img, x, y, spr, col, a):
    r = spr.shape[0] // 2; x, y = int(x), int(y)
    x0, y0, x1, y1 = max(0, x - r), max(0, y - r), min(W, x + r + 1), min(H, y + r + 1)
    if x0 >= x1 or y0 >= y1: return
    s = spr[y0 - y + r:y1 - y + r, x0 - x + r:x1 - x + r][..., None] * a
    img[y0:y1, x0:x1] += s * np.array(col, float)

logo = Image.open(LOGO).convert("RGBA")
LW = int(W * 0.8); LH = int(logo.height * LW / logo.width)
logo = logo.resize((LW, LH), Image.LANCZOS)
glow = Image.new("RGBA", (LW + 160, LH + 160)); glow.paste((255, 180, 80, 0), (0, 0, *glow.size))
ga = Image.new("L", glow.size); ga.paste(logo.split()[3], (80, 80)); ga = ga.filter(ImageFilter.GaussianBlur(28))
glow_rgba = np.zeros((*ga.size[::-1], 4)); glow_rgba[..., :3] = [255, 175, 70]; glow_rgba[..., 3] = np.array(ga) / 255 * 0.55
LOGO_CY = int(H * 0.49)

def ease(x): x = min(1, max(0, x)); return 1 - (1 - x) ** 3
def over(img, rgba, cx, cy, scale, a):
    if a <= 0: return
    h0, w0 = rgba.shape[:2]; w1, h1 = max(1, int(w0 * scale)), max(1, int(h0 * scale))
    im = np.array(Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA").resize((w1, h1), Image.LANCZOS)).astype(float)
    x0, y0 = int(cx - w1 / 2), int(cy - h1 / 2)
    sx0, sy0 = max(0, -x0), max(0, -y0); dx0, dy0 = max(0, x0), max(0, y0)
    dx1, dy1 = min(W, x0 + w1), min(H, y0 + h1)
    im = im[sy0:sy0 + dy1 - dy0, sx0:sx0 + dx1 - dx0]
    al = im[..., 3:4] / 255 * a
    img[dy0:dy1, dx0:dx1] = img[dy0:dy1, dx0:dx1] * (1 - al) + im[..., :3] * al
logo_np = np.array(logo).astype(float)
glow_np = np.concatenate([glow_rgba[..., :3], glow_rgba[..., 3:4] * 255], 2)

enc = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                        "-c:v", "ffv1", "/tmp/intro_frames.mkv"], stdin=subprocess.PIPE)
for n in range(N):
    t = n / FPS
    k = min(len(src) - 1, int(round((t + TRIM) * FPS)))
    # from the cut on, the settled final sky (the source's moon slides down and a ghost moon fades for ~0.6 s)
    if k >= 190: k = len(src) - 1
    f = src[k].astype(float)
    dc = t - CUT
    # motion blur across the cut: vertical smear (the camera tilts up), strongest on the cut frames
    mb = math.exp(-(dc / 0.07) ** 2)
    if mb > 0.05:
        L = int(4 + 44 * mb)
        f = ndimage.uniform_filter1d(f, L, axis=0, mode="nearest")
    if t >= CUT - 0.02:
        # living sky: twinkle (source coords), then a slow push-in toward the moon/logo area
        for (x, y), ph, fr in zip(stars, phase, freq):
            a = 0.55 * max(0.0, math.sin(2 * math.pi * fr * t + ph)) ** 3
            if a > 0.02: add_sprite(f, x, y, STAR, (255, 248, 220), a)
        z = 1 + 0.035 * ease((t - CUT) / (DUR - CUT))
        im = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8))
        cw, ch = W / z, H / z; cx, cy = W * 0.5, H * 0.38
        im = im.resize((W, H), Image.BICUBIC, box=(cx - cw / 2 * 1, cy - ch * 0.38, cx + cw / 2, cy - ch * 0.38 + ch))
        f = np.array(im).astype(float)
    # soft warm flash over the cut
    fl = 0.5 * math.exp(-(dc / 0.075) ** 2)
    if fl > 0.01:
        yy = np.linspace(-1, 1, H)[:, None]; xx = np.linspace(-1, 1, W)[None, :]
        rad = np.clip(1.25 - np.sqrt(xx ** 2 + (yy * 1.2) ** 2), 0.25, 1)[..., None]  # brighter in the middle
        f = f * (1 - fl * 0.6) + np.array([255, 202, 112]) * fl * rad
    # golden pollen burst: born just before the cut, lives ~0.9 s
    tb = t - (CUT - 0.1)
    if 0 <= tb < 0.9:
        drag = (1 - math.exp(-2.6 * tb)) / 2.6
        pos = p0 + pv * drag + np.array([0, 60]) * tb * tb
        a = (1 - tb / 0.9) ** 1.5 * min(1, tb / 0.05)
        for (x, y), s, c in zip(pos, psz, pcol):
            add_sprite(f, x, y, SPARK if s > 0.9 else SPARK_S, c, a * 1.4)
    # logo: fade + scale-in with a warm glow
    la = ease((t - LOGO_IN) / LOGO_T)
    if la > 0:
        sc = 0.9 + 0.1 * la + 0.015 * max(0, t - LOGO_IN - LOGO_T)
        over(f, glow_np, W / 2, LOGO_CY, sc, la * 0.9)
        over(f, logo_np, W / 2, LOGO_CY, sc, la)
    # everything to the game's night colour
    fa = min(1, max(0, (t - FADE0) / (FADE1 - FADE0)))
    fa = fa * fa * (3 - 2 * fa)
    if fa > 0: f = f * (1 - fa) + BG * fa
    enc.stdin.write(np.clip(f, 0, 255).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait()

af = (f"[0:a]atrim={TRIM}:{TRIM + DUR},asetpts=PTS-STARTPTS,afade=t=in:d=0.12[a0];"
      f"anoisesrc=color=brown:amplitude=0.5:duration={DUR}:sample_rate=48000,lowpass=f=500,highpass=f=60,"
      f"tremolo=f=0.18:d=0.6,volume=0.10,afade=t=in:d=1.2[w];"
      f"[a0][w]amix=inputs=2:normalize=0,afade=t=out:st={FADE0 - 0.3}:d={DUR - FADE0 + 0.3 - 0.05},aformat=channel_layouts=stereo[a]")
for p in (1, 2):
    cmd = ["ffmpeg", "-loglevel", "error", "-y", "-i", SRC, "-i", "/tmp/intro_frames.mkv", "-filter_complex", af,
           "-map", "1:v", "-map", "[a]", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-b:v", "930k", "-maxrate", "1600k", "-bufsize", "2000k",
           "-pix_fmt", "yuv420p", "-pass", str(p), "-passlogfile", "/tmp/intro2pass", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-t", str(DUR)]
    subprocess.run(cmd + (["-f", "mp4", "/dev/null"] if p == 1 else [OUT]), check=True)
print("ok", OUT)
