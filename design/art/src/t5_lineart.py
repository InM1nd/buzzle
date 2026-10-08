"""Technique 5 — mono line-art with a single honey accent (minimal)."""
from kit import *
from common import TAB_ICONS

INK, BG, ACC = "#141414", "#F5F3EE", "#FFB300"
LN = f'fill="{BG}" stroke="{INK}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"'
LO = f'fill="none" stroke="{INK}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"'

def bee_inner(sp):
    hero = sp == "zhuzha"
    m = {"wing": LN, "antenna": LO, "tip": f'fill="{INK}"', "stinger": f'fill="{INK}"',
         "body": LN.replace(f'fill="{BG}"', f'fill="{ACC}"') if hero else LN,
         "stripe": f'fill="{INK}"' if sp == "boris" else LO.replace('stroke-width="4.5"', 'stroke-width="4"'),
         "tuft": LN, "eye": f'fill="{INK}"', "eyehl": f'fill="{BG}"', "mouth": LO.replace("4.5", "3.5"),
         "petal": LN.replace("4.5", "3"), "pcenter": f'fill="{ACC}"'}
    parts = bee_parts(sp)
    if sp != "boris":   # stripes as two clean lines instead of filled bands
        parts = [(r, k, e) for r, k, e in parts if r != "stripe"]
        g = BEE[sp]; cx, cy, rx, ry = 100, 120, g["rx"], g["ry"]
        for y in (cy + 18, cy + 40):
            t = (y - cy) / ry; w = rx * math.sqrt(1 - t * t)
            parts.insert(len(parts) - 7 - (6 if g.get("flower") else 0) - (3 if g.get("tuft") else 0),
                         ("stripe", "line", f'<path d="M{cx - w + 2:.1f},{y} Q{cx},{y + 7} {cx + w - 2:.1f},{y}" §/>'))
    return render_parts(parts, lambda r, k: m.get(r))

def bee(sp, size):
    return svg(bee_inner(sp), "0 0 200 200", size)

def lglyph(kind, r=17, col=INK, sw=3.2):
    st = f'fill="none" stroke="{col}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"'
    if kind == 0:
        rays = "".join(f'<path d="M{math.cos(a) * r * .62:.1f},{math.sin(a) * r * .62:.1f} L{math.cos(a) * r * .95:.1f},{math.sin(a) * r * .95:.1f}" {st}/>' for a in [i * math.pi / 4 for i in range(8)])
        return f'<circle r="{r * .36:.1f}" {st}/>' + rays
    if kind == 2:
        pet = "".join(f'<path d="{ellipse_path(0, 1, r * .5, r * .3, r * .38, 72 * i)}" {st}/>' for i in range(5))
        return pet + f'<circle cy="1" r="{r * .3:.1f}" fill="{BG}" {st}/><circle cy="1" r="{r * .1:.1f}" fill="{col}"/>'
    return glyph(kind, 0, 1, r, "none", col, sw)

def cell_inner(kind, sel=False):
    hx = hex_path(0, 0, 45, 8)
    if kind == "bomb":
        return (f'<path d="{hx}" fill="{INK}"/><circle cx="-3" cy="5" r="15" fill="none" stroke="{BG}" stroke-width="3.2"/>'
                f'<path d="M7,-6 Q13,-19 22,-21" fill="none" stroke="{BG}" stroke-width="3.2" stroke-linecap="round"/>'
                + glyph(9, 25, -23, 8, ACC))
    if kind == "wild":
        arcs = "".join(f'<path d="M{-r},{8} A{r},{r} 0 0 1 {r},{8}" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>' for r in (26, 19, 12))
        return f'<path d="{hx}" fill="{BG}" stroke="{INK}" stroke-width="3.2"/>{arcs}' + glyph(9, 0, 17, 9, ACC)
    fill = ACC if sel else BG
    return f'<path d="{hx}" fill="{fill}" stroke="{INK}" stroke-width="3.2"/>' + lglyph(kind)

def cell(kind, size):
    return svg(cell_inner(kind), "-50 -50 100 100", size)

