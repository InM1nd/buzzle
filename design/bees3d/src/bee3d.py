"""Procedural cute bee for Buzzle, rendered with Blender/Cycles (headless).
Usage: blender -b -noaudio --python bee3d.py -- jobs.json
Each job: {style, species, out, size, yaw, pitch, roll, flap(-1..1), samples}
Styles: clay | glossy | fuzzy | paint | lowpoly
"""
import bpy, sys, json, math
from mathutils import Vector, Euler

SPECIES = {
    "zhuzha": dict(body=(1.0, 0.79, 0.24), stripe=(0.29, 0.17, 0.07), wide=1.0),
    "boris": dict(body=(1.0, 0.69, 0.23), stripe=(0.23, 0.14, 0.08), wide=1.13, tail=(1.0, 0.98, 0.94), fuzzy=True),
    "lavanda": dict(body=(0.82, 0.75, 1.0), stripe=(0.42, 0.25, 0.77), wide=1.0, flower=((0.61, 0.45, 0.95), (0.98, 0.93, 1.0), 5)),
}

def srgb(c):  # sRGB -> linear
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)

def principled(name, color, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*srgb(color), 1)
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return m, b

def stripe_material(style, sp, A, C):
    """body colour bands driven by object-space Z (and a white tail for the bumblebee)."""
    rough = dict(clay=0.62, glossy=0.28, fuzzy=0.55, paint=0.5, lowpoly=0.45)[style]
    m, b = principled("body", sp["body"], Roughness=rough)
    nt = m.node_tree; N = nt.nodes; L = nt.links
    tc = N.new("ShaderNodeTexCoord"); sep = N.new("ShaderNodeSeparateXYZ")
    L.new(tc.outputs["Object"], sep.inputs[0])
    ramp = N.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT" if style == "lowpoly" else "EASE"
    L.new(sep.outputs["Z"], ramp.inputs[0])
    # map z in [-1.1, 1.1] -> [0,1]
    mp = N.new("ShaderNodeMapRange"); mp.inputs["From Min"].default_value = -1.1 * C; mp.inputs["From Max"].default_value = 1.1 * C
    L.new(sep.outputs["Z"], mp.inputs["Value"]); L.new(mp.outputs["Result"], ramp.inputs[0])
    body, stripe = (*srgb(sp["body"]), 1), (*srgb(sp["stripe"]), 1)
    tail = (*srgb(sp["tail"]), 1) if "tail" in sp else stripe
    e = ramp.color_ramp.elements
    ramp.color_ramp.interpolation = "CONSTANT" if style == "lowpoly" else "LINEAR"
    k = 0.012  # soft edge half-width
    bands = [(0.13, 0.25, stripe), (0.36, 0.46, stripe)]
    stops = [(0.0, body)]
    if "tail" in sp:
        stops = [(0.0, tail), (0.12 - k, tail)]
        bands = [(0.12, 0.24, stripe), (0.35, 0.45, stripe)]
    for a, z, c in bands:
        stops += [(a - k, body), (a + k, c), (z - k, c), (z + k, body)]
    e[0].position, e[0].color = stops[0]
    e[1].position, e[1].color = stops[1]
    for p_, c_ in stops[2:]:
        el = e.new(p_); el.color = c_
    L.new(ramp.outputs["Color"], b.inputs["Base Color"])
    if style == "clay":
        b.inputs["Subsurface Weight"].default_value = 0.35
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.45, 0.25)
        b.inputs["Subsurface Scale"].default_value = 0.15
        b.inputs["Sheen Weight"].default_value = 0.25
        # fingerprint-ish micro bumps
        nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 12; nz.inputs["Detail"].default_value = 10
        bump = N.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.55; bump.inputs["Distance"].default_value = 0.02
        L.new(nz.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], b.inputs["Normal"])
    if style == "glossy":
        b.inputs["Coat Weight"].default_value = 0.7; b.inputs["Coat Roughness"].default_value = 0.08
        b.inputs["Subsurface Weight"].default_value = 0.12; b.inputs["Subsurface Scale"].default_value = 0.08
    if style == "fuzzy":
        b.inputs["Sheen Weight"].default_value = 0.8; b.inputs["Sheen Roughness"].default_value = 0.4
    if style == "paint":
        b.inputs["Specular IOR Level"].default_value = 0.25
    return m, ramp

