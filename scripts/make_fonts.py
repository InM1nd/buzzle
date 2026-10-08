"""Static Nunito instances (700/800/900), subset to Latin + Cyrillic, for expo-font (Android xml font family)."""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

SRC = "/usr/share/fonts/truetype/sand-box/google/Nunito/Nunito-VariableFont_wght.ttf"
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "fonts")
NAMES = {700: "Bold", 800: "ExtraBold", 900: "Black"}
UNICODES = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + list(range(0x400, 0x460)) + [0x1E9E]
            + list(range(0x2010, 0x2028)) + list(range(0x2030, 0x203B)) + [0x20AC, 0x2116, 0x2122]
            + list(range(0x2190, 0x2196)) + [0x2212, 0x2248, 0x2260, 0x2264, 0x2265, 0x00D7, 0x2713, 0x2715, 0x2022, 0x2026, 0x00B7, 0x221E])
for w, n in NAMES.items():
    f = TTFont(SRC)
    inst = instancer.instantiateVariableFont(f, {"wght": w})
    opts = subset.Options()
    opts.layout_features = ["kern", "liga", "calt", "tnum", "case", "ccmp", "locl", "mark", "mkmk"]
    opts.name_IDs = ["*"]; opts.notdef_outline = True; opts.hinting = False
    s = subset.Subsetter(opts); s.populate(unicodes=UNICODES); s.subset(inst)
    # unique family/style names per file
    for rec in inst["name"].names:
        if rec.nameID in (1, 16): rec.string = "Nunito"
        if rec.nameID in (2, 17): rec.string = n
        if rec.nameID == 4: rec.string = f"Nunito {n}"
        if rec.nameID == 6: rec.string = f"Nunito-{n}"
    inst["OS/2"].usWeightClass = w
    path = os.path.join(OUT, f"Nunito-{n}.ttf"); inst.save(path)
    print(path, os.path.getsize(path))
