"""Technique 6 — layered paper-cut (stacked paper shapes with soft shadows and fibre texture)."""
from kit import *

POL = ["#F4B942", "#EE7F98", "#9C86DA", "#64A6DE", "#74BE86"]
SP = {"zhuzha": ("#F6C24A", "#4B3527"), "pushinka": ("#F7E2B8", "#C9965E"), "boris": ("#F29A3E", "#3A2C26"), "lavanda": ("#C4B0EC", "#6E54B8")}
DARK = "#3E2C22"

def tone(h, t):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    tgt = 255 if t > 0 else 0
    return "#" + "".join(f"{int(v + (tgt - v) * abs(t)):02X}" for v in c)

def pfilter(fid, b, dy, op):
    return f'''<filter id="{fid}" x="-25%" y="-25%" width="150%" height="160%" color-interpolation-filters="sRGB">
 <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" seed="11" result="t"/>
 <feColorMatrix in="t" type="matrix" values="0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .2  0 0 0 -.42 .22" result="tx"/>
 <feComposite in="tx" in2="SourceAlpha" operator="in" result="tx2"/>
 <feBlend in="SourceGraphic" in2="tx2" mode="multiply" result="paper"/>
 <feOffset in="SourceAlpha" dy="1.2" result="o"/><feComposite in="SourceAlpha" in2="o" operator="out" result="edge"/>
 <feFlood flood-color="#fff" flood-opacity=".55"/><feComposite in2="edge" operator="in" result="edgew"/>
 <feGaussianBlur in="SourceAlpha" stdDeviation="{b}" result="s"/><feOffset in="s" dx="{dy * .35:.1f}" dy="{dy}" result="so"/>
 <feFlood flood-color="#3A2410" flood-opacity="{op}"/><feComposite in2="so" operator="in" result="sh"/>
 <feGaussianBlur in="SourceAlpha" stdDeviation="{b * 3}" result="a"/><feOffset in="a" dy="{dy * 1.5:.1f}" result="ao"/>
 <feFlood flood-color="#3A2410" flood-opacity="{op * .35:.2f}"/><feComposite in2="ao" operator="in" result="amb"/>
 <feMerge><feMergeNode in="amb"/><feMergeNode in="sh"/><feMergeNode in="paper"/><feMergeNode in="edgew"/></feMerge>
</filter>'''

DEFS = pfilter("pp", 2.2, 3.2, .38) + pfilter("ppS", 1.3, 1.8, .34) + pfilter("ppX", .8, 1, .3)
P, PS, PX = 'filter="url(#pp)"', 'filter="url(#ppS)"', 'filter="url(#ppX)"'

def bee_inner(sp):
    body, stripe = SP[sp]
    m = {"wing": f'fill="#FBFAF6" {P}', "antenna": f'fill="none" stroke="{DARK}" stroke-width="5" stroke-linecap="round" {PS}', "tip": f'fill="{DARK}" {PS}',
         "stinger": f'fill="{DARK}" {PS}', "body": f'fill="{body}" {P}', "stripe": f'fill="{stripe}" {PS}', "tuft": f'fill="{tone(body, .35)}" {PS}',
         "eye": f'fill="{DARK}" {PX}', "eyehl": 'fill="#fff"', "cheek": f'fill="#F2949F" {PX}', "mouth": f'fill="none" stroke="{DARK}" stroke-width="3.5" stroke-linecap="round"',
         "petal": f'fill="#FBFAF6" {PX}', "pcenter": f'fill="#F4B942" {PX}'}
    out = render_parts(bee_parts(sp), lambda r, k: m.get(r))
    # inner wing layer for depth
    g = BEE[sp]; top = 120 - g["ry"]; wx = g["rx"] - 8
    inner = (f'<ellipse cx="{100 - wx + 3}" cy="{top + 13}" rx="19" ry="11" transform="rotate(-30 {100 - wx + 3} {top + 13})" fill="#DCEBF5" {PX}/>'
             f'<ellipse cx="{100 + wx - 3}" cy="{top + 13}" rx="19" ry="11" transform="rotate(30 {100 + wx - 3} {top + 13})" fill="#DCEBF5" {PX}/>')
    i = out.index("<path", out.index("rotate(30"))   # after both wings
    return out[:i] + inner + out[i:]

