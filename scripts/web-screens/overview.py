"""Compose screens/overview.png from the real web-rendered screenshots."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os
D = "screens"
ITEMS = [
    ("17-hive-bees-flight.png", "Улей и пчёлы"), ("19-hive-collect-swarm.png", "Сбор мёда"), ("08-puzzle-hub.png", "Головоломка дня"),
    ("10-game-drag.png", "Цепочка сот"), ("20-game-combo-zip.png", "Комбо"), ("12-round-result.png", "Итоги раунда"),
    ("13-bees.png", "Коллекция пчёл"), ("15-tasks.png", "Задания и награды"),
]
W, H = 330, 714
GAP, COLS = 36, 4
rows = (len(ITEMS) + COLS - 1) // COLS
TOP = 170
cw = COLS * W + (COLS + 1) * GAP
ch = TOP + rows * (H + 70) + GAP
canvas = Image.new("RGB", (cw, ch), (255, 241, 210))
d = ImageDraw.Draw(canvas)
F = "assets/fonts/"
title = ImageFont.truetype(F + "Nunito-Black.ttf", 72)
sub = ImageFont.truetype(F + "Nunito-Bold.ttf", 28)
cap = ImageFont.truetype(F + "Nunito-ExtraBold.ttf", 28)
icon = Image.open("assets/icon.png").convert("RGBA").resize((110, 110), Image.LANCZOS)
m = Image.new("L", icon.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 109, 109], 26, fill=255)
canvas.paste(icon, (GAP, 34), m)
d.text((GAP + 134, 30), "Buzzle", font=title, fill=(74, 44, 18))
d.text((GAP + 138, 116), "улей + медовая головоломка · Android · v1.1.0", font=sub, fill=(156, 123, 91))
for i, (f, label) in enumerate(ITEMS):
    r, c = divmod(i, COLS)
    x = GAP + c * (W + GAP)
    y = TOP + r * (H + 70)
    im = Image.open(os.path.join(D, f)).convert("RGB").resize((W, H), Image.LANCZOS)
    sh = Image.new("L", (W + 60, H + 60), 0)
    ImageDraw.Draw(sh).rounded_rectangle([30, 36, W + 30, H + 36], 34, fill=90)
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    canvas.paste((150, 95, 30), (x - 30, y - 30), sh)
    mask = Image.new("L", (W, H), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, H - 1], 30, fill=255)
    canvas.paste(im, (x, y), mask)
    tw = d.textlength(label, font=cap)
    d.text((x + (W - tw) / 2, y + H + 16), label, font=cap, fill=(122, 74, 30))
canvas.save(os.path.join(D, "overview.png"), optimize=True)
print("overview", canvas.size)
