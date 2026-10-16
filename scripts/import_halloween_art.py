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
    # parallax strips: only the painted bottom of the 16:9 layers (FAR_TOP / NEAR_TOP in FlightScreen), the empty sky
    # above them was full-screen transparent overdraw every frame
    "fl_far.webp": ("flight/bg_far.png", (1200, 230), (0, 594, 1600, 900)),
    "fl_near.webp": ("flight/bg_near.png", (1200, 149), (0, 702, 1600, 900)),
    "fl_stem_top.webp": ("flight/stem_top.png", (200, 900)),
    "fl_stem_bottom.webp": ("flight/stem_bottom.png", (200, 900)),
    **{f"fl_bat_{i}.webp": (f"flight/bat_{i}.png", (192, 192)) for i in (1, 2, 3)},
    **{f"fl_candy_{i}.webp": (f"flight/candy_{i}.png", (96, 96)) for i in (1, 2, 3)},
    "fl_firefly.webp": ("flight/firefly.png", (64, 64)),
    "fl_icon.webp": ("flight/icon.png", (192, 192)),
    # bee layer: same 512 canvas as the side views in assets/art/turn/<bee>/*_side_288
    "lantern_side_288.webp": ("flight/lantern-side-view.png", (288, 288)),
    "puzzle_autumn.webp": ("env/puzzle-autumn-v3.png", (940, 1672)),  # all autumn
    "puzzle_night.webp": ("env/puzzle-halloween-v3.png", (940, 1672)),  # during the event (GameScreen switches to night text colours)
    "event_header.webp": ("ui/event_header.png", (1000, 400)),
    "trick_door.webp": ("trick/door.png", (480, 480)),
    "trick_basket.webp": ("trick/basket.png", (192, 192)),
    **{f"deco_jack{i}.webp": (f"deco/deco_jack_{i}.png", (160, 250)) for i in (1, 2, 3, 4)},
}
os.makedirs(A, exist_ok=True)
# the lantern's pool of light: one soft radial sprite instead of ten stacked translucent discs
g = Image.new("RGBA", (256, 256))
for y in range(256):
    for x in range(256):
        d = min(1, ((x - 127.5) ** 2 + (y - 127.5) ** 2) ** 0.5 / 128)
        g.putpixel((x, y), (255, 197, 107, int(255 * 0.32 * (1 - d) ** 2)))
g.save(A + "fl_glow.webp", "WEBP", quality=90, method=6)
for t, (s, size, *crop) in M.items():
    if not os.path.exists(D + s):
        print("skip (no source)", s); continue
    im = Image.open(D + s)
    if crop:
        im = im.crop(crop[0])
    im = im.convert("RGBA" if "A" in im.getbands() else "RGB").resize(size, Image.LANCZOS)
    im.save(A + t, "WEBP", quality=80 if im.mode == "RGB" else 86, method=6)
    print(t, size, os.path.getsize(A + t) // 1024, "KB")
