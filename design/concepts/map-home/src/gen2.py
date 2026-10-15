# Концепт v2: ОДНА поляна — единая сцена. Дом, дерево с ульем, указатель, доска, лавка нарисованы в SVG/CSS; остальное — ассеты v1.5.
from lib import *
import math

def sh(x,y,w,h,o=.3):  # мягкая тень на земле (падает вправо-вниз)
    return f'<div class=abs style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:50%;background:radial-gradient(closest-side,rgba(40,70,10,{o}),rgba(40,70,10,0));z-index:4"></div>'
def glow(cx,cy,w,h):  # подсветка хотспота на земле
    return f'<div class=abs style="left:{cx-w/2}px;top:{cy-h/2}px;width:{w}px;height:{h}px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,244,140,.9),rgba(255,222,80,.45) 60%,rgba(255,210,60,0));z-index:3"></div>'
def svg(x,y,w,h,vb,body,z=6,extra=""):
    return f'<svg class=abs viewBox="{vb}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;z-index:{z};overflow:visible;{extra}">{body}</svg>'

HOUSE='''
<rect x="136" y="38" width="22" height="46" fill="#B5683A"/><polygon points="136,38 158,38 158,84 147,84" fill="#C98050"/><rect x="132" y="32" width="30" height="9" rx="2" fill="#8A4A24"/>
<polygon points="28,98 100,98 100,176 28,176" fill="#F8E4B5"/><polygon points="100,98 172,98 172,176 100,176" fill="#EBC981"/>
<g stroke="#D9B56E" stroke-width="1.2" opacity=".8"><path d="M28 118H172M28 138H172M28 158H172"/></g>
<polygon points="28,166 172,166 172,178 28,178" fill="#B98A55"/><polygon points="100,166 172,166 172,178 100,178" fill="#9E7040"/>
<polygon points="12,102 100,22 100,102" fill="#F5A031"/><polygon points="100,22 188,102 100,102" fill="#D9801A"/>
<polygon points="100,22 100,102 56,102" fill="#FFB84A" opacity=".55"/>
<polygon points="6,102 194,102 188,114 12,114" fill="#A8561A"/><polygon points="100,102 194,102 188,114 100,114" fill="#8F4614"/>
<g fill="none" stroke="#B86A12" stroke-width="1.2" opacity=".7"><path d="M30 84L100 40M20 94L100 56M170 84L100 40M180 94L100 56"/></g>
<polygon points="100,52 113,59 113,74 100,81 87,74 87,59" fill="#FFF0A6" stroke="#7A4519" stroke-width="4" stroke-linejoin="round"/>
<g fill="#FFFBD6" opacity=".9"><polygon points="100,56 110,62 100,68 90,62"/></g>
<path d="M76 178V138Q93 116 110 138V178Z" fill="#8A4E24" stroke="#5E3412" stroke-width="4" stroke-linejoin="round"/><path d="M93 118V178" stroke="#5E3412" stroke-width="2"/>
<circle cx="103" cy="152" r="2.6" fill="#FFD766"/>
<polygon points="70,178 116,178 120,186 66,186" fill="#CDB07A"/>
<polygon points="126,126 138,132 138,146 126,152 114,146 114,132" transform="translate(30 0)" fill="#FFF0A6" stroke="#7A4519" stroke-width="4" stroke-linejoin="round"/>
<g transform="translate(30 0)"><path d="M126 126V152M114 139H138" stroke="#7A4519" stroke-width="2"/></g>
<rect x="124" y="152" width="40" height="9" rx="2" fill="#8A4E24"/>
<g><circle cx="130" cy="150" r="5" fill="#FF6B8A"/><circle cx="142" cy="148" r="5" fill="#FFD23D"/><circle cx="154" cy="150" r="5" fill="#B58CFF"/><path d="M126 153h36" stroke="#4E8A1E" stroke-width="3"/></g>
<g><circle cx="52" cy="150" r="5" fill="#FF6B8A"/><path d="M52 155v14" stroke="#4E8A1E" stroke-width="3"/><circle cx="42" cy="162" r="4" fill="#FFD23D"/><circle cx="60" cy="164" r="4" fill="#B58CFF"/></g>
'''
def house(x,y,w):
    h=w*190/200
    return svg(x,y,w,h,"0 0 200 190",HOUSE,6,"filter:drop-shadow(0 6px 4px rgba(60,40,10,.3))")

