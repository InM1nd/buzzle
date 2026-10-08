"""Direction 3 — Night garden: deep indigo, neon pollen, glowing outlines, fireflies, glass panels."""
import math, random
from common import *

BG0 = "#0B0A24"; BG1 = "#1A1240"; TXT = "#F3EEFF"; DIM = "#9A93C4"
NEON = ["#FFC94D", "#FF4FD8", "#A07CFF", "#3DE7FF", "#8CFF6B"]
AMBER = "#FFC94D"

DEFS = '''<defs>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="glow2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<radialGradient id="ff"><stop offset="0" stop-color="#FFF6B0"/><stop offset=".35" stop-color="#FFD84D" stop-opacity=".8"/><stop offset="1" stop-color="#FFB800" stop-opacity="0"/></radialGradient>
<linearGradient id="honeyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#FF9A1F"/></linearGradient>
</defs>'''

def fireflies(n, W, H, seed, rmin=1.5, rmax=4):
    rnd = random.Random(seed); out = []
    for _ in range(n):
        x, y = rnd.uniform(0, W), rnd.uniform(0, H); r = rnd.uniform(rmin, rmax)
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r * 4:.1f}" fill="url(#ff)" opacity="{rnd.uniform(.35, .9):.2f}"/><circle cx="{x:.0f}" cy="{y:.0f}" r="{r * .5:.1f}" fill="#FFFBE0"/>')
    return "".join(out)

def nbee(x, y, sc=1, rot=0, flip=False):
    f = -1 if flip else 1
    return f'''<g transform="translate({x},{y}) rotate({rot}) scale({sc * f},{sc})">
<circle cx="8" cy="2" r="20" fill="url(#ff)" opacity=".8"/>
<ellipse cx="-4" cy="-13" rx="9" ry="6" fill="#BFE9FF" fill-opacity=".25" stroke="#BFE9FF" stroke-width="1.2" transform="rotate(-25 -4 -13)"/>
<ellipse cx="6" cy="-14" rx="8" ry="5.5" fill="#BFE9FF" fill-opacity=".25" stroke="#BFE9FF" stroke-width="1.2" transform="rotate(20 6 -14)"/>
<ellipse cx="0" cy="0" rx="13" ry="10" fill="#1B1640" stroke="{AMBER}" stroke-width="1.8" filter="url(#soft)"/>
<path d="M-2,-9.5 Q-4,0 -2,9.5 M5,-9 Q3,0 5,9" stroke="{AMBER}" stroke-width="2.2" fill="none" filter="url(#soft)"/>
<ellipse cx="11" cy="1" rx="5" ry="5.5" fill="#FFF3A0" filter="url(#glow)"/>
<circle cx="-8" cy="-1" r="1.8" fill="#fff"/></g>'''

def ncell(x, y, R, col, on=False, dimmed=False, kind="n"):
    c = NEON[col]; op = .5 if dimmed else 1
    g = [f'<g opacity="{op}">']
    if on:
        g.append(f'<path d="{hex_path(x, y, R, 6)}" fill="{c}" opacity=".55" filter="url(#glow2)"/>')
    g.append(f'<path d="{hex_path(x, y, R, 6)}" fill="#15123A"/>')
    g.append(f'<path d="{hex_path(x, y, R, 6)}" fill="{c}" opacity="{.38 if on else .12}"/>')
    g.append(f'<path d="{hex_path(x, y, R * .97, 6)}" fill="none" stroke="{c}" stroke-width="{2.4 if on else 1.6}" filter="url(#soft)"/>')
    if kind == "wild":
        g.append(f'<g filter="url(#glow)">' + glyph(9, x, y, R * .42, "none", "#fff", 2) + '</g>')
        for k in range(5):
            a = math.radians(72 * k - 90)
            g.append(f'<circle cx="{x + math.cos(a) * R * .62:.1f}" cy="{y + math.sin(a) * R * .62:.1f}" r="2.2" fill="{NEON[k]}" filter="url(#soft)"/>')
    else:
        g.append(f'<g filter="url(#glow)">' + glyph(col, x, y, R * .36, c if not on else "#fff") + '</g>')
    g.append('</g>')
    return "".join(g)

def hive_svg():
    s = 40; W, H = 380, 340; cx0, cy0 = W / 2, H / 2
    out = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}">{DEFS}']
    out.append(f'<circle cx="{cx0}" cy="{cy0}" r="150" fill="#FFB800" opacity=".13" filter="url(#glow2)"/>')
    for i, (q, r) in enumerate(HIVE_SLOTS):
        x, y = hive_center(q, r, s); x += cx0; y += cy0
        st = hive_state(i); lv = HIVE_LEVELS[i]
        if st == "built":
            out.append(f'<path d="{hex_path(x, y, s * .9, 6)}" fill="url(#honeyg)" opacity="{.35 + .15 * lv}"/>')
            out.append(f'<path d="{hex_path(x, y, s * .9, 6)}" fill="none" stroke="{AMBER}" stroke-width="2" filter="url(#glow)"/>')
            out.append(f'<text x="{x}" y="{y + 8}" text-anchor="middle" font-family="Exo 2" font-weight="800" font-size="23" fill="#fff" filter="url(#soft)">{lv}</text>')
        else:
            out.append(f'<path d="{hex_path(x, y, s * .86, 6)}" fill="#A07CFF" fill-opacity=".05" stroke="#A07CFF" stroke-opacity=".45" stroke-width="1.3" stroke-dasharray="3 5"/>')
            out.append(f'<path d="M{x - 5},{y} h10 M{x},{y - 5} v10" stroke="#A07CFF" stroke-opacity=".6" stroke-width="1.5" stroke-linecap="round"/>')
    out.append(nbee(42, 60, 1.05, -8)); out.append(nbee(338, 286, 1, 10, True)); out.append(nbee(330, 48, .75, 4, True))
    out.append(fireflies(9, W, H, 5, 1, 2.5))
    out.append('</svg>')
    return "".join(out)

