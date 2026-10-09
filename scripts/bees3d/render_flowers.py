"""Buzzle v1.2 low-poly garden flowers (Blender/Cycles headless).
Usage: blender -b -noaudio --python render_flowers.py -- out_dir size
Renders <kind>_<stage>.png for kinds sunflower/clover/lavender/cornflower/mint and stages sprout/bud/bloom
(sprout is shared), plus a nectar drop icon."""
import bpy, sys, math, os
from mathutils import Vector, Euler

def srgb(c): return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)
def mat(name, color, rough=0.5, emit=0.0, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*srgb(color), 1); b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*srgb(color), 1); b.inputs["Emission Strength"].default_value = emit
    for k, v in kw.items(): b.inputs[k].default_value = v
    return m
def ico(loc, scale, m, sub=1, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=1, location=loc); o = bpy.context.object
    o.scale = scale; o.rotation_euler = rot; bpy.ops.object.shade_flat(); o.data.materials.append(m); return o
def cone(loc, r1, r2, d, m, verts=5, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=d, location=loc, rotation=rot); o = bpy.context.object
    bpy.ops.object.shade_flat(); o.data.materials.append(m); return o
def stem(h, m, x=0.0, lean=0.0):
    return cone((x + lean * h / 2, 0, h / 2), 0.05, 0.035, h, m, verts=5, rot=(0, lean, 0))
def leaf(loc, ang, s, m, tilt=0.5):
    return ico(loc, (0.32 * s, 0.07 * s, 0.13 * s), m, rot=(0, -tilt if ang > 0 else tilt, 0 if ang > 0 else math.pi))

def scene(size, el=18, zoom=1.0, target=(0, 0, 0.75)):
    sc = bpy.context.scene
    cam_d = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
    e = math.radians(el); d = 12
    cam.location = (0, -d * math.cos(e) + target[1], target[2] + d * math.sin(e)); cam.rotation_euler = (math.pi / 2 - e, 0, 0)
    cam_d.sensor_width = 36; cam_d.lens = 140 * 1.9 * zoom
    def area(loc, energy, sz, color):
        ld = bpy.data.lights.new("l", "AREA"); ld.energy = energy; ld.size = sz; ld.color = color
        lo = bpy.data.objects.new("l", ld); sc.collection.objects.link(lo); lo.location = loc
        lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    area((-4, -6, 6), 1100, 5, (1.0, 0.93, 0.82)); area((6, -5, 2), 380, 6, (0.9, 0.92, 1.0)); area((3, 5, 5), 700, 3, (1.0, 0.9, 0.7))
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (*srgb((1.0, 0.94, 0.82)), 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.55
    r = sc.render; r.engine = "CYCLES"; r.film_transparent = True; sc.cycles.samples = 64; sc.cycles.use_denoising = True; sc.cycles.device = "CPU"
    r.resolution_x = r.resolution_y = size; r.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"; sc.view_settings.exposure = -0.35; r.threads_mode = "FIXED"; r.threads = 8

def reset(): bpy.ops.wm.read_factory_settings(use_empty=True)

GREEN = (0.32, 0.72, 0.3); DGREEN = (0.2, 0.55, 0.25)
def sprout():
    g = mat("g", GREEN); stem(0.35, g)
    leaf((-0.17, 0, 0.38), -1, 0.8, g, 0.35); leaf((0.17, 0, 0.42), 1, 0.9, g, 0.35)
def base_plant(h, leaves=2):
    g = mat("g", GREEN); stem(h, g)
    for i in range(leaves):
        sx = -1 if i % 2 == 0 else 1
        leaf((sx * 0.2, 0, 0.25 + 0.22 * i), sx, 1.0, g, 0.4)
    return g
def sunflower(stage):
    base_plant(1.15, 3)
    if stage == "bud":
        ico((0, 0, 1.2), (0.16, 0.14, 0.16), mat("b", (0.45, 0.7, 0.25)))
        for i in range(6):
            a = 2 * math.pi * i / 6; ico((math.cos(a) * 0.08, -0.06, 1.24 + math.sin(a) * 0.08), (0.06, 0.04, 0.09), mat("p", (1.0, 0.8, 0.15)))
        return
    pm = mat("p", (1.0, 0.78, 0.1)); c = Vector((0, -0.05, 1.25))
    for i in range(14):
        a = 2 * math.pi * i / 14
        ico(c + Vector((math.cos(a) * 0.3, 0, math.sin(a) * 0.3)), (0.17, 0.04, 0.08), pm, rot=(0, -a, 0))
    ico(c + Vector((0, -0.05, 0)), (0.2, 0.07, 0.2), mat("c", (0.42, 0.24, 0.08)))
def clover(stage):
    g = base_plant(0.85, 2)
    for i in range(3):
        a = math.radians(90 + 120 * i)
        for s2 in (-1, 1):
            b = a + s2 * 0.4
            ico((math.cos(b) * 0.2 - 0.3, -0.05, 0.4 + math.sin(b) * 0.12), (0.12, 0.04, 0.09), g, rot=(0, -b, 0))
    pk = mat("pk", (1.0, 0.45, 0.68)); lp = mat("lp", (1.0, 0.72, 0.85))
    n = 6 if stage == "bud" else 22; R = 0.12 if stage == "bud" else 0.22
    for i in range(n):
        u = (i + 0.5) / n; th = math.acos(1 - 2 * u); ph = i * 2.4
        p = Vector((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th))) * R
        ico(Vector((0, 0, 0.98)) + p, (0.07, 0.07, 0.07), pk if i % 3 else lp)
