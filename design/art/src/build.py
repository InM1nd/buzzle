import importlib, sys, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kit
MODS = {"art-0-current": "t0_current", "art-1-flat": "t1_flat", "art-2-watercolor": "t2_watercolor", "art-3-clay": "t3_clay",
        "art-4-pixel": "t4_pixel", "art-5-lineart": "t5_lineart", "art-6-papercut": "t6_papercut"}
for name in sys.argv[1:]:
    m = importlib.import_module(MODS[name])
    html = kit.page(m.TECH)
    p = os.path.join(HERE, name + ".html")
    open(p, "w").write(html)
    out = os.path.join(HERE, "..", name + ".png")
    subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2",
                    "--window-size=1280,860", "--virtual-time-budget=5000", f"--screenshot={out}", "file://" + p],
                   check=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
    print("rendered", name)
