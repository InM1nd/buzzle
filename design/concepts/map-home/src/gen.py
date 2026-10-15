# Концепт «карта-главный экран» Buzzle. Собирается из существующих ассетов v1.5-ui (src/a/) в HTML и снимается headless Chrome.
A = "a/"
CSS = """
@font-face{font-family:NB;src:url(a/Nunito-Black.ttf)}
@font-face{font-family:NX;src:url(a/Nunito-ExtraBold.ttf)}
@font-face{font-family:NR;src:url(a/Nunito-Bold.ttf)}
*{box-sizing:border-box;margin:0;padding:0}
body{width:390px;height:844px;overflow:hidden;font-family:NR;color:#5A3410;position:relative;background:#FFF4DF}
.abs{position:absolute}
.nb{font-family:NB}.nx{font-family:NX}
img{display:block}
.pill{position:absolute;display:flex;align-items:center;gap:6px;background:#fff;border-radius:22px;height:40px;padding:0 12px 0 6px;box-shadow:0 3px 0 #F0D7AE,0 8px 16px rgba(170,100,20,.14);font-family:NB;font-size:16px;color:#5A3410}
.pill img{width:28px;height:28px;object-fit:contain}
.cap{position:absolute;left:50%;transform:translateX(-50%);top:9px;background:#6B4423;color:#FFF4DF;border-radius:14px;padding:5px 14px;font-family:NB;font-size:11px;letter-spacing:1.2px;white-space:nowrap;z-index:99}
.hs{position:absolute;z-index:10}
.halo{position:absolute;z-index:3;border-radius:50%;background:radial-gradient(closest-side,rgba(255,240,120,1),rgba(255,206,60,.7) 58%,rgba(255,190,40,0));filter:blur(2px)}
.ring{position:absolute;border-radius:50%;border:3px solid rgba(255,255,255,.95);box-shadow:0 0 0 3px rgba(255,190,40,.55),0 0 18px 6px rgba(255,200,60,.7)}
.lab{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;height:30px;padding:0 12px 0 4px;border-radius:15px;background:#fff;box-shadow:0 3px 0 #E8C98F,0 6px 12px rgba(120,70,10,.25);font-family:NB;font-size:14px;white-space:nowrap;color:#5A3410;z-index:20}
.lab i{width:22px;height:22px;border-radius:50%;background:linear-gradient(#FFC23D,#FF9A12);display:grid;place-items:center;box-shadow:0 2px 0 #C25F00}
.lab i img{width:14px;height:14px}
.badge{position:absolute;min-width:22px;height:22px;border-radius:11px;background:#E8412F;color:#fff;font-family:NB;font-size:12px;display:grid;place-items:center;padding:0 6px;border:2px solid #fff;box-shadow:0 2px 4px rgba(120,30,10,.35);z-index:21;white-space:nowrap}
.badge.g{background:#62A82A}
.badge.o{background:linear-gradient(#FFC23D,#FF9A12);}
.sh{filter:drop-shadow(0 0 7px rgba(255,238,130,.95)) drop-shadow(0 8px 6px rgba(80,50,10,.28))}
.tabbar{position:absolute;left:12px;right:12px;bottom:14px;height:66px;border-radius:30px;background:rgba(255,255,255,.96);box-shadow:0 4px 0 #EBCB98,0 10px 24px rgba(150,90,20,.25);display:flex;padding:6px;gap:2px;z-index:60}
.tab{flex:1;border-radius:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-family:NB;font-size:10.5px;color:#9A6A34;position:relative}
.tab img{width:26px;height:26px;object-fit:contain;filter:brightness(0) saturate(100%) invert(48%) sepia(35%) saturate(700%) hue-rotate(350deg) brightness(95%)}
.tab.on{background:linear-gradient(#FFC23D,#FF9A12);color:#fff;box-shadow:0 3px 0 #C25F00}
.tab.on img{filter:brightness(0) invert(1)}
.tab .badge{top:-2px;right:6px;min-width:18px;height:18px;font-size:10px;padding:0 4px}
.bee{position:absolute;z-index:12;filter:drop-shadow(0 10px 6px rgba(80,50,10,.22))}
.shadow{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(60,90,20,.28),rgba(60,90,20,0))}
.wood{background:linear-gradient(#C98A4B,#A8672C);border:3px solid #7A4519;border-radius:8px;box-shadow:0 4px 0 #5E3412}
.paper{background:#FFF8E6;border-radius:3px;box-shadow:0 1px 2px rgba(60,30,0,.4)}
"""
def top(honey="1 240", extra=True):
    return f'''<div class=pill style="left:16px;top:44px"><img src="{A}honey.webp">{honey}</div>
<div class=pill style="left:116px;top:44px"><img src="{A}pollen.webp">146</div>
<div class=pill style="left:200px;top:44px"><img src="{A}jelly.webp">4</div>
<div class=abs style="right:16px;top:44px;width:44px;height:44px;border-radius:50%;background:#fff;box-shadow:0 3px 0 #F0D7AE,0 8px 16px rgba(170,100,20,.14);display:grid;place-items:center;z-index:70"><img src="{A}gear.webp" style="width:26px;filter:brightness(0) saturate(100%) invert(48%) sepia(35%) saturate(700%) hue-rotate(350deg) brightness(95%)"></div>'''
def tabbar(cur=0, first="Карта"):
    T=[("tab_hive",first,0),("tab_puzzle","Играть",1),("tab_bee","Пчёлы",0),("tab_box","Сюрпризы",1),("tab_tasks","Задания",2)]
    return '<div class=tabbar>'+"".join(f'<div class="tab{" on" if i==cur else ""}"><img src="{A}{ic}.webp">{n}{f"<div class=badge>{b}</div>" if b and i!=cur else ""}</div>' for i,(ic,n,b) in enumerate(T))+'</div>'
