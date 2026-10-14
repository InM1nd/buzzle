"""Port of design/2d/bee-turnarounds/sprite.js + zhuzha-turnaround/sprite.js (the user's 2D flight prototype):
renders each bee view as separate layers (wing 0 / wing 1 behind, body on top) with the prototype's own wing
masks, sprites, arrangements and roots, flap off. Units: the prototype's 1366-wide drawing space, origin = bee centre."""
import json, math, numpy as np
from PIL import Image, ImageDraw
D = "design/2d"; BT = f"{D}/bee-turnarounds"
MAN = {s["id"]: s for s in json.load(open(f"{BT}/manifest.json"))}
MASKS = json.load(open(f"{BT}/reference-masks.json"))
ZDEF = {
 'front': ([680,680],1,[[[100,300],[330,300],[430,430],[435,540],[420,600],[300,660],[100,620]],[[935,470],[970,310],[1110,300],[1220,340],[1260,500],[1200,620],[1080,660],[957,590]]],[[422,531],[942,530]]),
 'q3-front': ([742,705],.94,[[[100,375],[360,375],[465,490],[477,603],[447,665],[375,745],[100,745]],[[970,420],[1100,250],[1285,290],[1330,470],[1250,600],[1080,630],[1050,563],[1030,513]]],[[470,605],[1040,519]]),
 'side': ([760,700],.96,[[[380,330],[410,260],[515,300],[608,410],[618,476],[578,501],[390,375]],[[250,345],[480,345],[560,450],[616,566],[570,626],[513,665],[380,616],[285,485]]],[[582,453],[595,548]]),
}
ARR = {'front': [[470,570,0,1,0],[890,570,0,1,1]], 'side': [[480,490,.5,.8,0],[500,550,.04,1,0]]}
import os
REFS = os.environ.get("BEE_REFS", "/workspace/wings2/refs")  # original 1366px reference PNGs (git show eead25a:assets/art/bees-prototype/*)
W = 1366; OX, OY = 683, 700   # output canvas W x W, bee centre at (OX, OY)

def put(dst, src, M):
    """dst += src transformed by affine M (3x3, src px -> dst px)"""
    inv = np.linalg.inv(M); a, b, c, d, e, f = inv[0, 0], inv[0, 1], inv[0, 2], inv[1, 0], inv[1, 1], inv[1, 2]
    t = src.transform(dst.size, Image.AFFINE, (a, b, c, d, e, f), resample=Image.BICUBIC)
    dst.alpha_composite(t)
T = lambda x, y: np.array([[1, 0, x], [0, 1, y], [0, 0, 1.]])
S = lambda sx, sy=None: np.array([[sx, 0, 0], [0, sx if sy is None else sy, 0], [0, 0, 1.]])
def R(a): c, s = math.cos(a), math.sin(a); return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1.]])
def poly_mask(size, pts, stroke=0):
    m = Image.new("L", size, 0); dr = ImageDraw.Draw(m); dr.polygon([tuple(p) for p in pts], fill=255)
    if stroke: dr.line([tuple(p) for p in pts] + [tuple(pts[0])], fill=255, width=stroke)
    return m
def masked(img, m):
    o = img.copy(); a = np.array(o); a[..., 3] = (a[..., 3].astype(int) * np.array(m) // 255).astype(np.uint8); return Image.fromarray(a)
def svg_poly(path):
    nums = [float(v) for v in path.replace("M", " ").replace("L", " ").replace("Z", " ").split()]
    return [[nums[i], nums[i + 1]] for i in range(0, len(nums), 2)]
def clean_wing(im):
    from scipy import ndimage as nd
    a = np.array(im); lab, n = nd.label(a[..., 3] >= 16)
    if n > 1:
        sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1)); keep = 1 + int(np.argmax(sizes)); a[lab != keep, 3] = 0
    return Image.fromarray(a)

def layers(bee, view):
    """-> dict(body, wings=[(img, pivot_xy)]) on a W x W canvas, centre (OX, OY). Root = wing pivot in output px."""
    base = T(OX, OY)   # size == 1366 -> scale 1
    out = {"wings": []}; body = Image.new("RGBA", (W, W))
    if bee == "zhuzha":
        anchor, sc, masks, roots = ZDEF[view]; img = Image.open(f"design/3d/turnaround/{view}.png").convert("RGBA")
        M = base @ S(sc) @ T(-anchor[0], -anchor[1]); bimg = img.copy(); ba = np.array(bimg)
        for i, pts in enumerate(masks):
            m = poly_mask(img.size, pts, 4); wl = masked(img, m)
            if view == "side" and i == 0:
                wa = np.array(wl); wa[np.array(poly_mask(img.size, masks[1])) > 0, 3] = 0; wl = Image.fromarray(wa)
            ba[np.array(m) > 0, 3] = 0
            c = Image.new("RGBA", (W, W)); put(c, wl, M); p = M @ [roots[i][0], roots[i][1], 1]
            out["wings"].append((c, (p[0], p[1])))
        put(body, Image.fromarray(ba), M)
    elif view == "q3-front":
        sp = MAN[bee]; ref = Image.open(f"{REFS}/{sp['reference']}").convert("RGBA").resize((1366, 1151), Image.LANCZOS)
        cfg = MASKS[bee]; anchor = [755, 710] if bee == "boris" else [742, 705]
        M = base @ S(.94) @ T(-anchor[0], -anchor[1]); ba = np.array(ref)
        for i, path in enumerate(cfg["paths"]):
            m = poly_mask(ref.size, svg_poly(path)); wl = masked(ref, m); ba[np.array(m) > 0, 3] = 0
            c = Image.new("RGBA", (W, W)); put(c, wl, M); p = M @ [cfg["roots"][i][0], cfg["roots"][i][1], 1]
            out["wings"].append((c, (p[0], p[1])))
        put(body, Image.fromarray(ba), M)
    else:
        sp = MAN[bee]; v = sp["views"][view]; img = Image.open(f"{BT}/assets/{bee}/{view}.png").convert("RGBA")
        wings = [clean_wing(Image.open(f"{BT}/assets/{bee}/wing-{s}.png").convert("RGBA")) for s in ("left", "right")]
        for rx, ry, rot, ratio, which in ARR[view]:
            im = wings[which]; w = 330 * ratio; h = w * im.height / im.width
            Mw = base @ T(rx - 683, ry - 680) @ R(rot) @ T(-w * (.04 if which else .96), -h * .80) @ S(w / im.width, h / im.height)
            c = Image.new("RGBA", (W, W)); put(c, im, Mw); p = base @ [rx - 683, ry - 680, 1]
            out["wings"].append((c, (p[0], p[1])))
        put(body, img, base @ S(v["scale"]) @ T(-v["anchor"][0], -v["anchor"][1]))
    out["body"] = body
    return out
