"""Technique 1 — flat geometric vector (code-drawn shapes, no outlines, flat half-shade)."""
from kit import *

INK = "#231A14"
POL = ["#FFB000", "#FF4F79", "#8B5CF6", "#2D8CFF", "#1FB866"]
SP = {"zhuzha": ("#FFC21A", INK), "pushinka": ("#FFE2A8", "#C98A4B"), "boris": ("#FF9A1F", INK), "lavanda": ("#C4A8FF", "#5B34C9")}

def bee_inner(sp):
    body, stripe = SP[sp]
    m = {"wing": 'fill="#D6EAFF"', "antenna": f'fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round"', "tip": f'fill="{INK}"',
         "stinger": f'fill="{INK}"', "body": f'fill="{body}"', "stripe": f'fill="{stripe}"', "shade": f'fill="{INK}" opacity=".09"',
         "tuft": f'fill="{body}"', "eye": f'fill="{INK}"', "eyehl": 'fill="#fff"', "cheek": 'fill="#FF5C7A" opacity=".45"',
         "mouth": f'fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round"', "petal": 'fill="#FFFFFF"', "pcenter": 'fill="#FFB000"'}
    return render_parts(bee_parts(sp), lambda r, k: m[r])

def bee(sp, size):
    return svg(bee_inner(sp), "0 0 200 200", size)

def cell_inner(kind, sel=False):
    if kind == "bomb":
        return (f'<path d="{hex_path(0, 0, 48, 9)}" fill="{INK}"/><path d="{hex_path(0, 0, 38, 0)}" fill="#fff" opacity=".06"/>'
                '<circle cx="-3" cy="5" r="17" fill="#fff"/><rect x="5" y="-17" width="10" height="9" rx="2" transform="rotate(40 10 -12)" fill="#fff"/>'
                '<path d="M13,-17 Q18,-26 25,-24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>'
                + glyph(9, 27, -25, 8, "#FFB000"))
    if kind == "wild":
        sect = ""
        cols = POL + ["#FF7A1A"]
        pts = hex_pts(0, 0, 41)
        for i in range(6):
            a, b = pts[i], pts[(i + 1) % 6]
            sect += f'<path d="M0,0 L{a[0]:.1f},{a[1]:.1f} L{b[0]:.1f},{b[1]:.1f}Z" fill="{cols[(i + 2) % 6]}"/>'
        return (f'<path d="{hex_path(0, 0, 48, 9)}" fill="#fff"/>{sect}<circle r="17" fill="#fff"/>' + glyph(9, 0, 1, 12, INK))
    col = POL[kind]
    ring = f'<path d="{hex_path(0, 0, 44, 7)}" fill="none" stroke="#fff" stroke-width="4"/>' if sel else ""
    return (f'<path d="{hex_path(0, 0, 48, 9)}" fill="{col}"/>'
            f'<path d="M-38,0 L-19,-32.9 L19,-32.9 L38,0Z" fill="#fff" opacity=".16"/>{ring}' + glyph(kind, 0, 1, 19, "#fff"))

def cell(kind, size):
    return svg(cell_inner(kind), "-50 -50 100 100", size)

def hive(size):
    m = {"plank": 'fill="#B8661A"', "band0": 'fill="#FFB000"', "band1": 'fill="#FFCB45"', "door": f'fill="{INK}"'}
    inner = render_parts(hive_parts(), lambda r, k: m[r])
    return svg(inner, "0 0 200 200", size)

def flower(size):
    m = {"stem": 'fill="none" stroke="#1FB866" stroke-width="7" stroke-linecap="round"', "leaf": 'fill="#1FB866"', "petal": 'fill="#FF4F79"', "center": 'fill="#FFB000"'}
    return svg(render_parts(flower_parts(), lambda r, k: m[r]), "0 0 200 200", size)

def drop(size):
    m = {"drop": 'fill="#FFB000"', "hl": 'fill="#fff" opacity=".75"', "hl2": 'fill="#fff" opacity=".75"'}
    return svg(render_parts(drop_parts(), lambda r, k: m[r]) + '<path d="M100,24 C116,56 152,90 152,126 A52,52 0 0 1 100,178Z" fill="#231A14" opacity=".08"/>', "0 0 200 200", size)