def img(src,x,y,w,extra="",cls="sh"):
    return f'<img src="{A}{src}" class="{cls}" style="position:absolute;z-index:6;left:{x}px;top:{y}px;width:{w}px;{extra}">'
def label(text,icon,x,y):
    return f'<div class=lab style="left:{x}px;top:{y}px"><i><img src="{A}{icon}.webp"></i>{text}</div>'
def badge(t,x,y,cls=""):
    return f'<div class="badge {cls}" style="left:{x}px;top:{y}px">{t}</div>'
def halo(cx,cy,w,h,ring=False):
    ring=False
    s=f'<div class=halo style="left:{cx-w/2}px;top:{cy-h/2}px;width:{w}px;height:{h}px"></div>'
    if ring: s+=f'<div class=ring style="left:{cx-w/2+10}px;top:{cy-h/2+10}px;width:{w-20}px;height:{h-20}px"></div>'
    return s
def bee(n,x,y,w,flip=False,rot=0):
    return f'<img class=bee src="{A}{n}.png" style="left:{x}px;top:{y}px;width:{w}px;transform:scaleX({-1 if flip else 1}) rotate({rot}deg)">'
def bed(x,y,w,plant,wet=False):
    h=w*185/360
    return (f'<img src="{A}bed_{"wet" if wet else "dry"}.webp" style="position:absolute;z-index:6;left:{x}px;top:{y}px;width:{w}px">'
      f'<img src="{A}{plant}.webp" style="position:absolute;z-index:7;left:{x+w/2-w*.36}px;top:{y+h*.45-w*.72}px;width:{w*.72}px">'
      f'<img src="{A}bed_{"wet" if wet else "dry"}.webp" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;z-index:8;clip-path:inset(52% 0 0 0)">')

def hive_cluster(x,y,w, collect=True):
    h=w*173/200; step=w*.75; out=''
    cols=[[0.5,1.5],[0,1,2],[0.5,1.5]]
    for c,rows in enumerate(cols):
        for r in rows:
            out+=f'<img src="{A}comb.webp" style="position:absolute;z-index:6;left:{x+c*step}px;top:{y+r*h*.995}px;width:{w}px;filter:drop-shadow(0 0 8px rgba(255,238,130,.9)) drop-shadow(0 5px 3px rgba(120,60,0,.3))">'
    return out

