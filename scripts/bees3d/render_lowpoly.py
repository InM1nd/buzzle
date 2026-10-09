"""Buzzle v1.2 low-poly bees, rendered with Blender/Cycles (headless) into layers for the RN Animated pipeline.

Usage: blender -b -noaudio --python render_lowpoly.py -- jobs.json
A job = {species, view(yaw deg), size, out_dir, passes:[body|eyes|wings|gold|crown|full|flower], ...}
Every pass renders the same camera frame (bee centred, transparent film), so the layers stack 1:1.
The script also writes <out_dir>/<species>_<yaw>.json with projected anchors (wing pivots, eye centre)
in frame pixels, used by scripts/bees3d/pack.py to build src/ui/beeArt.ts.
"""
import bpy, sys, json, math, os
from mathutils import Vector, Euler
from bpy_extras.object_utils import world_to_camera_view

def srgb(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

#            body colour         stripe colour       width  extras
SPECIES = {
    "zhuzha":    dict(body=(1.0, 0.79, 0.24), stripe=(0.29, 0.17, 0.07)),
    "pushinka":  dict(body=(1.0, 0.95, 0.80), stripe=(0.72, 0.52, 0.33), fluff=True),
    "boris":     dict(body=(1.0, 0.62, 0.20), stripe=(0.23, 0.14, 0.08), wide=1.14, tail=(1.0, 0.98, 0.94)),
    "solnyshko": dict(body=(1.0, 0.91, 0.32), stripe=(0.93, 0.45, 0.08), acc="sunflower"),
    "klevera":   dict(body=(1.0, 0.72, 0.80), stripe=(0.80, 0.25, 0.47), acc="clover"),
    "lavanda":   dict(body=(0.82, 0.75, 1.0), stripe=(0.42, 0.25, 0.77), acc="lavender"),
    "vasilek":   dict(body=(0.52, 0.70, 1.0), stripe=(0.13, 0.22, 0.58), acc="cornflower"),
    "myatka":    dict(body=(0.62, 0.92, 0.66), stripe=(0.12, 0.45, 0.24), acc="mint"),
    "iskorka":   dict(body=(1.0, 0.47, 0.40), stripe=(0.45, 0.10, 0.12), acc="stars"),
    "sonya":     dict(body=(0.50, 0.52, 0.80), stripe=(0.14, 0.15, 0.36), acc="mask", sleepy=True),
    "zorkaya":   dict(body=(0.33, 0.80, 0.80), stripe=(0.06, 0.30, 0.34), acc="goggles"),
    "margo":     dict(body=(0.62, 0.40, 0.88), stripe=(1.0, 0.78, 0.25), wide=1.07, acc="ruff"),
}

def mat(name, color, rough=0.45, emit=0.0, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*srgb(color), 1)
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*srgb(color), 1); b.inputs["Emission Strength"].default_value = emit
    for k, v in kw.items(): b.inputs[k].default_value = v
    return m, b

def stripe_material(sp, C):
    m, b = mat("body", sp["body"], 0.45)
    nt = m.node_tree; N = nt.nodes; L = nt.links
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ"); L.new(tc.outputs["Object"], sep.inputs[0])
    mp = N.new("ShaderNodeMapRange"); mp.inputs["From Min"].default_value = -1.1 * C; mp.inputs["From Max"].default_value = 1.1 * C
    L.new(sep.outputs["Z"], mp.inputs["Value"])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
    L.new(mp.outputs["Result"], ramp.inputs[0])
    body, stripe = (*srgb(sp["body"]), 1), (*srgb(sp["stripe"]), 1)
    stops = [(0.0, body)]
    bands = [(0.13, 0.25), (0.36, 0.46)]
    if "tail" in sp:
        tail = (*srgb(sp["tail"]), 1)
        stops = [(0.0, tail), (0.115, body)]
        bands = [(0.12, 0.24), (0.35, 0.45)]
    for a, z in bands:
        stops += [(a, stripe), (z, body)]
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = stops[0]
    e[1].position, e[1].color = stops[1]
    for p_, c_ in stops[2:]:
        el = e.new(p_); el.color = c_
    L.new(ramp.outputs["Color"], b.inputs["Base Color"])
    return m

