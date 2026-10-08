from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
names = ["buzzle-1-storybook", "buzzle-2-minimal", "buzzle-3-night-garden", "buzzle-4-candy"]
TW, TH, GAP, PAD, HEAD = 1120, 1240, 48, 90, 250
W, H = PAD * 2 + TW * 2 + GAP, HEAD + TH * 2 + GAP + PAD
bg = Image.new("RGB", (W, H), "#F1ECE2")
d = ImageDraw.Draw(bg)
def f(size, wght):
    ft = ImageFont.truetype("fonts/InterTight-VariableFont_wght.ttf", size); ft.set_variation_by_axes([wght]); return ft
d.text((PAD, 92), "Buzzle — 4 варианта стиля", font=f(76, 650), fill="#1A1410")
d.text((PAD, 186), "Улей + головоломка в процессе · Pixel 412×915 · 1 Сказочный · 2 Минимализм · 3 Ночной сад · 4 Карамель", font=f(30, 450), fill="#7A7268")
for i, n in enumerate(names):
    im = Image.open(n + ".png").convert("RGB").resize((TW, TH), Image.LANCZOS)
    x = PAD + (i % 2) * (TW + GAP); y = HEAD + (i // 2) * (TH + GAP)
    sh = Image.new("L", (W, H), 0); ImageDraw.Draw(sh).rounded_rectangle([x, y + 18, x + TW, y + TH + 18], 36, fill=90)
    sh = sh.filter(ImageFilter.GaussianBlur(26)); bg.paste(Image.new("RGB", (W, H), "#9a9288"), (0, 0), sh)
    m = Image.new("L", (TW, TH), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, TW - 1, TH - 1], 36, fill=255)
    bg.paste(im, (x, y), m)
bg.save("overview.png", optimize=True)
print(bg.size)