def bg_scene():
    return f'''<div class=abs style="inset:0;background:url({A}hive_bg.webp) center top/cover"></div>
<div class=abs style="left:0;right:0;top:300px;bottom:0;background:url({A}garden_bg.webp) center bottom/cover;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 34%);mask-image:linear-gradient(to bottom,transparent 0,#000 34%)"></div>'''

def scene_A(labels=True, dim=False):
    s = bg_scene()
    s+='<svg class=abs style="left:0;top:0;z-index:2" width=390 height=844 fill=none><path d="M195 640 C 180 560, 220 520, 150 470 M195 640 C 230 560, 250 520, 300 470 M150 440 C 130 400, 120 370, 110 335" stroke="#F6E3A8" stroke-width="20" stroke-linecap="round" opacity=".55"/></svg>'
    # decor (не хотспоты; места под украшения)
    s+=img("deco_lanterns.webp",204,262,44)+img("deco_mushroom.webp",12,520,40)+img("deco_pinwheel.webp",350,548,28)
    # --- улей
    s+=halo(110,214,250,250)
    s+=hive_cluster(18,112,80)
    if labels: s+=label("Улей","tab_hive",70,326)+badge("Собрать 1 960",122,326,"o")
    # --- доска заданий
    s+=halo(316,176,150,150)
    s+='<div class="shadow" style="left:268px;top:244px;width:100px;height:18px"></div>'
    s+='<div class="abs wood" style="left:278px;top:196px;width:10px;height:56px;z-index:9"></div><div class="abs wood" style="left:350px;top:196px;width:10px;height:56px;z-index:9"></div>'
    s+='''<div class="abs wood" style="left:264px;top:112px;width:108px;height:96px;z-index:11;border-radius:10px">
<div class="paper abs" style="left:6px;top:7px;width:44px;height:34px;transform:rotate(-4deg);padding:4px;font-size:8px;line-height:9px;color:#8A5A20">Собрать<br>мёд <span style="color:#62A82A">✓</span></div>
<div class="paper abs" style="left:54px;top:5px;width:44px;height:34px;transform:rotate(3deg);padding:4px;font-size:8px;line-height:9px;color:#8A5A20">Пазл на<br>3★</div>
<div class="paper abs" style="left:28px;top:48px;width:50px;height:34px;transform:rotate(-2deg);padding:4px;font-size:8px;line-height:9px;color:#8A5A20">Полить<br>3 цветка</div>
<div class="abs" style="left:2px;top:-2px;width:10px;height:10px;border-radius:50%;background:#E8412F"></div></div>'''
    if labels: s+=label("Задания","tab_tasks",318,262)+badge("2",356,100)
    # --- мольберт «Играть»
    s+=halo(312,368,160,160)
    s+='<div class="shadow" style="left:256px;top:438px;width:116px;height:20px"></div>'
    s+='<div class="abs wood" style="left:268px;top:392px;width:9px;height:52px;transform:rotate(-8deg);z-index:9"></div><div class="abs wood" style="left:350px;top:392px;width:9px;height:52px;transform:rotate(8deg);z-index:9"></div>'
    s+='<div class="abs wood" style="left:260px;top:300px;width:104px;height:100px;z-index:11;background:linear-gradient(#FFE9B8,#FFD27A)"></div>'
    for n,cx,cy in [("cell0",0,0),("cell1",1,-.5),("cell2",1,.5),("cell3",0,1),("cell1",-1,.5),("cell2",-1,-.5),("cell0",0,-1)]:
        s+=f'<img src="{A}{n}.webp" style="position:absolute;left:{312-17+cx*25}px;top:{350-15+cy*29}px;width:34px;z-index:12">'
    if labels: s+=label("Играть","tab_puzzle",312,452)+badge("★ 1/3",340,290,"g")+badge("!",252,290)
    # --- лавка и сундуки
    s+=halo(96,436,180,140)
    s+='<div class="shadow" style="left:14px;top:480px;width:170px;height:22px"></div>'
    s+=img("shop.webp",14,386,92,"z-index:9")+img("chest.webp",92,424,74,"z-index:10")+img("box_wax.webp",56,456,46,"z-index:11")+img("box_wood.webp",146,452,40,"z-index:11")
    if labels: s+=label("Сюрпризы","tab_box",98,504)+badge("1",146,410)
    # --- пчёлы
    s+=halo(204,392,110,80)
    s+=bee("zhuzha_side",152,350,66)+bee("boris_side",204,118,48,False,-6)+bee("lavanda_q3",198,418,42)+bee("solnyshko_side",110,336,38,True,4)+bee("pushinka_side",318,490,34,True)
    if labels: s+=label("Пчёлы","tab_bee",206,474)+badge("13",208,340,"g")
    # --- сад
    s+=halo(195,646,390,110)
    s+='<div class="shadow" style="left:6px;top:674px;width:378px;height:24px"></div>'
    s+=bed(8,622,122,"sunflower_bloom")+bed(134,622,122,"lavender_bloom",True)+bed(260,622,122,"cornflower_bloom")
    s+=badge("✓",100,552,"g")+badge("✓",218,552,"g")+badge("💧",350,566,"o")
    if labels: s+=label("Сад","tab_hive",195,704)+badge("2 готовы",232,698,"g")
    return s