def bee(sp, size):
    return svg(bee_inner(sp), "0 0 200 200", size)

def cell_inner(kind, sel=False):
    if kind == "bomb":
        base = "#6E6A7C"
        return (f'<path d="{hex_path(0, 0, 47, 10)}" fill="{tone(base, -.25)}" {PS}/><path d="{hex_path(0, 0, 38, 8)}" fill="{base}" {PS}/>'
                f'<circle cx="-3" cy="5" r="16" fill="#2E2A36" {PS}/><path d="M7,-7 Q14,-20 23,-22" fill="none" stroke="#D9BF94" stroke-width="4" stroke-linecap="round" {PX}/>'
                + glyph(9, 25, -24, 9, "#F4B942").replace("/>", f" {PX}/>") + '<circle cx="-9" cy="-1" r="3.5" fill="#fff" opacity=".6"/>')
    if kind == "wild":
        cols = ["#EE7F98", "#F49B5A", "#F4C542", "#74BE86", "#64A6DE", "#9C86DA"]
        rings = "".join(f'<path d="{hex_path(0, 0, 47 - i * 6.4, 10 - i)}" fill="{c}" {PX}/>' for i, c in enumerate(cols))
        return rings + glyph(9, 0, 1, 11, "#FFFDF8").replace("/>", f" {PX}/>")
    c = POL[kind]
    lift = ' transform="translate(0,-2)"' if sel else ""
    return (f'<g{lift}><path d="{hex_path(0, 0, 47, 10)}" fill="{tone(c, -.18)}" {PS}/><path d="{hex_path(0, 0, 39, 8)}" fill="{c}" {PS}/>'
            f'<path d="{hex_path(0, 0, 31, 6)}" fill="{tone(c, .22)}" {PX}/>' + glyph(kind, 0, 1, 17, "#FFFDF8").replace("/>", f" {PX}/>") + "</g>")

def cell(kind, size):
    return svg(cell_inner(kind), "-50 -50 100 100", size)

def hive(size):
    m = {"plank": f'fill="#A87A52" {PS}', "band0": f'fill="#E9A93C" {PS}', "band1": f'fill="#F6C861" {PS}', "door": f'fill="{DARK}" {PX}'}
    return svg(render_parts(hive_parts(), lambda r, k: m[r]), "0 0 200 200", size)

def flower(size):
    m = {"stem": f'fill="none" stroke="#5FA872" stroke-width="7" stroke-linecap="round" {PS}', "leaf": f'fill="#74BE86" {PS}',
         "petal": f'fill="#EE7F98" {PS}', "center": f'fill="#F4B942" {P}'}
    inner = "".join(f'<path d="{ellipse_path(100, 80, 26, 9, 15, 60 * i + 30)}" fill="#F7B0BF" {PX}/>' for i in range(6))
    parts = render_parts(flower_parts(), lambda r, k: m[r])
    i = parts.index("<circle")
    return svg(parts[:i] + inner + parts[i:], "0 0 200 200", size)

def drop(size):
    m = {"drop": f'fill="#EFA92E" {P}', "hl": 'fill="#FFE3A0"', "hl2": 'fill="#FFE3A0"'}
    inner = f'<path d="M100,52 C112,76 136,100 136,126 A36,36 0 0 1 64,126 C64,100 88,76 100,52Z" fill="#F6C24A" {PS}/>'
    p = drop_parts()
    return svg(render_parts(p[:1], lambda r, k: m[r]) + inner + render_parts(p[1:], lambda r, k: m[r]), "0 0 200 200", size)

