"""Direction 1 — Cozy storybook: warm paper, pastel watercolour fills, wobbly hand-inked outlines."""
import base64, math
from common import *

INK = "#5B3A29"; PAPER = "#FFF8EA"; CREAM = "#F6ECD8"
POL = ["#FBD872", "#F6A6B9", "#BFA8EE", "#9FD0F3", "#A9DFB4"]
POLD = ["#E2A53A", "#E06C8C", "#8E72D6", "#5AA6DE", "#5DB377"]
HONEY = "#F8C95A"

def grain(op=.06, freq=.9):
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='{freq}' numOctaves='3' stitchTiles='stitch'/>"
           f"<feColorMatrix values='0 0 0 0 .35 0 0 0 0 .23 0 0 0 0 .15 0 0 0 {op*10} 0'/></filter><rect width='240' height='240' filter='url(#n)'/></svg>")
    return "url(data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode() + ")"

DEFS = f'''<defs>
<filter id="wob" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="4" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="3.2"/></filter>
<filter id="wob2" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="9" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="2.4"/></filter>
<filter id="wc" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="3" seed="2" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="6"/><feGaussianBlur stdDeviation=".6"/></filter>
<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="6" stroke="{INK}" stroke-width="1" opacity=".18"/></pattern>
</defs>'''

def bee(x, y, sc=1.0, rot=0, flip=False, body="#FBD872"):
    fx = -1 if flip else 1
    return f'''<g transform="translate({x},{y}) rotate({rot}) scale({sc * fx},{sc})">
<g filter="url(#wob2)">
<ellipse cx="-7" cy="-17" rx="11" ry="8" fill="#fff" fill-opacity=".85" stroke="{INK}" stroke-width="1.8" transform="rotate(-25 -7 -17)"/>
<ellipse cx="7" cy="-18" rx="10" ry="7.5" fill="#fff" fill-opacity=".85" stroke="{INK}" stroke-width="1.8" transform="rotate(20 7 -18)"/>
<ellipse cx="0" cy="0" rx="17" ry="14" fill="{body}"/>
<path d="M-6,-13 Q-9,0 -6,13 M4,-14 Q1,0 4,14" stroke="{INK}" stroke-width="5" fill="none" opacity=".85" stroke-linecap="round"/>
<ellipse cx="0" cy="0" rx="17" ry="14" fill="none" stroke="{INK}" stroke-width="2"/>
<path d="M17,0 l6,1.5 -6,2" fill="{INK}"/>
<path d="M-10,-11 q-6,-9 -11,-8 M-14,-9 q-2,-9 -6,-12" stroke="{INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
</g>
<circle cx="-11" cy="-2" r="2.4" fill="{INK}"/><circle cx="-10.3" cy="-2.8" r=".8" fill="#fff"/>
<ellipse cx="-12" cy="4" rx="3" ry="2" fill="#F39AAE" opacity=".8"/>
<path d="M-15,5 q2,2 4,0" stroke="{INK}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
</g>'''

def honey_jar(x, y, s=1):
    return f'''<g transform="translate({x},{y}) scale({s})" filter="url(#wob2)">
<path d="M-11,-4 C-15,3 -14,13 0,13 C14,13 15,3 11,-4 Z" fill="{HONEY}" stroke="{INK}" stroke-width="1.8" stroke-linejoin="round"/>
<rect x="-9" y="-11" width="18" height="7" rx="2.5" fill="#E9B4A0" stroke="{INK}" stroke-width="1.7"/>
<path d="M-11,-3 h22 l-1,4 q-3,3 -4,0 q-2,4 -5,1 q-3,4 -6,0 q-3,3 -5,0z" fill="#F2B23F" opacity=".9"/>
<path d="M-7,4 q0,4 3,6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/>
</g>'''

def jelly_drop(x, y, s=1):
    return f'''<g transform="translate({x},{y}) scale({s})" filter="url(#wob2)"><path d="M0,-11 C3,-6 9,-1 9,4 A9,9 0 0 1 -9,4 C-9,-1 -3,-6 0,-11Z" fill="#D7C6F5" stroke="{INK}" stroke-width="1.8"/>
<path d="M-4,2 q0,-3 2,-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g>'''