def page(body,cap,tabs=True,cur=0):
    return f'<!doctype html><meta charset=utf-8><style>{CSS}</style><body>{body}<div class=cap>{cap}</div>{top()}{tabbar(cur) if tabs else ""}</body>'

# ---------- A ----------
open("A.html","w").write(page(scene_A(),"A · ПАНОРАМНАЯ СЦЕНА · КОНЦЕПТ"))

# ---------- B : map with islands ----------
def island(x,y,w,h,hue="g"):
    top = "linear-gradient(#B7DB62,#8CC03F)" if hue=="g" else "linear-gradient(#F4F8FB,#CFE0EC)"
    side= "linear-gradient(#B5763A,#8A5424)" if hue=="g" else "linear-gradient(#A7BFD1,#7E9BB2)"
    return f'''<div class=abs style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;z-index:2">
<div class=abs style="left:{w*.06}px;top:{h*.28}px;width:{w*.88}px;height:{h*.62}px;border-radius:40% 40% 55% 55%/30% 30% 70% 70%;background:{side};box-shadow:0 14px 18px rgba(80,50,10,.28)"></div>
<div class=abs style="left:0;top:0;width:{w}px;height:{h*.58}px;border-radius:50%;background:{top};box-shadow:inset 0 -6px 0 rgba(0,80,0,.15),inset 0 5px 0 rgba(255,255,255,.35)"></div></div>'''
def cloud(x,y,w,o=.85):
    return f'<div class=abs style="left:{x}px;top:{y}px;width:{w}px;height:{w*.32}px;border-radius:{w}px;background:#fff;opacity:{o};filter:blur(1px);z-index:1;box-shadow:{w*.25}px -{w*.1}px 0 {w*.04}px #fff,-{w*.2}px -{w*.05}px 0 0 #fff"></div>'