def lavender(stage):
    g = mat("g", GREEN); pm = mat("lv", (0.6, 0.42, 0.92)); pl = mat("lv2", (0.75, 0.6, 1.0))
    for k, (x, lean, h) in enumerate(((0, 0, 1.15), (-0.18, -0.22, 0.95), (0.18, 0.22, 1.0))):
        stem(h, g, x, lean)
        top = Vector((x + math.sin(lean) * h, 0, math.cos(lean) * h))
        n = 3 if stage == "bud" else 7
        for i in range(n):
            t = i / max(1, n - 1); p = top - Vector((math.sin(lean), 0, math.cos(lean))) * (0.45 * t) * (0.5 if stage == "bud" else 1)
            s = 0.075 * (1 - 0.35 * t) if stage == "bloom" else 0.055
            ico(p, (s, s, s * 1.2), pm if i % 2 else pl, rot=(0, lean, 0))
    for sx in (-1, 1): leaf((sx * 0.15, 0, 0.2), sx, 0.9, g, 0.8)
def cornflower(stage):
    base_plant(1.05, 2)
    c = Vector((0, -0.04, 1.12))
    if stage == "bud":
        ico(c, (0.1, 0.09, 0.13), mat("b", (0.35, 0.55, 0.35))); ico(c + Vector((0, 0, 0.1)), (0.07, 0.06, 0.06), mat("bb", (0.3, 0.45, 0.98))); return
    pm = mat("p", (0.25, 0.45, 0.98)); pl = mat("p2", (0.45, 0.65, 1.0))
    for i in range(10):
        a = 2 * math.pi * i / 10
        o = cone(c + Vector((math.cos(a) * 0.18, 0, math.sin(a) * 0.18)), 0.09, 0.0, 0.3, pm if i % 2 else pl, verts=4)
        o.rotation_euler = Euler((0, math.pi / 2 - a, 0)); o.rotation_euler.rotate(Euler((0, 0, 0)))
        o.rotation_euler = Euler((math.pi / 2, 0, 0)); o.rotation_euler.rotate_axis("Y", 0)
        o.rotation_euler = (0, -a - math.pi / 2, 0)
    ico(c + Vector((0, -0.05, 0)), (0.09, 0.06, 0.09), mat("c", (0.22, 0.12, 0.45)))
def mint(stage):
    g = mat("g", (0.3, 0.75, 0.42)); g2 = mat("g2", (0.45, 0.85, 0.5))
    for k, (x, lean, h) in enumerate(((0, 0, 0.9), (-0.22, -0.3, 0.7), (0.22, 0.3, 0.75))):
        stem(h, g, x, lean)
        for j in range(3):
            t = 0.35 + 0.28 * j; p = Vector((x + math.sin(lean) * h * t, 0, math.cos(lean) * h * t))
            for sx in (-1, 1):
                ico(p + Vector((sx * 0.13, -0.02, 0)), (0.16, 0.05, 0.1), g2 if j % 2 else g, rot=(0, sx * -0.4 + lean, 0))
        top = Vector((x + math.sin(lean) * h, 0, math.cos(lean) * h))
        if stage == "bloom":
            for i in range(4):
                ico(top + Vector((0, -0.02, 0.06 * i)), (0.06, 0.06, 0.06), mat("w", (0.93, 0.88, 1.0)))
        else:
            ico(top, (0.08, 0.06, 0.1), g2)
