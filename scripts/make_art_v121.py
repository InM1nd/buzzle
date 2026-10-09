"""v1.2.1 UI art: pencil (rename) icon, pre-coloured so it needs no tintColor on web."""
from PIL import Image, ImageDraw
S, SS = 96, 4
N = S * SS
im = Image.new("RGBA", (N, N), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
brown, light, pink, tip = (122, 74, 30, 255), (242, 165, 22, 255), (240, 120, 140, 255), (74, 44, 18, 255)
def rot(pts, a=-45, c=(N / 2, N / 2)):
    import math
    r = math.radians(a); ca, sa = math.cos(r), math.sin(r)
    return [(c[0] + (x - c[0]) * ca - (y - c[1]) * sa, c[1] + (x - c[0]) * sa + (y - c[1]) * ca) for x, y in pts]
cx, w = N / 2, N * 0.2
top, bot = N * 0.06, N * 0.94
eraser, ferrule, body_end = top + N * 0.14, top + N * 0.2, bot - N * 0.24
d.polygon(rot([(cx - w / 2, top + w / 4), (cx + w / 2, top + w / 4), (cx + w / 2, eraser), (cx - w / 2, eraser)]), fill=pink, outline=brown, width=SS * 5 // 2)
d.polygon(rot([(cx - w / 2, eraser), (cx + w / 2, eraser), (cx + w / 2, ferrule), (cx - w / 2, ferrule)]), fill=(200, 200, 210, 255), outline=brown, width=SS * 5 // 2)
d.polygon(rot([(cx - w / 2, ferrule), (cx + w / 2, ferrule), (cx + w / 2, body_end), (cx - w / 2, body_end)]), fill=light, outline=brown, width=SS * 5 // 2)
d.line(rot([(cx, ferrule), (cx, body_end)]), fill=(214, 128, 10, 255), width=SS * 3)
d.polygon(rot([(cx - w / 2, body_end), (cx + w / 2, body_end), (cx, bot)]), fill=(255, 226, 170, 255), outline=brown, width=SS * 5 // 2)
d.polygon(rot([(cx - w * 0.18, bot - w * 0.36), (cx + w * 0.18, bot - w * 0.36), (cx, bot)]), fill=tip)
im.resize((S, S), Image.LANCZOS).save("assets/art/pencil.png", optimize=True)
print("pencil ok")
