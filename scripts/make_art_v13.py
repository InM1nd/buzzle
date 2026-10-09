"""v1.3 UI art (pre-coloured, 96 px, supersampled): pollen, bee fragment, boosters, album, shop, streak freeze,
share, save; plus the white tab silhouette for the «Сюрпризы» tab."""
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont
S, SS = 96, 4
N = S * SS
BROWN = (122, 74, 30, 255)
def canvas(): im = Image.new("RGBA", (N, N), (0, 0, 0, 0)); return im, ImageDraw.Draw(im)
def save(im, name):
    # v1.3 icons ship as lossless WebP (smaller APK); the tab icon stays PNG for the web tab-icon inliner
    im = im.resize((S, S), Image.LANCZOS)
    if name == "tab_box": im.save(f"assets/art/{name}.png", optimize=True)
    else: im.save(f"assets/art/{name}.webp", "WEBP", lossless=True, quality=100, method=6)
    print(name)
def hexpts(cx, cy, r, rot=0):
    return [(cx + r * math.cos(math.radians(60 * i + rot)), cy + r * math.sin(math.radians(60 * i + rot))) for i in range(6)]
def star(d, cx, cy, r, fill, k=0.42, n=4):
    pts = []
    for i in range(n * 2):
        a = math.pi / 2 + i * math.pi / n; rr = r if i % 2 == 0 else r * k
        pts.append((cx + math.cos(a) * rr, cy - math.sin(a) * rr))
    d.polygon(pts, fill=fill)
W = SS * 5
# pollen of the collection: a sparkly golden-pink pollen ball
im, d = canvas()
glow = Image.new("RGBA", (N, N)); ImageDraw.Draw(glow).ellipse((N * .14, N * .14, N * .86, N * .86), fill=(255, 210, 90, 150))
im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(SS * 6))); d = ImageDraw.Draw(im)
d.ellipse((N * .22, N * .22, N * .78, N * .78), fill=(255, 196, 64, 255), outline=BROWN, width=W)
for i in range(9):
    a = i * 2.4; r = N * (0.06 + 0.17 * ((i * 37) % 10) / 10)
    x, y = N / 2 + math.cos(a) * r, N / 2 + math.sin(a) * r
    d.ellipse((x - N * .035, y - N * .035, x + N * .035, y + N * .035), fill=(255, 140, 170, 255))
d.ellipse((N * .32, N * .3, N * .44, N * .4), fill=(255, 250, 225, 255))
star(d, N * .8, N * .2, N * .11, (255, 255, 255, 255)); star(d, N * .18, N * .78, N * .07, (255, 255, 255, 255))
save(im, "pollen")
# bee fragment: a night-blue hex shard with a glowing star
im, d = canvas()
pts = [(N * .3, N * .12), (N * .74, N * .2), (N * .86, N * .56), (N * .6, N * .88), (N * .2, N * .74), (N * .14, N * .36)]
d.polygon(pts, fill=(64, 70, 150, 255), outline=(30, 30, 80, 255), width=W)
d.polygon([(N * .3, N * .12), (N * .74, N * .2), (N * .5, N * .44), (N * .14, N * .36)], fill=(98, 106, 196, 255))
d.line([pts[0], (N * .5, N * .44), pts[3]], fill=(40, 40, 100, 255), width=SS * 3)
star(d, N * .55, N * .62, N * .16, (255, 236, 150, 255), n=5, k=0.45)
save(im, "fragment")
# booster +3 moves: green hex with +3
im, d = canvas()
d.polygon(hexpts(N / 2, N / 2, N * .44), fill=(96, 200, 110, 255), outline=(36, 110, 54, 255), width=W)
f = ImageFont.truetype("assets/fonts/Nunito-Black.ttf", int(N * .46))
d.text((N / 2, N / 2 + SS * 2), "+3", font=f, fill=(255, 255, 255, 255), anchor="mm", stroke_width=SS * 3, stroke_fill=(36, 110, 54, 255))
save(im, "boost_moves")
# booster shuffle: two curved arrows in a blue hex
im, d = canvas()
d.polygon(hexpts(N / 2, N / 2, N * .44), fill=(90, 160, 240, 255), outline=(30, 80, 160, 255), width=W)
for a0 in (200, 20):
    d.arc((N * .27, N * .27, N * .73, N * .73), a0, a0 + 130, fill=(255, 255, 255, 255), width=SS * 9)
    a = math.radians(a0 + 130); x, y = N / 2 + math.cos(a) * N * .23, N / 2 + math.sin(a) * N * .23
    t = a + math.pi / 2
    d.polygon([(x + math.cos(t) * N * .12, y + math.sin(t) * N * .12), (x + math.cos(t + 2.3) * N * .1, y + math.sin(t + 2.3) * N * .1), (x + math.cos(t - 2.3) * N * .1, y + math.sin(t - 2.3) * N * .1)], fill=(255, 255, 255, 255))
