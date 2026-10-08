"""overview.png — all 7 boards (current + 6 techniques) in a grid, labelled in Russian."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
names = [("art-0-current", "0 · Текущий Бзз", "C"), ("art-1-flat", "1 · Плоский вектор", "A"), ("art-2-watercolor", "2 · Тушь + акварель", "B"),
         ("art-3-clay", "3 · Мягкий 3D / пластилин", "C · B"), ("art-4-pixel", "4 · Пиксель-арт", "A"), ("art-5-lineart", "5 · Линия + один акцент", "A"),
         ("art-6-papercut", "6 · Бумажная аппликация", "B · A")]
TW, TH = 1240, 833            # board 2560x1720 scaled
GAP, PAD, HEAD, LAB = 56, 90, 300, 64
COLS = 2
rows = 4
W = PAD * 2 + TW * COLS + GAP * (COLS - 1)
H = HEAD + rows * (LAB + TH) + (rows - 1) * GAP + PAD
bg = Image.new("RGB", (W, H), "#E6E2DA"); d = ImageDraw.Draw(bg)
def f(size, wght):
    ft = ImageFont.truetype("fonts/InterTight-VariableFont_wght.ttf", size); ft.set_variation_by_axes([wght]); return ft
d.text((PAD, 90), "Buzzle — как рисовать арт: 6 техник + текущий", font=f(76, 680), fill="#1A1410")
d.text((PAD, 192), "Один и тот же набор: маскот Жужа, 3 вида пчёл, 7 сот, улей, цветок, мёд, 4 иконки + фрагмент поля с цепочкой.", font=f(31, 450), fill="#6E665C")
d.text((PAD, 236), "Пары с выбранными направлениями: A — Минимализм, B — Сказочный, C — текущий Бзз.", font=f(31, 450), fill="#6E665C")
for i, (n, label, pair) in enumerate(names):
    im = Image.open(f"design/art/{n}.png" if False else f"{n}.png").convert("RGB").resize((TW, TH), Image.LANCZOS)
    x = PAD + (i % COLS) * (TW + GAP); y = HEAD + (i // COLS) * (LAB + TH + GAP)
    d.text((x + 4, y + 8), label, font=f(36, 650), fill="#1A1410")
    tw = d.textlength(label, font=f(36, 650))
    chip = f"пара: {pair}"; cw = d.textlength(chip, font=f(24, 600))
    d.rounded_rectangle([x + tw + 22, y + 12, x + tw + 22 + cw + 28, y + 50], 19, fill="#1A1410")
    d.text((x + tw + 36, y + 17), chip, font=f(24, 600), fill="#FFFFFF")
    y += LAB
    sh = Image.new("L", (W, H), 0); ImageDraw.Draw(sh).rounded_rectangle([x, y + 14, x + TW, y + TH + 14], 30, fill=70)
    sh = sh.filter(ImageFilter.GaussianBlur(22)); bg.paste(Image.new("RGB", (W, H), "#9a9288"), (0, 0), sh)
    m = Image.new("L", (TW, TH), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, TW - 1, TH - 1], 30, fill=255)
    bg.paste(im, (x, y), m)
# 8th slot: legend
x = PAD + TW + GAP; y = HEAD + 3 * (LAB + TH + GAP) + LAB
d.rounded_rectangle([x, y, x + TW, y + TH], 30, fill="#F8F6F2")
rows_t = [("Техника", "Пара", "Как в RN", "Вес набора*"),
          ("0 Текущий", "C", "PNG из make_art.py", "664 КБ"),
          ("1 Плоский", "A, C", "PNG / tint-маски", "0,21 МБ · 0,12 WebP"),
          ("2 Акварель", "B", "только растр", "1,3 МБ · 0,52 WebP"),
          ("3 Пластилин", "C, B", "только растр", "0,97 МБ · 0,30 WebP"),
          ("4 Пиксель", "A", "PNG ×6 заранее", "0,03 МБ"),
          ("5 Линия", "A", "маски + tintColor", "0,31 МБ · 0,15 WebP"),
          ("6 Бумага", "B, A", "растр, слои → параллакс", "1,4 МБ · 0,36 WebP")]
cx = [x + 50, x + 330, x + 470, x + 860]
yy = y + 60
for j, r in enumerate(rows_t):
    for k, t in enumerate(r):
        d.text((cx[k], yy), t, font=f(30 if j else 22, 650 if (j == 0 or k == 0) else 450), fill="#9A9288" if j == 0 else "#1C1A17")
    yy += 78 if j else 56
    if j: d.line([x + 50, yy - 20, x + TW - 50, yy - 20], fill="#E6E1D8", width=2)
d.text((x + 50, yy + 10), "* замер: ассеты в разрешении игры на прозрачном фоне, пересчёт на ~40 файлов.", font=f(24, 450), fill="#8C857B")
d.text((x + 50, yy + 46), "Запас APK до 24 МБ ≈ 0,7 МБ; текущие 664 КБ заменяются, а не добавляются.", font=f(24, 450), fill="#8C857B")
bg.save("overview.png", optimize=True)
print(bg.size)