TREE='''
<polygon points="36,200 42,96 62,96 62,200" fill="#8A5A2C"/><polygon points="62,96 84,96 90,200 62,200" fill="#6E4420"/>
<polygon points="18,200 38,182 42,200" fill="#6E4420"/><polygon points="90,200 98,190 112,200" fill="#5E3412"/>
<polygon points="2,70 20,22 52,4 60,52" fill="#8FD14F"/><polygon points="52,4 98,10 60,52" fill="#A5E060"/><polygon points="98,10 122,60 60,52" fill="#6FB233"/>
<polygon points="2,70 60,52 36,98" fill="#6FB233"/><polygon points="60,52 122,60 90,100" fill="#5C9E2A"/><polygon points="36,98 60,52 90,100" fill="#7CC03E"/>
<polygon points="20,22 52,4 40,38" fill="#B5EA70" opacity=".8"/>
<polygon points="18,108 60,92 102,108 96,116 24,116" fill="#B5683A"/><polygon points="60,92 102,108 96,116 60,116" fill="#8F4614"/>
'''
def tree_hive(x,y,w):
    h=w*200/120
    s=svg(x,y,w,h,"0 0 120 200",TREE,5,"filter:drop-shadow(0 6px 4px rgba(40,60,10,.3))")
    cw=w*.215   # ширина соты
    cx=x+w*.50-(cw+cw*1.5)/2
    s+=hive_cluster(cx,y+h*.50,cw)
    return s
def hive_cluster(x,y,w):
    h=w*173/200; step=w*.75; out=''
    for c,rows in enumerate([[0.5,1.5],[0,1,2],[0.5,1.5]]):
        for r in rows:
            out+=f'<img src="{A}comb.webp" style="position:absolute;z-index:7;left:{x+c*step}px;top:{y+r*h*.995}px;width:{w}px;filter:drop-shadow(0 0 7px rgba(255,238,130,.9)) drop-shadow(0 3px 2px rgba(120,60,0,.35))">'
    return out

def board(x,y,w=84):
    h=w*.88
    return (sh(x+4,y+h+30,w,14)+
      f'<div class="abs wood" style="left:{x+10}px;top:{y+h-6}px;width:8px;height:{36}px;z-index:5"></div><div class="abs wood" style="left:{x+w-18}px;top:{y+h-6}px;width:8px;height:36px;z-index:5"></div>'
      f'<div class="abs wood" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;z-index:7;border-radius:8px">'
      f'<div class="paper abs" style="left:5px;top:6px;width:{w*.4}px;height:{h*.42}px;transform:rotate(-4deg);padding:3px;font-size:7px;line-height:8px;color:#8A5A20">Собрать<br>мёд <span style="color:#62A82A">✓</span></div>'
      f'<div class="paper abs" style="left:{w*.5}px;top:4px;width:{w*.4}px;height:{h*.42}px;transform:rotate(3deg);padding:3px;font-size:7px;line-height:8px;color:#8A5A20">Пазл на<br>3★</div>'
      f'<div class="paper abs" style="left:{w*.25}px;top:{h*.5}px;width:{w*.46}px;height:{h*.38}px;transform:rotate(-2deg);padding:3px;font-size:7px;line-height:8px;color:#8A5A20">Полить<br>3 цветка</div>'
      '<div class="abs" style="left:1px;top:-3px;width:9px;height:9px;border-radius:50%;background:#E8412F"></div></div>')

def signpost(x,y,w=104):
    cx=x+w/2
    s=sh(x+6,y+w*1.02,w*.9,16)
    s+=f'<div class="abs wood" style="left:{cx-5}px;top:{y+w*.7}px;width:10px;height:{w*.42}px;z-index:5"></div>'
    s+=f'<div class="abs wood" style="left:{x}px;top:{y}px;width:{w}px;height:{w*.78}px;z-index:7;background:linear-gradient(#FFE9B8,#FFD27A)"></div>'
    for n,dx,dy in [("cell0",0,0),("cell1",1,-.5),("cell2",1,.5),("cell3",0,1),("cell1",-1,.5),("cell2",-1,-.5),("cell0",0,-1)]:
        s+=f'<img src="{A}{n}.webp" style="position:absolute;z-index:8;left:{cx-16+dx*24}px;top:{y+w*.39-14+dy*28}px;width:32px">'
    return s

def ground(flip=False):
    t="transform:scaleX(-1);" if flip else ""
    return (f'<div class=abs style="inset:0;background:url({A}garden_bg.webp) center top/cover;{t}"></div>'
      '<div class=abs style="inset:0;background:linear-gradient(120deg,rgba(255,244,170,.38),rgba(255,244,170,0) 55%)"></div>'
      '<div class=abs style="inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(255,255,255,0) 55%,rgba(30,60,10,.18) 100%)"></div>')
