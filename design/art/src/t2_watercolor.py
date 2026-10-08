"""Technique 2 — hand-drawn ink + watercolour (storybook)."""
from kit import *
from common import TAB_ICONS

INK = "#3B2A20"
POL = ["#F5BF4A", "#F094AA", "#B497E6", "#86BCEB", "#97CF92"]
SP = {"zhuzha": ("#F7C948", "#8A5A3B"), "pushinka": ("#F8DDA8", "#C99A68"), "boris": ("#F4A34A", "#4A3A34"), "lavanda": ("#C9B2F0", "#7A5BC2")}
WC = 'filter="url(#wc)"'
INKS = f'fill="none" stroke="{INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#ink)"'
GRAIN = ("url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' "
         "baseFrequency='.75' numOctaves='3' seed='5'/><feColorMatrix values='0 0 0 0 .45 0 0 0 0 .36 0 0 0 0 .25 0 0 0 .5 0'/></filter>"
         "<rect width='240' height='240' filter='url(%23n)' opacity='.22'/></svg>\")")

DEFS = """
<filter id="wc" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
 <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="2" result="n1"/>
 <feDisplacementMap in="SourceGraphic" in2="n1" scale="8" xChannelSelector="R" yChannelSelector="G" result="shape"/>
 <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="4" seed="9" result="n2"/>
 <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.25 0 0 0 1.45" result="mott"/>
 <feComposite in="shape" in2="mott" operator="in" result="pig"/>
 <feMorphology in="shape" operator="erode" radius="2.2" result="er"/>
 <feComposite in="shape" in2="er" operator="out" result="rim"/>
 <feGaussianBlur in="rim" stdDeviation="0.9" result="rimb"/>
 <feComponentTransfer in="rimb" result="rimd"><feFuncR type="linear" slope=".72"/><feFuncG type="linear" slope=".7"/><feFuncB type="linear" slope=".72"/><feFuncA type="linear" slope=".85"/></feComponentTransfer>
 <feMerge><feMergeNode in="pig"/><feMergeNode in="rimd"/></feMerge>
</filter>
<filter id="ink" x="-10%" y="-10%" width="120%" height="120%">
 <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4" result="n"/>
 <feDisplacementMap in="SourceGraphic" in2="n" scale="3.6" xChannelSelector="R" yChannelSelector="G"/>
</filter>
"""

def bee_inner(sp):
    body, stripe = SP[sp]
    parts = bee_parts(sp)
    fills = {"wing": f'fill="#CFE4F2" {WC} opacity=".85"', "body": f'fill="{body}" {WC}', "stripe": f'fill="{stripe}" {WC} opacity=".8" style="mix-blend-mode:multiply"',
             "tuft": f'fill="{body}" {WC}', "cheek": f'fill="#F08BA0" {WC} opacity=".7"', "petal": f'fill="#F3A0C0" {WC}', "pcenter": f'fill="#F5BF4A" {WC}',
             "stinger": f'fill="#6B5040" {WC}'}
    lines = {"wing", "body", "stinger", "tuft", "petal", "antenna", "mouth"}
    out = ""
    for role, kind, el in parts:
        if role in fills:
            out += f'<g transform="translate(2.5,2)">{el.replace("§", fills[role])}</g>'
        if role in lines:
            out += el.replace("§", INKS)
        elif role in ("tip", "eye"):
            out += el.replace("§", f'fill="{INK}" filter="url(#ink)"')
        elif role == "eyehl":
            out += el.replace("§", 'fill="#FFFDF6"')
    return out

def bee(sp, size):
    return svg(bee_inner(sp), "0 0 200 200", size)

def cell_inner(kind, sel=False):
    hx = hex_path(0, 0, 45, 11)
    ink = INKS.replace('stroke-width="3.2"', 'stroke-width="2.6"')
    gl = lambda k, r=18: glyph(k, 0, 1, r, "#FFFDF6", INK, 2.2).replace("/>", ' filter="url(#ink)"/>')
    if kind == "bomb":
        return (f'<g transform="translate(1.5,1.5)"><path d="{hx}" fill="#A9AFBF" {WC}/><circle cx="-3" cy="5" r="17" fill="#4C4A5A" {WC}/>'
                f'<path d="{glyph_star(26, -25, 9)}" fill="#F5A64A" {WC}/></g><path d="{hx}" {ink}/>'
                f'<circle cx="-3" cy="5" r="17" {ink}/><path d="M7,-9 Q14,-22 24,-23" {ink}/><circle cx="-9" cy="-1" r="4" fill="#FFFDF6" opacity=".8"/>'
                f'<path d="{glyph_star(26, -25, 9)}" {ink}/>')
    if kind == "wild":
        pts = hex_pts(0, 0, 44); sect = ""
        for i in range(6):
            a, b = pts[i], pts[(i + 1) % 6]
            sect += f'<path d="M0,0 L{a[0]:.1f},{a[1]:.1f} L{b[0]:.1f},{b[1]:.1f}Z" fill="{(POL + ["#F7A15C"])[(i + 2) % 6]}" {WC} style="mix-blend-mode:multiply"/>'
        return f'<g transform="translate(1.5,1.5)">{sect}</g><path d="{hx}" {ink}/>' + gl(9, 17)
    selc = f'<path d="{hex_path(0, 0, 39, 9)}" fill="none" stroke="{INK}" stroke-width="1.6" stroke-dasharray="3 4" filter="url(#ink)"/>' if sel else ""
    return f'<g transform="translate(1.5,1.5)"><path d="{hx}" fill="{POL[kind]}" {WC}/></g><path d="{hx}" {ink}/>{selc}' + gl(kind)

