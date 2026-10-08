"""Direction 4 — Glossy candy: juicy 3D gem hexes, sunny meadow, chunky outlined type, shiny buttons."""
import math, random
from common import *

CAND = [("#FFE36B", "#FFB000", "#D97A00"), ("#FF8FB0", "#FF3D72", "#C2124A"), ("#D7A6FF", "#A15CFF", "#6B22D1"),
        ("#9BE3FF", "#2EA8FF", "#1660D6"), ("#C2F57A", "#5ED33A", "#24961F")]
BROWN = "#6B2E0A"

def defs():
    g = ['<defs>']
    for k, (l, m, d) in enumerate(CAND):
        g.append(f'<radialGradient id="gem{k}" cx=".38" cy=".28" r=".85"><stop offset="0" stop-color="{l}"/><stop offset=".55" stop-color="{m}"/><stop offset="1" stop-color="{d}"/></radialGradient>')
    g.append('<linearGradient id="hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>')
    g.append('<radialGradient id="honeyGem" cx=".38" cy=".28" r=".85"><stop offset="0" stop-color="#FFF0A0"/><stop offset=".5" stop-color="#FFB71A"/><stop offset="1" stop-color="#C96A00"/></radialGradient>')
    g.append('<radialGradient id="rainbow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#FFE36B"/><stop offset=".55" stop-color="#FF5C9A"/><stop offset=".8" stop-color="#7E5CFF"/><stop offset="1" stop-color="#2EA8FF"/></radialGradient>')
    g.append('<filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#3A0F5C" flood-opacity=".45"/></filter>')
    g.append('<filter id="glw" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>')
    g.append('</defs>')
    return "".join(g)
DEFS = defs()

def gem(x, y, R, fill, sym=None, symc="#fff", big=False):
    o = [f'<g filter="url(#sh)">',
         f'<path d="{hex_path(x, y + R * .1, R, R * .26)}" fill="#000" opacity=".22"/>',
         f'<path d="{hex_path(x, y, R, R * .26)}" fill="{fill}"/>',
         f'<path d="{hex_path(x, y, R * .9, R * .22)}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.4"/>',
         f'<ellipse cx="{x - R * .12}" cy="{y - R * .42}" rx="{R * .55}" ry="{R * .26}" fill="url(#hl)" opacity=".85"/>',
         f'<circle cx="{x - R * .45}" cy="{y - R * .22}" r="{R * .08}" fill="#fff" opacity=".9"/>']
    if sym is not None:
        o.append(f'<g opacity=".95">{glyph(sym, x, y + R * .06, R * .4, "rgba(0,0,0,.18)")}</g>')
        o.append(glyph(sym, x, y + R * .02, R * .38, symc))
    o.append('</g>')
    return "".join(o)

def cbee(x, y, sc=1, rot=0, flip=False):
    f = -1 if flip else 1
    return f'''<g transform="translate({x},{y}) rotate({rot}) scale({sc * f},{sc})" filter="url(#sh)">
<ellipse cx="-5" cy="-15" rx="10" ry="7" fill="#E8F7FF" stroke="#7FC7FF" stroke-width="1.5" transform="rotate(-25 -5 -15)"/>
<ellipse cx="7" cy="-16" rx="9" ry="6.5" fill="#E8F7FF" stroke="#7FC7FF" stroke-width="1.5" transform="rotate(20 7 -16)"/>
<ellipse cx="0" cy="0" rx="17" ry="14" fill="url(#honeyGem)"/>
<path d="M-4,-13.5 Q-7,0 -4,13.5 M5,-13.5 Q2,0 5,13.5" stroke="#4A2108" stroke-width="5" fill="none" stroke-linecap="round"/>
<ellipse cx="-3" cy="-7" rx="9" ry="4" fill="#fff" opacity=".5"/>
<circle cx="-10" cy="-1" r="4.2" fill="#fff"/><circle cx="-10.8" cy="-1" r="2.6" fill="#2A1204"/><circle cx="-11.6" cy="-2" r="1" fill="#fff"/>
<ellipse cx="-12" cy="5" rx="3" ry="2" fill="#FF7FA8" opacity=".8"/>
<path d="M17,0 l6,1.5 -6,2" fill="#4A2108"/>
<path d="M-9,-11 q-5,-9 -10,-8" stroke="#4A2108" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="-19" cy="-19" r="2.4" fill="#FF5C9A"/>
</g>'''