def board_svg():
    s = 33; W, H = board_size(s); pad = 12
    out = [f'<svg width="{W + 2 * pad}" height="{H + 2 * pad}" viewBox="{-pad} {-pad} {W + 2 * pad} {H + 2 * pad}">{DEFS}']
    sel = set(PATH); pc = CELLS[PATH[0][0]][PATH[0][1]]
    for c in range(COLS):
        for r in range(ROWS):
            x, y = cell_center(c, r, s); col = CELLS[c][r]; on = (c, r) in sel
            kind = "wild" if (c, r) == WILD else "n"
            out.append(ncell(x, y, s * (.92 if on else .88), col, on, dimmed=(col != pc and kind == "n" and (c, r) != BOMB), kind=kind))
            if (c, r) == BOMB:
                out.append(f'<circle cx="{x}" cy="{y}" r="{s * .5}" fill="#FF4FD8" opacity=".35" filter="url(#glow2)"/><circle cx="{x}" cy="{y}" r="{s * .3}" fill="#FFE6FA" filter="url(#glow)"/>'
                           f'<path d="M{x - 8},{y - 2} l0,-7 4,4 4,-6 4,6 4,-4 0,7z" fill="#B0218F"/>')
    pts = path_points(s)
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    out.append(f'<path d="{d}" stroke="#FF4FD8" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7" filter="url(#glow2)"/>')
    out.append(f'<path d="{d}" stroke="#FFE6FA" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>')
    for i, (x, y) in enumerate(pts):
        out.append(f'<circle cx="{x}" cy="{y}" r="{7 if i == len(pts) - 1 else 4}" fill="#fff" filter="url(#glow)"/>')
    rnd = random.Random(3)
    for x, y in pts[-2:]:
        for _ in range(5):
            a = rnd.uniform(0, 6.28); dd = rnd.uniform(14, 30)
            out.append(f'<circle cx="{x + math.cos(a) * dd:.1f}" cy="{y + math.sin(a) * dd:.1f}" r="{rnd.uniform(1.2, 2.6):.1f}" fill="#FFD6F6" filter="url(#soft)"/>')
    ex, ey = pts[-1]
    out.append(f'<text x="{ex + 24}" y="{ey + 8}" font-family="Exo 2" font-weight="800" font-size="26" fill="#FFE6FA" filter="url(#glow)">+168</text>')
    out.append('</svg>')
    return "".join(out)