def star(x, y, r, on=True):
    pts = " ".join(f"{x + math.cos(math.radians(36 * i - 90)) * (r if i % 2 == 0 else r * .48):.1f},{y + math.sin(math.radians(36 * i - 90)) * (r if i % 2 == 0 else r * .48):.1f}" for i in range(10))
    return f'<polygon points="{pts}" fill="{HONEY if on else "#F3E6CC"}" stroke="{INK}" stroke-width="1.8" stroke-linejoin="round" filter="url(#wob2)"/>'

# ---------------- hive ----------------
def hive_svg():
    s = 39; W, H = 380, 350; cx0, cy0 = W / 2, H / 2 + 4
    out = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}">{DEFS}']
    for i, (q, r) in enumerate(HIVE_SLOTS):
        x, y = hive_center(q, r, s); x += cx0; y += cy0
        st = hive_state(i); lv = HIVE_LEVELS[i]
        if st == "built":
            fill = ["", "#FCE3A0", "#F9D27A", "#F6C25A", "#F2B23F"][min(lv, 4)]
            out.append(f'<path d="{hex_path(x, y + 2.5, s * .9, 7)}" fill="{INK}" opacity=".18"/>')
            out.append(f'<path d="{hex_path(x, y, s * .9, 7)}" fill="{fill}"/>')
            out.append(f'<path d="{hex_path(x, y, s * .9, 7)}" fill="url(#hatch)" opacity=".7"/>')
            out.append(f'<path d="{hex_path(x - 3, y - 4, s * .55, 6)}" fill="#fff" opacity=".28"/>')
            out.append(f'<path d="{hex_path(x, y, s * .9, 7)}" fill="none" stroke="{INK}" stroke-width="2.4" filter="url(#wob)"/>')
            if lv >= 3:  # honey drip
                out.append(f'<path d="M{x + 6},{y + s * .74} q2,8 0,11 a3,3 0 0 1 -4,-1 q0,-4 1,-10z" fill="#F2B23F" stroke="{INK}" stroke-width="1.5" filter="url(#wob2)"/>')
            out.append(f'<text x="{x}" y="{y + 9}" text-anchor="middle" font-family="Pangolin" font-size="25" fill="{INK}">{lv}</text>')
        else:
            out.append(f'<path d="{hex_path(x, y, s * .86, 7)}" fill="#FFF8EA" fill-opacity=".6" stroke="{INK}" stroke-width="1.8" stroke-dasharray="5 5" opacity=".55" filter="url(#wob)"/>')
            out.append(f'<text x="{x}" y="{y + 8}" text-anchor="middle" font-family="Pangolin" font-size="24" fill="{INK}" opacity=".45">+</text>')
    # bees with dotted flight trails
    out.append(f'<path d="M30,70 C60,20 110,40 96,60" stroke="{INK}" stroke-width="1.6" stroke-dasharray="2 6" fill="none" stroke-linecap="round" opacity=".6"/>')
    out.append(bee(38, 66, .95, -8))
    out.append(f'<path d="M352,300 C330,330 290,320 300,300" stroke="{INK}" stroke-width="1.6" stroke-dasharray="2 6" fill="none" stroke-linecap="round" opacity=".6"/>')
    out.append(bee(348, 292, .9, 10, True, "#F6C1CF"))
    out.append(bee(330, 52, .75, 6, True, "#CDE8C9"))
    out.append('</svg>')
    return "".join(out)