def ico(name, loc, scale, m, sub=1, rot=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = scale
    bpy.ops.object.shade_flat(); o.data.materials.append(m)
    if rot is not None: o.rotation_euler = rot
    return o

def cone(name, loc, r1, r2, depth, m, verts=6, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; bpy.ops.object.shade_flat(); o.data.materials.append(m)
    return o

def cyl(name, loc, r, depth, m, verts=8, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; bpy.ops.object.shade_flat(); o.data.materials.append(m)
    return o

def torus(name, loc, R, r, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=10, minor_segments=5, major_radius=R, minor_radius=r, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; bpy.ops.object.shade_flat(); o.data.materials.append(m)
    return o

def curve(name, pts, bevel, m):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = bevel; cu.bevel_resolution = 0
    cu.resolution_u = 3; cu.use_fill_caps = True
    s = cu.splines.new("NURBS"); s.points.add(len(pts) - 1)
    for p, q in zip(s.points, pts): p.co = (*q, 1)
    s.use_endpoint_u = True; s.order_u = min(4, len(pts))
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o); cu.materials.append(m)
    return o

def star_mesh(name, loc, r, m, rot=(math.pi / 2, 0, 0)):
    import bmesh
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    outer = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5; rr = r if i % 2 == 0 else r * 0.45
        outer.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, 0)))
    top = bm.verts.new((0, 0, r * 0.35)); bot = bm.verts.new((0, 0, -r * 0.35))
    for i in range(10):
        a, b_ = outer[i], outer[(i + 1) % 10]
        bm.faces.new((a, b_, top)); bm.faces.new((b_, a, bot))
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.location = loc; o.rotation_euler = rot; me.materials.append(m)
    return o