def garden(W, H):
    """flower & grass silhouettes with rim light along the bottom of the screen"""
    rnd = random.Random(11); g = [f'<svg class="abs" style="left:0;bottom:0" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{DEFS}']
    for i in range(48):
        x = rnd.uniform(-10, W + 10); h = rnd.uniform(40, 150); b = rnd.uniform(-14, 14)
        g.append(f'<path d="M{x:.0f},{H} q{b / 2:.0f},{-h / 2:.0f} {b:.0f},{-h:.0f}" stroke="#2A1F5C" stroke-width="{rnd.uniform(2, 4):.1f}" fill="none" stroke-linecap="round"/>')
    for x, y, col in [(34, H - 170, NEON[1]), (96, H - 128, NEON[3]), (176, H - 150, NEON[4]), (250, H - 118, NEON[1]), (318, H - 182, NEON[2]), (378, H - 136, NEON[0])]:
        g.append(f'<path d="M{x},{H} q-6,-40 0,{y - H}" stroke="#2A1F5C" stroke-width="3" fill="none"/>')
        for k in range(6):
            a = math.radians(60 * k)
            g.append(f'<ellipse cx="{x + math.cos(a) * 8:.1f}" cy="{y + math.sin(a) * 8:.1f}" rx="7" ry="4" transform="rotate({60 * k} {x + math.cos(a) * 8:.1f} {y + math.sin(a) * 8:.1f})" fill="{col}" opacity=".55" filter="url(#soft)"/>')
        g.append(f'<circle cx="{x}" cy="{y}" r="4" fill="#FFF6C8" filter="url(#glow)"/>')
    g.append('</svg>')
    return "".join(g)

