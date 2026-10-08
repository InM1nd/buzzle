"""Technique 3 — soft 3D clay / plasticine render look (pre-rendered PNG)."""
from kit import *

POL = ["#FFB833", "#FF7090", "#9B7BFF", "#4DA6FF", "#52C27A"]
SP = {"zhuzha": ("#FFC53D", "#5A3A2A"), "pushinka": ("#FFE4B5", "#D49A5C"), "boris": ("#FF9C33", "#3A2E2A"), "lavanda": ("#C6AEFF", "#6E4AD0")}
DARK = "#4A3226"

def clay_filter(fid, blur, scale, shadow=True, dy=5, sb=4, so=.28):
    sh = (f'<feGaussianBlur in="SourceAlpha" stdDeviation="{sb}" result="s1"/><feOffset in="s1" dy="{dy}" dx="{dy * .4:.1f}" result="s2"/>'
          f'<feFlood flood-color="#5A3010" flood-opacity="{so}"/><feComposite in2="s2" operator="in" result="shadow"/>') if shadow else ""
    merge = '<feMergeNode in="shadow"/>' if shadow else ""
    return f'''<filter id="{fid}" x="-30%" y="-30%" width="160%" height="170%" color-interpolation-filters="sRGB">
 <feGaussianBlur in="SourceAlpha" stdDeviation="{blur}" result="b"/>
 <feDiffuseLighting in="b" surfaceScale="{scale}" diffuseConstant="1.25" lighting-color="#fff" result="df"><feDistantLight azimuth="235" elevation="48"/></feDiffuseLighting>
 <feComposite in="df" in2="SourceAlpha" operator="in" result="dfi"/>
 <feBlend in="SourceGraphic" in2="dfi" mode="multiply" result="lit"/>
 <feSpecularLighting in="b" surfaceScale="{scale}" specularConstant=".45" specularExponent="11" lighting-color="#FFF6E8" result="sp"><feDistantLight azimuth="235" elevation="58"/></feSpecularLighting>
 <feComposite in="sp" in2="SourceAlpha" operator="in" result="spi"/>
 <feComposite in="lit" in2="spi" operator="arithmetic" k2="1" k3=".55" result="ls"/>
 <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3" result="gr"/>
 <feColorMatrix in="gr" type="matrix" values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .06" result="grain"/>
 <feComposite in="grain" in2="SourceAlpha" operator="in" result="grain2"/>
 <feBlend in="ls" in2="grain2" mode="multiply" result="lsg"/>
 <feComposite in="lsg" in2="SourceAlpha" operator="in" result="clay"/>
 {sh}
 <feMerge>{merge}<feMergeNode in="clay"/></feMerge>
</filter>'''

DEFS = (clay_filter("clay", 6, 7) + clay_filter("clayS", 3, 4, dy=2.5, sb=2, so=.3) + clay_filter("clayX", 1.6, 2.2, dy=1.2, sb=1, so=.25)
        + clay_filter("clayC", 5, 6, dy=4, sb=3.5, so=.3))

def bee_inner(sp):
    body, stripe = SP[sp]
    C, S, X = 'filter="url(#clay)"', 'filter="url(#clayS)"', 'filter="url(#clayX)"'
    m = {"wing": f'fill="#CBE5FF" opacity=".95" {C}', "antenna": f'fill="none" stroke="{DARK}" stroke-width="7" stroke-linecap="round" {S}', "tip": f'fill="{DARK}" {S}',
         "stinger": f'fill="{DARK}" {S}', "body": f'fill="{body}" {C}', "stripe": f'fill="{stripe}" {S}', "tuft": f'fill="{body}" {S}',
         "eye": f'fill="#2A1C16" {X}', "eyehl": 'fill="#fff"', "cheek": f'fill="#FF8FA0" {X}', "mouth": f'fill="none" stroke="#2A1C16" stroke-width="4" stroke-linecap="round"',
         "petal": f'fill="#FFFFFF" {X}', "pcenter": f'fill="#FFB833" {X}'}
    return render_parts(bee_parts(sp), lambda r, k: m.get(r))

def bee(sp, size):
    return svg(bee_inner(sp), "0 0 200 200", size)

def glyph_rounded(kind, r):
    return glyph(kind, 0, 1, r, "#FFFFFF").replace("/>", ' filter="url(#clayX)"/>')

def cell_inner(kind, sel=False):
    hx = hex_path(0, 0, 46, 14)
    if kind == "bomb":
        return (f'<path d="{hx}" fill="#4B4A5C" filter="url(#clayC)"/><circle cx="-3" cy="6" r="18" fill="#2B2A36" filter="url(#clayS)"/>'
                '<path d="M8,-7 Q14,-20 23,-22" fill="none" stroke="#C9A57A" stroke-width="5" stroke-linecap="round" filter="url(#clayX)"/>'
                + glyph(9, 25, -24, 10, "#FFB833").replace("/>", ' filter="url(#clayX)"/>'))
    if kind == "wild":
        cols = ["#FF7090", "#FFB833", "#FFE066", "#52C27A", "#4DA6FF", "#9B7BFF"]
        rings = "".join(f'<path d="{hex_path(0, 0, 46 - i * 6.2, 12 - i)}" fill="{c}"/>' for i, c in enumerate(cols))
        return (f'<g filter="url(#clayC)">{rings}</g><circle r="15" fill="#fff" filter="url(#clayS)"/>' + glyph(9, 0, 1, 10, "#FFB833").replace("/>", ' filter="url(#clayX)"/>'))
    up = ' transform="translate(0,-3) scale(1.04)"' if sel else ""
    return f'<g{up}><path d="{hx}" fill="{POL[kind]}" filter="url(#clayC)"/>' + glyph_rounded(kind, 18) + "</g>"

