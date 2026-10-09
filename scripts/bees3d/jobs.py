"""Writes the Blender job list for the v1.2 bee layers: python3 jobs.py OUT_DIR > jobs.json"""
import json, sys
OUT = sys.argv[1]
SPECIES = ["zhuzha", "pushinka", "boris", "solnyshko", "klevera", "lavanda", "vasilek", "myatka", "iskorka", "sonya", "zorkaya", "margo"]
VIEWS = [0, 32, 62]          # front, three-quarter, near-profile (mirrored in RN for the other side)
ZHUZHA_VIEWS = [0, 16, 32, 47, 62]
jobs = []
for sp in SPECIES:
    views = ZHUZHA_VIEWS if sp == "zhuzha" else VIEWS
    for v in views:
        passes = ["body", "eyes"]
        if sp == "zhuzha":
            passes += ["wingL", "wingR", "goldL", "goldR", "crown"]
        jobs.append({"species": sp, "view": v, "size": 384 if sp == "zhuzha" else 256, "out_dir": OUT, "passes": passes, "samples": 96})
# app icon / splash / previews
jobs.append({"species": "zhuzha", "view": 0, "size": 1024, "out_dir": OUT + "/icon", "passes": ["full"], "samples": 128})
jobs.append({"species": "zhuzha", "view": 18, "size": 1024, "out_dir": OUT + "/icon", "passes": ["full"], "samples": 128})
print(json.dumps(jobs))