css = f"""
body{{background:#07061A}}
.page{{background:radial-gradient(900px 600px at 80% 0%,#2A1460 0%,transparent 60%),radial-gradient(800px 600px at 0% 100%,#0D3550 0%,transparent 60%),#07061A;color:{TXT}}}
.page-head .kicker{{font-family:'Exo 2';font-weight:700;color:#C9B8FF;opacity:.8}}
.page-head p{{font-family:'Exo 2';font-weight:500;color:#C9C2EE}}
.logo{{font:900 64px/1 'Exo 2';font-style:italic;letter-spacing:-.02em;background:linear-gradient(90deg,#FFE27A,#FF9A3C 45%,#FF4FD8);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 0 14px rgba(255,140,80,.55))}}
.phone{{background:#14112E;box-shadow:0 40px 90px -30px rgba(120,60,255,.45),0 0 0 1px #2E2860 inset}}
.screen{{background:radial-gradient(500px 420px at 85% 8%,#3A1D7A 0%,transparent 60%),radial-gradient(420px 380px at 0% 80%,#0E3C5C 0%,transparent 65%),linear-gradient(180deg,{BG1},{BG0});color:{TXT};font-family:'Exo 2'}}
.status{{font-family:'Exo 2'}}
.gesture{{background:#fff;opacity:.6}}
.top{{display:flex;align-items:center;gap:8px;padding:8px 18px 0;position:relative;z-index:3}}
.wm{{flex:1;font:900 26px/1 'Exo 2';font-style:italic;background:linear-gradient(90deg,#FFE27A,#FF9A3C 50%,#FF4FD8);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 0 8px rgba(255,140,80,.5))}}
.pill{{display:flex;align-items:center;gap:7px;height:38px;padding:0 14px 0 8px;border-radius:20px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);font:800 16px/1 'Exo 2'}}
.orb{{width:22px;height:22px;border-radius:50%}}
.glass{{position:relative;margin:12px 16px 0;border-radius:26px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(10px)}}
.hh{{display:flex;justify-content:space-between;align-items:center;padding:14px 18px 0}}
.hh b{{font:800 17px/1 'Exo 2'}} .hh span{{font:700 13px/1 'Exo 2';color:{AMBER};text-shadow:0 0 10px rgba(255,201,77,.7)}}
.store{{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 0}}
.store small{{font:600 13px/1 'Exo 2';color:{DIM};display:block;margin-bottom:6px}}
.store b{{font:800 24px/1 'Exo 2'}} .store em{{font-style:normal;color:{DIM};font:600 15px/1 'Exo 2'}}
.bar{{margin:12px 18px 0;height:8px;border-radius:6px;background:rgba(255,255,255,.08)}}
.bar i{{display:block;height:100%;width:46%;border-radius:6px;background:linear-gradient(90deg,#FF9A1F,#FFE08A);box-shadow:0 0 12px rgba(255,190,60,.8)}}
.btn{{margin:16px 18px 18px;height:56px;border-radius:20px;background:linear-gradient(180deg,#FFD66B,#FF9A1F);box-shadow:0 0 26px rgba(255,170,40,.55),inset 0 1px 0 rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;gap:10px;font:800 19px/1 'Exo 2';color:#2A1500}}
.tabs{{position:absolute;left:12px;right:12px;bottom:22px;height:70px;border-radius:26px;display:flex;align-items:center;background:rgba(20,16,52,.75);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(14px);z-index:4}}
.tab{{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;font:700 11px/1 'Exo 2';color:#7D76AA;position:relative}}
.tab.on{{color:{AMBER};text-shadow:0 0 10px rgba(255,201,77,.8)}} .tab.on svg{{filter:drop-shadow(0 0 6px rgba(255,201,77,.9))}}
.tab .d{{position:absolute;top:-2px;right:26px;width:7px;height:7px;border-radius:50%;background:#FF4FD8;box-shadow:0 0 8px #FF4FD8}}
/* puzzle */
.gtop{{display:flex;align-items:center;padding:6px 16px 0;gap:10px}}
.gx{{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center}}
.gs{{flex:1;text-align:center}} .gs small{{display:block;font:700 12px/1 'Exo 2';letter-spacing:.14em;text-transform:uppercase;color:{DIM}}}
.gs b{{display:block;font:800 42px/1 'Exo 2';margin-top:4px;text-shadow:0 0 18px rgba(160,124,255,.8)}}
.mv{{width:62px;height:62px;border-radius:20px;border:1.5px solid {NEON[3]};box-shadow:0 0 16px rgba(61,231,255,.45),inset 0 0 14px rgba(61,231,255,.25);display:flex;flex-direction:column;align-items:center;justify-content:center}}
.mv b{{font:800 26px/1 'Exo 2';color:#E8FDFF}} .mv small{{font:700 10px/1 'Exo 2';color:{NEON[3]};letter-spacing:.08em}}
.trk{{position:relative;margin:16px 22px 0;height:8px;border-radius:6px;background:rgba(255,255,255,.08)}}
.trk i{{position:absolute;left:0;top:0;bottom:0;width:41%;border-radius:6px;background:linear-gradient(90deg,#A07CFF,#FF4FD8);box-shadow:0 0 12px rgba(255,79,216,.8)}}
.trk svg{{position:absolute;top:-9px;margin-left:-13px}}
.chips{{display:flex;justify-content:space-between;padding:20px 18px 0}}
.chip{{display:flex;align-items:center;gap:6px;font:800 13.5px/1 'Exo 2';border-radius:14px;padding:8px 12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}}
.chip.m{{border-color:#FF4FD8;color:#FFD6F6;box-shadow:0 0 14px rgba(255,79,216,.45)}}
.bwrap{{margin:10px auto 0;width:{board_size(33)[0] + 24:.0f}px}}
"""