# ---------------- board ----------------
def board_svg():
    s = 33; W, H = board_size(s); pad = 10
    out = [f'<svg width="{W + pad * 2}" height="{H + pad * 2}" viewBox="{-pad} {-pad} {W + pad * 2} {H + pad * 2}">{DEFS}']
    sel = set(PATH)
    for c in range(COLS):
        for r in range(ROWS):
            x, y = cell_center(c, r, s); col = CELLS[c][r]
            on = (c, r) in sel
            R = s * (.93 if on else .88)
            if (c, r) == WILD:
                out.append(f'<path d="{hex_path(x, y + 2, R, 6)}" fill="{INK}" opacity=".16"/>')
                out.append(f'<g filter="url(#wc)">' + "".join(f'<path d="{hex_path(x, y, R * (1 - k * .17), 6)}" fill="{POL[(k + 1) % 5]}"/>' for k in range(5)) + '</g>')
                out.append(f'<path d="{hex_path(x, y, R, 6)}" fill="none" stroke="{INK}" stroke-width="2.2" filter="url(#wob)"/>')
                out.append(glyph(9, x, y, s * .38, "#fff", INK, 1.6))
                continue
            out.append(f'<path d="{hex_path(x, y + (3.5 if on else 2), R, 6)}" fill="{INK}" opacity="{.28 if on else .14}"/>')
            out.append(f'<path d="{hex_path(x, y - (2 if on else 0), R, 6)}" fill="{POL[col]}" filter="url(#wc)"/>')
            out.append(f'<path d="{hex_path(x - 4, y - 5 - (2 if on else 0), R * .5, 5)}" fill="#fff" opacity=".35"/>')
            out.append(f'<path d="{hex_path(x, y - (2 if on else 0), R, 6)}" fill="none" stroke="{INK}" stroke-width="{2.8 if on else 2}" filter="url(#wob)"/>')
            out.append(glyph(col, x, y + 1 - (2 if on else 0), s * .34, POLD[col]))
            if (c, r) == BOMB:
                out.append(f'<g filter="url(#wob2)"><ellipse cx="{x}" cy="{y + 2}" rx="{s * .42}" ry="{s * .36}" fill="#FFFDF6" stroke="{INK}" stroke-width="1.8"/>'
                           f'<path d="M{x - 10},{y - 6} l0,-10 5,6 5,-9 5,9 5,-6 0,10z" fill="{HONEY}" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/></g>')
    # pencil chain
    pts = path_points(s)
    d = "M" + " L".join(f"{x:.1f},{y - 2:.1f}" for x, y in pts)
    out.append(f'<path d="{d}" stroke="#fff" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9" filter="url(#wob2)"/>')
    out.append(f'<path d="{d}" stroke="{INK}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 8" filter="url(#wob2)"/>')
    for i, (x, y) in enumerate(pts):
        rr = 7 if i == len(pts) - 1 else 4.5
        out.append(f'<circle cx="{x}" cy="{y - 2}" r="{rr}" fill="#fff" stroke="{INK}" stroke-width="2.2" filter="url(#wob2)"/>')
    ex, ey = pts[-1]
    out.append(f'<text x="{ex + 30}" y="{ey + 4}" font-family="Caveat" font-weight="700" font-size="32" fill="{POLD[1]}" stroke="#fff" stroke-width="6" paint-order="stroke" stroke-linejoin="round" transform="rotate(-10 {ex + 30} {ey})">+168</text>')
    out.append('</svg>')
    return "".join(out)

TAB_SVG = lambda n, c: tab_icon(n, 25, c, 2.1)