def glyph_star(cx, cy, r):
    pts = []
    for i in range(10):
        a = math.radians(36 * i - 90); rr = r * (1 if i % 2 == 0 else .45)
        pts.append(f"{cx + math.cos(a) * rr:.1f},{cy + math.sin(a) * rr:.1f}")
    return "M" + " L".join(pts) + "Z"

def cell(kind, size):
    return svg(cell_inner(kind), "-50 -50 100 100", size)

def simple(parts, fills, lines, size, extra=""):
    l1 = render_parts(parts, lambda r, k: fills.get(r))
    l2 = render_parts(parts, lambda r, k: INKS if r in lines else None)
    return svg(f'<g transform="translate(2.5,2)">{l1}</g>{l2}{extra}', "0 0 200 200", size)

def hive(size):
    return simple(hive_parts(), {"plank": f'fill="#C9A27A" {WC}', "band0": f'fill="#EDB54E" {WC}', "band1": f'fill="#F6CF78" {WC}', "door": f'fill="#5E4030" {WC}'},
                  {"plank", "band0", "band1", "door"}, size)

def flower(size):
    return simple(flower_parts(), {"leaf": f'fill="#97CF92" {WC}', "petal": f'fill="#F094AA" {WC} opacity=".85" style="mix-blend-mode:multiply"', "center": f'fill="#F5BF4A" {WC}'},
                  {"stem", "leaf", "petal", "center"}, size)

def drop(size):
    p = drop_parts()
    return svg(f'<g transform="translate(2.5,2)">{render_parts(p, lambda r, k: f"fill=\"#F0B23C\" {WC}" if r == "drop" else None)}</g>'
               + render_parts(p, lambda r, k: INKS if r == "drop" else 'fill="#FFFDF6" opacity=".9"'), "0 0 200 200", size)

def icon(name, size, active=False):
    blob = "#F7D27E" if active else "#E3DCD0"
    ic = TAB_ICONS[name]
    return svg(f'<circle cx="50" cy="52" r="34" fill="{blob}" {WC}/><g transform="translate(4,4) scale(3.7)" fill="none" stroke="{INK}" stroke-width=".9" '
               f'stroke-linecap="round" stroke-linejoin="round" filter="url(#ink2)">{ic}</g>', "0 0 96 96", size)

def chain(pts, s):
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    dots = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{5 if i < len(pts) - 1 else 8}" fill="{INK}" filter="url(#ink)"/>' for i, (x, y) in enumerate(pts))
    return (f'<path d="{d}" fill="none" stroke="#FFFDF6" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>'
            f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" stroke-linejoin="round"/>{dots}')

def preview():
    b = board_svg(44, cell_inner, chain, dim=0.45)
    tabs = "".join(f'<div class="t2tab{" on" if i == 0 else ""}">{icon(k, 38, i == 0)}<span>{nm}</span></div>' for i, (k, nm) in enumerate(ICONS))
    return f'''<div style="position:absolute;inset:0;background:#FBF3E2;background-image:{GRAIN.replace(chr(34), '&quot;')}"></div>
<div style="position:absolute;left:0;right:0;top:20px;text-align:center;font:400 15px/1 'Pangolin';color:#8A6A50">Головоломка дня</div>
<div style="position:absolute;left:0;right:0;top:40px;text-align:center;font:400 46px/1 'Pangolin';color:{INK}">1 285</div>
<div class="t2badge" style="left:22px">ходы<b>14</b></div>
<div style="position:absolute;left:22px;top:108px;font:400 22px/1 'Pangolin';color:#C0604A;transform:rotate(-3deg)">Комбо ×1,5 !</div>
<div style="position:absolute;right:22px;top:108px;font:400 17px/1 'Pangolin';color:#5E4030;transform:rotate(2deg)">цепочка 6 → бомба</div>
<div style="position:absolute;left:24px;top:150px">{b}</div>
<div style="position:absolute;left:0;right:0;bottom:104px;text-align:center;font:400 15px/1 'Pangolin';color:#8A6A50">веди пальцем по сотам одного цвета</div>
<div style="position:absolute;left:12px;right:12px;bottom:10px;height:80px;display:flex;justify-content:space-around;align-items:center">{tabs}</div>'''

TECH = dict(n=2, title="Тушь + акварель", en="ink & watercolour",
            sub="Кривоватые контуры тушью, пятна акварели с тёмной кромкой и разводами, лёгкий сдвиг заливки — как иллюстрация в детской книжке.",
            pair=["B · Сказочный"],
            rn="Только растр: заранее отрендеренные PNG/WebP @2x (фильтры не повторить во View). Текстура бумаги — один тайл 256 px.",
            size="замер ≈ 1,3 МБ PNG / 0,52 МБ WebP. PNG съест весь запас APK (~0,7 МБ) → только WebP.",
            bee=bee, cell=cell, hive=hive, flower=flower, drop=drop, icon=icon, preview=preview,
            defs=DEFS + '<filter id="ink2" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.18" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1" xChannelSelector="R" yChannelSelector="G"/></filter>',
            css=f".tile{{background-color:#FBF8F1;background-image:{GRAIN}}}"
                ".t2badge{position:absolute;top:24px;font:400 14px/1 'Pangolin';color:#8A6A50;text-align:center;width:58px;height:58px;border:2.5px solid #3B2A20;border-radius:50%;padding-top:8px;transform:rotate(-6deg);background:#F7D27E}"
                ".t2badge b{display:block;font:400 24px/1 'Pangolin';color:#3B2A20;font-weight:400}"
                ".t2tab{display:flex;flex-direction:column;align-items:center;gap:3px;font:400 13px/1 'Pangolin';color:#9C8670}.t2tab.on{color:#3B2A20}")