def build(job):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    spid = job["species"]; sp = SPECIES[spid]; wide = sp.get("wide", 1.0)
    sc = bpy.context.scene
    root = bpy.data.objects.new("bee", None); sc.collection.objects.link(root)
    A, B, C = 0.9 * wide, 0.82 * wide ** 0.5, 1.0
    def front(x, z, out=0.0):
        t = 1 - (x / A) ** 2 - (z / C) ** 2
        y = -B * math.sqrt(max(t, 0.0))
        n = Vector((x / A ** 2, y / B ** 2, z / C ** 2)).normalized()
        return Vector((x, y, z)) + n * out, n
    def surf(x, z, out=0.0):  # any point on the front/back hemisphere by angle
        return front(x, z, out)

    groups = {"body": [], "eyes": [], "wingL": [], "wingR": [], "goldL": [], "goldR": [], "crown": []}
    body = ico("body", (0, 0, 0), (A, B, C), stripe_material(sp, C), sub=2)
    groups["body"].append(body)
    dark_m, _ = mat("dark", (0.22, 0.12, 0.06), 0.5)
    eye_m, _ = mat("eye", (0.07, 0.045, 0.03), 0.12)
    hi_m, hb = mat("hi", (1, 1, 1), 0.3, emit=6)
    cheek_m, _ = mat("cheek", (1.0, 0.52, 0.58), 0.6)
    gold_m, _ = mat("gold", (1.0, 0.76, 0.22), 0.25, Metallic=0.85)
    white_m, _ = mat("white", (1.0, 0.98, 0.94), 0.6)
    G = groups["body"]

    # eyes (separate layer) or sleepy closed eyes (in the body)
    er = 0.15
    for sx in (-1, 1):
        p, n = front(sx * 0.34, 0.3, -er * 0.25)
        if sp.get("sleepy"):
            pts = []
            for i in range(5):
                t = -1 + 2 * i / 4
                q, _ = front(sx * 0.34 + t * 0.11, 0.27 - 0.045 * (1 - t * t), 0.012); pts.append(tuple(q))
            G.append(curve(f"closed{sx}", pts, 0.026, dark_m))
        else:
            groups["eyes"] += [
                ico(f"eye{sx}", p, (er, er * 0.62, er * 1.12), eye_m),
                ico(f"hi{sx}", p + Vector((0.045, -er * 0.75, er * 0.45)), (er * 0.3,) * 3, hi_m),
                ico(f"hi2{sx}", p + Vector((-0.04, -er * 0.72, -er * 0.4)), (er * 0.13,) * 3, hi_m),
            ]
        cp, cn = front(sx * 0.56, 0.06, -0.035)
        ch = ico(f"cheek{sx}", cp, (0.12, 0.05, 0.085), cheek_m)
        ch.rotation_euler = Vector((0, -1, 0)).rotation_difference(-cn).to_euler(); G.append(ch)
    pts = []
    for i in range(7):
        t = -1 + 2 * i / 6
        q, _ = front(t * 0.13, 0.13 - 0.06 * (1 - t * t), 0.012); pts.append(tuple(q))
    G.append(curve("smile", pts, 0.024, dark_m))
    # antennae
    tips = []
    for sx in (-1, 1):
        a0, _ = front(sx * 0.22, 0.93, -0.03)
        pts = [tuple(a0), (sx * 0.3, a0.y - 0.05, 1.25), (sx * 0.44, a0.y - 0.08, 1.48), (sx * 0.56, a0.y - 0.06, 1.58)]
        G.append(curve(f"ant{sx}", pts, 0.032, dark_m)); tips.append(Vector(pts[-1]))
    acc = sp.get("acc")
    for i, tp in enumerate(tips):
        if acc == "stars":
            G.append(star_mesh(f"star{i}", tp, 0.23, mat("starm", (1.0, 0.8, 0.2), 0.25, emit=0.6, Metallic=0.5)[0]))
        elif sp.get("sleepy"):
            G.append(ico(f"moon{i}", tp, (0.12,) * 3, mat("moon", (1.0, 0.9, 0.45), 0.4, emit=0.4)[0]))
        else:
            G.append(ico(f"tip{i}", tp, (0.085,) * 3, dark_m))
    G.append(cone("sting", (0, 0.02, -C - 0.08), 0.11, 0, 0.26, mat("sting", (0.25, 0.15, 0.08), 0.35)[0], verts=8, rot=(math.pi, 0, 0)))
    for sx in (-1, 1):
        fp, _ = front(sx * 0.28, -0.88, -0.02)
        G.append(ico(f"foot{sx}", fp + Vector((0, 0, -0.06)), (0.09, 0.08, 0.07), dark_m))

    # species accessories (low-poly)
    hx = 0.44 * wide; head = Vector((hx, -0.3, 0.88)); K = 1.55
    def flower(center, petal, mid, n, pr=0.13, ps=(0.12, 0.04, 0.075), pointy=False):
        pr *= K; ps = tuple(x * K for x in ps)
        pm, _ = mat("petal", petal, 0.45); cm, _ = mat("fmid", mid, 0.45)
        for i in range(n):
            a = 2 * math.pi * i / n
            pp = center + Vector((math.cos(a) * pr, -0.02, math.sin(a) * pr))
            if pointy:
                o = cone(f"petal{i}", pp, ps[0], 0, ps[1], pm, verts=4, rot=(0, -a + math.pi / 2, 0))
                o.rotation_euler.rotate(Euler((math.radians(-90), 0, 0))); o.rotation_euler = (math.pi / 2, a - math.pi / 2, 0)
            else:
                o = ico(f"petal{i}", pp, ps, pm); o.rotation_euler = (0, -a, 0)
                o.rotation_euler.rotate(Euler((math.radians(-20), 0, math.radians(-15))))
            G.append(o)
        G.append(ico("fmid", center + Vector((0, -0.05, 0)), (0.075 * K, 0.05 * K, 0.075 * K), cm))
    if acc == "lavender":
        flower(head, (0.61, 0.45, 0.95), (0.98, 0.93, 1.0), 5)
    elif acc == "sunflower":
        flower(head, (1.0, 0.78, 0.1), (0.42, 0.24, 0.08), 10, pr=0.15, ps=(0.1, 0.035, 0.05))
    elif acc == "cornflower":
        pm, _ = mat("petal", (0.25, 0.42, 0.98), 0.45)
        for i in range(8):
            a = 2 * math.pi * i / 8
            pp = head + Vector((math.cos(a) * 0.14 * K, -0.02, math.sin(a) * 0.14 * K))
            o = cone(f"cpetal{i}", pp, 0.06 * K, 0.0, 0.2 * K, pm, verts=4)
            o.rotation_euler = (0, math.pi / 2 - a, 0); o.rotation_euler.rotate(Euler((math.radians(-90), 0, 0)))
            o.rotation_euler = Euler((math.pi / 2, 0, 0)); o.rotation_euler.rotate(Euler((0, -a + math.pi / 2, 0)))
            G.append(o)
        G.append(ico("cmid", head + Vector((0, -0.05, 0)), (0.07 * K, 0.05 * K, 0.07 * K), mat("cm", (0.2, 0.12, 0.45), 0.4)[0]))
    elif acc == "clover":
        lm, _ = mat("leaf", (0.3, 0.75, 0.3), 0.45)
        for i in range(3):
            a = math.radians(90 + 120 * i)
            for s2 in (-1, 1):
                b2 = a + s2 * math.radians(22)
                pp = head + Vector((math.cos(b2) * 0.12 * K, -0.03, math.sin(b2) * 0.12 * K))
                o = ico(f"leaf{i}{s2}", pp, (0.075 * K, 0.03 * K, 0.06 * K), lm); o.rotation_euler = (0, -b2, 0); G.append(o)
        G.append(cyl("stem", head + Vector((0.05, -0.02, -0.12)), 0.018, 0.2, lm, verts=5, rot=(0, math.radians(-20), 0)))
    elif acc == "mint":
        lm, _ = mat("mint", (0.25, 0.72, 0.4), 0.45)
        for i, (a, s_) in enumerate(((math.radians(55), 1.0), (math.radians(120), 0.85))):
            pp = head + Vector((math.cos(a) * 0.12 * K - 0.04, -0.02, math.sin(a) * 0.12 * K - 0.04))
            o = ico(f"mint{i}", pp, (0.17 * s_ * K, 0.035 * K, 0.08 * s_ * K), lm); o.rotation_euler = (0, -a, 0); G.append(o)
        G.append(ico("mintbud", head + Vector((-0.02, -0.04, -0.02)), (0.05, 0.04, 0.05), mat("mb", (0.75, 0.95, 0.8), 0.4)[0]))
    elif acc == "mask":
        mm, _ = mat("mask", (1.0, 0.6, 0.72), 0.55)
        for sx in (-1, 1):
            p, n = front(sx * 0.26, 0.66, 0.02)
            o = ico(f"mask{sx}", p, (0.22, 0.07, 0.14), mm); o.rotation_euler = Vector((0, -1, 0)).rotation_difference(-n).to_euler(); G.append(o)
        pts = []
        for i in range(9):
            t = -1 + 2 * i / 8
            q, _ = front(t * 0.8 * A, 0.62 + 0.04 * (1 - t * t), 0.015); pts.append(tuple(q))
        G.append(curve("strap", pts, 0.045, mm))
    elif acc == "goggles":
        fm, _ = mat("frame", (0.45, 0.25, 0.1), 0.4); gm, _ = mat("glass", (0.55, 0.85, 1.0), 0.05, emit=0.4)
        for sx in (-1, 1):
            p, n = front(sx * 0.25, 0.68, 0.03)
            rot = Vector((0, 0, 1)).rotation_difference(-n).to_euler()
            G.append(torus(f"gog{sx}", p, 0.13, 0.035, fm, rot=rot))
            o = cyl(f"lens{sx}", p, 0.12, 0.02, gm, verts=10, rot=rot); G.append(o)
        pts = []
        for i in range(9):
            t = -1 + 2 * i / 8
            q, _ = front(t * 0.86 * A, 0.66, 0.01); pts.append(tuple(q))
        G.append(curve("gstrap", pts, 0.028, fm))
    elif acc == "ruff":
        for i in range(13):
            t = -1 + 2 * i / 12
            p, n = front(t * 0.78 * A, -0.12 - 0.05 * (1 - t * t), 0.02)
            G.append(ico(f"ruff{i}", p, (0.11, 0.07, 0.09), white_m))
        G.append(ico("gem", front(0, -0.22, 0.05)[0], (0.07, 0.05, 0.09), mat("gem", (0.95, 0.2, 0.35), 0.1, emit=0.3)[0], sub=1))
    if sp.get("fluff"):
        fm, _ = mat("fluff", (1.0, 1.0, 0.97), 0.7)
        for i, (x, z, s_) in enumerate(((0, 1.0, 0.16), (-0.13, 0.97, 0.12), (0.14, 0.98, 0.13), (0.05, 1.08, 0.1))):
            G.append(ico(f"tuft{i}", (x, -0.08, z), (s_, s_ * 0.9, s_), fm))
        for i in range(12):
            t = -1 + 2 * i / 11
            p, n = front(t * 0.8 * A, -0.08 - 0.04 * (1 - t * t), 0.02)
            G.append(ico(f"fl{i}", p, (0.1, 0.07, 0.085), fm))

    # wings (pivot at the root, as in the design board)
    def wing_mat(name, base, rim, gold=False):
        m, b = mat(name, base, 0.08, IOR=1.25)
        b.inputs["Transmission Weight"].default_value = 0.6 if gold else 1.0
        b.inputs["Alpha"].default_value = 0.85 if gold else 0.75
        if gold:
            b.inputs["Thin Film Thickness"].default_value = 520; b.inputs["Thin Film IOR"].default_value = 1.5
            b.inputs["Metallic"].default_value = 0.35
            b.inputs["Emission Color"].default_value = (*srgb((1.0, 0.85, 0.4)), 1); b.inputs["Emission Strength"].default_value = 0.35
        nt = m.node_tree; lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.25
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
        mix.inputs[6].default_value = (*srgb(base), 1); mix.inputs[7].default_value = (*srgb(rim), 1)
        nt.links.new(lw.outputs["Facing"], mix.inputs[0]); nt.links.new(mix.outputs[2], b.inputs["Base Color"])
        return m
    wm = wing_mat("wing", (0.93, 0.97, 1.0), (0.55, 0.75, 0.92))
    gm = wing_mat("goldwing", (1.0, 0.88, 0.5), (0.95, 0.55, 0.15), gold=True)
    pivots = {}
    for sx, key in ((-1, "L"), (1, "R")):
        piv = bpy.data.objects.new(f"wpiv{sx}", None); sc.collection.objects.link(piv)
        piv.location = (sx * 0.42 * wide, 0.32, 0.62)
        # job["flap"]: extra wing lift in degrees (0 = the in-game rest pose; covers use a mid-flap ~18)
        piv.rotation_euler = (0, -sx * math.radians(22 + job.get("flap", 0)), 0)
        piv.parent = root; pivots[key] = piv
        for m_, grp in ((wm, "wing" + key), (gm, "gold" + key)):
            w = ico(f"{grp}", (0, 0, 0), (0.56, 0.035, 0.37), m_)
            w.parent = piv; w.location = (sx * 0.52, 0, 0.0); w.rotation_euler = (0, 0, sx * math.radians(-12))
            groups[grp].append(w)

    # crown (level 10 overlay)
    cr = Vector((0, -0.06, 0.95)); CK = 1.4
    G2 = groups["crown"]
    G2.append(cyl("cband", cr, 0.3 * CK, 0.12 * CK, gold_m, verts=10))
    for i in range(5):
        a = math.pi / 2 + 2 * math.pi * i / 5 + math.pi / 5
        pp = cr + Vector((math.cos(a) * 0.27 * CK, math.sin(a) * 0.27 * CK, 0.15 * CK))
        G2.append(cone(f"spike{i}", pp, 0.09 * CK, 0.0, 0.2 * CK, gold_m, verts=4))
        G2.append(ico(f"ball{i}", pp + Vector((0, 0, 0.12 * CK)), (0.045 * CK,) * 3, gold_m))
    for i, col in enumerate(((0.95, 0.2, 0.35), (0.25, 0.55, 1.0), (0.3, 0.85, 0.4))):
        a = -math.pi / 2 + (i - 1) * 0.75
        G2.append(ico(f"jewel{i}", cr + Vector((math.cos(a) * 0.3 * CK, math.sin(a) * 0.3 * CK, 0)), (0.06, 0.035, 0.06), mat(f"j{i}", col, 0.1, emit=0.5)[0]))
    for o in G2: o.rotation_euler.rotate(Euler((0, math.radians(-8), 0)))

    for grp in groups.values():
        for o in grp:
            if o.parent is None: o.parent = root
    root.rotation_euler = (math.radians(job.get("pitch", 0)), 0, math.radians(job["view"]))

    cam_d = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
    el = math.radians(8); dist = 14.5
    cam.location = (0, -dist * math.cos(el), 0.32 + dist * math.sin(el)); cam.rotation_euler = (math.pi / 2 - el, 0, 0)
    cam_d.sensor_width = 36; cam_d.lens = 85 * job.get("zoom", 1.95)
    def area(name, loc, energy, size, color):
        ld = bpy.data.lights.new(name, "AREA"); ld.energy = energy; ld.size = size; ld.color = color
        lo = bpy.data.objects.new(name, ld); sc.collection.objects.link(lo); lo.location = loc
        lo.rotation_euler = (Vector((0, 0, 0.2)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    area("key", (-4, -6, 5), 1100, 5, (1.0, 0.93, 0.82)); area("fill", (6, -5, 1), 380, 6, (0.9, 0.92, 1.0)); area("rim", (3, 5, 4), 900, 3, (1.0, 0.9, 0.7))
    world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
    bg = world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (*srgb((1.0, 0.94, 0.82)), 1); bg.inputs[1].default_value = 0.55
    r = sc.render; r.engine = "CYCLES"; r.film_transparent = True; sc.cycles.film_transparent_glass = True
    sc.cycles.device = "CPU"; sc.cycles.samples = job.get("samples", 64); sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 8; sc.cycles.transmission_bounces = 6; sc.cycles.transparent_max_bounces = 12
    r.resolution_x = r.resolution_y = job["size"]; r.resolution_percentage = 100
    r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"; sc.view_settings.exposure = -0.35
    r.threads_mode = "FIXED"; r.threads = 8
    bpy.context.view_layer.update()

    S = job["size"]
    def proj(v):
        u = world_to_camera_view(sc, cam, v); return [round(u.x * S, 2), round((1 - u.y) * S, 2)]
    eyes = [o for o in groups["eyes"] if o.name.startswith("eye")]
    meta = {
        "species": spid, "view": job["view"], "size": S,
        "pivotL": proj(pivots["L"].matrix_world.translation), "pivotR": proj(pivots["R"].matrix_world.translation),
        "eye": proj(sum((o.matrix_world.translation for o in eyes), Vector()) / len(eyes)) if eyes else None,
        "head": proj(root.matrix_world @ Vector((0, 0, 0.93))),
    }
    os.makedirs(job["out_dir"], exist_ok=True)
    tag = f'{spid}_{job["view"]}'
    json.dump(meta, open(os.path.join(job["out_dir"], tag + ".json"), "w"))

    allobjs = [o for g in groups.values() for o in g]
    def show(visible, holdout=()):
        for o in allobjs:
            o.hide_render = o not in visible and o not in holdout
            o.is_holdout = o in holdout
    passes = {
        "body": (groups["body"], ()),
        "eyes": (groups["eyes"], [body]),
        "wingL": (groups["wingL"], ()), "wingR": (groups["wingR"], ()),
        "goldL": (groups["goldL"], ()), "goldR": (groups["goldR"], ()),
        "crown": (groups["crown"], [body]),
        "full": (groups["body"] + groups["eyes"] + groups["wingL"] + groups["wingR"], ()),
        "fullgold": (groups["body"] + groups["eyes"] + groups["goldL"] + groups["goldR"] + groups["crown"], ()),
    }
    for p in job["passes"]:
        if p == "eyes" and not groups["eyes"]: continue
        vis, hold = passes[p]; show(vis, hold)
        r.filepath = os.path.join(job["out_dir"], f"{tag}_{p}.png")
        bpy.ops.render.render(write_still=True)
        print("RENDERED", r.filepath, flush=True)

argv = sys.argv[sys.argv.index("--") + 1:]
for job in json.load(open(argv[0])):
    build(job)