def scene_B(tab=True):
    s=f'<div class=abs style="inset:0;background:linear-gradient(#FFE9A8 0,#FFF4D4 38%,#FFF4DF 100%)"></div>'
    s+=f'<div class=abs style="inset:0;background:url({A}hive_bg.webp) center top/cover;opacity:.55"></div>'
    s+=cloud(14,150,90)+cloud(290,196,80,.7)+cloud(30,600,100,.7)+cloud(280,690,90,.75)
    # paths (SVG), dashed honey trail
    s+='''<svg class=abs style="left:0;top:0;z-index:1" width=390 height=844 viewBox="0 0 390 844" fill=none>
<path d="M195 300 C 120 340, 90 380, 100 430 M195 300 C 270 340, 300 380, 290 430 M100 470 C 120 520, 170 540, 195 560 M290 470 C 270 520, 220 540, 195 560 M195 600 C 190 640, 200 660, 195 690 M290 360 C 330 300, 330 270, 320 240 M100 470 C 60 530, 60 560, 70 600" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=.9/>
<path d="M195 300 C 120 340, 90 380, 100 430 M195 300 C 270 340, 300 380, 290 430 M100 470 C 120 520, 170 540, 195 560 M290 470 C 270 520, 220 540, 195 560 M195 600 C 190 640, 200 660, 195 690 M290 360 C 330 300, 330 270, 320 240 M100 470 C 60 530, 60 560, 70 600" stroke="#F2A93B" stroke-width="5" stroke-dasharray="1 11" stroke-linecap="round"/></svg>'''
    # Улей island (top center)
    s+=island(60,150,270,190)+halo(195,215,250,150,True)
    s+=hive_cluster(132,126,50)
    s+=bee("zhuzha_side",246,130,54)+bee("boris_side",76,196,38,True)
    s+=label("Улей","tab_hive",150,300)+badge("Собрать 1 960",200,300,"o")
    # Задания island (top-right small)
    s+=island(268,210,110,70)
    s+='<div class="abs wood" style="left:296px;top:190px;width:52px;height:44px;z-index:6;border-radius:6px"></div>'+img("tab_tasks.webp",305,196,34,"z-index:7;filter:none",cls="")
    s+=label("Задания","tab_tasks",323,264)+badge("2",342,178)
    # Сад island (left middle)
    s+=island(16,392,170,110)+halo(101,420,170,90,True)
    s+=bed(30,408,70,"sunflower_bloom")+bed(100,408,70,"cornflower_bloom",True)
    s+=label("Сад","tab_hive",101,478)+badge("2",160,386,"g")+badge("💧",26,386,"o")
    # Играть island (right middle)
    s+=island(204,392,170,110)+halo(289,420,170,90,True)
    for n,cx,cy in [("cell0",0,0),("cell1",1,-.5),("cell2",1,.5),("cell3",0,1),("cell1",-1,.5),("cell2",-1,-.5),("cell0",0,-1)]:
        s+=f'<img src="{A}{n}.webp" style="position:absolute;left:{289-18+cx*26}px;top:{416-16+cy*30}px;width:34px;z-index:7">'
    s+=label("Играть","tab_puzzle",289,478)+badge("★ 1/3",322,384,"g")+badge("!",208,386)
    # Сюрпризы island (center)
    s+=island(100,545,190,120)+halo(195,580,190,100,True)
    s+=img("shop.webp",110,520,84,"z-index:7")+img("chest.webp",176,552,70,"z-index:8")+img("box_wax.webp",230,566,42,"z-index:9")
    s+=label("Сюрпризы","tab_box",195,636)+badge("1",250,538)
    # Пчёлы: flying over map
    s+=bee("lavanda_q3",152,325,44)+bee("solnyshko_side",236,340,38,True)+bee("pushinka_side",72,540,36)
    # Locked biome island (future)
    s+=island(24,640,120,76)
    s+=f'<div class=abs style="left:0;top:640px;width:160px;height:92px;z-index:9;background:radial-gradient(closest-side,rgba(255,255,255,.95),rgba(255,255,255,.8) 60%,rgba(255,255,255,0));"></div>'
    s+=f'<div class=abs style="left:62px;top:664px;width:36px;height:36px;border-radius:50%;background:#fff;box-shadow:0 3px 0 #E8C98F;display:grid;place-items:center;z-index:10"><img src="{A}lock.webp" style="width:20px;filter:brightness(0) saturate(100%) invert(48%) sepia(35%) saturate(700%) hue-rotate(350deg) brightness(95%)"></div>'
    s+=f'<div class=lab style="left:84px;top:702px;background:#FFF4DF;color:#9A6A34;font-size:12px;padding:0 10px;z-index:10">Новый биом · скоро</div>'
    # winter biome
    s+=island(250,690,120,66,"w")
    s+=f'<div class=abs style="left:230px;top:688px;width:160px;height:80px;z-index:9;background:radial-gradient(closest-side,rgba(255,255,255,.95),rgba(255,255,255,.7) 60%,rgba(255,255,255,0))"></div>'
    s+=f'<div class=lab style="left:310px;top:718px;background:#FFF4DF;color:#9A6A34;font-size:12px;padding:0 10px;z-index:10">❄ Зима · скоро</div>'
    return s
