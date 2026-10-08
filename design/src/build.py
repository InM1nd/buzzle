import importlib, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")
MODS = [("style1_storybook", "buzzle-1-storybook"), ("style2_minimal", "buzzle-2-minimal"), ("style3_night", "buzzle-3-night-garden"), ("style4_candy", "buzzle-4-candy")]
for mod, out in MODS:
    if len(sys.argv) > 1 and out not in sys.argv[1:]: continue
    try: m = importlib.import_module(mod)
    except ModuleNotFoundError: continue
    open(out + ".html", "w").write(m.HTML); print("wrote", out)