def icon_inner(name, active):
    main, main2, det = ("#FFB000", "#FFCB45", INK) if active else ("#BDB5AA", "#D3CCC2", "#F8F6F2")
    m = {"main": f'fill="{main}"', "main2": f'fill="{main2}"', "sub": f'fill="{main2}" stroke="{main2}" stroke-width="6" stroke-linecap="round"',
         "detail": f'fill="{det}" stroke="{det}" stroke-width="0"'}
    def st(r, k):
        if k == "line":
            c = main2 if r == "sub" else det
            return f'fill="none" stroke="{c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"'
        return m[r]
    return render_parts(icon_parts(name), st)

def icon(name, size, active=False):
    return svg(icon_inner(name, active), "0 0 96 96", size)

def chain(pts, s):
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    dots = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{7 if i < len(pts) - 1 else 11}" fill="#fff" stroke="{INK}" stroke-width="3.5"/>' for i, (x, y) in enumerate(pts))
    return f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>{dots}'

def preview():
    b = board_svg(44, cell_inner, chain, dim=0.32)
    tabs = "".join(f'<div class="t1tab{" on" if i == 0 else ""}">{icon(k, 30, i == 0)}<span>{nm}</span></div>' for i, (k, nm) in enumerate(ICONS))
    return f'''<div style="position:absolute;inset:0;background:#F5F3EE"></div>
<div style="position:absolute;left:26px;top:24px;font:600 11px/1 'Inter Tight';letter-spacing:.16em;color:#8C857B">ГОЛОВОЛОМКА ДНЯ</div>
<div style="position:absolute;left:24px;top:42px;font:700 54px/1 'Inter Tight';letter-spacing:-.025em;word-spacing:.18em;color:{INK}">1 285</div>
<div style="position:absolute;right:26px;top:24px;text-align:right;font:600 11px/1 'Inter Tight';letter-spacing:.16em;color:#8C857B">ХОДЫ<div style="font:700 40px/1 'Inter Tight';letter-spacing:-.03em;color:{INK};margin-top:9px">14</div></div>
<div style="position:absolute;left:24px;top:112px;display:flex;gap:8px"><span style="background:#FFB000;color:{INK};font:650 13px/1 'Inter Tight';padding:7px 12px;border-radius:20px">Комбо ×1,5</span><span style="background:{INK};color:#fff;font:650 13px/1 'Inter Tight';padding:7px 12px;border-radius:20px">Цепочка 6 → бомба</span></div>
<div style="position:absolute;left:24px;top:160px">{b}</div>
<div style="position:absolute;left:0;right:0;bottom:104px;text-align:center;font:500 13px/1 'Inter Tight';color:#9A9288">Ведите по 3+ сотам одного цвета</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:86px;border-top:1px solid #E2DED6;display:flex;justify-content:space-around;align-items:center;background:#F5F3EE">{tabs}</div>'''

TECH = dict(n=1, title="Плоский вектор", en="flat geometric",
            sub="Чистые геометрические фигуры без обводок: заливки, плоская полутень, белые значки. Рисуется кодом, масштабируется без потерь.",
            pair=["A · Минимализм", "C · Бзз (упрощённо)"],
            rn="PNG-спрайты, отрендеренные из SVG при сборке (@3x), react-native-svg не нужен; цвет сот можно тонировать через tintColor одной маской.",
            size="замер ≈ 0,21 МБ PNG / 0,12 МБ WebP на весь набор — легче текущих 664 КБ.",
            bee=bee, cell=cell, hive=hive, flower=flower, drop=drop, icon=icon, preview=preview,
            defs='<clipPath id="f1hive"><rect x="25" y="20" width="150" height="160"/></clipPath>',
            css=".t1tab{display:flex;flex-direction:column;align-items:center;gap:6px;font:550 11.5px/1 'Inter Tight';color:#A39B90}.t1tab.on{color:#231A14}")