def page_B(): 
    return f'<!doctype html><meta charset=utf-8><style>{CSS}</style><body>{scene_B()}<div class=cap>B · КАРТА С ОСТРОВАМИ · КОНЦЕПТ</div>{top()}'+\
      f'''<div class=abs style="left:50%;transform:translateX(-50%);bottom:18px;z-index:60;height:44px;padding:0 18px;border-radius:22px;background:rgba(255,255,255,.96);box-shadow:0 4px 0 #EBCB98,0 10px 24px rgba(150,90,20,.25);display:flex;align-items:center;gap:8px;font-family:NB;font-size:13px;color:#9A6A34"><img src="{A}tab_hive.webp" style="width:22px;filter:brightness(0) saturate(100%) invert(48%) sepia(35%) saturate(700%) hue-rotate(350deg) brightness(95%)">Меню вкладок ▴</div>
<div class=abs style="left:0;right:0;bottom:70px;text-align:center;font-size:11px;color:#9A6A34;z-index:60;font-family:NR">Панель вкладок можно скрыть: карта — главный способ навигации</div></body>'''
open("B.html","w").write(page_B())

# ---------- C: tap transition (zoom into hive) ----------
def page_C():
    # scene zoomed ×2.1 around hive, others blurred
    zoom = f'<div class=abs style="inset:0;transform-origin:110px 214px;transform:translate(70px,100px) scale(1.9);filter:blur(1.2px)">{scene_A(labels=False)}</div>'
    veil = '<div class=abs style="inset:0;background:radial-gradient(circle at 36% 40%,rgba(255,244,223,0) 10%,rgba(255,244,223,.55) 55%,rgba(255,244,223,.9) 100%);z-index:30"></div>'
    ui = f'''<div class=abs style="left:20px;top:100px;z-index:40;opacity:.95"><div class=nb style="font-size:28px;color:#5A3410">Улей</div></div>
<div class=abs style="left:16px;top:98px;z-index:41"></div>
<div class=abs style="left:120px;right:20px;top:104px;height:40px;border-radius:20px;background:rgba(255,255,255,.85);box-shadow:inset 0 2px 4px rgba(150,90,20,.15);display:flex;padding:4px;z-index:40;font-family:NB;font-size:13px;opacity:.9"><div style="flex:1;border-radius:16px;background:linear-gradient(#FFC23D,#FF9A12);color:#fff;display:grid;place-items:center;box-shadow:0 3px 0 #C25F00">Соты</div><div style="flex:1;display:grid;place-items:center;color:#9A6A34">Сад •</div></div>
<div class=abs style="left:30px;right:30px;bottom:110px;height:58px;border-radius:29px;background:linear-gradient(#FFC23D,#FF9A12);box-shadow:0 5px 0 #C25F00;display:flex;align-items:center;justify-content:center;gap:10px;color:#fff;font-family:NB;font-size:20px;z-index:40;opacity:.78"><img src="{A}honey.webp" style="width:34px">Собрать 1 960</div>
<div class=abs style="left:16px;top:152px;z-index:45;height:34px;padding:0 14px 0 10px;border-radius:17px;background:#fff;box-shadow:0 3px 0 #E8C98F;display:flex;align-items:center;gap:6px;font-family:NB;font-size:13px;color:#5A3410">‹ Карта</div>'''
    # tap ripple
    tap = '''<div class=abs style="left:118px;top:262px;width:128px;height:128px;border-radius:50%;border:4px solid rgba(255,255,255,.95);box-shadow:0 0 0 8px rgba(255,190,40,.4),0 0 30px 10px rgba(255,200,60,.7);z-index:50"></div>
<div class=abs style="left:164px;top:308px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.85);z-index:51;box-shadow:0 0 14px rgba(255,170,0,.9)"></div>'''
    return f'<!doctype html><meta charset=utf-8><style>{CSS}</style><body>{zoom}{veil}{ui}{tap}<div class=cap>C · ТАП НА УЛЕЙ → ЗУМ (~0,4 С) → ЭКРАН ЛОКАЦИИ</div>{top()}{tabbar(0)}</body>'
open("C.html","w").write(page_C())