def icon(name, size, active=False):
    main, main2, det = ("#F4B942", "#F7D07A", DARK) if active else ("#CFC6B8", "#DFD8CC", "#FBFAF6")
    def st(r, k):
        f = {"main": main, "main2": main2, "sub": main2, "detail": det}[r]
        if k == "line":
            return f'fill="none" stroke="{f}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" {PX}'
        return f'fill="{f}" {PX if r == "detail" else PS}'
    return svg(render_parts(icon_parts(name), st), "0 0 96 96", size)

def chain(pts, s):
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    dots = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{6 if i < len(pts) - 1 else 10}" fill="#FFFDF8" {PX}/>' for i, (x, y) in enumerate(pts))
    return f'<path d="{d}" fill="none" stroke="#FFFDF8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" {PX}/>{dots}'

def preview():
    b = board_svg(44, cell_inner, chain, dim=0.5)
    tabs = "".join(f'<div class="t6tab{" on" if i == 0 else ""}">{icon(k, 34, i == 0)}<span>{nm}</span></div>' for i, (k, nm) in enumerate(ICONS))
    hills = (f'<svg width="400" height="230" style="position:absolute;left:0;bottom:0"><path d="M0,120 C80,80 160,110 230,90 C300,70 360,95 400,80 V230 H0Z" fill="#C9D9A8" {P}/>'
             f'<path d="M0,160 C90,130 170,160 260,140 C320,128 370,140 400,132 V230 H0Z" fill="#A9C98E" {P}/></svg>')
    return f'''<div style="position:absolute;inset:0;background:#F1E4CC"></div>

{hills}
<div class="t6card" style="left:20px;top:20px;width:236px">Головоломка дня<b>1 285</b></div>
<div class="t6card" style="right:20px;top:20px;width:100px;text-align:center">ходы<b>14</b></div>
<div style="position:absolute;left:20px;top:108px;display:flex;gap:8px"><span class="t6chip" style="background:#EE7F98">Комбо ×1,5</span><span class="t6chip" style="background:#9C86DA">Цепочка 6 → бомба</span></div>
<div style="position:absolute;left:24px;top:154px">{b}</div>
<div style="position:absolute;left:0;right:0;bottom:106px;text-align:center;font:700 12.5px/1 'Comfortaa';color:#5B4A3A">Веди пальцем по 3+ сотам</div>
<div class="t6card" style="left:14px;right:14px;bottom:14px;height:80px;padding:0;display:flex;justify-content:space-around;align-items:center">{tabs}</div>'''

TECH = dict(n=6, title="Бумажная аппликация", en="layered paper-cut",
            sub="Детали вырезаны из цветной бумаги и сложены слоями: мягкие тени между слоями, светлая кромка среза, волокна бумаги.",
            pair=["B · Сказочный", "A · Минимализм (формы)"],
            rn="PNG/WebP с запечёнными тенями. Слои можно разнести на 2–3 картинки и слегка двигать Animated (параллакс) — эффект «живой бумаги» без Skia.",
            size="замер ≈ 1,4 МБ PNG / 0,36 МБ WebP (тени + текстура) — только WebP.",
            bee=bee, cell=cell, hive=hive, flower=flower, drop=drop, icon=icon, preview=preview, defs=DEFS,
            css=".t6card{position:absolute;height:72px;border-radius:18px;background:#FFFDF8;box-shadow:0 2px 0 rgba(255,255,255,.6) inset,0 3px 4px rgba(58,36,16,.22),0 10px 18px -8px rgba(58,36,16,.3);padding:15px 18px 0;font:700 12px/1 'Comfortaa';color:#9A8670}"
                ".t6card b{display:block;font:700 30px/1 'Comfortaa';color:#3E2C22;margin-top:6px}"
                ".t6chip{color:#fff;font:700 12.5px/1 'Comfortaa';padding:8px 13px;border-radius:12px;box-shadow:0 2px 3px rgba(58,36,16,.3)}"
                ".t6tab{display:flex;flex-direction:column;align-items:center;gap:3px;font:700 10.5px/1 'Comfortaa';color:#A8977F}.t6tab.on{color:#3E2C22}")
