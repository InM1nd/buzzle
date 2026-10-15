"""Convert the exported geometry into an editable Blender scene; no image projection."""
from pathlib import Path
import bpy

root = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/'zhuzha-volume.glb'))
bpy.ops.wm.save_as_mainfile(filepath=str(root/'zhuzha-volume.blend'))
print('Saved editable Zhuzha scene')
