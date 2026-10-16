"""v1.6 puzzle tile styles (Settings → Tiles): cut the calmer tile sets out of the owner-approved comparison sheet
design/art/glyph-contrast-options-v1/current-and-all-options.png (one tile per cell, same scale) into game sprites.
Each tile: bbox of the non-background pixels -> 240x208 -> flat-top hexagon alpha mask (antialiased), like cell0..4.
The compact bomb overlay (bomb-compact.png) is shared by the calm styles, fitted at 80% of the tile height (it must cover the glyph: a bomb keeps its colour for chaining).
Run: python3 scripts/import_tile_styles.py
"""
import os
from PIL import Image, ImageChops, ImageDraw

D = "design/art/glyph-contrast-options-v1/"
OUT = "assets/art/tiles/"
STYLES = {"soft": 1, "pastel": 2, "wax": 3}       # sheet column (0 = the current game art)
ROWS = ["cell0", "cell1", "cell2", "cell3", "cell4", "cell_wild"]
COL_X = [325, 655, 985, 1315]; ROW_Y = [268, 502, 737, 972, 1207, 1442]
W, H = 240, 208

sheet = Image.open(D + "current-and-all-options.png").convert("RGB")
def hex_mask(w, h, k=4):
    m = Image.new("L", (w * k, h * k), 0)
    W4, H4 = w * k, h * k
    ImageDraw.Draw(m).polygon([(W4 * 0.25, 0), (W4 * 0.75, 0), (W4, H4 / 2), (W4 * 0.75, H4), (W4 * 0.25, H4), (0, H4 / 2)], fill=255)
    return m.resize((w, h), Image.LANCZOS)
MASK = hex_mask(W, H)

def cut(col, row):
    cx, cy = COL_X[col], ROW_Y[row]
    reg = sheet.crop((cx - 160, cy - 112, cx + 160, cy + 112))
    bg = Image.new("RGB", reg.size, reg.getpixel((4, 4)))
    d = ImageChops.difference(reg, bg).convert("L").point(lambda v: 255 if v > 38 else 0)
    x0, y0, x1, y1 = d.getbbox()
    tile = reg.crop((x0, y0, x1, y1)).resize((W, H), Image.LANCZOS).convert("RGBA")
    tile.putalpha(MASK)
    return tile

os.makedirs(OUT, exist_ok=True)
bomb = Image.open(D + "bomb-compact.png").convert("RGBA")
bomb = bomb.crop(bomb.getbbox())
bh = int(H * 0.8); bw = int(bomb.width * bh / bomb.height)
bomb = bomb.resize((bw, bh), Image.LANCZOS)
compact = Image.new("RGBA", (W, H)); compact.alpha_composite(bomb, ((W - bw) // 2, (H - bh) // 2 - 2))
for style, col in STYLES.items():
    for i, name in enumerate(ROWS):
        cut(col, i).save(f"{OUT}{style}_{name}.webp", "WEBP", quality=88, method=6)
    compact.save(f"{OUT}{style}_bomb.webp", "WEBP", quality=88, method=6)
    print(style)
