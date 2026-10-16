"""v1.6 Halloween costumes: rough fit of layers drawn on one bee (design/2d/halloween/costumes) onto every species.

Each costume layer is drawn once on Pushinka's or Zhuzha's 512 canvas. For another bee it is moved and scaled so that a reference
accessory every species already has (beret on the head, scarf at the neck, bag on the back) lands in the same place:
anchor of the reference on the source bee -> anchor of the reference on that bee. Left views are mirrors of the right ones.
Output: assets/art/costumes/<bee>/<layer>_<view>_<size>.webp and src/ui/costumeArt.ts (generated).
Run: python3 scripts/fit_costumes.py [layer ...]   (no arguments = every layer; e.g. `vampcape_f vampcape_b` after a rework)
"""
import glob, json, os, sys
from functools import lru_cache
from PIL import Image, ImageChops, ImageOps

AS = "design/2d/all-species-accessories-v1"
HW = "design/2d/halloween/costumes"
OUT = "assets/art/costumes"
CROP = (26, 26, 486, 486)  # same crop as scripts/import_bee_layers.py
BEES = [s["id"] for s in json.load(open(f"{AS}/manifest.json"))["species"]]
VIEWS = ["front", "q3-front", "side"]
Z3, Z8 = f"{HW}/rework-v3/zhuzha", f"{HW}/rework-v8/zhuzha"
pk = lambda prefix: {v: f"{HW}/{prefix}-{v}-view.png" for v in VIEWS}
# layer id: (source file per view, bee it was drawn on, reference accessory, anchor: "bottom" = bottom-centre, "center",
#            optional mask per view: pixels covered by the bee's own wings, cut out because the game draws wings under the body)
LAYERS = {
    "witchhat": (pk("witchhat"), "pushinka", "beret", "bottom", None),
    "pumpkinhat": (pk("pumpkinhat"), "pushinka", "beret", "bottom", None),
    "ghosthood": (pk("ghosthood"), "pushinka", "beret", "bottom", None),
    "batwings_b": (pk("batwings-back"), "pushinka", "bag", "center", None),
    # owner-approved on Zhuzha: wreath v4 (approved-zhuzha-wreath-v4.json), cape v8 (approved-zhuzha-vampcape-v8.json; front view from v3)
    "pumpkinwreath": ({v: f"{Z3}/wreath-{v}.png" for v in VIEWS}, "zhuzha", "wreath", "bottom", None),
    "vampcape_f": ({"front": f"{Z3}/vampcape-front-front.png", "q3-front": f"{Z8}/front-q3-front.png", "side": f"{Z8}/front-side.png"},
                   "zhuzha", "body", "center", {"q3-front": f"{Z8}/wings-q3-front.png", "side": f"{Z8}/wings-side.png"}),
    "vampcape_b": ({"front": f"{Z3}/vampcape-back-front.png", "q3-front": f"{Z8}/back-q3-front.png", "side": f"{Z8}/back-side.png"},
                   "zhuzha", "body", "center", None),
}
SIZES = {288: VIEWS, 720: ["front"]}


@lru_cache(None)
def overlay_bbox(bee, item, view):
    """bbox of an accessory on a species: dressed frame minus the base frame (any channel differs by > 16)"""
    ref = Image.open(f"{AS}/{bee}/{view}-base-view.png").convert("RGBA")
    if item == "body":  # the whole bee: a cape hangs from the neck, scarves sit too low on some species
        x0, y0, x1, y1 = ref.getchannel("A").point(lambda v: 255 if v > 128 else 0).getbbox()
        return x0, y0, x1 - 1, y1 - 1
    fr = Image.open(f"{AS}/{bee}/{item}-{view}-view.png").convert("RGBA")
    d = ImageChops.difference(fr, ref).split()
    m = d[0]
    for ch in d[1:]:
        m = ImageChops.lighter(m, ch)
    x0, y0, x1, y1 = m.point(lambda v: 255 if v > 16 else 0).getbbox()
    return x0, y0, x1 - 1, y1 - 1


def anchor(b, how):
    x0, y0, x1, y1 = b
    return ((x0 + x1) / 2, y1 if how == "bottom" else (y0 + y1) / 2)


def fit(src, base, bee, ref, how, view):
    if bee == base:
        return src
    p, q = overlay_bbox(base, ref, view), overlay_bbox(bee, ref, view)
    s = (q[2] - q[0]) / max(1, p[2] - p[0])
    (ax, ay), (bx, by) = anchor(p, how), anchor(q, how)
    # output pixel (u, v) samples source at ((u - bx) / s + ax, (v - by) / s + ay)
    return src.transform(src.size, Image.Transform.AFFINE, (1 / s, 0, ax - bx / s, 0, 1 / s, ay - by / s), resample=Image.Resampling.BICUBIC)


only = set(sys.argv[1:]) or set(LAYERS)
for layer in only:  # refit only the asked layers, keep the rest
    for f in glob.glob(f"{OUT}/*/{layer}_*.webp"):
        os.remove(f)
def load(path, view, wings):
    im = Image.open(path).convert("RGBA")
    if wings and view in wings:  # the cape goes under the wings: drop what the wings cover
        a = ImageChops.subtract(im.getchannel("A"), Image.open(wings[view]).convert("RGBA").getchannel("A").point(lambda v: 255 if v > 24 else 0))
        im.putalpha(a)
    return im


for layer, (paths, base, ref, how, wings) in LAYERS.items():
    if layer not in only:
        continue
    if not all(os.path.exists(paths[v]) for v in VIEWS):
        print("skip (art missing)", layer)
        continue
    for bee in BEES:
        os.makedirs(f"{OUT}/{bee}", exist_ok=True)
        for v in VIEWS:
            src = load(paths[v], v, wings)
            if not src.getbbox():
                continue  # nothing to draw in this view (cape back in profile)
            im = fit(src, base, bee, ref, how, v).crop(CROP)
            for n, views in SIZES.items():
                if v not in views:
                    continue
                out = im.resize((n, n), Image.Resampling.LANCZOS)
                keys = [(f"{v}_{n}", out)] + ([(f"{v}-left_{n}", ImageOps.mirror(out))] if v != "front" else [])
                for key, img in keys:
                    path = f"{OUT}/{bee}/{layer}_{key}.webp"
                    img.save(path, "WEBP", quality=90, method=6, exact=True)
    print("fitted", layer)

# the registry lists whatever is on disk
art = {}
for path in sorted(glob.glob(f"{OUT}/*/*.webp")):
    bee, name = path.split("/")[-2], os.path.basename(path)[:-5]
    layer = next(l for l in sorted(LAYERS, key=len, reverse=True) if name.startswith(l + "_"))
    if layer in LAYERS:
        art.setdefault(bee, {}).setdefault(layer, {})[name[len(layer) + 1:]] = path
code = ["// generated by scripts/fit_costumes.py: v1.6 costume layers, same keys as TURN in turnArt.ts",
        "export const COSTUME_ART: Record<string, Record<string, Record<string, any>>> = {"]
for bee, layers in art.items():
    code.append(f'  "{bee}": {{')
    for layer, entries in layers.items():
        code.append(f'    "{layer}": {{' + ", ".join(f'"{k}": require("../../{p}")' for k, p in entries.items()) + "},")
    code.append("  },")
code.append("};")
open("src/ui/costumeArt.ts", "w").write("\n".join(code) + "\n")