def nectar():
    m = mat("n", (1.0, 0.42, 0.62), 0.08, IOR=1.4, **{"Transmission Weight": 0.55, "Coat Weight": 1.0})
    o = ico((0, 0, 0.75), (0.42, 0.42, 0.42), m, sub=2)
    c = cone((0, 0, 1.25), 0.36, 0.0, 0.6, m, verts=10)
    ico((-0.14, -0.33, 0.9), (0.08, 0.05, 0.11), mat("hi", (1, 1, 1), emit=5))

def moonpoppy(stage):
    """v1.3 rare: лунный мак — silvery-blue poppy with a glowing centre"""
    base_plant(1.1, 2)
    c = Vector((0, -0.05, 1.18))
    if stage == "bud":
        ico(c, (0.13, 0.11, 0.17), mat("b", (0.4, 0.6, 0.45))); ico(c + Vector((0, -0.02, 0.1)), (0.08, 0.07, 0.08), mat("bb", (0.55, 0.6, 1.0), emit=0.3)); return
    pm = mat("p", (0.45, 0.52, 0.98), 0.35, emit=0.15); pl = mat("p2", (0.72, 0.78, 1.0), 0.35, emit=0.2)
    for i in range(6):
        a = 2 * math.pi * i / 6 + 0.3
        ico(c + Vector((math.cos(a) * 0.22, 0.02 * (i % 2), math.sin(a) * 0.22)), (0.24, 0.05, 0.17), pm if i % 2 else pl, rot=(0, -a, 0))
    ico(c + Vector((0, -0.06, 0)), (0.1, 0.07, 0.1), mat("c", (1.0, 0.95, 0.65), emit=2.2))
    for i in range(6):
        a = 2 * math.pi * i / 6
        ico(c + Vector((math.cos(a) * 0.12, -0.1, math.sin(a) * 0.12)), (0.02,) * 3, mat("st", (0.25, 0.2, 0.45)))
def goldsun(stage):
    """v1.3 rare: золотой подсолнух — metallic gold petals, honey centre"""
    base_plant(1.25, 3)
    if stage == "bud":
        ico((0, 0, 1.3), (0.18, 0.15, 0.18), mat("b", (0.5, 0.72, 0.25)))
        for i in range(6):
            a = 2 * math.pi * i / 6; ico((math.cos(a) * 0.09, -0.07, 1.34 + math.sin(a) * 0.09), (0.07, 0.04, 0.1), mat("p", (1.0, 0.82, 0.2), 0.25, Metallic=0.8))
        return
    pm = mat("p", (1.0, 0.8, 0.2), 0.22, Metallic=0.85); pd = mat("pd", (1.0, 0.62, 0.08), 0.25, Metallic=0.8)
    c = Vector((0, -0.05, 1.32))
    for i in range(16):
        a = 2 * math.pi * i / 16
        ico(c + Vector((math.cos(a) * 0.33, 0.01 * (i % 2), math.sin(a) * 0.33)), (0.19, 0.04, 0.085), pm if i % 2 else pd, rot=(0, -a, 0))
    ico(c + Vector((0, -0.05, 0)), (0.22, 0.08, 0.22), mat("c", (0.85, 0.45, 0.05), 0.2, emit=0.4))
    ico(c + Vector((-0.07, -0.13, 0.08)), (0.05, 0.03, 0.05), mat("hi", (1, 1, 1), emit=4))

if __name__ == "__main__":
    out, size = sys.argv[sys.argv.index("--") + 1], int(sys.argv[sys.argv.index("--") + 2])
    os.makedirs(out, exist_ok=True)
    jobs = [("sprout", lambda: sprout(), 1.7)]
    only = sys.argv[sys.argv.index("--") + 3:]   # optional: render only these names
    for name, fn in (("sunflower", sunflower), ("clover", clover), ("lavender", lavender), ("cornflower", cornflower), ("mint", mint), ("moonpoppy", moonpoppy), ("goldsun", goldsun)):
        for st in ("bud", "bloom"):
            jobs.append((f"{name}_{st}", (lambda fn=fn, st=st: fn(st)), 1.0))
    jobs.append(("nectar", nectar, 1.0))
    for name, fn, zoom in jobs:
        if only and name not in only: continue
        reset(); fn()
        scene(size, zoom=zoom, target=(0, 0, 0.3 if name == "sprout" else (0.72 if name != "nectar" else 0.85)))
        bpy.context.scene.render.filepath = os.path.join(out, name + ".png")
        bpy.ops.render.render(write_still=True); print("RENDERED", name, flush=True)
