"""Direction 2 — Bold flat minimal: off-white, ink, one honey accent, geometric hexes, huge numerals."""
import math
from common import *

INK = "#141414"; BG = "#F5F3EE"; GREY = "#8C8A85"; LINE = "#E3E0D8"; HONEY = "#FFB300"
POL = ["#FFB300", "#FF5A3C", "#3D5AFE", "#16A36E", "#141414"]

def mglyph(kind, x, y, r, fill="#fff"):
    if kind == 0: return f'<circle cx="{x}" cy="{y}" r="{r * .42}" fill="{fill}"/>'
    if kind == 1: return f'<circle cx="{x}" cy="{y}" r="{r * .38}" fill="none" stroke="{fill}" stroke-width="{r * .2}"/>'
    if kind == 2: return f'<path d="M{x},{y - r * .5} L{x + r * .5},{y + r * .38} L{x - r * .5},{y + r * .38}Z" fill="{fill}"/>'
    if kind == 3: return f'<rect x="{x - r * .36}" y="{y - r * .36}" width="{r * .72}" height="{r * .72}" rx="{r * .08}" fill="{fill}" transform="rotate(45 {x} {y})"/>'
    if kind == 4: return f'<path d="M{x - r * .45},{y} h{r * .9} M{x},{y - r * .45} v{r * .9}" stroke="{fill}" stroke-width="{r * .2}" stroke-linecap="round"/>'
    return ""

def gbee(x, y, sc=1, rot=0):
    return f'''<g transform="translate({x},{y}) rotate({rot}) scale({sc})">
<circle cx="-5" cy="-11" r="7" fill="none" stroke="{INK}" stroke-width="1.6"/><circle cx="5" cy="-11" r="7" fill="none" stroke="{INK}" stroke-width="1.6"/>
<rect x="-12" y="-7" width="24" height="16" rx="8" fill="{HONEY}"/>
<path d="M-3,-7 v16 M4,-7 v16" stroke="{INK}" stroke-width="3.2"/>
<circle cx="-7" cy="0" r="1.6" fill="{INK}"/></g>'''

def hive_svg():
    s = 40; W, H = 380, 330; cx0, cy0 = W / 2, H / 2
    out = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
    for i, (q, r) in enumerate(HIVE_SLOTS):
        x, y = hive_center(q, r, s); x += cx0; y += cy0
        st = hive_state(i); lv = HIVE_LEVELS[i]
        if st == "built":
            fill = HONEY if lv < 4 else INK
            tc = INK if lv < 4 else HONEY
            out.append(f'<path d="{hex_path(x, y, s * .92, 4)}" fill="{fill}"/>')
            out.append(f'<text x="{x}" y="{y + 8}" text-anchor="middle" font-family="Inter Tight" font-weight="650" font-size="23" fill="{tc}" letter-spacing="-1">{lv}</text>')
        else:
            out.append(f'<path d="{hex_path(x, y, s * .9, 4)}" fill="none" stroke="#CFCBC2" stroke-width="1.5" stroke-dasharray="4 4"/>')
            out.append(f'<path d="M{x - 5},{y} h10 M{x},{y - 5} v10" stroke="#B9B5AC" stroke-width="1.6" stroke-linecap="round"/>')
    out.append(gbee(28, 88, 1.05, -10)); out.append(gbee(340, 290, .95, 12)); out.append(gbee(336, 40, .8, 6))
    out.append('</svg>')
    return "".join(out)