def hive_svg():
    s = 39; W, H = 380, 330; cx0, cy0 = W / 2, H / 2 + 2
    out = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}">{DEFS}']
    for i, (q, r) in enumerate(HIVE_SLOTS):
        x, y = hive_center(q, r, s); x += cx0; y += cy0
        st = hive_state(i); lv = HIVE_LEVELS[i]
        if st == "built":
            out.append(gem(x, y, s * .9, "url(#honeyGem)"))
            out.append(f'<text x="{x}" y="{y + 9}" text-anchor="middle" font-family="Rubik" font-weight="900" font-size="25" fill="#fff" stroke="{BROWN}" stroke-width="5" paint-order="stroke" stroke-linejoin="round">{lv}</text>')
        else:
            out.append(f'<path d="{hex_path(x, y, s * .86, 9)}" fill="#fff" fill-opacity=".35" stroke="#fff" stroke-width="2.5" stroke-opacity=".9"/>')
            out.append(f'<circle cx="{x}" cy="{y}" r="11" fill="#5ED33A" stroke="#fff" stroke-width="2.5"/><path d="M{x - 5},{y} h10 M{x},{y - 5} v10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>')
    out.append(cbee(40, 62, 1.1, -8)); out.append(cbee(342, 290, 1.05, 10, True)); out.append(cbee(336, 44, .8, 6, True))
    out.append('</svg>')
    return "".join(out)

