"""Buzzle v1.3 low-poly items (Blender/Cycles headless): hive/garden decorations and the surprise combs.
Usage: blender -b -noaudio --python render_items.py -- out_dir size [names...]
Writes deco_<id>.png and box_<kind>.png on a transparent film (same light rig as the flowers)."""
import bpy, sys, math, os
from mathutils import Vector, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_flowers import srgb, mat, ico, cone, reset, scene  # noqa: E402

def cyl(loc, r, d, m, verts=8, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d, location=loc, rotation=rot); o = bpy.context.object
    bpy.ops.object.shade_flat(); o.data.materials.append(m); return o
def box(loc, size, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object; o.scale = size
    bpy.ops.object.shade_flat(); o.data.materials.append(m); return o
def torus(loc, R, r, m, rot=(0, 0, 0), seg=10):
    bpy.ops.mesh.primitive_torus_add(major_segments=seg, minor_segments=5, major_radius=R, minor_radius=r, location=loc, rotation=rot)
    o = bpy.context.object; bpy.ops.object.shade_flat(); o.data.materials.append(m); return o
def rope(pts, bevel, m):
    cu = bpy.data.curves.new("c", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = bevel; cu.bevel_resolution = 0
    s = cu.splines.new("NURBS"); s.points.add(len(pts) - 1)
    for p, q in zip(s.points, pts): p.co = (*q, 1)
    s.use_endpoint_u = True; s.order_u = min(4, len(pts))
    o = bpy.data.objects.new("c", cu); bpy.context.collection.objects.link(o); cu.materials.append(m); return o
def turn_all(deg):
    for o in bpy.context.scene.objects:
        if o.type in ("MESH", "CURVE") and o.parent is None:
            o.location = Euler((0, 0, math.radians(deg))).to_matrix() @ o.location
            o.rotation_euler.rotate(Euler((0, 0, math.radians(deg))))

WOOD = (0.62, 0.4, 0.2); DWOOD = (0.42, 0.26, 0.12)
GRASS = (0.42, 0.75, 0.32)
def tuft(x, y):
    g = mat("tuft", GRASS)
    for i in range(3): cone((x + (i - 1) * 0.06, y, 0.06), 0.035, 0, 0.16, g, verts=4, rot=(0, (i - 1) * 0.35, 0))

# ---------------- hive decorations ----------------
def flags():
    w = mat("pole", WOOD)
    for sx in (-1, 1):
        cyl((sx * 0.75, 0, 0.6), 0.04, 1.2, w, verts=6); ico((sx * 0.75, 0, 1.22), (0.06,) * 3, mat("knob", (1.0, 0.78, 0.2), 0.3, Metallic=0.6))
    pts = [(-0.75, 0, 1.15), (-0.35, -0.02, 0.92), (0, -0.03, 0.86), (0.35, -0.02, 0.92), (0.75, 0, 1.15)]
    rope(pts, 0.012, mat("rope", (0.95, 0.9, 0.8)))
    cols = [(1.0, 0.4, 0.45), (1.0, 0.8, 0.2), (0.45, 0.7, 1.0), (0.5, 0.85, 0.45), (0.8, 0.55, 1.0), (1.0, 0.55, 0.25)]
    for i in range(6):
        t = (i + 0.5) / 6; x = -0.75 + 1.5 * t; z = 1.15 - 0.29 * math.sin(math.pi * t) - 0.08
        o = cone((x, -0.03, z - 0.08), 0.11, 0, 0.22, mat(f"f{i}", cols[i], 0.6), verts=3, rot=(math.pi, 0, 0)); o.scale = (1, 0.25, 1)
def lanterns():
    w = mat("post", DWOOD)
    cyl((0, 0, 0.7), 0.05, 1.4, w, verts=6); box((0.25, 0, 1.38), (0.6, 0.06, 0.06), w)
    paper = [mat("lp1", (1.0, 0.55, 0.3), 0.6, emit=1.2), mat("lp2", (1.0, 0.8, 0.35), 0.6, emit=1.2)]
    cap = mat("lcap", (0.35, 0.22, 0.1))
    for i, (x, z) in enumerate(((0.45, 1.05), (0.12, 1.12))):
        rope([(x, 0, 1.36), (x, 0, z + 0.2)], 0.01, cap)
        ico((x, 0, z), (0.14, 0.14, 0.19), paper[i], sub=2)
        cyl((x, 0, z + 0.19), 0.07, 0.04, cap, verts=8); cyl((x, 0, z - 0.19), 0.07, 0.04, cap, verts=8)
    tuft(-0.15, 0.05)
def barrel():
    wd = mat("barrel", WOOD, 0.6); band = mat("band", (0.55, 0.55, 0.6), 0.3, Metallic=0.8)
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.42, depth=0.85, location=(0, 0, 0.43)); o = bpy.context.object
    bpy.ops.object.shade_flat(); o.data.materials.append(wd)
    for z in (0.15, 0.71): torus((0, 0, z), 0.43, 0.025, band)
    honey = mat("honey", (1.0, 0.65, 0.08), 0.15, emit=0.25, **{"Coat Weight": 1.0})
    cyl((0, 0, 0.87), 0.38, 0.04, honey, verts=10)
    for i, (a, l) in enumerate(((0.3, 0.25), (1.6, 0.4), (2.6, 0.18), (4.2, 0.32))):
        x, y = math.cos(a) * 0.42, math.sin(a) * 0.42
        cone((x, y, 0.86 - l / 2), 0.05, 0.02, l, honey, verts=6); ico((x, y, 0.86 - l), (0.045, 0.045, 0.06), honey)
    dip = mat("dipper", DWOOD)
    cyl((0.15, -0.05, 1.05), 0.025, 0.55, dip, verts=6, rot=(0.3, 0.5, 0))
    for k in range(4): torus((0.02, -0.0, 0.8 + 0.05 * k), 0.07 - 0.008 * k, 0.02, dip)
def fountain():
    stone = mat("stone", (0.92, 0.85, 0.72), 0.7); gold = mat("gold", (1.0, 0.78, 0.25), 0.25, Metallic=0.85)
    honey = mat("honey", (1.0, 0.66, 0.1), 0.12, emit=0.5, **{"Coat Weight": 1.0})
    cyl((0, 0, 0.12), 0.62, 0.24, stone, verts=10); cyl((0, 0, 0.25), 0.55, 0.03, honey, verts=10)
    cyl((0, 0, 0.5), 0.09, 0.5, stone, verts=8)
    cyl((0, 0, 0.78), 0.34, 0.1, gold, verts=10); cyl((0, 0, 0.84), 0.3, 0.02, honey, verts=10)
    cyl((0, 0, 0.98), 0.05, 0.3, gold, verts=6); ico((0, 0, 1.18), (0.12, 0.12, 0.14), gold, sub=2)
    for i in range(6):
        a = 2 * math.pi * i / 6
        rope([(math.cos(a) * 0.3, math.sin(a) * 0.3, 0.84), (math.cos(a) * 0.45, math.sin(a) * 0.45, 0.6), (math.cos(a) * 0.5, math.sin(a) * 0.5, 0.28)], 0.022, honey)
    for i in range(5):
        a = 2 * math.pi * i / 5 + 0.3
        ico((math.cos(a) * 0.6, math.sin(a) * 0.6 - 0.05, 0.26), (0.05, 0.05, 0.03), gold)
# ---------------- garden decorations ----------------
def mushroom():
    stem_m = mat("mst", (1.0, 0.96, 0.88), 0.6); cap = mat("cap", (0.92, 0.2, 0.18), 0.45); dot = mat("dot", (1.0, 1.0, 0.97), 0.5)
    for (x, y, s) in ((0, 0, 1.0), (0.42, 0.1, 0.6)):
        cone((x, y, 0.3 * s), 0.13 * s, 0.1 * s, 0.6 * s, stem_m, verts=8)
        o = ico((x, y, 0.62 * s), (0.42 * s, 0.42 * s, 0.24 * s), cap, sub=2)
        for i in range(6):
            a = 2 * math.pi * i / 6 + s
            ico((x + math.cos(a) * 0.27 * s, y + math.sin(a) * 0.27 * s - 0.04, 0.72 * s), (0.05 * s, 0.05 * s, 0.03 * s), dot)
        ico((x, y - 0.05, 0.82 * s), (0.06 * s,) * 3, dot)
    tuft(-0.35, -0.05); tuft(0.62, -0.1)
def bench():
    w = mat("plank", WOOD, 0.6); d = mat("leg", DWOOD, 0.6)
    for i in range(3): box((0, 0.12 * i - 0.12, 0.45), (1.3, 0.1, 0.05), w)
    for i in range(2): box((0, 0.2, 0.68 + 0.16 * i), (1.3, 0.04, 0.1), w, rot=(0.15, 0, 0))
    for sx in (-1, 1):
        box((sx * 0.55, 0, 0.22), (0.07, 0.34, 0.44), d); box((sx * 0.55, 0.22, 0.6), (0.06, 0.05, 0.55), d)
    ico((0.25, -0.05, 0.52), (0.09, 0.09, 0.08), mat("pot", (1.0, 0.7, 0.15), 0.25, **{"Coat Weight": 1.0}))
def pinwheel():
    stick = mat("stick", (0.95, 0.92, 0.85), 0.5)
    cyl((0, 0, 0.6), 0.03, 1.2, stick, verts=6)
    cols = [(1.0, 0.4, 0.5), (0.4, 0.7, 1.0), (1.0, 0.82, 0.25), (0.45, 0.85, 0.45)]
    c = Vector((0, -0.06, 1.15))
    for i in range(4):
        a = math.pi / 2 * i + 0.4
        o = cone(c + Vector((math.cos(a) * 0.2, 0, math.sin(a) * 0.2)), 0.2, 0, 0.42, mat(f"b{i}", cols[i], 0.5), verts=3, rot=(math.pi / 2, 0, 0))
        o.rotation_euler = Euler((math.pi / 2, -a + math.pi / 2, 0)); o.scale = (1, 1, 0.12)
    ico(c + Vector((0, -0.05, 0)), (0.06,) * 3, mat("pin", (1.0, 0.8, 0.2), 0.3, Metallic=0.6))
    tuft(0.12, 0.05)
def gnome():
    blue = mat("coat", (0.25, 0.45, 0.85), 0.6); red = mat("hat", (0.88, 0.2, 0.2), 0.55); skin = mat("skin", (1.0, 0.8, 0.66), 0.6)
    beard = mat("beard", (0.98, 0.97, 0.94), 0.75); boot = mat("boot", (0.35, 0.22, 0.12))
    cone((0, 0, 0.3), 0.32, 0.2, 0.55, blue, verts=8)
    for sx in (-1, 1): ico((sx * 0.13, -0.05, 0.04), (0.11, 0.15, 0.07), boot)
    ico((0, -0.02, 0.68), (0.22, 0.2, 0.2), skin, sub=2)
    cone((0, -0.12, 0.5), 0.2, 0.04, 0.38, beard, verts=6, rot=(math.pi + 0.25, 0, 0))
    ico((0, -0.22, 0.68), (0.06, 0.05, 0.05), mat("nose", (1.0, 0.6, 0.55), 0.5))
    cone((0, 0.02, 1.02), 0.24, 0.0, 0.62, red, verts=8, rot=(-0.15, 0, 0))
    for sx in (-1, 1): ico((sx * 0.08, -0.2, 0.75), (0.025,) * 3, mat("eye", (0.1, 0.06, 0.04)))
    pot = mat("hpot", (1.0, 0.7, 0.18), 0.25, **{"Coat Weight": 1.0})
    ico((0.3, -0.12, 0.32), (0.14, 0.14, 0.13), pot, sub=2); cyl((0.3, -0.12, 0.45), 0.08, 0.05, mat("lid", WOOD), verts=8)
    for sx in (-1, 1): ico((sx * 0.28, -0.08, 0.38), (0.07, 0.07, 0.12), blue)
# ---------------- surprise combs ----------------
def comb(kind):
    look = {
        "wood": dict(body=(0.66, 0.43, 0.22), cap=(0.86, 0.62, 0.34), rim=(0.42, 0.26, 0.12), rough=0.7, metal=0.0),
        "wax": dict(body=(1.0, 0.76, 0.22), cap=(1.0, 0.88, 0.5), rim=(0.93, 0.6, 0.1), rough=0.3, metal=0.0),
        "gold": dict(body=(1.0, 0.76, 0.2), cap=(1.0, 0.88, 0.45), rim=(0.85, 0.5, 0.08), rough=0.18, metal=0.9),
        "royal": dict(body=(0.55, 0.32, 0.85), cap=(0.75, 0.55, 1.0), rim=(1.0, 0.78, 0.25), rough=0.3, metal=0.2),
    }[kind]
    body = mat("cb", look["body"], look["rough"], Metallic=look["metal"])
    cap = mat("cc", look["cap"], max(0.15, look["rough"] - 0.1), Metallic=look["metal"] * 0.8)
    rim = mat("cr", look["rim"], 0.3, Metallic=0.85 if kind != "wood" else 0.0)
    cyl((0, 0, 0.42), 0.62, 0.84, body, verts=6)
    if kind == "wood":
        for z in (0.2, 0.42, 0.64): torus((0, 0, z), 0.625, 0.012, rim, seg=6, rot=(0, 0, math.pi / 6))
    # wax cap: a low hex lid with a cluster of 7 capped cells on top
    cone((0, 0, 0.88), 0.6, 0.5, 0.1, cap, verts=6)
    cell = mat("cell", look["cap"], max(0.12, look["rough"] - 0.15), Metallic=look["metal"] * 0.8)
    edge = mat("cedge", look["rim"], 0.35, Metallic=0.6 if kind != "wood" else 0.0)
    for (q, r_) in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1)):
        x = 0.25 * (q + r_ / 2) * 0.98; y = 0.25 * (r_ * math.sqrt(3) / 2) * 0.98
        cyl((x, y, 0.95), 0.125, 0.05, edge, verts=6, rot=(0, 0, math.pi / 6))
        cone((x, y, 0.985), 0.108, 0.06, 0.04, cell, verts=6, rot=(0, 0, math.pi / 6))
    torus((0, 0, 0.84), 0.6, 0.04, rim, seg=6, rot=(0, 0, math.pi / 6)); torus((0, 0, 0.02), 0.6, 0.04, rim, seg=6, rot=(0, 0, math.pi / 6))
    if kind in ("wax", "gold"):
        drip = mat("drip", (1.0, 0.68, 0.12) if kind == "wax" else (1.0, 0.85, 0.35), 0.12, emit=0.2, **{"Coat Weight": 1.0})
        for i, (a, l) in enumerate(((-1.9, 0.28), (-1.3, 0.16), (-0.6, 0.34), (0.4, 0.2))):
            x, y = math.cos(a) * 0.6, math.sin(a) * 0.6
            cone((x, y, 0.86 - l / 2), 0.05, 0.025, l, drip, verts=6); ico((x, y, 0.86 - l), (0.05, 0.05, 0.065), drip)
    if kind == "gold":
        for i, c in enumerate(((0.95, 0.2, 0.35), (0.25, 0.6, 1.0), (0.3, 0.85, 0.4))):
            a = -math.pi / 2 + (i - 1) * 0.55
            ico((math.cos(a) * 0.6, math.sin(a) * 0.6, 0.45), (0.07, 0.04, 0.09), mat(f"g{i}", c, 0.1, emit=0.4))
    if kind == "royal":
        gold = mat("crown", (1.0, 0.78, 0.25), 0.2, Metallic=0.9)
        cyl((0, 0, 1.05), 0.26, 0.12, gold, verts=10)
        for i in range(5):
            a = 2 * math.pi * i / 5 + 0.3
            cone((math.cos(a) * 0.24, math.sin(a) * 0.24, 1.2), 0.07, 0, 0.18, gold, verts=4)
        ico((0, -0.27, 1.05), (0.05, 0.03, 0.06), mat("rj", (0.95, 0.2, 0.35), 0.1, emit=0.4))
        for i in range(6):
            a = 2 * math.pi * i / 6
            ico((math.cos(a) * 0.6, math.sin(a) * 0.6, 0.45), (0.05, 0.05, 0.05), gold)
    turn_all(-20)

JOBS = {
    "deco_flags": flags, "deco_lanterns": lanterns, "deco_barrel": barrel, "deco_fountain": fountain,
    "deco_mushroom": mushroom, "deco_bench": bench, "deco_pinwheel": pinwheel, "deco_gnome": gnome,
    "box_wood": lambda: comb("wood"), "box_wax": lambda: comb("wax"), "box_gold": lambda: comb("gold"), "box_royal": lambda: comb("royal"),
}
if __name__ == "__main__":
    a = sys.argv[sys.argv.index("--") + 1:]
    out, size, only = a[0], int(a[1]), a[2:]
    os.makedirs(out, exist_ok=True)
    for name, fn in JOBS.items():
        if only and name not in only: continue
        reset(); fn()
        isbox = name.startswith("box_")
        scene(size, el=36 if isbox else 16, zoom=0.6 if isbox else 0.78, target=(0, 0, 0.5 if isbox else 0.62))
        bpy.context.scene.render.filepath = os.path.join(out, name + ".png")
        bpy.ops.render.render(write_still=True); print("RENDERED", name, flush=True)
