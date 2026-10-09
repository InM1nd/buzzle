"""Writes the render job list for all bee options (renders/<style>/...)."""
import json, os, sys
R = os.path.join(os.path.dirname(__file__), "..", "renders")
jobs = []
STYLES = ["clay", "glossy", "fuzzy", "paint", "lowpoly", "hero"]
only = sys.argv[1].split(",") if len(sys.argv) > 1 else STYLES
for st in only:
    d = os.path.abspath(os.path.join(R, st)); os.makedirs(d, exist_ok=True)
    hair = st in ("fuzzy", "hero")
    for sp, yaw in (("zhuzha", -22), ("boris", 20), ("lavanda", -12)):
        jobs.append(dict(style=st, species=sp, out=f"{d}/hero_{sp}.png", size=640, yaw=yaw, cam_el=8, samples=96 if hair else 128))
    for k, fl in enumerate((1.0, 0.0, -1.0)):
        jobs.append(dict(style=st, species="zhuzha", out=f"{d}/flap_{k}.png", size=320, yaw=0, samples=64))
    for sp, yaw, roll, pitch, fl in (("zhuzha", -38, 12, 6, 0.6), ("boris", 32, -10, 4, -0.5), ("lavanda", -8, 7, 10, 1.0)):
        jobs.append(dict(style=st, species=sp, out=f"{d}/ctx_{sp}.png", size=288, yaw=yaw, roll=roll, pitch=pitch, flap=fl, samples=64))
    if st == "hero":
        for a in range(8):
            for k, fl in enumerate((1.0, 0.0, -1.0)):
                jobs.append(dict(style=st, species="zhuzha", out=f"{d}/turn_{a}_{k}.png", size=192, yaw=a * 45, flap=fl, samples=48))
json.dump(jobs, open("/tmp/bee_jobs.json", "w"), indent=0)
print(len(jobs), "jobs")