def board_svg():
    s = 33; W, H = board_size(s); pad = 8
    out = [f'<svg width="{W + 2 * pad}" height="{H + 2 * pad}" viewBox="{-pad} {-pad} {W + 2 * pad} {H + 2 * pad}">{DEFS}']
    sel = set(PATH)
    for c in range(COLS):
        for r in range(ROWS):
            x, y = cell_center(c, r, s); col = CELLS[c][r]; on = (c, r) in sel
            out.append(f'<path d="{hex_path(x, y, s * .95, 8)}" fill="#fff" opacity=".07"/>')
    for c in range(COLS):
        for r in range(ROWS):
            x, y = cell_center(c, r, s); col = CELLS[c][r]; on = (c, r) in sel
            R = s * (.95 if on else .86)
            if on:
                out.append(f'<path d="{hex_path(x, y, R + 3, 10)}" fill="#FFF6B0" opacity=".9" filter="url(#glw)"/>')
            if (c, r) == WILD:
                out.append(gem(x, y, R, "url(#rainbow)", 9, "#fff"))
            else:
                out.append(gem(x, y, R, f"url(#gem{col})", col))
            if (c, r) == BOMB:
                out.append(f'<g filter="url(#sh)"><circle cx="{x}" cy="{y + 2}" r="{s * .42}" fill="#FFF9EC" stroke="#FFD2E4" stroke-width="2"/><ellipse cx="{x - 4}" cy="{y - 4}" rx="6" ry="3.5" fill="#fff"/>'
                           f'<path d="M{x - 10},{y - 4} l0,-11 5,6 5,-9 5,9 5,-6 0,11z" fill="#FFC21F" stroke="{BROWN}" stroke-width="1.6" stroke-linejoin="round"/></g>')
    pts = path_points(s)
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    out.append(f'<path d="{d}" stroke="#FFB000" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>')
    out.append(f'<path d="{d}" stroke="#FFF7C2" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    for i, (x, y) in enumerate(pts):
        out.append(f'<circle cx="{x}" cy="{y}" r="{8 if i == len(pts) - 1 else 5}" fill="#fff" stroke="#FFB000" stroke-width="3"/>')
    rnd = random.Random(4)
    for x, y in pts[-3:]:
        for _ in range(3):
            a = rnd.uniform(0, 6.28); dd = rnd.uniform(18, 30)
            out.append(glyph(9, x + math.cos(a) * dd, y + math.sin(a) * dd, rnd.uniform(3, 6), "#FFF6B0"))
    ex, ey = pts[-1]
    out.append(f'<text x="{ex + 22}" y="{ey + 10}" font-family="Rubik" font-weight="900" font-size="28" fill="#FFE36B" stroke="{BROWN}" stroke-width="6" paint-order="stroke" stroke-linejoin="round">+168</text>')
    out.append('</svg>')
    return "".join(out)

def meadow(W, H):
    return f'''<svg class="abs" style="left:0;bottom:0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<path d="M0,{H * .45} C90,{H * .25} 170,{H * .5} 260,{H * .32} S380,{H * .3} {W},{H * .38} V{H} H0Z" fill="#8EE06A"/>
<path d="M0,{H * .62} C120,{H * .48} 220,{H * .7} {W},{H * .52} V{H} H0Z" fill="#5CC94A"/>
{"".join(f'<circle cx="{x}" cy="{y}" r="4" fill="{c}"/><circle cx="{x}" cy="{y}" r="1.6" fill="#FFE36B"/>' for x, y, c in [(40, H * .58, "#fff"), (120, H * .66, "#FF8FB0"), (220, H * .6, "#fff"), (330, H * .66, "#D7A6FF"), (380, H * .56, "#fff"), (170, H * .8, "#FF8FB0"), (290, H * .82, "#fff")])}
</svg>'''

def cloud(x, y, s=1):
    return f'<svg class="abs" style="left:{x}px;top:{y}px" width="{120 * s}" height="{50 * s}" viewBox="0 0 120 50"><path d="M20,45 a18,18 0 0 1 4,-34 a24,24 0 0 1 44,-4 a18,18 0 0 1 32,14 a14,14 0 0 1 0,24z" fill="#fff" opacity=".85"/></svg>'

OUT = f"-webkit-text-stroke:0;text-shadow:0 2px 0 {BROWN},2px 0 0 {BROWN},-2px 0 0 {BROWN},0 -2px 0 {BROWN},2px 2px 0 {BROWN},-2px 2px 0 {BROWN},2px -2px 0 {BROWN},-2px -2px 0 {BROWN},0 4px 0 {BROWN}"

css = f"""
body{{background:#FFD9A0}}
.page{{background:radial-gradient(900px 500px at 50% -10%,#FFF3C4 0%,transparent 70%),linear-gradient(180deg,#FFC98A,#FF9DB8);color:{BROWN}}}
.page-head .kicker{{font-family:'Rubik';font-weight:800;color:{BROWN}}}
.page-head p{{font-family:'Rubik';font-weight:500;color:#7A3A1A}}
.logo{{position:relative;font:900 70px/1 'Rubik';letter-spacing:-.01em;color:#FFD23F;{OUT};}}
.logo:after{{content:"Buzzle";position:absolute;left:0;top:0;color:transparent;background:linear-gradient(180deg,#FFF6C0 0%,#FFD23F 45%,#FF9A00 100%);-webkit-background-clip:text;text-shadow:none}}
.phone{{background:#2B1350;box-shadow:0 40px 80px -30px rgba(120,30,80,.55),0 0 0 2px #1A0A33 inset}}
.screen{{font-family:'Rubik';color:#fff}}
.sky{{position:absolute;inset:0;background:radial-gradient(380px 260px at 70% 0%,#FFF6C8 0%,transparent 70%),linear-gradient(180deg,#7FD3FF 0%,#B9E8FF 55%,#E9FAFF 100%)}}
.rays{{position:absolute;left:-200px;top:-420px;width:820px;height:820px;background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,255,255,.22) 0 8deg,transparent 8deg 20deg);border-radius:50%;opacity:.7}}
.status{{font-family:'Rubik'}}
.gesture{{background:#3A1B5C;opacity:.6}}
.top{{display:flex;align-items:center;gap:8px;padding:6px 14px 0;position:relative}}
.cpill{{position:relative;display:flex;align-items:center;gap:6px;height:40px;padding:0 34px 0 4px;border-radius:22px;background:linear-gradient(180deg,#5B2C9E,#3E1B78);border:3px solid #fff;box-shadow:0 3px 0 rgba(58,15,92,.5);font:900 17px/1 'Rubik';color:#fff}}
.cpill .plus{{position:absolute;right:3px;top:3px;width:28px;height:28px;border-radius:50%;background:linear-gradient(180deg,#8BEA5A,#36B22A);display:flex;align-items:center;justify-content:center;font:900 20px/1 'Rubik';box-shadow:inset 0 2px 0 rgba(255,255,255,.5)}}
.lvl{{margin-left:auto;width:48px;height:48px;position:relative;display:flex;align-items:center;justify-content:center;font:900 19px/1 'Rubik';color:#fff;{OUT.replace("2px", "1.5px")}}}
.lvl svg{{position:absolute;inset:0}}
.panel{{position:relative;margin:12px 14px 0;border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,.55));border:4px solid #fff;box-shadow:0 6px 0 rgba(58,15,92,.18),0 14px 30px -10px rgba(58,15,92,.35)}}
.ribbon{{position:absolute;left:50%;top:-18px;transform:translateX(-50%);white-space:nowrap;padding:8px 22px;border-radius:14px;background:linear-gradient(180deg,#FF7FA8,#E8336D);border:3px solid #fff;box-shadow:0 3px 0 #A3134A;font:900 16px/1 'Rubik';color:#fff;text-shadow:0 2px 0 #A3134A}}
.rate{{position:absolute;right:14px;top:16px;font:800 13px/1 'Rubik';color:#fff;background:#5ED33A;border-radius:12px;padding:6px 9px;box-shadow:0 2px 0 #2D8C22}}
.stor{{display:flex;align-items:center;gap:10px;padding:14px 16px 0;color:#5B2C9E}}
.stor b{{font:900 24px/1 'Rubik'}} .stor small{{font:700 14px/1 'Rubik';opacity:.7}}
.meter{{margin:10px 16px 0;height:22px;border-radius:12px;background:#E9DDFB;border:3px solid #fff;box-shadow:inset 0 2px 4px rgba(58,15,92,.25);overflow:hidden}}
.meter i{{display:block;height:100%;width:46%;border-radius:10px;background:linear-gradient(180deg,#FFE36B,#FFA800);box-shadow:inset 0 3px 0 rgba(255,255,255,.6)}}
.gbtn{{margin:16px 16px 16px;height:62px;border-radius:24px;background:linear-gradient(180deg,#9BF06A 0%,#4CC437 50%,#32A324 100%);border:4px solid #fff;box-shadow:0 6px 0 #1F7A16,0 10px 20px -6px rgba(31,122,22,.6);display:flex;align-items:center;justify-content:center;gap:10px;font:900 23px/1 'Rubik';color:#fff;text-shadow:0 2px 0 #1F7A16,0 -1px 0 #1F7A16,1px 0 0 #1F7A16,-1px 0 0 #1F7A16;position:relative;overflow:hidden}}
.gbtn:before{{content:"";position:absolute;left:12px;right:12px;top:5px;height:18px;border-radius:14px;background:rgba(255,255,255,.35)}}
.tabs{{position:absolute;left:10px;right:10px;bottom:20px;height:76px;border-radius:28px;background:#fff;box-shadow:0 6px 0 rgba(58,15,92,.2);display:flex;align-items:flex-end;padding-bottom:10px}}
.tab{{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;font:800 11.5px/1 'Rubik';color:#9A86BE;position:relative}}
.tab .bub{{width:46px;height:40px;border-radius:16px;display:flex;align-items:center;justify-content:center}}
.tab.on{{color:#E8336D}} .tab.on .bub{{width:60px;height:60px;margin-top:-30px;border-radius:22px;background:linear-gradient(180deg,#FFE36B,#FFA800);border:4px solid #fff;box-shadow:0 4px 0 #C26A00}}
.tab .d{{position:absolute;top:2px;right:22px;min-width:18px;height:18px;border-radius:9px;background:#FF3D72;border:2px solid #fff;font:900 10px/14px 'Rubik';color:#fff;text-align:center}}
/* puzzle */
.psky{{position:absolute;inset:0;background:radial-gradient(420px 300px at 50% 30%,#8A5CFF 0%,transparent 70%),linear-gradient(180deg,#4A2AA8 0%,#7C3CC9 50%,#C455B8 100%)}}
.prays{{position:absolute;left:-210px;top:-150px;width:830px;height:830px;background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,255,255,.07) 0 8deg,transparent 8deg 20deg);border-radius:50%}}
.hud{{position:relative;display:flex;align-items:center;justify-content:space-between;padding:6px 14px 0}}
.round{{width:46px;height:46px;border-radius:50%;background:linear-gradient(180deg,#FF7FA8,#E8336D);border:3px solid #fff;box-shadow:0 3px 0 #A3134A;display:flex;align-items:center;justify-content:center}}
.scoreb{{flex:1;margin:0 10px;height:58px;border-radius:20px;background:linear-gradient(180deg,#5B2C9E,#3E1B78);border:3px solid #fff;box-shadow:0 4px 0 rgba(30,8,60,.6);display:flex;flex-direction:column;align-items:center;justify-content:center}}
.scoreb small{{font:800 11px/1 'Rubik';letter-spacing:.08em;color:#FFD6EA}} .scoreb b{{font:900 28px/1 'Rubik';color:#FFE36B;text-shadow:0 2px 0 #9A4A00;margin-top:2px}}
.movesb{{width:70px;height:70px;border-radius:50%;background:radial-gradient(circle at 40% 30%,#FFF3A0,#FFB000 60%,#D97A00);border:4px solid #fff;box-shadow:0 4px 0 #9A4A00;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff}}
.movesb b{{font:900 28px/1 'Rubik';{OUT.replace("2px", "1.5px").replace("4px", "2.5px")}}} .movesb small{{font:900 10px/1 'Rubik';color:{BROWN};margin-top:2px}}
.sbar{{position:relative;margin:14px 22px 0;height:20px;border-radius:12px;background:rgba(30,8,60,.45);border:3px solid #fff}}
.sbar i{{position:absolute;left:0;top:0;bottom:0;width:41%;border-radius:10px;background:linear-gradient(180deg,#FFE36B,#FFA800);box-shadow:inset 0 3px 0 rgba(255,255,255,.55)}}
.sbar svg{{position:absolute;top:-12px;margin-left:-17px}}
.chips{{position:relative;display:flex;justify-content:space-between;align-items:center;padding:18px 16px 0}}
.burst{{position:relative;width:110px;height:46px;display:flex;align-items:center;justify-content:center;font:900 15px/1 'Rubik';color:#fff;text-shadow:0 2px 0 #A3134A}}
.burst svg{{position:absolute;inset:0}}
.rib2{{padding:9px 14px;border-radius:14px;background:linear-gradient(180deg,#FFE36B,#FFA800);border:3px solid #fff;box-shadow:0 3px 0 #9A4A00;font:900 14px/1 'Rubik';color:{BROWN}}}
.frame{{position:relative;margin:10px auto 0;width:{board_size(33)[0] + 16 + 16:.0f}px;padding:8px;border-radius:30px;background:linear-gradient(180deg,rgba(40,14,90,.62),rgba(60,20,110,.55));border:5px solid #FFD23F;box-shadow:0 0 0 3px #fff,0 8px 0 3px rgba(30,8,60,.45),inset 0 4px 12px rgba(0,0,0,.35)}}
.pbee{{position:absolute;right:16px;bottom:30px}}
.speech{{position:absolute;left:24px;bottom:42px;padding:10px 14px;border-radius:18px 18px 4px 18px;background:#fff;color:#5B2C9E;font:800 14px/1.2 'Rubik';box-shadow:0 4px 0 rgba(30,8,60,.3)}}
"""

def phone_hive():
    tabs = "".join(f'<div class="tab{" on" if i == 0 else ""}"><div class="bub">{tab_icon(n, 28 if i == 0 else 25, "#fff" if i == 0 else "#9A86BE", 2.3)}</div>{l}{"<i class=d>" + ("1" if i == 1 else "2") + "</i>" if i in (1, 3) else ""}</div>' for i, (n, l) in enumerate(TABS))
    star = f'<svg width="48" height="48" viewBox="-24 -24 48 48">{DEFS}<g filter="url(#sh)">{glyph(9, 0, 1, 22, "#FFB000", "#fff", 3)}</g></svg>'
    return f'''<div class="phone"><div class="screen"><div class="sky"></div><div class="rays"></div>
{cloud(20, 120, .8)}{cloud(270, 96, 1)}{meadow(412, 260)}<div class="cam"></div>
{status_bar("#2B1350")}
<div class="top"><div class="cpill"><svg width="34" height="34" viewBox="-17 -17 34 34">{DEFS}{gem(0, 0, 14, "url(#honeyGem)")}</svg>1 240<span class="plus">+</span></div>
<div class="cpill"><svg width="30" height="30" viewBox="-15 -15 30 30">{DEFS}<g filter="url(#sh)"><path d="M0,-12 C4,-6 10,-1 10,4 A10,10 0 0 1 -10,4 C-10,-1 -4,-6 0,-12Z" fill="url(#gem2)"/><ellipse cx="-3" cy="0" rx="3" ry="4" fill="#fff" opacity=".7"/></g></svg>7<span class="plus">+</span></div>
<div class="lvl">{star}<span style="position:relative">5</span></div></div>
<div class="panel" style="margin-top:30px"><div class="ribbon">Мой улей</div><div class="rate">+240/ч</div><div style="height:14px"></div>{hive_svg()}</div>
<div class="panel"><div class="stor"><svg width="40" height="40" viewBox="-20 -20 40 40">{DEFS}{gem(0, 0, 17, "url(#honeyGem)")}</svg><div style="flex:1"><small>Мёд в улье</small><div><b>766</b> <small>/ 1 677</small></div></div><small style="text-align:right">полон через<br><b style="font-size:16px">3 ч 48 мин</b></small></div>
<div class="meter"><i></i></div><div class="gbtn">Собрать 766</div></div>
<div class="tabs">{tabs}</div><div class="gesture"></div></div></div>'''

def phone_puzzle():
    st = lambda on: f'<svg width="34" height="34" viewBox="-17 -17 34 34">{DEFS}<g filter="url(#sh)">{glyph(9, 0, 0, 15, "#FFD23F" if on else "#8E78B8", "#fff", 2.5)}</g></svg>'
    stars = "".join(f'<span style="position:absolute;left:{t / 3100 * 100:.1f}%">{st(on)}</span>' for t, on in [(1000, True), (1800, False), (2800, False)])
    burst_pts = " ".join(f"{55 + math.cos(math.radians(i * 18)) * (52 if i % 2 == 0 else 44):.1f},{23 + math.sin(math.radians(i * 18)) * (22 if i % 2 == 0 else 17):.1f}" for i in range(20))
    return f'''<div class="phone"><div class="screen"><div class="psky"></div><div class="prays"></div><div class="cam"></div>
{status_bar("#fff")}
<div class="hud"><div class="round"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3 3 13" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></div>
<div class="scoreb"><small>ГОЛОВОЛОМКА ДНЯ</small><b>1 285</b></div><div class="movesb"><b>14</b><small>ХОДОВ</small></div></div>
<div class="sbar"><i></i>{stars}</div>
<div class="chips"><div class="burst"><svg width="110" height="46" viewBox="0 0 110 46"><polygon points="{burst_pts}" fill="#FF3D72" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg><span style="position:relative">Комбо ×1,5</span></div>
<div class="rib2">Цепочка 6 — БОМБА!</div></div>
<div class="frame">{board_svg()}</div>
<div class="speech">Сладко! Цепочка из 6 — будет бомба!</div>
<svg class="pbee" width="80" height="70" viewBox="-40 -38 80 70">{DEFS}{cbee(0, 0, 1.55, 8, True)}</svg>
<div class="gesture"></div></div></div>'''

LOGO = f'''<div style="display:flex;align-items:center;gap:4px"><div class="logo">Buzzle</div><svg width="76" height="70" viewBox="-36 -36 76 70">{DEFS}{cbee(0, 0, 1.5, -12)}</svg></div>'''

HTML = page(css, f'''<div class="page">
<div class="page-head"><div><div class="kicker">Направление 4 · Карамельная головоломка</div>{LOGO}</div>
<p>Сочные глянцевые гексы-конфеты, солнечный луг, толстые обводки и «нажимные» кнопки. Максимум сока и праздника — как в больших match-3.</p></div>
<div class="phones">{phone_hive()}{phone_puzzle()}</div></div>''', "Buzzle — candy")