def phone_hive():
    tabs = "".join(f'<div class="tab{" on" if i == 0 else ""}">{tab_icon(n, 24, "currentColor", 1.9)}{l}{"<i class=d></i>" if i in (1, 3) else ""}</div>' for i, (n, l) in enumerate(TABS))
    return f'''<div class="phone"><div class="screen"><div class="cam"></div>
<svg class="abs" style="left:0;top:0" width="412" height="915">{DEFS}{fireflies(14, 412, 915, 21, 1, 2.8)}</svg>
{garden(412, 250)}
{status_bar(TXT)}
<div class="top"><div class="wm">Buzzle</div>
<div class="pill"><div class="orb" style="background:radial-gradient(circle at 35% 30%,#FFF3B0,#FFB21F 60%,#C66A00);box-shadow:0 0 12px rgba(255,190,60,.9)"></div>1 240</div>
<div class="pill"><div class="orb" style="width:18px;height:18px;background:radial-gradient(circle at 35% 30%,#fff,#C9A8FF 50%,#7B4DFF);box-shadow:0 0 12px rgba(160,124,255,.9)"></div>7</div></div>
<div class="glass" style="margin-top:14px"><div class="hh"><b>Улей · ур. 5</b><span>+240 мёда/ч</span></div>{hive_svg()}</div>
<div class="glass"><div class="store"><div><small>Мёд в улье</small><b>766</b> <em>/ 1 677</em></div><div style="text-align:right"><small>полон через</small><b style="font-size:18px">3 ч 48 мин</b></div></div>
<div class="bar"><i></i></div><div class="btn">Собрать 766</div></div>
<div class="tabs">{tabs}</div><div class="gesture"></div></div></div>'''

def phone_puzzle():
    star = lambda on: f'<svg width="26" height="26" viewBox="-13 -13 26 26">{DEFS}<g filter="url(#{"glow" if on else "soft"})">{glyph(9, 0, 0, 10, "#FFE27A" if on else "#3A3470")}</g></svg>'
    stars = "".join(f'<span style="position:absolute;left:{t / 3100 * 100:.1f}%">{star(on)}</span>' for t, on in [(1000, True), (1800, False), (2800, False)])
    return f'''<div class="phone"><div class="screen"><div class="cam"></div>
<svg class="abs" style="left:0;top:0" width="412" height="915">{DEFS}{fireflies(16, 412, 915, 8, 1, 2.6)}</svg>
{status_bar(TXT)}
<div class="gtop"><div class="gx"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3 3 13" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></div>
<div class="gs"><small>Головоломка дня</small><b>1 285</b></div><div class="mv"><b>14</b><small>ХОДОВ</small></div></div>
<div class="trk"><i></i>{stars}</div>
<div class="chips"><div class="chip"><svg width="18" height="20" viewBox="-10 -12 20 22">{DEFS}<g filter="url(#soft)">{flame(0, 0, .95, "#FF8A3D", "#FFE27A")}</g></svg>Комбо ×1,5</div><div class="chip m">цепочка 6 · бомба!</div></div>
<div class="bwrap">{board_svg()}</div>
<div style="position:absolute;left:0;right:0;bottom:34px;text-align:center;font:600 13px/1 'Exo 2';color:{DIM}">Светлячки собирают пыльцу — ведите по 3+ сотам</div>
<div class="gesture"></div></div></div>'''

HTML = page(css, f'''<div class="page">
<svg class="abs" style="left:0;top:0;z-index:1" width="1120" height="1240">{DEFS}{fireflies(26, 1120, 1240, 99, 1.2, 3.2)}</svg>
<div class="page-head"><div><div class="kicker">Направление 3 · Ночной сад</div><div class="logo">Buzzle</div></div>
<p>Тёмная индиго-ночь, светящаяся неоновая пыльца, светлячки и стеклянные панели. Ярко, атмосферно, приятно играть вечером.</p></div>
<div class="phones">{phone_hive()}{phone_puzzle()}</div></div>''', "Buzzle — night garden")