css = f"""
body{{background:{CREAM}}}
.page{{background:{CREAM} {grain(.05)};color:{INK}}}
.logo{{display:flex;align-items:center;gap:6px}}
.logo b{{font:400 66px/1 'Pangolin';letter-spacing:-.01em;color:{INK}}}
.page-head .kicker{{font-family:'Balsamiq Sans';font-weight:700;color:{INK}}}
.page-head p{{font-family:'Balsamiq Sans';color:{INK}}}
.phone{{background:#4A3426;box-shadow:0 34px 70px -30px rgba(74,52,38,.55),0 0 0 2px #2E1F16 inset}}
.screen{{background:{PAPER} {grain(.045)};color:{INK};font-family:'Balsamiq Sans'}}
.blob{{position:absolute;border-radius:50%;filter:blur(30px);opacity:.55}}
.gesture{{background:{INK};opacity:.7}}
.status{{font-family:'Balsamiq Sans'}}
.top{{display:flex;align-items:center;gap:8px;padding:8px 18px 0}}
.mini-logo{{font:400 30px/1 'Pangolin';flex:1;display:flex;align-items:center;gap:2px}}
.pill{{display:flex;align-items:center;gap:6px;height:38px;padding:0 13px 0 7px;background:#fff;border:2px solid {INK};border-radius:20px;font:700 16px/1 'Balsamiq Sans';box-shadow:2px 3px 0 {INK}}}
.gear{{width:38px;height:38px;border-radius:50%;border:2px solid {INK};background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:2px 3px 0 {INK}}}
.card{{position:relative;margin:12px 16px 0;background:#FFFCF4;border:2px solid {INK};border-radius:22px 18px 24px 20px;box-shadow:3px 4px 0 rgba(91,58,41,.9)}}
.tape{{position:absolute;width:64px;height:20px;background:rgba(246,166,185,.6);top:-10px;transform:rotate(-6deg);border-left:2px dashed rgba(255,255,255,.6);border-right:2px dashed rgba(255,255,255,.6)}}
.hive-head{{display:flex;justify-content:space-between;align-items:center;padding:12px 16px 0}}
.hand{{font:700 26px/1 'Caveat'}}
.sticker{{font:700 13px/1 'Balsamiq Sans';background:#CDE8C9;border:2px solid {INK};border-radius:12px;padding:5px 9px;transform:rotate(2deg)}}
.store{{display:flex;align-items:center;gap:12px;padding:14px 16px 0}}
.store b{{font:700 22px/1 'Balsamiq Sans'}} .store small{{font:400 15px/1 'Balsamiq Sans';opacity:.65}}
.bar{{margin:10px 16px 0;height:16px;border:2px solid {INK};border-radius:10px;overflow:hidden;background:#FFF3D8}}
.bar i{{display:block;height:100%;width:46%;background:{HONEY} repeating-linear-gradient(135deg,transparent 0 6px,rgba(91,58,41,.13) 6px 8px);border-right:2px solid {INK}}}
.note{{padding:8px 16px 0;font:400 13.5px/1.2 'Balsamiq Sans';opacity:.7}}
.btn{{margin:14px 16px 16px;height:56px;border-radius:20px 24px 20px 26px;background:{HONEY};border:2.5px solid {INK};box-shadow:3px 5px 0 {INK};display:flex;align-items:center;justify-content:center;gap:10px;font:700 21px/1 'Balsamiq Sans'}}
.tabs{{position:absolute;left:0;right:0;bottom:0;height:92px;background:#FFFCF4;border-top:2px solid {INK};display:flex;padding:10px 6px 0;border-radius:26px 26px 0 0}}
.tab{{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;font:700 12px/1 'Balsamiq Sans';opacity:.55;position:relative}}
.tab.on{{opacity:1}}
.tab.on .ic{{background:#FBD872;border:2px solid {INK};box-shadow:2px 2px 0 {INK}}}
.tab .ic{{width:58px;height:36px;border-radius:16px 20px 16px 18px;display:flex;align-items:center;justify-content:center}}
.dot{{position:absolute;top:2px;right:16px;width:10px;height:10px;border-radius:50%;background:#F6A6B9;border:2px solid {INK}}}
.upg{{display:flex;align-items:center;gap:10px;padding:10px 14px;margin-top:14px}}
.upg b{{display:block;font:700 16px/1.1 'Balsamiq Sans'}} .upg small{{display:block;font:400 13px/1.2 'Balsamiq Sans';opacity:.65;margin-top:2px}}
.mini{{font:700 16px/1 'Balsamiq Sans';background:#CDE8C9;border:2px solid {INK};border-radius:14px;padding:8px 12px;box-shadow:2px 3px 0 {INK}}}
/* puzzle */
.ghead{{display:flex;align-items:center;padding:6px 16px 0;gap:10px}}
.x{{width:44px;height:44px;border-radius:50%;background:#fff;border:2px solid {INK};box-shadow:2px 3px 0 {INK};display:flex;align-items:center;justify-content:center}}
.score{{flex:1;text-align:center}}
.score small{{display:block;font:700 22px/1 'Caveat';opacity:.8}}
.score b{{display:block;font:400 42px/1 'Pangolin';margin-top:2px}}
.moves{{width:64px;height:62px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center}}
.moves svg{{position:absolute;inset:0}}
.moves b{{position:relative;font:400 28px/1 'Pangolin'}} .moves small{{position:relative;font:700 11px/1 'Balsamiq Sans'}}
.prog{{position:relative;margin:12px 22px 0;height:16px;border:2px solid {INK};border-radius:10px;background:#FFF3D8}}
.prog i{{position:absolute;left:0;top:0;bottom:0;width:41%;background:{HONEY};border-radius:8px 0 0 8px;border-right:2px solid {INK}}}
.prog .st{{position:absolute;top:-12px}}
.chips{{display:flex;justify-content:space-between;padding:16px 18px 0}}
.chip{{display:flex;align-items:center;gap:5px;font:700 14px/1 'Balsamiq Sans';background:#fff;border:2px solid {INK};border-radius:14px;padding:6px 10px;box-shadow:2px 2px 0 {INK}}}
.chip.pink{{background:{POL[1]};transform:rotate(-2deg)}}
.boardcard{{position:relative;margin:12px auto 0;width:390px;padding:4px 3px;background:#FFFCF4;border:2px solid {INK};border-radius:26px 22px 28px 24px;box-shadow:3px 4px 0 rgba(91,58,41,.9)}}
.boardcard svg{{margin:0 auto}}
.bubble{{position:absolute;left:96px;bottom:42px;background:#fff;border:2px solid {INK};border-radius:18px 18px 18px 4px;padding:9px 13px;font:700 15px/1.2 'Balsamiq Sans';box-shadow:2px 3px 0 {INK};transform:rotate(-1.5deg)}}
"""

