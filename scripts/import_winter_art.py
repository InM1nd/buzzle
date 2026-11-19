"""1.7 winter decorations and flowers: owner-picked sprites from design/art/winter-* into game assets.
Decorations: cropped to the drawing, 336 px tall (2x the summer ones), webp; prints the ITEM_ART sizes.
Flowers: the full 1024 canvas (shared planting point 512,944) scaled to 249 like assets/art/garden/*.
Run: python3 scripts/import_winter_art.py
"""
import os
from PIL import Image

A = "design/art/"
DECO = {  # game id: source (owner picks of 19.11.2026: tree and garland v2, snowman v6)
    "garland": "winter-decor-v2/deco_winter_garland.png",
    "firtree": "winter-decor-v2/deco_winter_tree.png",
    "snowlanterns": "winter-decor-v1/deco_winter_lantern.png",
    "gingerhouse": "winter-decor-v4/deco_winter_gingerbread_house.png",
    "goldstar": "winter-decor-v3/deco_winter_star.png",  # icicles (v3) floated next to the combs, the star stands on its base
    "snowman": "winter-decor-v6/deco_winter_snowman.png",
    "sled": "winter-gift-sled-v1/deco_winter_gift_sled.png",
    "mailbox": "winter-decor-v4/deco_winter_mailbox.png",
    "lamppost": "winter-decor-v6/deco_winter_lantern.png",
}
FLOWERS = {
    "hellebore_bloom": "winter-plants-v1/hellebore_bloom.png", "poinsettia_bloom": "winter-plants-v1/poinsettia_bloom.png",
    "hellebore_bud": "winter-plants-v2/hellebore_bud.png", "poinsettia_bud": "winter-plants-v2/poinsettia_bud.png",
}
OUT = "assets/art/winter/"

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for gid, src in DECO.items():
        im = Image.open(A + src).convert("RGBA")
        im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox())
        h = 336; w = round(im.width * h / im.height)
        im.resize((w, h), Image.Resampling.LANCZOS).save(f"{OUT}deco_{gid}.webp", "WEBP", quality=90, method=6, exact=True)
        print(f'  "deco_{gid}": {{ src: require("../../assets/art/winter/deco_{gid}.webp"), w: {w}, h: {h} }},')
    for gid, src in FLOWERS.items():
        Image.open(A + src).convert("RGBA").resize((249, 249), Image.Resampling.LANCZOS).save(f"{OUT}{gid}.webp", "WEBP", quality=90, method=6, exact=True)
        print(gid)