def hive(size):
    m = {"plank": LN, "band0": LN, "band1": LN, "door": f'fill="{INK}"'}
    return svg(render_parts(hive_parts(), lambda r, k: m[r]) + f'<circle cx="150" cy="58" r="5" fill="{ACC}"/><path d="M150,58 q-14,-12 -24,-4" fill="none" stroke="{INK}" stroke-width="2.5" stroke-dasharray="1 6" stroke-linecap="round"/>', "0 0 200 200", size)

def flower(size):
    m = {"stem": LO, "leaf": LN, "petal": LN, "center": f'fill="{ACC}" stroke="{INK}" stroke-width="4.5"'}
    return svg(render_parts(flower_parts(), lambda r, k: m[r]), "0 0 200 200", size)

def drop(size):
    m = {"drop": f'fill="{ACC}" stroke="{INK}" stroke-width="4.5" stroke-linejoin="round"', "hl": f'fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"', "hl2": None}
    p = [drop_parts()[0], ("hl", "line", '<path d="M70,112 Q68,132 80,146" §/>')]
    return svg(render_parts(p, lambda r, k: m[r]), "0 0 200 200", size)

def icon(name, size, active=False):
    dot = f'<circle cx="12" cy="23.6" r="1.3" fill="{ACC}"/>' if active else ""
    col = INK if active else "#A39B90"
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{col}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="overflow:visible">'
            f'{TAB_ICONS[name]}{dot}</svg>')

def chain(pts, s):
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    dots = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{4.5 if i < len(pts) - 1 else 8}" fill="{INK}"/>' for i, (x, y) in enumerate(pts))
    return f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>{dots}'

def preview():
    b = board_svg(44, cell_inner, chain, dim=0.38)
    tabs = "".join(f'<div class="t5tab{" on" if i == 0 else ""}">{icon(k, 26, i == 0)}<span>{nm}</span></div>' for i, (k, nm) in enumerate(ICONS))
    return f'''<div style="position:absolute;inset:0;background:{BG}"></div>
<div style="position:absolute;left:26px;top:24px;font:500 12px/1 'Inter Tight';color:#8C857B">головоломка дня</div>
<div style="position:absolute;left:24px;top:44px;font:300 58px/1 'Inter Tight';letter-spacing:-.02em;word-spacing:.12em;color:{INK}">1 285</div>
<div style="position:absolute;right:26px;top:24px;text-align:right;font:500 12px/1 'Inter Tight';color:#8C857B">ходы<div style="font:300 44px/1 'Inter Tight';color:{INK};margin-top:8px">14</div></div>
<div style="position:absolute;left:26px;top:118px;font:500 13px/1 'Inter Tight';color:{INK};display:flex;gap:16px;align-items:center"><span style="display:flex;gap:6px;align-items:center"><i style="width:8px;height:8px;border-radius:50%;background:{ACC}"></i>комбо ×1,5</span><span style="color:#8C857B">цепочка 6 → бомба</span></div>
<div style="position:absolute;left:24px;top:156px">{b}</div>
<div style="position:absolute;left:24px;right:24px;bottom:86px;height:1px;background:#DDD8CF"></div>
<div style="position:absolute;left:0;right:0;bottom:0;height:86px;display:flex;justify-content:space-around;align-items:center">{tabs}</div>'''

TECH = dict(n=5, title="Линия + один акцент", en="mono line-art",
            sub="Только чёрная линия одной толщины и один медовый акцент (маскот, выбранная цепочка, мёд). Цвета пыльцы заменены формой значка.",
            pair=["A · Минимализм"],
            rn="Маски-PNG (белая линия на прозрачном) + tintColor — одна картинка на ассет, цвет задаётся в коде; иконки вкладок — те же контуры.",
            size="замер ≈ 0,31 МБ PNG / 0,15 МБ WebP (маски можно хранить в 8-бит grey — ещё меньше). Минус: 5 «цветов» различаются только формой.",
            bee=bee, cell=cell, hive=hive, flower=flower, drop=drop, icon=icon, preview=preview,
            css=".t5tab{display:flex;flex-direction:column;align-items:center;gap:7px;font:500 11.5px/1 'Inter Tight';color:#A39B90}.t5tab.on{color:#141414}")