def path(d,wd=34):
    return (f'<svg class=abs style="left:0;top:0;z-index:2" width=390 height=844 fill=none>'
      f'<path d="{d}" stroke="#C9AA6A" stroke-width="{wd+6}" stroke-linecap="round" stroke-linejoin="round" opacity=".6" transform="translate(0 3)"/>'
      f'<path d="{d}" stroke="#EBD79F" stroke-width="{wd}" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>'
      f'<path d="{d}" stroke="#F6E8BA" stroke-width="{wd*.45}" stroke-linecap="round" stroke-linejoin="round" opacity=".6" stroke-dasharray="2 14"/></svg>')
def flowers(pts):
    return "".join(f'<img src="{A}{n}.webp" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;z-index:4;filter:drop-shadow(0 2px 1px rgba(40,70,10,.3))">' for n,x,y,w in pts)

def scene1(labels=True):
    s=ground()+path("M195 292 C 175 340, 215 380, 200 430 C 185 490, 200 540, 195 610")
    s+=flowers([("clover_bloom",160,330,22),("cornflower_bloom",226,470,22),("lavender_bloom",150,520,26),("sunflower_bloom",232,545,24),("sprout",166,430,20)])
    # улей на дереве (слева сзади)
    s+=glow(60,260,150,70)+sh(24,282,100,18)+tree_hive(8,108,104)
    if labels: s+=label("Улей","tab_hive",58,308)+badge("Собрать 1 960",12,336,"o")
    # домик (центр сзади) = Пчёлы
    s+=glow(195,282,230,70)+sh(100,276,210,22)+house(98,112,200)
    s+=bee("zhuzha_side",236,196,40,False,-6)+bee("boris_side",80,120,34,True,4)+bee("lavanda_q3",300,262,34)
    if labels: s+=label("Домик пчёл","tab_bee",196,300)+badge("13",264,286,"g")
    # доска заданий (справа сзади)
    s+=glow(338,228,110,60)+board(294,150,80)
    if labels: s+=label("Задания","tab_tasks",334,252)+badge("2",360,138)
    # лавка и сундуки (слева в центре)
    s+=glow(80,448,160,70)+sh(16,452,150,22)
    s+=img("shop.webp",14,368,84,"z-index:6")+img("chest.webp",80,404,64,"z-index:7")+img("box_wax.webp",54,430,40,"z-index:8")+img("box_wood.webp",124,430,34,"z-index:8")+img("deco_barrel.webp",6,440,30,"z-index:8")
    if labels: s+=label("Сюрпризы","tab_box",84,484)+badge("1",140,398)
    # указатель/доска-пазл (справа в центре)
    s+=glow(318,404,140,70)+signpost(268,316,104)
    if labels: s+=label("Играть","tab_puzzle",320,440)+badge("★ 1/3",332,306,"g")
    # сад (спереди)
    s+=glow(195,654,380,80)+sh(6,672,378,24)
    s+=bed(8,622,122,"sunflower_bloom")+bed(134,622,122,"lavender_bloom",True)+bed(260,622,122,"cornflower_bloom")
    s+=badge("✓",100,552,"g")+badge("✓",218,552,"g")+badge("💧",350,566,"o")
    s+=img("deco_mushroom.webp",150,574,34,"z-index:9")+img("deco_pinwheel.webp",236,520,26,"z-index:6")+img("deco_lanterns.webp",230,330,34,"z-index:6")
    if labels: s+=label("Сад","tab_hive",195,704)+badge("2 готовы",232,698,"g")
    return s