def board_svg():
    s = 34; W, H = board_size(s)
    out = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}">']
    sel = set(PATH); pc = CELLS[PATH[0][0]][PATH[0][1]]
    for c in range(COLS):
        for r in range(ROWS):
            x, y = cell_center(c, r, s); col = CELLS[c][r]
            on = (c, r) in sel
            op = 1 if (on or col == pc or (c, r) in (WILD, BOMB)) else .28
            if (c, r) == WILD:
                pts = hex_pts(x, y, s * .9)
                for k in range(6):
                    a, b = pts[k], pts[(k + 1) % 6]
                    out.append(f'<path d="M{x},{y} L{a[0]:.1f},{a[1]:.1f} L{b[0]:.1f},{b[1]:.1f}Z" fill="{POL[k % 5]}"/>')
                out.append(f'<circle cx="{x}" cy="{y}" r="{s * .3}" fill="{BG}"/><text x="{x}" y="{y + 5}" text-anchor="middle" font-family="Inter Tight" font-weight="700" font-size="15" fill="{INK}">∗</text>')
                continue
            out.append(f'<g opacity="{op}"><path d="{hex_path(x, y, s * .9, 3.5)}" fill="{POL[col]}"/>')
            out.append(mglyph(col, x, y, s * .62) + '</g>')
            if (c, r) == BOMB:
                out.append(f'<g opacity="{op}"><circle cx="{x}" cy="{y}" r="{s * .36}" fill="#fff"/><circle cx="{x}" cy="{y}" r="{s * .18}" fill="{INK}"/></g>')
            if on:
                out.append(f'<path d="{hex_path(x, y, s * .9, 3.5)}" fill="none" stroke="{INK}" stroke-width="3.5"/>')
    pts = path_points(s)
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    out.append(f'<path d="{d}" stroke="{INK}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
    for i, (x, y) in enumerate(pts):
        if i == len(pts) - 1:
            out.append(f'<circle cx="{x}" cy="{y}" r="9" fill="{INK}"/><circle cx="{x}" cy="{y}" r="4" fill="{HONEY}"/>')
        else:
            out.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{INK}"/>')
    out.append('</svg>')
    return "".join(out)

css = f"""
body{{background:#ECEAE4}}
.page{{background:#EFEDE7;color:{INK}}}
.page-head .kicker{{font-family:'Inter Tight';font-weight:600;color:{INK}}}
.page-head p{{font-family:'Inter Tight';font-weight:500;color:#55534F}}
.logo{{display:flex;align-items:center;gap:10px;font:700 62px/1 'Unbounded';letter-spacing:-.04em}}
.phone{{background:#1A1A1A;box-shadow:0 40px 80px -30px rgba(0,0,0,.35),0 0 0 1px #000 inset}}
.screen{{background:{BG};color:{INK};font-family:'Inter Tight'}}
.status{{font-family:'Inter Tight';font-weight:600}}
.gesture{{background:{INK}}}
.top{{display:flex;align-items:center;justify-content:space-between;padding:10px 24px 0}}
.wm{{display:flex;align-items:center;gap:6px;font:700 22px/1 'Unbounded';letter-spacing:-.04em}}
.round{{width:40px;height:40px;border-radius:50%;border:1.5px solid {LINE};display:flex;align-items:center;justify-content:center;background:#fff}}
.cap{{font:600 11.5px/1 'Inter Tight';letter-spacing:.16em;text-transform:uppercase;color:{GREY}}}
.honey{{padding:22px 24px 0}}
.honey .row{{display:flex;align-items:flex-end;gap:12px;margin-top:8px}}
.honey b{{font:600 76px/.8 'Inter Tight';letter-spacing:-.06em}}
.chipy{{font:600 13px/1 'Inter Tight';background:{HONEY};border-radius:999px;padding:7px 11px;margin-bottom:4px}}
.chipk{{font:600 13px/1 'Inter Tight';background:#fff;border:1.5px solid {LINE};border-radius:999px;padding:6px 10px;margin-bottom:4px;display:flex;gap:5px;align-items:center}}
.chipk i{{width:8px;height:8px;border-radius:50%;background:#9B6BFF}}
.hivebox{{margin:18px 16px 0;position:relative}}
.lvl{{position:absolute;left:10px;top:4px}}
.stor{{margin:4px 24px 0;padding:16px 0 0;border-top:1.5px solid {LINE};display:flex;justify-content:space-between;align-items:baseline}}
.stor b{{font:600 22px/1 'Inter Tight';letter-spacing:-.02em}} .stor span{{color:{GREY};font:500 14px/1 'Inter Tight'}}
.line{{margin:12px 24px 0;height:3px;background:{LINE};border-radius:3px}} .line i{{display:block;height:100%;width:46%;background:{INK};border-radius:3px}}
.sub{{display:flex;justify-content:space-between;margin:10px 24px 0;font:500 13.5px/1 'Inter Tight';color:{GREY}}}
.btn{{margin:18px 24px 0;height:60px;border-radius:999px;background:{INK};color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 26px;font:600 18px/1 'Inter Tight';letter-spacing:-.01em}}
.btn i{{width:44px;height:44px;border-radius:50%;background:{HONEY};display:flex;align-items:center;justify-content:center}}
.tabs{{position:absolute;left:0;right:0;bottom:0;height:86px;display:flex;padding:12px 10px 0;border-top:1.5px solid {LINE};background:{BG}}}
.tab{{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;font:600 11.5px/1 'Inter Tight';color:#AFACA5;position:relative}}
.tab.on{{color:{INK}}}
.tab.on:after{{content:"";position:absolute;top:-13px;width:26px;height:3px;border-radius:2px;background:{HONEY}}}
.tab .d{{position:absolute;top:0;right:28px;width:7px;height:7px;border-radius:50%;background:#FF5A3C}}
.up{{display:flex;align-items:center;gap:10px;margin:0 24px;padding:12px 0;border-bottom:1.5px solid {LINE};font:600 15px/1 'Inter Tight'}}
.up em{{flex:1;font-style:normal;font-weight:500;color:{GREY};font-size:13.5px}}
.up b{{font-weight:600;font-size:14px;border:1.5px solid {INK};border-radius:999px;padding:6px 12px}}
/* puzzle */
.gtop{{display:flex;align-items:center;justify-content:space-between;padding:10px 20px 0}}
.gscore{{padding:18px 24px 0;display:flex;align-items:flex-end;justify-content:space-between}}
.gscore b{{display:block;font:600 84px/.8 'Inter Tight';letter-spacing:-.065em;margin-top:10px}}
.mv{{text-align:right}} .mv b{{font:600 44px/.85 'Inter Tight';letter-spacing:-.05em;display:block;margin-top:10px}}
.track{{position:relative;margin:20px 24px 0;height:3px;background:{LINE};border-radius:3px}}
.track i{{position:absolute;left:0;top:0;height:3px;width:41%;background:{INK};border-radius:3px}}
.tick{{position:absolute;top:-9px;width:21px;height:21px;margin-left:-10px;border-radius:50%;background:{BG};border:1.5px solid #CFCBC2;display:flex;align-items:center;justify-content:center}}
.tick.on{{background:{HONEY};border-color:{HONEY}}}
.tl{{position:absolute;top:18px;margin-left:-20px;width:40px;text-align:center;font:600 11px/1 'Inter Tight';color:{GREY}}}
.gchips{{display:flex;gap:8px;padding:40px 24px 0}}
.gchip{{font:600 13.5px/1 'Inter Tight';border-radius:999px;padding:8px 13px}}
.board{{margin:18px auto 0;width:{board_size(34)[0]:.0f}px;position:relative}}
.plus{{position:absolute;font:600 26px/1 'Inter Tight';letter-spacing:-.03em;background:{BG};border-radius:999px;padding:6px 10px;box-shadow:0 0 0 1.5px {INK}}}
.hint{{position:absolute;bottom:30px;left:24px;right:24px;display:flex;justify-content:space-between;font:500 13px/1 'Inter Tight';color:{GREY}}}
"""

HEXI = f'<svg width="22" height="20" viewBox="0 0 22 20"><path d="{hex_path(11, 10, 10, 2)}" fill="{HONEY}"/></svg>'
STAR = lambda c: f'<svg width="11" height="11" viewBox="-6 -6 12 12">{glyph(9, 0, 0, 5.4, c)}</svg>'

def phone_hive():
    tabs = "".join(f'<div class="tab{" on" if i == 0 else ""}">{tab_icon(n, 24, "currentColor", 1.8)}{l}{"<i class=d></i>" if i in (1, 3) else ""}</div>' for i, (n, l) in enumerate(TABS))
    return f'''<div class="phone"><div class="screen"><div class="cam"></div>{status_bar(INK)}
<div class="top"><div class="wm">buzzle{HEXI}</div><div class="round"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{INK}" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg></div></div>
<div class="honey"><div class="cap">Мёд</div><div class="row"><b>1<span style="margin-left:.2em"></span>240</b><span class="chipy">+240 / ч</span><span class="chipk"><i></i>7</span></div></div>
<div class="hivebox"><div class="lvl cap">Улей · уровень 5</div>{hive_svg()}</div>
<div class="stor"><span>В улье</span><div><b>766</b> <span>/ 1 677</span></div></div>
<div class="line"><i></i></div>
<div class="sub"><span>Полон через 3 ч 48 мин</span><span>запас 7 ч</span></div>
<div class="btn" style="margin-top:16px">Собрать 766<i><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v13M6 11l6 6 6-6"/></svg></i></div>
<div class="cap" style="padding:26px 24px 4px">Улучшения</div>
<div class="up"><span>Рабочие пчёлы</span><em>ур. 2 → +30%</em><b>810</b></div>
<div class="tabs">{tabs}</div><div class="gesture"></div></div></div>'''

def phone_puzzle():
    W = board_size(34)[0]
    ex, ey = path_points(34)[-1]
    ticks = ""
    for k, (t, on) in enumerate([(1000, True), (1800, False), (2800, False)]):
        p = t / 3100 * 100
        ticks += f'<div class="tick{" on" if on else ""}" style="left:{p:.1f}%">{STAR(INK if on else "#CFCBC2")}</div><div class="tl" style="left:{p:.1f}%">{str(t)[0]}&nbsp;{str(t)[1:]}</div>'
    return f'''<div class="phone"><div class="screen"><div class="cam"></div>{status_bar(INK)}
<div class="gtop"><div class="round"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3 3 13" stroke="{INK}" stroke-width="2" stroke-linecap="round"/></svg></div>
<div class="cap">Головоломка дня · 8 окт</div><div class="round" style="border:none;background:none"></div></div>
<div class="gscore"><div><div class="cap">Очки</div><b>1<span style="margin-left:.2em"></span>285</b></div><div class="mv"><div class="cap">Ходов</div><b>14</b></div></div>
<div class="track"><i></i>{ticks}</div>
<div class="gchips"><span class="gchip" style="background:{HONEY}">Комбо ×1,5</span><span class="gchip" style="background:{INK};color:#fff">Цепочка 6 · бомба</span></div>
<div class="board">{board_svg()}<div class="plus" style="left:{ex + 22:.0f}px;top:{ey - 20:.0f}px">+168</div></div>
<div class="hint"><span>Бомба — от 6 сот</span><span>Рекорд дня 2 140</span></div>
<div class="gesture"></div></div></div>'''

HTML = page(css, f'''<div class="page">
<div class="page-head"><div><div class="kicker">Направление 2 · Чистый минимализм</div><div class="logo">buzzle{HEXI.replace('width="22" height="20"', 'width="52" height="48"')}</div></div>
<p>Родственник минимального Karten: тёплый белый, чернила и один медовый акцент. Плоские гексы с геометрическими значками (различимы и без цвета), огромные цифры, тонкие линии.</p></div>
<div class="phones">{phone_hive()}{phone_puzzle()}</div></div>''', "Buzzle — minimal")