ICO_SUB = 1
def obj_sphere(name, loc, scale, mat, seg=48, rings=24, smooth=True, ico=False):
    if ico:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=ICO_SUB, radius=1, location=loc)
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = scale
    if smooth: bpy.ops.object.shade_smooth()
    else: bpy.ops.object.shade_flat()
    o.data.materials.append(mat)
    return o

LOWCURVE = False
def curve_obj(name, pts, bevel, mat, res=12):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = bevel; cu.bevel_resolution = 0 if LOWCURVE else 6
    cu.resolution_u = 3 if LOWCURVE else res; cu.use_fill_caps = True
    sp = cu.splines.new("NURBS"); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts): p.co = (*q, 1)
    sp.use_endpoint_u = True; sp.order_u = min(4, len(pts))
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o); cu.materials.append(mat)
    return o

def build(job):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    style, sp = job["style"], SPECIES[job["species"]]
    hero = style == "hero"
    if hero: style = "glossy"
    low = style == "lowpoly"
    global LOWCURVE
    LOWCURVE = low
    sc = bpy.context.scene
    root = bpy.data.objects.new("bee", None); sc.collection.objects.link(root)
    A, B, C = 0.9 * sp["wide"], 0.82 * sp["wide"] ** 0.5, 1.0  # ellipsoid half-axes (x, y-depth, z)
    def front(x, z, out=0.0):
        t = 1 - (x / A) ** 2 - (z / C) ** 2
        y = -B * math.sqrt(max(t, 0.0))
        n = Vector((x / A ** 2, y / B ** 2, z / C ** 2)).normalized()
        return Vector((x, y, z)) + n * out, n

    body_m, ramp = stripe_material(style, sp, A, C)
    global ICO_SUB
    ICO_SUB = 2
    body = obj_sphere("body", (0, 0, 0), (A, B, C), body_m, seg=64, rings=32, smooth=not low, ico=low)
    ICO_SUB = 1
    if low:
        body.scale = (A, B, C)
    else:
        mod = body.modifiers.new("sub", "SUBSURF"); mod.levels = 1; mod.render_levels = 2
        if style == "clay":
            tex = bpy.data.textures.new("lumps", "CLOUDS"); tex.noise_scale = 0.6
            dm = body.modifiers.new("lumps", "DISPLACE"); dm.texture = tex; dm.strength = 0.06; dm.mid_level = 0.5
    parts = [body]

    dark = sp["stripe"] if job["species"] != "lavanda" else (0.2, 0.12, 0.3)
    eye_m, eb = principled("eye", (0.08, 0.05, 0.03), Roughness=0.08 if style != "clay" else 0.25, **({"Coat Weight": 1.0} if style in ("glossy", "fuzzy") else {}))
    hi_m, hb = principled("hi", (1, 1, 1)); hb.inputs["Emission Color"].default_value = (1, 1, 1, 1); hb.inputs["Emission Strength"].default_value = 6
    cheek_m, _ = principled("cheek", (1.0, 0.55, 0.6), Roughness=0.6, **{"Subsurface Weight": 0.3, "Alpha": 0.85})
    mouth_m, _ = principled("mouth", (0.25, 0.12, 0.05), Roughness=0.5)
    sting_m, _ = principled("sting", (0.25, 0.15, 0.08), Roughness=0.35)

    big = 1.3 if style == "glossy" else 1.0
    er = 0.15 * big
    sclera_m, _ = principled("sclera", (0.98, 0.97, 0.95), Roughness=0.15, **{"Coat Weight": 1.0, "Subsurface Weight": 0.2})
    iris_m, ib = principled("iris", (0.45, 0.25, 0.08), Roughness=0.1, **{"Coat Weight": 1.0})
    for sx in (-1, 1):
        p, n = front(sx * 0.34, 0.3, -er * 0.25)
        if style == "glossy":
            parts.append(obj_sphere(f"scl{sx}", p, (er, er * 0.6, er * 1.12), sclera_m))
            ip = p + Vector((sx * -0.012, -er * 0.38, -er * 0.05))
            parts.append(obj_sphere(f"iris{sx}", ip, (er * 0.8, er * 0.32, er * 0.92), iris_m))
            parts.append(obj_sphere(f"pup{sx}", ip + Vector((0, -er * 0.12, 0)), (er * 0.48, er * 0.25, er * 0.56), eye_m))
            hp = p + Vector((0.05, -er * 0.75, er * 0.38))
            parts.append(obj_sphere(f"hi{sx}", hp, (er * 0.26,) * 3, hi_m, seg=16, rings=8))
            parts.append(obj_sphere(f"hi2{sx}", p + Vector((-0.035, -er * 0.72, -er * 0.38)), (er * 0.11,) * 3, hi_m, seg=12, rings=6))
        else:
            e = obj_sphere(f"eye{sx}", p, (er, er * 0.62, er * 1.12), eye_m, ico=low, smooth=not low)
            parts.append(e)
            hp = p + Vector((0.045, -er * 0.75, er * 0.45))
            parts.append(obj_sphere(f"hi{sx}", hp, (er * 0.3,) * 3, hi_m, seg=16, rings=8, ico=low, smooth=not low))
            parts.append(obj_sphere(f"hi2{sx}", p + Vector((-0.04, -er * 0.72, -er * 0.4)), (er * 0.13,) * 3, hi_m, seg=12, rings=6, ico=low, smooth=not low))
        cp, cn = front(sx * 0.56, 0.06, -0.035)
        ch = obj_sphere(f"cheek{sx}", cp, (0.12, 0.05, 0.085), cheek_m, ico=low, smooth=not low)
        ch.rotation_euler = Vector((0, -1, 0)).rotation_difference(-cn).to_euler()
        parts.append(ch)
    # smile
    pts = []
    for i in range(7):
        t = -1 + 2 * i / 6
        x, z = t * 0.13, 0.13 - 0.06 * (1 - t * t)
        q, _ = front(x, z, 0.012); pts.append(tuple(q))
    parts.append(curve_obj("smile", pts, 0.024, mouth_m))
    # antennae
    for sx in (-1, 1):
        a0, _ = front(sx * 0.22, 0.93, -0.03)
        pts = [tuple(a0), (sx * 0.3, a0.y - 0.05, 1.25), (sx * 0.44, a0.y - 0.08, 1.48), (sx * 0.56, a0.y - 0.06, 1.58)]
        parts.append(curve_obj(f"ant{sx}", pts, 0.032, mouth_m))
        parts.append(obj_sphere(f"tip{sx}", pts[-1], (0.085,) * 3, mouth_m, ico=low, smooth=not low))
    # stinger
    bpy.ops.mesh.primitive_cone_add(vertices=8 if low else 24, radius1=0.11, depth=0.26, location=(0, 0.02, -C - 0.08))
    st = bpy.context.object; st.rotation_euler = (math.pi, 0, 0); st.data.materials.append(sting_m)
    if not low: bpy.ops.object.shade_smooth()
    parts.append(st)
    # tiny feet
    for sx in (-1, 1):
        fp, _ = front(sx * 0.28, -0.88, -0.02)
        parts.append(obj_sphere(f"foot{sx}", fp + Vector((0, 0, -0.06)), (0.09, 0.08, 0.07), mouth_m, ico=low, smooth=not low))

    # flower (lavanda)
    if "flower" in sp:
        pc, cc, n = sp["flower"]
        pm, _ = principled("petal", pc, Roughness=0.4, **{"Subsurface Weight": 0.3, "Subsurface Scale": 0.05})
        cm, _ = principled("fcenter", cc, Roughness=0.4)
        fc = Vector((0.42 * sp["wide"], -0.25, 0.86))
        for i in range(n):
            a = 2 * math.pi * i / n
            pp = fc + Vector((math.cos(a) * 0.13, -0.02, math.sin(a) * 0.13))
            pe = obj_sphere(f"petal{i}", pp, (0.12, 0.04, 0.075), pm, ico=low, smooth=not low)
            pe.rotation_euler = (0, -a, 0)
            pe.rotation_euler.rotate(Euler((math.radians(-20), 0, math.radians(-15))))
            parts.append(pe)
        parts.append(obj_sphere("fcenter", fc + Vector((0, -0.05, 0)), (0.075, 0.05, 0.075), cm, ico=low, smooth=not low))

    # wings: pivot at the root, flap rotates around the view axis (Y)
    wm, wb = principled("wing", (0.93, 0.97, 1.0), Roughness=0.08 if style != "clay" else 0.3, IOR=1.25)
    wb.inputs["Transmission Weight"].default_value = 1.0 if style not in ("clay",) else 0.0
    wb.inputs["Alpha"].default_value = 0.75 if style != "clay" else 0.8
    if style == "clay":
        wb.inputs["Subsurface Weight"].default_value = 0.6; wb.inputs["Roughness"].default_value = 0.55
    if style in ("fuzzy", "glossy"):
        wb.inputs["Thin Film Thickness"].default_value = 420
        wb.inputs["Thin Film IOR"].default_value = 1.45
    # rim darkening so the wing edge reads like the 2D outline
    nt = wm.node_tree; lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.25
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = (*srgb((0.93, 0.97, 1.0)), 1); mix.inputs[7].default_value = (*srgb((0.55, 0.75, 0.92)), 1)
    nt.links.new(lw.outputs["Facing"], mix.inputs[0])
    if style in ("glossy", "fuzzy", "paint"):
        tc2 = nt.nodes.new("ShaderNodeTexCoord"); vor = nt.nodes.new("ShaderNodeTexVoronoi")
        vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 1.3
        nt.links.new(tc2.outputs["Object"], vor.inputs["Vector"])
        vr = nt.nodes.new("ShaderNodeMapRange"); vr.inputs["From Min"].default_value = 0.0; vr.inputs["From Max"].default_value = 0.018
        vr.inputs["To Min"].default_value = 1.0; vr.inputs["To Max"].default_value = 0.0
        nt.links.new(vor.outputs["Distance"], vr.inputs["Value"])
        mix2 = nt.nodes.new("ShaderNodeMix"); mix2.data_type = "RGBA"; mix2.clamp_factor = True
        nt.links.new(vr.outputs["Result"], mix2.inputs[0]); nt.links.new(mix.outputs[2], mix2.inputs[6])
        mix2.inputs[7].default_value = (*srgb((0.72, 0.62, 0.45)), 1)
        nt.links.new(mix2.outputs[2], wb.inputs["Base Color"])
    else:
        nt.links.new(mix.outputs[2], wb.inputs["Base Color"])
    flap = job.get("flap", 0.0)  # -1 down … 1 up
    for sx in (-1, 1):
        piv = bpy.data.objects.new(f"wpiv{sx}", None); sc.collection.objects.link(piv)
        piv.location = (sx * 0.42 * sp["wide"], 0.32, 0.62)
        base = 22 + 42 * flap
        piv.rotation_euler = (0, -sx * math.radians(base), 0)
        w = obj_sphere(f"wing{sx}", (0, 0, 0), (0.56, 0.035, 0.37), wm, ico=low, smooth=not low)
        w.parent = piv; w.location = (sx * 0.52, 0, 0.0)
        w.rotation_euler = (0, 0, sx * math.radians(-12))
        piv.parent = root

    for p in parts:
        if p.parent is None: p.parent = root

    # fur
    if style == "fuzzy" or hero:
        vg = body.vertex_groups.new(name="fur")
        for v in body.data.vertices:
            x, y, z = v.co  # unit-sphere coords; face centre faces -Y around z=0.25
            dx, dz = x / 0.62, (z - 0.25) / 0.5
            r = math.sqrt(dx * dx + dz * dz) if y < 0 else 9.0
            t = min(1.0, max(0.0, (r - 0.55) / 0.6)); t = t * t * (3 - 2 * t)
            vg.add([v.index], 0.3 + 0.7 * t, "REPLACE")
        mod = body.modifiers.new("fur", "PARTICLE_SYSTEM"); ps = mod.particle_system.settings
        ps.type = "HAIR"; ps.count = 3000 if style == "fuzzy" else 5000
        ps.hair_length = (0.22 if sp.get("fuzzy") else 0.17) if style == "fuzzy" else (0.065 if sp.get("fuzzy") else 0.05)
        ps.child_type = "INTERPOLATED"; ps.child_percent = 6; ps.rendered_child_count = 22
        ps.child_length = 1.0; ps.roughness_1 = 0.04 if style == "fuzzy" else 0.015; ps.roughness_2 = 0.05 if style == "fuzzy" else 0.02; ps.roughness_endpoint = 0.05 if style == "fuzzy" else 0.01
        ps.clump_factor = 0.15; ps.factor_random = 0.0
        ps.root_radius = 1.0; ps.tip_radius = 0.0; ps.radius_scale = 0.012
        ps.use_advanced_hair = False
        ps.material = 1
        mod.particle_system.vertex_group_density = "fur"; mod.particle_system.vertex_group_length = "fur"
        bpy.context.scene.cycles.use_auto_tile = False

    root.rotation_euler = (math.radians(job.get("pitch", 0)), math.radians(job.get("roll", 0)), math.radians(job.get("yaw", 0)))

    # camera
    cam_d = bpy.data.cameras.new("cam"); cam_d.lens = 85
    cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
    el = math.radians(job.get("cam_el", 8))
    dist = 14.5
    cam.location = (0, -dist * math.cos(el), 0.25 + dist * math.sin(el))
    cam.rotation_euler = (math.pi / 2 - el, 0, 0)
    cam_d.sensor_width = 36; cam_d.lens = 85 * job.get("zoom", 1.5)

    # lights
    def area(name, loc, energy, size, color):
        ld = bpy.data.lights.new(name, "AREA"); ld.energy = energy; ld.size = size; ld.color = color
        lo = bpy.data.objects.new(name, ld); sc.collection.objects.link(lo); lo.location = loc
        d = Vector((0, 0, 0.2)) - Vector(loc); lo.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return lo
    if style == "paint":
        area("key", (-4.5, -5, 5.5), 2200, 1.5, (1.0, 0.9, 0.75))
        area("fill", (5, -4, 0.5), 140, 4, (0.75, 0.8, 1.0))
        area("rim", (3, 5, 4), 900, 2, (1.0, 0.85, 0.6))
    elif style == "glossy":
        area("key", (-4, -6, 5), 1300, 3.5, (1.0, 0.93, 0.82))
        area("fill", (6, -5, 1), 420, 5, (0.85, 0.9, 1.0))
        area("rim1", (4, 5, 3.5), 1600, 1.5, (1.0, 0.92, 0.75))
        area("rim2", (-4.5, 5, 2.5), 1200, 1.5, (0.8, 0.88, 1.0))
    else:
        area("key", (-4, -6, 5), 1100, 5, (1.0, 0.93, 0.82))
        area("fill", (6, -5, 1), 380, 6, (0.9, 0.92, 1.0))
        area("rim", (3, 5, 4), 900, 3, (1.0, 0.9, 0.7))
    world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
    bg = world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (*srgb((1.0, 0.94, 0.82)), 1)
    bg.inputs[1].default_value = 0.55 if style != "paint" else 0.25

    r = sc.render; r.engine = "CYCLES"; r.film_transparent = True
    sc.cycles.film_transparent_glass = True
    sc.cycles.device = "CPU"; sc.cycles.samples = job.get("samples", 96); sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 8; sc.cycles.transmission_bounces = 6; sc.cycles.transparent_max_bounces = 12
    r.resolution_x = r.resolution_y = job.get("size", 512); r.resolution_percentage = 100
    r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = job.get("exposure", -1.0 if style == "paint" else -0.35)
    r.threads_mode = "FIXED"; r.threads = 8
    r.filepath = job["out"]

argv = sys.argv[sys.argv.index("--") + 1:]
for job in json.load(open(argv[0])):
    build(job)
    bpy.ops.render.render(write_still=True)
    print("RENDERED", job["out"], flush=True)