def cell(kind, size):
    return svg(cell_inner(kind), "-50 -50 100 100", size)

def hive(size):
    m = {"plank": 'fill="#B9824E" filter="url(#clayS)"', "band0": 'fill="#F4AE3A" filter="url(#clayS)"', "band1": 'fill="#FFC85A" filter="url(#clayS)"', "door": 'fill="#4A3226" filter="url(#clayX)"'}
    return svg(render_parts(hive_parts(), lambda r, k: m[r]), "0 0 200 200", size)

def flower(size):
    m = {"stem": 'fill="none" stroke="#45B06C" stroke-width="9" stroke-linecap="round" filter="url(#clayS)"', "leaf": 'fill="#52C27A" filter="url(#clayS)"',
         "petal": 'fill="#FF8AA6" filter="url(#clayS)"', "center": 'fill="#FFC53D" filter="url(#clay)"'}
    return svg(render_parts(flower_parts(), lambda r, k: m[r]), "0 0 200 200", size)

def drop(size):
    m = {"drop": 'fill="#FFAE1F" filter="url(#clay)"', "hl": 'fill="#fff" opacity=".7"', "hl2": 'fill="#fff" opacity=".8"'}
    return svg(render_parts(drop_parts(), lambda r, k: m[r]), "0 0 200 200", size)

def icon(name, size, active=False):
    main, main2, det = ("#FFB833", "#FFD06A", "#4A3226") if active else ("#C9C0B4", "#DAD3C8", "#F8F6F2")
    def st(r, k):
        f = {"main": main, "main2": main2, "sub": main2, "detail": det}[r]
        if k == "line":
            return f'fill="none" stroke="{f}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" filter="url(#clayX)"'
        return f'fill="{f}" filter="url(#{"clayX" if r == "detail" else "clayS"})"'
    return svg(render_parts(icon_parts(name), st), "0 0 96 96", size)

def chain(pts, s):
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    dots = "".join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{7 if i < len(pts) - 1 else 11}" fill="#FFF7EC" filter="url(#clayX)"/>' for i, (x, y) in enumerate(pts))
    return f'<path d="{d}" fill="none" stroke="#FFF7EC" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" filter="url(#clayX)"/>{dots}'

def preview():
    b = board_svg(44, cell_inner, chain, dim=0.55)
    tabs = "".join(f'<div class="t3tab{" on" if i == 0 else ""}">{icon(k, 36, i == 0)}<span>{nm}</span></div>' for i, (k, nm) in enumerate(ICONS))
    return f'''<div style="position:absolute;inset:0;background:linear-gradient(180deg,#FFE7CF,#FFD3B8)"></div>
<div class="t3pill" style="left:20px;top:20px;width:236px">Головоломка дня<b>1 285</b></div>
<div class="t3pill" style="right:20px;top:20px;width:100px;text-align:center">ходы<b>14</b></div>
<div style="position:absolute;left:20px;top:108px;display:flex;gap:8px"><span class="t3chip" style="background:#FF7A5C">Комбо ×1,5</span><span class="t3chip" style="background:#9B7BFF">Цепочка 6 → бомба</span></div>
<div style="position:absolute;left:24px;top:154px;padding:0">{b}</div>
<div style="position:absolute;left:0;right:0;bottom:106px;text-align:center;font:800 13px/1 'Nunito';color:#B07A5A">Веди пальцем по 3+ сотам одного цвета</div>
<div style="position:absolute;left:14px;right:14px;bottom:14px;height:78px;border-radius:26px;background:#FFF4E8;box-shadow:0 6px 0 #F0C9A8,0 14px 24px -10px rgba(120,60,20,.4);display:flex;justify-content:space-around;align-items:center">{tabs}</div>'''

TECH = dict(n=3, title="Мягкий 3D / пластилин", en="soft clay render",
            sub="Объём из «пластилина»: матовый свет, мягкий блик, зерно и тень под каждой деталью. Каждая деталь — отдельный «слепленный» кусочек.",
            pair=["C · Бзз (следующий шаг)", "B · Сказочный"],
            rn="Только растр: PNG/WebP, отрендеренные заранее (сейчас из SVG-фильтров, позже можно из Blender). Анимации — Animated scale/translate поверх спрайтов.",
            size="замер ≈ 0,97 МБ PNG / 0,30 МБ WebP (градиенты и зерно сжимаются хуже плоских).",
            bee=bee, cell=cell, hive=hive, flower=flower, drop=drop, icon=icon, preview=preview, defs=DEFS,
            css=".t3pill{position:absolute;height:72px;border-radius:24px;background:#FFF4E8;box-shadow:0 5px 0 #F0C9A8,0 12px 20px -10px rgba(120,60,20,.35);padding:14px 18px 0;font:800 12px/1 'Nunito';color:#B07A5A;letter-spacing:.02em}"
                ".t3pill b{display:block;font:900 32px/1 'Nunito';color:#5A3A2A;margin-top:4px}"
                ".t3chip{color:#fff;font:900 13px/1 'Nunito';padding:8px 13px;border-radius:16px;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),0 3px 6px -2px rgba(90,40,10,.35)}"
                ".t3tab{display:flex;flex-direction:column;align-items:center;gap:2px;font:800 11.5px/1 'Nunito';color:#C0A08A}.t3tab.on{color:#5A3A2A}")
