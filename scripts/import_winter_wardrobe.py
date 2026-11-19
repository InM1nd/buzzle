"""1.7 winter wardrobe: bring the layers drawn on canonical Zhuzha (1366x1151, design/2d/winter-*-layer-*) onto her
512 game canvas (design/2d/all-species-accessories-v1/zhuzha/<view>-base-view.png), where scripts/fit_costumes.py picks them up
and fits them onto every species.

Canonical -> game: one scale + offset per view, found by matching the silhouettes of the wreath fittings (bee without the
wreath) with the game base frames (IoU 0.91 front, 0.92 three-quarter, 0.83 profile, where the wings sit differently).
Headwear keeps its antennae overlay (the antennae drawn back over the fabric), merged into the same layer.
Output: design/2d/winter-wardrobe-game-v1/<item>-<view>.png (512x512, transparent).
Run: python3 scripts/import_winter_wardrobe.py && python3 scripts/fit_costumes.py bobblehat winterscarf santahat antlers firwreath festivebow
"""
import json, os
from PIL import Image

D = "design/2d/"
OUT = D + "winter-wardrobe-game-v1/"
VIEWS = ["front", "q3-front", "side"]
# canonical -> game canvas: scale, then paste at (x, y)
T = {"front": (0.3739, 2, 46), "q3-front": (0.3525, -6, 52), "side": (0.3358, 4, 56)}


def placed(path, box):
    """an accessory crop scaled into its layout box on the canonical canvas"""
    im = Image.open(path).convert("RGBA").resize((box["width"], box["height"]), Image.Resampling.LANCZOS)
    c = Image.new("RGBA", (1366, 1151)); c.alpha_composite(im, (box["x"], box["y"]))
    return c


def full(path):
    return Image.open(path).convert("RGBA")


def hat_v12(view):
    """bobble hat: front from v1, three-quarter and profile from v2 (crops placed by layout.json)"""
    d = D + ("winter-hat-layer-v1/" if view == "front" else "winter-hat-layer-v2/")
    lay = json.load(open(d + "layout.json"))
    lay = lay if view == "front" else lay[view]
    c = placed(d + f"hat-{view}.png", lay["hat"])
    c.alpha_composite(placed(d + f"antennae-{view}.png", lay["antennae"]))
    return c


def scarf_v12(view):
    if view == "front":
        lay = json.load(open(D + "winter-scarf-layer-v1/layout.json"))
        return placed(D + "winter-scarf-layer-v1/scarf-front.png", lay["scarf"])
    lay = json.load(open(D + "winter-scarf-layer-v2/layout.json"))[view]["scarf"]
    return placed(D + f"winter-scarf-layer-v2/{lay['file']}", lay)


def fitted(folder, prefix, antennae):
    def get(view):
        c = full(D + f"{folder}/{prefix}-fitted-{view}.png")
        if antennae:
            c.alpha_composite(full(D + f"{folder}/antennae-{view}.png"))
        return c
    return get


ITEMS = {
    "bobblehat": hat_v12,
    "winterscarf": scarf_v12,
    "santahat": fitted("winter-santa-layer-v2", "hat", True),
    "antlers": fitted("winter-antlers-layer-v2", "hat", True),
    "firwreath": fitted("winter-wreath-layer-v2", "wreath", True),
    "festivebow": fitted("winter-bow-layer-v1", "bow", False),
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for item, get in ITEMS.items():
        for v in VIEWS:
            s, x, y = T[v]
            im = get(v)
            sm = im.resize((round(im.width * s), round(im.height * s)), Image.Resampling.LANCZOS)
            game = Image.new("RGBA", (512, 512))
            game.paste(sm, (x, y), sm)
            game.save(OUT + f"{item}-{v}.png")
        print(item)