def scene2(labels=True):
    s=ground(True)+path("M96 296 C 110 340, 250 340, 240 400 C 232 450, 110 450, 120 520 C 126 560, 200 570, 215 600")
    s+=flowers([("clover_bloom",300,330,22),("cornflower_bloom",150,348,22),("lavender_bloom",260,470,26),("sunflower_bloom",140,470,24),("sprout",330,560,22)])
    # домик слева сверху
    s+=glow(100,292,230,70)+sh(6,284,210,22)+house(0,114,210)
    s+=bee("zhuzha_side",160,190,40,False,-6)+bee("lavanda_q3",150,330,32)+bee("solnyshko_side",208,244,32,False,4)
    if labels: s+=label("Домик пчёл","tab_bee",100,306)+badge("13",160,296,"g")
    # дерево-улей справа сверху
    s+=glow(318,262,150,70)+sh(280,284,100,18)+tree_hive(270,110,108)
    if labels: s+=label("Улей","tab_hive",326,294)+badge("Собрать 1 960",268,322,"o")
    # доска заданий у дороги (слева)
    s+=glow(60,420,110,60)+board(20,344,84)
    if labels: s+=label("Задания","tab_tasks",64,452)+badge("2",96,334)
    # указатель-пазл справа в центре
    s+=glow(312,466,140,70)+signpost(262,376,104)
    if labels: s+=label("Играть","tab_puzzle",314,502)+badge("★ 1/3",342,366,"g")
    # лавка и сундуки (справа внизу-центр)
    s+=glow(316,600,150,70)+sh(250,606,140,20)
    s+=img("shop.webp",254,532,84,"z-index:6")+img("chest.webp",316,566,60,"z-index:7")+img("box_gold.webp",276,590,34,"z-index:8")
    if labels: s+=label("Сюрпризы","tab_box",316,636)+badge("1",366,556)
    # сад слева внизу: 2×2 грядки
    s+=glow(100,640,210,150)+sh(6,690,200,20)
    s+=bed(6,540,100,"sunflower_bloom")+bed(104,540,100,"goldsun_bloom" if False else "cornflower_bloom",True)+bed(6,628,100,"lavender_bloom")+bed(104,628,100,"mint_bloom")
    s+=badge("✓",70,490,"g")+badge("✓",42,578,"g")+badge("💧",168,594,"o")
    s+=img("deco_bench.webp",214,668,54,"z-index:6")+img("deco_mushroom.webp",300,690,30,"z-index:6")+img("deco_fountain.webp",190,500,60,"z-index:6")
    if labels: s+=label("Сад","tab_hive",106,716)+badge("2 готовы",142,710,"g")
    return s

def page(body,cap,cur=0):
    return f'<!doctype html><meta charset=utf-8><style>{CSS}</style><body>{body}<div class=cap>{cap}</div>{top()}{tabbar(cur)}</body>'
open("M1.html","w").write(page(scene1(),"1 · ПОЛЯНА · ДОМ ПО ЦЕНТРУ · КОНЦЕПТ"))
open("M2.html","w").write(page(scene2(),"2 · ПОЛЯНА · ТРОПА К САДУ · КОНЦЕПТ"))
def tap():
    zoom=f'<div class=abs style="inset:0;transform-origin:60px 230px;transform:translate(120px,80px) scale(2.3);filter:blur(1.4px)">{scene1(False)}</div>'
    veil='<div class=abs style="inset:0;background:radial-gradient(circle at 48% 40%,rgba(255,244,223,0) 8%,rgba(255,244,223,.6) 55%,rgba(255,244,223,.92) 100%);z-index:30"></div>'
    ui=f'''<div class=abs style="left:20px;top:100px;z-index:40"><div class=nb style="font-size:28px">Улей</div></div>
<div class=abs style="left:120px;right:20px;top:104px;height:40px;border-radius:20px;background:rgba(255,255,255,.85);box-shadow:inset 0 2px 4px rgba(150,90,20,.15);display:flex;padding:4px;z-index:40;font-family:NB;font-size:13px"><div style="flex:1;border-radius:16px;background:linear-gradient(#FFC23D,#FF9A12);color:#fff;display:grid;place-items:center;box-shadow:0 3px 0 #C25F00">Соты</div><div style="flex:1;display:grid;place-items:center;color:#9A6A34">Сад •</div></div>
<div class=abs style="left:30px;right:30px;bottom:110px;height:58px;border-radius:29px;background:linear-gradient(#FFC23D,#FF9A12);box-shadow:0 5px 0 #C25F00;display:flex;align-items:center;justify-content:center;gap:10px;color:#fff;font-family:NB;font-size:20px;z-index:40;opacity:.8"><img src="{A}honey.webp" style="width:34px">Собрать 1 960</div>
<div class=abs style="left:16px;top:152px;z-index:45;height:34px;padding:0 14px 0 10px;border-radius:17px;background:#fff;box-shadow:0 3px 0 #E8C98F;display:flex;align-items:center;font-family:NB;font-size:13px">‹ Поляна</div>
<div class=abs style="left:118px;top:268px;width:128px;height:128px;border-radius:50%;border:4px solid rgba(255,255,255,.95);box-shadow:0 0 0 8px rgba(255,190,40,.4),0 0 30px 10px rgba(255,200,60,.7);z-index:50"></div>
<div class=abs style="left:164px;top:314px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.85);z-index:51;box-shadow:0 0 14px rgba(255,170,0,.9)"></div>'''
    return page(zoom+veil+ui,"3 · ТАП НА УЛЕЙ → ЗУМ (~0,4 С) → ЭКРАН ЛОКАЦИИ")
open("M3.html","w").write(tap())