def phone_hive():
    tabs = "".join(f'<div class="tab{" on" if i == 0 else ""}"><div class="ic">{TAB_SVG(n, INK)}</div>{l}{"<i class=dot></i>" if i in (1, 3) else ""}</div>' for i, (n, l) in enumerate(TABS))
    return f'''<div class="phone"><div class="screen"><div class="cam"></div>
<div class="blob" style="width:220px;height:220px;background:#FBD872;left:-60px;top:120px"></div>
<div class="blob" style="width:200px;height:200px;background:#F6A6B9;right:-70px;top:420px"></div>
<div class="blob" style="width:180px;height:180px;background:#BFA8EE;left:40px;bottom:120px;opacity:.35"></div>
{status_bar(INK)}
<div class="top" style="position:relative"><div class="mini-logo">Buzzle<svg width="34" height="30" viewBox="-20 -24 46 44">{DEFS}{bee(0, 0, .7, -10)}</svg></div>
<div class="pill"><svg width="28" height="28" viewBox="-14 -14 28 28">{DEFS}{honey_jar(0, 0, .95)}</svg>1 240</div>
<div class="pill"><svg width="24" height="26" viewBox="-12 -13 24 26">{DEFS}{jelly_drop(0, 1, .95)}</svg>7</div></div>
<div class="card" style="margin-top:14px"><div class="tape" style="left:30px"></div><div class="tape" style="right:28px;transform:rotate(7deg);background:rgba(169,223,180,.7)"></div>
<div class="hive-head"><span class="hand">Мой улей · ур. 5</span><span class="sticker">+240 мёда/ч</span></div>
{hive_svg()}</div>
<div class="card"><div class="store"><svg width="46" height="46" viewBox="-15 -15 30 30">{DEFS}{honey_jar(0, 1, 1.25)}</svg>
<div style="flex:1"><div style="font:700 15px/1 'Balsamiq Sans';opacity:.7;margin-bottom:5px">Мёд в улье</div><b>766</b> <small>/ 1 677</small></div>
<span class="hand" style="font-size:22px;transform:rotate(-4deg)">ещё 3 ч 48 мин</span></div>
<div class="bar"><i></i></div>
<div class="btn"><svg width="30" height="30" viewBox="-15 -15 30 30">{DEFS}{honey_jar(0, 1, 1.05)}</svg>Собрать 766</div></div>
<div class="card upg"><svg width="44" height="40" viewBox="-22 -24 44 44">{DEFS}{bee(0, 0, .9, -6)}</svg>
<div style="flex:1"><b>Рабочие пчёлы</b><small>ур. 2 → 3 · +30% мёда</small></div><div class="mini">810</div></div>
<div class="tabs">{tabs}</div><div class="gesture"></div></div></div>'''

