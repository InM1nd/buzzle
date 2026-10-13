"""Throwaway real 3D turnaround. Approved art projects onto the front volume.
Side/back geometry is provisional, not an approved replacement for the sprite.
Run with Blender --background --python build.py.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'outputs/zhuzha-turnaround-v2'
OUT.mkdir(parents=True, exist_ok=True)
ART = ROOT / 'assets/art/bees-prototype/zhuzha-base.png'
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.samples = 12
sc.render.resolution_x = 400
sc.render.resolution_y = 400
sc.render.resolution_percentage = 100
sc.render.film_transparent = True
sc.view_settings.view_transform = 'Standard'
sc.world = bpy.data.worlds.new('warm studio')
sc.world.use_nodes = True
sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.65, 0.65, 0.65, 1)
sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.6

def material(name, color):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = 0.75
    return m

def linear(c): return tuple(((v+.055)/1.055)**2.4 if v>.04045 else v/12.92 for v in c)
honey = material('honey', linear((1, .67, .15)))
brown = material('warm brown', linear((.40, .24, .13)))
cream = material('wing ivory', (1, .89, .57))
wingLight = material('wing highlight', (1, .96, .78))
front = material('approved front artwork', (1, .7, .2))
n = front.node_tree.nodes; l = front.node_tree.links
image = n.new('ShaderNodeTexImage'); image.image = bpy.data.images.load(str(ART)); image.image.pack()
bsdf = n['Principled BSDF']
l.new(image.outputs['Color'], bsdf.inputs['Base Color'])
l.new(image.outputs['Color'], bsdf.inputs['Emission Color'])
bsdf.inputs['Emission Strength'].default_value = .65
coord=n.new('ShaderNodeTexCoord'); sep=n.new('ShaderNodeSeparateXYZ'); l.new(coord.outputs['Object'],sep.inputs[0])
mapping=n.new('ShaderNodeMapRange'); mapping.inputs['From Min'].default_value=-1.3; mapping.inputs['From Max'].default_value=1.3
l.new(sep.outputs['Z'],mapping.inputs['Value'])
ramp=n.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation='CONSTANT'; l.new(mapping.outputs['Result'],ramp.inputs[0])
stops=[(0,(*linear((.32,.19,.10)),1)),(.075,(*linear((1,.67,.15)),1)),(.29,(*linear((.32,.19,.10)),1)),(.46,(*linear((1,.67,.15)),1))]
for e,(pos,col) in zip(ramp.color_ramp.elements,stops):e.position=pos;e.color=col
for pos,col in stops[2:]:ramp.color_ramp.elements.new(pos).color=col
weight=n.new('ShaderNodeVertexColor'); weight.layer_name='front paint weight'
mul=n.new('ShaderNodeMath'); mul.operation='MULTIPLY'; l.new(weight.outputs['Color'],mul.inputs[0]); l.new(image.outputs['Alpha'],mul.inputs[1])
mix=n.new('ShaderNodeMixRGB'); l.new(mul.outputs[0],mix.inputs[0]); l.new(ramp.outputs['Color'],mix.inputs[1]); l.new(image.outputs['Color'],mix.inputs[2])
l.new(ramp.outputs['Color'],bsdf.inputs['Base Color']); l.new(ramp.outputs['Color'],bsdf.inputs['Emission Color'])
bsdf.inputs['Emission Strength'].default_value=.1
emission=n.new('ShaderNodeEmission'); l.new(image.outputs['Color'],emission.inputs['Color'])
blend=n.new('ShaderNodeMixShader'); l.new(mul.outputs[0],blend.inputs[0]); l.new(bsdf.outputs[0],blend.inputs[1]); l.new(emission.outputs[0],blend.inputs[2]); l.new(blend.outputs[0],n['Material Output'].inputs['Surface'])
wingMat=bpy.data.materials.new('reference translucent wing'); wingMat.use_nodes=True
wn=wingMat.node_tree.nodes; wl=wingMat.node_tree.links
wt=wn.new('ShaderNodeTexImage'); wt.image=image.image
we=wn.new('ShaderNodeEmission'); wl.new(wt.outputs['Color'],we.inputs['Color'])
transparent=wn.new('ShaderNodeBsdfTransparent'); wm=wn.new('ShaderNodeMixShader')
wa=wn.new('ShaderNodeMath'); wa.operation='MULTIPLY'; wa.inputs[1].default_value=.85; wl.new(wt.outputs['Alpha'],wa.inputs[0]); wl.new(wa.outputs[0],wm.inputs[0])
wl.new(transparent.outputs[0],wm.inputs[1]); wl.new(we.outputs[0],wm.inputs[2]); wl.new(wm.outputs[0],wn['Material Output'].inputs['Surface'])

def point(px, py, depth=0): return ((px-750)/300, depth, (700-py)/300)
root = bpy.data.objects.new('Zhuzha volume prototype', None); sc.collection.objects.link(root)
def attach(o): o.parent = root; return o
profile = [(315,760,0),(355,765,130),(435,770,225),(555,770,295),(700,755,345),(830,740,350),(945,730,295),(1035,720,205),(1080,710,80),(1090,710,0)]
verts=[]; uv=[]; count=24
for py,cx,r in profile:
    for i in range(count):
        a = 2*math.pi*i/count
        px = cx + r*math.sin(a)
        verts.append(point(px,py,-r*.83*math.cos(a)/300))
        uv.append((px/1366,1-py/1151))
faces=[]; facefront=[]; faceY=[]
for j in range(len(profile)-1):
    for i in range(count):
        a=j*count+i; b=j*count+(i+1)%count; c=b+count; d=a+count
        tris=[(a,b,c),(a,c,d)] if (i+j)%2 else [(a,b,d),(b,c,d)]
        for tri in tris:
            faces.append(tri); facefront.append(math.cos(2*math.pi*(i+.5)/count)>.05); faceY.append((profile[j][0]+profile[j+1][0])/2)
me=bpy.data.meshes.new('faceted continuous body'); me.from_pydata(verts,[],faces); me.update()
o=bpy.data.objects.new('body',me); sc.collection.objects.link(o); attach(o)
for m in [front,honey,brown]: me.materials.append(m)
uvlayer=me.uv_layers.new(name='front projection')
paint=me.color_attributes.new(name='front paint weight',type='FLOAT_COLOR',domain='POINT')
for i in range(len(verts)):
    t=max(0,min(1,(math.cos(2*math.pi*(i%count)/count))/.15)); paint.data[i].color=(t,t,t,1)
for poly,isfront,py in zip(me.polygons,facefront,faceY):
    poly.material_index=0
    for loop in poly.loop_indices: uvlayer.data[loop].uv=uv[me.loops[loop].vertex_index]
# Correct outward normals before rendering.
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT'); o.select_set(False)

def rod(name,p,q,r):
    v=Vector(q)-Vector(p)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=r, depth=v.length, location=(Vector(p)+Vector(q))/2)
    o=bpy.context.object; o.name=name; o.rotation_euler=v.to_track_quat('Z','Y').to_euler(); o.data.materials.append(brown); return attach(o)
def ball(name,p,scale,mat):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p)
    o=bpy.context.object; o.name=name; o.scale=scale; o.data.materials.append(mat); return attach(o)
for side,pts in [('left',[(642,350),(600,255),(550,170),(525,130)]),('right',[(855,325),(905,220),(960,155),(990,120)])]:
    for j in range(3): rod(side+' antenna',point(*pts[j],-.18),point(*pts[j+1],-.18),.055)
    ball(side+' antenna tip',point(*pts[-1],-.18),(.15,.15,.15),brown)
for px,py in [(500,1050),(715,1100),(955,1055)]: ball('foot',point(px,py,-.10),(.075,.1,.13),brown)

def wing(name,outline,centre):
    pts=[point(px,py,.20) for px,py in outline]+[point(*centre,.13)]
    faces=[(i,(i+1)%len(outline),len(outline)) for i in range(len(outline))]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(pts,[],faces); mesh.update()
    o=bpy.data.objects.new(name,mesh); sc.collection.objects.link(o); attach(o)
    mesh.materials.append(wingMat)
    wingUV=mesh.uv_layers.new()
    coords=outline+[centre]
    for poly in mesh.polygons:
        for loop in poly.loop_indices:
            px,py=coords[mesh.loops[loop].vertex_index]; wingUV.data[loop].uv=(px/1366,1-py/1151)
    mod=o.modifiers.new('wing thickness','SOLIDIFY'); mod.thickness=.035
    return o
left=wing('left wing',[(140,450),(325,405),(450,500),(480,620),(450,675),(290,720),(140,685)],(300,560))
right=wing('right wing',[(995,415),(1120,285),(1260,315),(1300,475),(1230,570),(1090,610)],(1155,455))
for o,p in [(left,point(476,614,.20)),(right,point(998,505,.20))]:
    for v in o.data.vertices:v.co-=Vector(p)
    o.location=p

bpy.ops.object.camera_add(location=(-.2233,-12,.415))
cam=bpy.context.object; cam.rotation_euler=(Vector((-.2233,0,.415))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=1366/300; sc.camera=cam
bpy.ops.object.light_add(type='AREA',location=(-3,-5,7)); bpy.context.object.data.energy=500; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=5
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'zhuzha-turnaround-prototype.blend'))
for deg in [0,90,180,270]:
    root.rotation_euler.z=math.radians(deg)
    sc.render.filepath=str(OUT/f'view-{deg:03}.png'); bpy.ops.render.render(write_still=True)
for i in range(32):
    root.rotation_euler.z=2*math.pi*i/32
    left.rotation_euler.z=math.radians(28)*math.sin(i*math.pi/2)
    right.rotation_euler.z=-left.rotation_euler.z
    sc.render.filepath=str(OUT/f'frame-{i:02}.png'); bpy.ops.render.render(write_still=True)