save(im, "boost_shuffle")
# album: an open book with a hex
im, d = canvas()
d.polygon([(N * .08, N * .24), (N * .5, N * .32), (N * .92, N * .24), (N * .92, N * .8), (N * .5, N * .88), (N * .08, N * .8)], fill=(214, 108, 60, 255), outline=BROWN, width=W)
d.polygon([(N * .14, N * .22), (N * .48, N * .29), (N * .48, N * .8), (N * .14, N * .73)], fill=(255, 247, 228, 255), outline=BROWN, width=SS * 3)
d.polygon([(N * .86, N * .22), (N * .52, N * .29), (N * .52, N * .8), (N * .86, N * .73)], fill=(255, 247, 228, 255), outline=BROWN, width=SS * 3)
d.polygon(hexpts(N * .31, N * .5, N * .1), fill=(255, 196, 64, 255)); d.polygon(hexpts(N * .69, N * .5, N * .1), fill=(240, 120, 150, 255))
save(im, "album")
# shop: a striped market awning over a counter
im, d = canvas()
d.rectangle((N * .16, N * .46, N * .84, N * .86), fill=(255, 226, 170, 255), outline=BROWN, width=W)
d.rectangle((N * .34, N * .58, N * .66, N * .86), fill=(214, 140, 60, 255), outline=BROWN, width=SS * 3)
for i in range(5):
    x0 = N * (.08 + .168 * i)
    d.polygon([(x0, N * .2), (x0 + N * .168, N * .2), (x0 + N * .168, N * .4), (x0 + N * .084, N * .5), (x0, N * .4)], fill=(240, 90, 90, 255) if i % 2 == 0 else (255, 250, 240, 255), outline=BROWN)
d.line([(N * .08, N * .2), (N * .92, N * .2)], fill=BROWN, width=W)
d.polygon(hexpts(N * .5, N * .12, N * .07), fill=(255, 196, 64, 255), outline=BROWN, width=SS * 2)
save(im, "shop")
# streak freeze: ice-blue snowflake on a flame
im, d = canvas()
d.polygon(hexpts(N / 2, N / 2, N * .44), fill=(190, 230, 255, 255), outline=(60, 130, 200, 255), width=W)
for i in range(3):
    a = math.radians(90 + 60 * i)
    x, y = math.cos(a) * N * .3, math.sin(a) * N * .3
    d.line([(N / 2 - x, N / 2 - y), (N / 2 + x, N / 2 + y)], fill=(40, 110, 190, 255), width=SS * 6)
    for sgn in (-1, 1):
        cx, cy = N / 2 + sgn * x * .62, N / 2 + sgn * y * .62
        for b in (a + 0.7, a - 0.7):
            d.line([(cx, cy), (cx + sgn * math.cos(b) * N * .1, cy + sgn * math.sin(b) * N * .1)], fill=(40, 110, 190, 255), width=SS * 4)
save(im, "freeze")
# share (invite a friend): paper plane
im, d = canvas()
d.polygon([(N * .1, N * .46), (N * .9, N * .14), (N * .62, N * .86), (N * .46, N * .58)], fill=(60, 150, 230, 255), outline=(25, 80, 150, 255), width=W)
d.polygon([(N * .46, N * .58), (N * .9, N * .14), (N * .5, N * .78)], fill=(40, 120, 200, 255))
save(im, "share")
# save export/import: a jar label with an arrow
im, d = canvas()
d.rounded_rectangle((N * .2, N * .22, N * .8, N * .9), radius=N * .12, fill=(255, 196, 64, 255), outline=BROWN, width=W)
d.rectangle((N * .26, N * .1, N * .74, N * .24), fill=(214, 140, 60, 255), outline=BROWN, width=W)
d.polygon([(N * .5, N * .36), (N * .68, N * .56), (N * .56, N * .56), (N * .56, N * .76), (N * .44, N * .76), (N * .44, N * .56), (N * .32, N * .56)], fill=(255, 255, 255, 255))
save(im, "save")
# tab: white silhouette of a surprise comb with a bow (tinted like the other tab icons)
im, d = canvas()
WH = (255, 255, 255, 255)
d.polygon([(N * .14, N * .42), (N * .5, N * .3), (N * .86, N * .42), (N * .86, N * .78), (N * .5, N * .92), (N * .14, N * .78)], fill=WH)
d.polygon([(N * .14, N * .4), (N * .5, N * .28), (N * .86, N * .4), (N * .5, N * .52)], fill=(0, 0, 0, 0))
d.polygon([(N * .19, N * .36), (N * .5, N * .26), (N * .81, N * .36), (N * .5, N * .47)], fill=WH)
d.line([(N * .5, N * .52), (N * .5, N * .92)], fill=(0, 0, 0, 0), width=SS * 6)
for sgn in (-1, 1):
    d.ellipse((N * (.5 + sgn * .14) - N * .12, N * .08, N * (.5 + sgn * .14) + N * .12, N * .28), outline=WH, width=SS * 7)
save(im, "tab_box")