def phone_puzzle():
    mv = f'<svg width="64" height="62" viewBox="0 0 64 62">{DEFS}<path d="{hex_path(32, 31, 29, 9)}" fill="{POL[2]}" stroke="{INK}" stroke-width="2.4" filter="url(#wob)"/></svg>'
    return f'''<div class="phone"><div class="screen"><div class="cam"></div>
<div class="blob" style="width:240px;height:240px;background:#9FD0F3;right:-90px;top:60px;opacity:.4"></div>
<div class="blob" style="width:220px;height:220px;background:#FBD872;left:-80px;bottom:60px;opacity:.5"></div>
{status_bar(INK)}
<div class="ghead"><div class="x"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3 3 13" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/></svg></div>
<div class="score"><small>Головоломка дня</small><b>1 285</b></div><div class="moves">{mv}<b>14</b><small>ходов</small></div></div>
<div class="prog"><i></i>
<svg class="st" style="left:{1000 / 3100 * 100:.1f}%;margin-left:-14px" width="28" height="28" viewBox="-14 -14 28 28">{DEFS}{star(0, 0, 12, True)}</svg>
<svg class="st" style="left:{1800 / 3100 * 100:.1f}%;margin-left:-14px" width="28" height="28" viewBox="-14 -14 28 28">{DEFS}{star(0, 0, 12, False)}</svg>
<svg class="st" style="left:{2800 / 3100 * 100:.1f}%;margin-left:-14px" width="28" height="28" viewBox="-14 -14 28 28">{DEFS}{star(0, 0, 12, False)}</svg></div>
<div class="chips"><div class="chip"><svg width="20" height="22" viewBox="-11 -12 22 23">{flame(0, 0, 1, "#FF9B6A", "#FBD872", INK, 1.6)}</svg>Комбо ×1,5</div><div class="chip pink">цепочка 6 · бомба!</div></div>
<div class="boardcard"><div class="tape" style="left:36px;background:rgba(159,208,243,.7)"></div><div class="tape" style="right:40px;transform:rotate(5deg)"></div>{board_svg()}</div>
<svg class="abs" style="left:14px;bottom:20px" width="90" height="80" viewBox="-45 -42 90 80">{DEFS}{bee(0, 0, 1.6, -6)}</svg>
<div class="bubble">Ещё чуть-чуть — и бомба<br>маточного молочка!</div>
<div class="gesture"></div></div></div>'''

LOGO = f'''<div class="logo"><b>Buzzle</b><svg width="74" height="64" viewBox="-30 -36 74 64">{DEFS}<path d="M-28,18 C-10,26 2,10 -6,4" stroke="{INK}" stroke-width="1.8" stroke-dasharray="2 6" fill="none" stroke-linecap="round" opacity=".7"/>{bee(10, -6, 1.15, -12)}</svg></div>'''

HTML = page(css, f'''<div class="page">
<div class="page-head"><div><div class="kicker">Направление 1 · Сказочный улей</div>{LOGO}</div>
<p>Тёплая бумага, пастельная акварель и «нарисованный от руки» контур. Уютно, как детская книжка: стикеры, скотч, карандашная цепочка.</p></div>
<div class="phones">{phone_hive()}{phone_puzzle()}</div></div>''', "Buzzle — storybook")
