"""Measure sprite payloads (WebP q85 with alpha) per option; writes ../sizes.json (Russian text) + sizes-raw.json."""
import glob, io, json, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.abspath(os.path.join(HERE, "..")); R = os.path.join(D, "renders")
ART = "/workspace/apps/bee-game/assets/art"
def webp(im, px):
    im = im.copy(); im.thumbnail((px, px), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, "WEBP", quality=85, method=6); return b.tell()
cur = sum(os.path.getsize(p) for p in glob.glob(f"{ART}/bee_*_body.png") + [f"{ART}/bee_wing.png", f"{ART}/bee_eye.png"])
raw = {"current_png_parts": cur}
gl = json.load(open(os.path.join(D, "gl-probe.json"))) if os.path.exists(os.path.join(D, "gl-probe.json")) else None
out = {}
for st in ["clay", "glossy", "fuzzy", "paint", "lowpoly", "hero"]:
    heroes = [Image.open(f"{R}/{st}/hero_{sp}.png") for sp in ("zhuzha", "boris", "lavanda")]
    if st == "paint":
        heroes = [Image.open(f"{R}/{st}/hero_{sp}.painted.png") if os.path.exists(f"{R}/{st}/hero_{sp}.painted.png") else h for sp, h in zip(("zhuzha", "boris", "lavanda"), heroes)]
    s256 = sum(webp(h, 256) for h in heroes) / 3
    s512 = sum(webp(h, 512) for h in heroes) / 3
    layered = 12 * s256 + 3 * s512          # 12 species in-game + 3 large mascots
    three = 12 * 3 * s256 + 3 * s512        # +2 baked yaw views (-30/+30) per species
    raw[st] = dict(s256=s256, s512=s512, layered=layered, three_views=three)
    txt = (f"Слои (12 видов × 256 px + 3 маскота 512 px, WebP): ≈{layered/1024:.0f} КБ "
           f"(сейчас PNG-слои {cur/1024:.0f} КБ) : APK {'+' if layered > cur else '−'}{abs(layered-cur)/1024:.0f} КБ. "
           f"APK ≈{(23162370 - cur + layered)/1e6:.2f} МБ. С 3 ракурсами на вид ≈{three/1024:.0f} КБ (APK ≈{(23162370 - cur + three)/1e6:.2f} МБ).")
    if st == "hero":
        frames = [Image.open(p) for p in sorted(glob.glob(f"{R}/hero/turn_*_*.png"))]
        f192 = sum(webp(f, 192) for f in frames) / len(frames)
        sheet = 12 * 24 * f192
        raw["hero"]["turn_frame192"] = f192; raw["hero"]["sheet12"] = sheet
        base = 23162370 - cur
        mixed = 24 * f192 + 11 * 9 * f192
        txt = (f"Кадр 192 px WebP ≈{f192/1024:.1f} КБ. Полный лист 8 ракурсов × 3 взмаха × 12 видов ≈{sheet/1e6:.2f} МБ : APK ≈{(base+sheet)/1e6:.2f} МБ: "
               f"НЕ влезает в 24 МБ. Реалистично: полный лист только у Жужи, у остальных 11 видов 3 ракурса × 3 взмаха ≈{mixed/1024:.0f} КБ : APK ≈{(base+mixed)/1e6:.2f} МБ.")
        raw["hero"]["mixed"] = 24 * f192 + 11 * 9 * f192
    if st == "lowpoly" and gl:
        txt += f" Real-time 3D (expo-gl + three.js, измерено сборкой): APK {gl['apk']/1e6:.2f} МБ (+{gl['delta']/1e6:.2f} МБ к v1.1: three.js ≈+0,9 МБ байткода, libexpo-gl.so 0,83 МБ), ещё без моделей и текстур — {'укладывается' if gl['apk'] < 24e6 else 'НЕ укладывается'} в 24 МБ."
    out[st] = txt
json.dump(out, open(os.path.join(D, "sizes.json"), "w"), ensure_ascii=False, indent=1)
json.dump(raw, open(os.path.join(D, "sizes-raw.json"), "w"), indent=1)
print(json.dumps(raw, indent=1))
