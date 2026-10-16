"""v1.6: Halloween art (design/2d/halloween, exported at 3x) -> runtime webp in assets/art/halloween at game size.
Sprites keep their canvas (tile layers must stay aligned with cell0..4) and are only resized."""
from PIL import Image
import os
D = "design/2d/halloween/"; A = "assets/art/halloween/"
M = {  # target: (source, size)
    "cell_pumpkin.webp": ("tiles/cell_pumpkin.png", (240, 208)),
    "ghost.webp": ("tiles/ghost_overlay.png", (240, 208)),
    "point.webp": ("ui/event_point.png", (144, 144)),
    "pumpkin_bud.webp": ("garden/pumpkin_bud.png", (249, 249)),
    "pumpkin_bloom.webp": ("garden/pumpkin_bloom.png", (249, 249)),
    "hive_bg_night.webp": ("env/hive_bg_night.png", (940, 1672)),
    "garden_bg_night.webp": ("env/garden_bg_night.png", (940, 1672)),
    "fl_sky.webp": ("flight/bg_sky.png", (1200, 675)),
    "fl_far.webp": ("flight/bg_far.png", (1200, 675)),
    "fl_near.webp": ("flight/bg_near.png", (1200, 675)),
    "fl_stem_top.webp": ("flight/stem_top.png", (200, 900)),
    "fl_stem_bottom.webp": ("flight/stem_bottom.png", (200, 900)),
    **{f"fl_bat_{i}.webp": (f"flight/bat_{i}.png", (192, 192)) for i in (1, 2, 3)},
    **{f"fl_candy_{i}.webp": (f"flight/candy_{i}.png", (96, 96)) for i in (1, 2, 3)},
    "fl_firefly.webp": ("flight/firefly.png", (64, 64)),
    "fl_icon.webp": ("flight/icon.png", (192, 192)),
    # bee layer: same 512 canvas as the side views in assets/art/turn/<bee>/*_side_288
    "lantern_side_288.webp": ("flight/lantern-side-view.png", (288, 288)),
}
os.makedirs(A, exist_ok=True)
for t, (s, size) in M.items():
    if not os.path.exists(D + s):
        print("skip (no source)", s); continue
    im = Image.open(D + s)
    im = im.convert("RGBA" if "A" in im.getbands() else "RGB").resize(size, Image.LANCZOS)
    im.save(A + t, "WEBP", quality=80 if im.mode == "RGB" else 86, method=6)
    print(t, size, os.path.getsize(A + t) // 1024, "KB")
