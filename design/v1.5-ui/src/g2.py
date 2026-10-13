import random
A="a/"
def bee(n,w,x,y,rot=0,flip=False,z=5,shadow=True):
    t=f"rotate({rot}deg)"+(" scaleX(-1)" if flip else "")
    sh=f'<div style="position:absolute;left:{x+w*0.2}px;top:{y+w*1.02}px;width:{w*0.6}px;height:{w*0.12}px;border-radius:50%;background:rgba(120,60,0,.18);filter:blur(4px);z-index:{z-1}"></div>' if shadow else ""
    return sh+f'<img src="{A}bee_{n}.png" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;transform:{t};z-index:{z};filter:drop-shadow(0 6px 8px rgba(120,60,0,.25))">'
CSS=f"""@font-face{{font-family:N;src:url({A}Nunito-ExtraBold.ttf)}}@font-face{{font-family:NB;src:url({A}Nunito-Black.ttf)}}@font-face{{font-family:NBo;src:url({A}Nunito-Bold.ttf)}}
*{{box-sizing:border-box;margin:0;padding:0}}body{{width:390px;height:844px;overflow:hidden;position:relative;font-family:N;color:#5A3410;-webkit-font-smoothing:antialiased}}
.abs{{position:absolute}}.nb{{font-family:NB}}
.pill{{display:flex;align-items:center;gap:6px;height:40px;padding:0 14px 0 6px;border-radius:20px;background:linear-gradient(#fff,#FFF6E6);box-shadow:0 3px 0 #EBCB98,0 8px 16px rgba(160,90,10,.12);font-family:NB;font-size:17px}}
.pill img{{width:30px;height:30px;object-fit:contain}}
.rbtn{{width:44px;height:44px;border-radius:22px;background:linear-gradient(#fff,#FFF3DE);box-shadow:0 3px 0 #EBCB98,0 8px 16px rgba(160,90,10,.12);display:grid;place-items:center}}
.cta{{position:absolute;left:24px;right:24px;height:74px;border-radius:30px;background:linear-gradient(180deg,#FFC23D 0%,#FF9A12 55%,#F58200 100%);box-shadow:inset 0 3px 0 rgba(255,255,255,.55),inset 0 -5px 0 rgba(190,90,0,.35),0 7px 0 #C25F00,0 16px 26px rgba(200,100,0,.35);color:#fff;font-family:NB;font-size:28px;display:flex;align-items:center;justify-content:center;gap:10px;text-shadow:0 2px 0 rgba(170,70,0,.45)}}
.cta small{{display:block;font-family:N;font-size:13px;opacity:.95;text-shadow:none}}
.card{{position:absolute;border-radius:28px;background:linear-gradient(#FFFFFF,#FFF8EC);box-shadow:0 4px 0 #F0D7AE,0 14px 30px rgba(170,100,20,.14)}}
.badge{{position:absolute;min-width:22px;height:22px;border-radius:11px;background:linear-gradient(#FF6B5A,#E8412E);color:#fff;font-family:NB;font-size:12px;display:grid;place-items:center;padding:0 6px;box-shadow:0 2px 0 #B42B1C,0 0 0 3px #fff}}
.muted{{color:#A57A4A;font-family:NBo;font-size:14px}}
.hexwrap img{{position:absolute;filter:drop-shadow(0 5px 0 rgba(170,90,0,.35)) drop-shadow(0 10px 12px rgba(170,90,0,.18))}}
.label{{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:99;background:rgba(90,52,16,.82);color:#FFE7B8;font-family:NB;font-size:11px;letter-spacing:.5px;padding:4px 12px;border-radius:12px;white-space:nowrap}}
"""
GEAR='<svg width="24" height="24" viewBox="0 0 24 24"><path fill="#B07A3A" d="M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>'
def page(body,label,bg): return f'<html><head><meta charset=utf8><style>{CSS}</style></head><body style="background:{bg}"><div class=label>{label}</div>{body}</body></html>'
def hive(cx,cy,s,cells,glow=None):
    # axial hex layout
    w=s;h=s*0.865;o=""
    for q,r,kind in cells:
        x=cx+q*w*0.75-w/2; y=cy+r*h+(abs(q)%2)*h/2-h/2
        img="comb.png" if kind!="e" else "comb_empty.png"
        o+=f'<img src="{A}{img}" style="left:{x}px;top:{y}px;width:{w}px;{"opacity:.55" if kind=="e" else ""}">'
    return f'<div class=hexwrap>{o}</div>'
CELLS=[(0,0,"f"),(0,-1,"f"),(1,-1,"f"),(1,0,"f"),(0,1,"f"),(-1,0,"f"),(-1,-1,"f")]
def board(x0,y0,s,cols,rows,seed=3):
    random.seed(seed);o=""
    for c in range(cols):
        for r in range(rows):
            if c%2 and r==rows-1: continue
            k=random.choice(["cell0","cell1","cell2","cell3","cell4"]) if random.random()>.05 else "cell_wild"
            o+=f'<img src="{A}{k}.png" style="position:absolute;left:{x0+c*s*0.76}px;top:{y0+r*s*0.88+(c%2)*s*0.44}px;width:{s}px;filter:drop-shadow(0 3px 0 rgba(0,0,0,.12))">'
    return o
S={}
# ===== A: Медовая поляна (scene home) =====
sky="linear-gradient(180deg,#FFE7A8 0%,#FFF1C9 38%,#DFF0B0 62%,#B7DE86 100%)"
hill='<div class=abs style="left:-80px;right:-80px;top:470px;height:500px;border-radius:50% 50% 0 0;background:radial-gradient(ellipse at 50% 0%,#C9EB97,#9FD06A 70%);box-shadow:inset 0 10px 0 rgba(255,255,255,.35)"></div><div class=abs style="left:-60px;top:430px;width:260px;height:160px;border-radius:50%;background:#D7EFA8;opacity:.8"></div><div class=abs style="right:-70px;top:420px;width:280px;height:170px;border-radius:50%;background:#CFEA9C;opacity:.8"></div>'
sun='<div class=abs style="right:40px;top:90px;width:110px;height:110px;border-radius:50%;background:radial-gradient(#FFF8D8,#FFE38A 60%,rgba(255,227,138,0) 72%)"></div>'
flowers=f'<img class=abs src="{A}sunflower_bloom.webp" style="left:6px;top:560px;width:86px;filter:drop-shadow(0 6px 6px rgba(60,90,0,.25))"><img class=abs src="{A}lavender_bloom.webp" style="right:10px;top:575px;width:70px"><img class=abs src="{A}clover_bloom.webp" style="left:300px;top:640px;width:56px"><img class=abs src="{A}fountain.png" style="left:18px;top:665px;width:70px;opacity:.0">'
topA=f'<div class=abs style="left:16px;top:50px;display:flex;gap:8px"><div class=pill><img src="{A}honey.png">1 240</div></div><div class="rbtn abs" style="right:16px;top:48px">{GEAR}</div>'
def circ(icon,t,x,badge=""):
    b=f'<div class=badge style="right:-2px;top:-4px">{badge}</div>' if badge else ""
    return f'<div class=abs style="left:{x}px;top:744px;width:84px;text-align:center"><div style="position:relative;width:64px;height:64px;margin:0 auto;border-radius:22px;background:linear-gradient(#FFFFFF,#FFF0D6);box-shadow:0 4px 0 #E5C38C,0 10px 18px rgba(80,90,10,.25);display:grid;place-items:center"><img src="{A}{icon}" style="width:46px;height:46px;object-fit:contain">{b}</div><div class=nb style="font-size:13px;margin-top:6px;color:#4E5A1A;text-shadow:0 1px 0 rgba(255,255,255,.7)">{t}</div></div>'
S["A1"]=page(hill+sun+topA+
  f'<div class=abs style="left:0;right:0;top:108px;text-align:center"><div class=nb style="font-size:30px;color:#7A4A12;text-shadow:0 2px 0 #fff">Улей Жужи</div><div class=muted>ур. 5 · +316 мёда в час</div></div>'+
  hive(140,350,110,CELLS)+bee("zhuzha",96,20,200,-8)+bee("boris",80,280,420,6,True)+bee("pushinka",64,40,420,-4)+flowers+
  f'<div class=abs style="left:110px;top:196px;z-index:20;background:#fff;border-radius:16px;padding:6px 12px;box-shadow:0 4px 10px rgba(0,0,0,.12);font-family:NB;font-size:14px;color:#E07B00">Мёд готов! ✨</div>'+
  '<div class="cta" style="top:640px;font-size:30px"><div style="text-align:center;line-height:30px">Играть<small>головоломка дня</small></div></div>'+
  circ("bee_solnyshko.png","Пчёлы",20)+circ("sunflower_bloom.webp","Сад",110,"2")+circ("box_wood.png","Сюрприз",196,"1")+circ("milk.png","Задания",282,"1/3"),
  "A · МЕДОВАЯ ПОЛЯНА — ДОМ",sky)
S["A2"]=page(hill+topA+
  f'<div class="card" style="left:20px;right:20px;top:120px;height:470px;overflow:hidden"><div class=abs style="left:0;right:0;top:0;height:160px;background:linear-gradient(135deg,#FFD66B,#FFB02E);"></div>'+bee("zhuzha",120,135,30,-6)+
  f'<div class=abs style="left:0;right:0;top:180px;text-align:center"><div class=nb style="font-size:28px">Головоломка дня</div><div class=muted style="margin-top:4px">Собирай цепочки из 3+ сот одного цвета</div></div>'+
  f'<div class=abs style="left:28px;right:28px;top:262px;display:flex;justify-content:space-between">'+"".join(f'<div style="width:96px;height:110px;border-radius:20px;background:#FFF4DF;box-shadow:inset 0 -3px 0 #F0D7AE;text-align:center;padding-top:10px"><div style="font-size:36px;line-height:44px;color:{c}">★</div><div class=nb style="font-size:13px">{t}</div><div class=muted style="font-size:11px">{d}</div></div>' for c,t,d in [("#FFB800","1 звезда","+200 мёда"),("#FFB800","2 звезды","+1 молочко"),("#FFB800","3 звезды","Восковая сота")])+'</div>'+
  f'<div class=abs style="left:0;right:0;top:400px;text-align:center"><span style="display:inline-flex;align-items:center;gap:8px;background:#FFF0F4;color:#D2416B;font-family:NB;font-size:14px;padding:8px 14px;border-radius:14px"><img src="{A}cell1.png" width=24>Цвет дня — розовый ×1,5</span></div></div>'+
  '<div class="cta" style="top:620px">Начать</div>'+
  f'<div class=abs style="left:24px;right:24px;top:722px;display:flex;gap:12px">'+"".join(f'<div style="flex:1;height:64px;border-radius:22px;background:rgba(255,255,255,.85);box-shadow:0 4px 0 #A9CF77;display:flex;align-items:center;gap:10px;padding:0 12px"><img src="{A}{i}" style="width:40px;height:40px;object-fit:contain"><div><div class=nb style="font-size:15px">{t}</div><div class=muted style="font-size:12px">{d}</div></div></div>' for i,t,d in [("cell_wild.png","Бесконечный","рекорд 4 120"),("clover_bloom.webp","Луг","мини-игры")])+'</div>',
  "A · МЕДОВАЯ ПОЛЯНА — ИГРАТЬ",sky)
S["A3"]=page(f'<div class=abs style="inset:0;background:radial-gradient(circle at 50% 38%,#FFF6C8 0,#FFD873 30%,#FFB23A 75%)"></div>'+
  ''.join(f'<div class=abs style="left:195px;top:330px;width:900px;height:60px;transform-origin:0 50%;transform:rotate({a}deg);background:linear-gradient(90deg,rgba(255,255,255,.45),rgba(255,255,255,0) 60%);clip-path:polygon(0 50%,100% 0,100% 100%)"></div>' for a in range(0,360,30))+
  topA+f'<div class=abs style="left:0;right:0;top:120px;text-align:center;color:#fff;text-shadow:0 3px 0 #D06A00"><div class=nb style="font-size:34px">Сюрприз готов!</div><div style="font-family:NB;font-size:16px;opacity:.95">За 3 задания сегодня</div></div>'+
  f'<img class=abs src="{A}box_wood.png" style="left:85px;top:220px;width:220px;filter:drop-shadow(0 18px 18px rgba(150,60,0,.4))">'+
  f'<div class="card" style="left:30px;right:30px;top:470px;height:120px;padding:16px 18px"><div class=nb style="font-size:15px;margin-bottom:10px">Может выпасть</div><div style="display:flex;justify-content:space-between">'+"".join(f'<div style="width:66px;height:62px;border-radius:16px;background:#FFF4DF;display:grid;place-items:center"><img src="{A}{i}" style="width:48px;height:48px;object-fit:contain"></div>' for i in ["bee_lavanda.png","milk.png","pinwheel.png","nectar.png"])+'</div></div>'+
  '<div class="cta" style="top:624px">Открыть</div>'+
  f'<div class=abs style="left:0;right:0;top:726px;text-align:center"><div style="display:inline-flex;gap:10px">'+"".join(f'<div style="width:56px;height:56px;border-radius:18px;background:rgba(255,255,255,.5);display:grid;place-items:center;filter:grayscale(.2);opacity:.85"><img src="{A}{b}.png" style="width:42px"></div>' for b in ["box_wax","box_gold","box_royal"])+'</div><div style="color:#fff;font-family:NB;font-size:13px;margin-top:8px;text-shadow:0 1px 0 #C46000">Следующие: восковая · золотая · королевская</div></div>',
  "A · МЕДОВАЯ ПОЛЯНА — СЮРПРИЗ","#FFB23A")
# ===== B: Дневник Жужи (mascot guide, cards) =====
cream="linear-gradient(180deg,#FFF6E3,#FFEFD2)"
topB=f'<div class=abs style="left:16px;top:50px" ><div class=pill><img src="{A}honey.png">1 240</div></div><div class=abs style="left:138px;top:50px"><div class=pill><img src="{A}milk.png">7</div></div><div class="rbtn abs" style="right:16px;top:48px">{GEAR}</div>'
def task(i,icon,t,d,state,y):
    st={"done":("#7DBE3E","✓","opacity:.75"),"now":("#FF9A12",str(i),""),"next":("#E3C79A",str(i),"")}[state]
    border="box-shadow:0 0 0 3px #FFB13B,0 4px 0 #F0D7AE,0 14px 30px rgba(255,150,20,.25);" if state=="now" else ""
    right='<div class=nb style="color:#fff;background:linear-gradient(#FFB43A,#F58A00);box-shadow:0 3px 0 #C25F00;border-radius:16px;padding:8px 14px;font-size:15px">Играть</div>' if state=="now" else (f'<div class=nb style="color:#7DBE3E;font-size:14px">Готово</div>' if state=="done" else "")
    return f'<div class=card style="left:20px;right:20px;top:{y}px;height:82px;display:flex;align-items:center;gap:12px;padding:0 14px;{border}{st[2]}"><div style="width:58px;height:58px;border-radius:18px;background:#FFF2DA;display:grid;place-items:center;position:relative"><img src="{A}{icon}" style="width:46px;height:46px;object-fit:contain"><div class=nb style="position:absolute;left:-6px;top:-6px;width:24px;height:24px;border-radius:12px;background:{st[0]};color:#fff;font-size:13px;display:grid;place-items:center;box-shadow:0 0 0 3px #fff">{st[1]}</div></div><div style="flex:1"><div class=nb style="font-size:18px">{t}</div><div class=muted style="font-size:13px">{d}</div></div>{right}</div>'
def tabbar(on):
    it=[("comb.png","Улей"),("cell_wild.png","Игры"),("bee_zhuzha.png","Пчёлы")]
    o='<div class=abs style="left:16px;right:16px;bottom:20px;height:76px;border-radius:30px;background:linear-gradient(#fff,#FFF7E8);box-shadow:0 4px 0 #EBCB98,0 14px 30px rgba(160,90,10,.18);display:flex;justify-content:space-around;align-items:center">'
    for i,(ic,t) in enumerate(it):
        if i==on: o+=f'<div style="display:flex;align-items:center;gap:8px;height:54px;padding:0 18px 0 10px;border-radius:24px;background:linear-gradient(#FFC23D,#FF9A12);box-shadow:inset 0 2px 0 rgba(255,255,255,.5),0 3px 0 #C25F00;color:#fff;font-family:NB;font-size:16px"><img src="{A}{ic}" style="width:36px;height:36px;object-fit:contain">{t}</div>'
        else: o+=f'<div style="text-align:center;font-family:NB;font-size:12px;color:#B08454"><img src="{A}{ic}" style="width:34px;height:34px;object-fit:contain;display:block;margin:0 auto 2px;filter:saturate(.7)">{t}</div>'
    return o+'</div>'
S["B1"]=page(topB+
  f'<div class=card style="left:20px;right:20px;top:106px;height:200px;overflow:visible;background:linear-gradient(135deg,#FFE08A,#FFC04D)">'+bee("zhuzha",150,190,20,8,True,shadow=False)+f'<div class=abs style="left:20px;top:22px;width:190px"><div class=nb style="font-size:26px;line-height:30px;color:#6A3A08">Доброе утро!</div><div style="font-family:NB;font-size:15px;color:#8A5410;margin-top:6px">Сегодня всего 3 дела — минут на пять</div><div style="margin-top:14px;height:14px;border-radius:7px;background:rgba(255,255,255,.6);overflow:hidden"><div style="width:33%;height:100%;background:linear-gradient(#8FD14F,#62A82A);border-radius:7px"></div></div><div style="font-family:NB;font-size:12px;color:#8A5410;margin-top:4px">1 из 3 · награда: деревянная сота</div></div></div>'+
  task(1,"honey.png","Собрать мёд","+1 960 мёда","done",326)+task(2,"cell1.png","Головоломка дня","3★ — восковая сота","now",420)+task(3,"can.png","Полить сад","2 цветка ждут","next",514)+
  f'<div class=abs style="left:20px;right:20px;top:616px;display:flex;align-items:center;gap:10px;padding:0 6px"><img src="{A}box_wood.png" style="width:56px"><div class=muted style="flex:1;font-size:13px">Сделай все 3 — и откроешь сюрприз. Дальше играй сколько хочешь.</div></div>'+tabbar(0),
  "B · ДНЕВНИК ЖУЖИ — СЕГОДНЯ",cream)
S["B2"]=page(topB+
  f'<div class=abs style="left:20px;top:106px"><div class=nb style="font-size:30px">Игры</div></div>'+
  f'<div class=card style="left:20px;right:20px;top:156px;height:300px;overflow:hidden;background:linear-gradient(160deg,#FF9DB8,#FF6F93)">{board(150,18,58,4,4,7)}<div class=abs style="left:20px;top:24px;color:#fff;width:130px"><div style="font-family:NB;font-size:12px;letter-spacing:1px;opacity:.9">СЕГОДНЯ</div><div class=nb style="font-size:26px;line-height:28px;text-shadow:0 2px 0 rgba(160,30,70,.35)">Голово&shy;ломка дня</div><div style="font-family:NB;font-size:14px;margin-top:8px">Цвет дня ×1,5</div></div><div class=abs style="left:20px;bottom:20px;right:20px;height:60px;border-radius:24px;background:#fff;color:#E2456E;font-family:NB;font-size:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 5px 0 #C93A62">Играть</div></div>'+
  "".join(f'<div class=card style="left:{x}px;width:169px;top:476px;height:170px;padding:16px;text-align:left"><img src="{A}{i}" style="width:70px;height:70px;object-fit:contain"><div class=nb style="font-size:18px;margin-top:8px">{t}</div><div class=muted style="font-size:12px">{d}</div></div>' for x,i,t,d in [(20,"cell_wild.png","Бесконечный","Рекорд 4 120"),(201,"clover_bloom.webp","Луг","Мини-игры · скоро")])+tabbar(1),
  "B · ДНЕВНИК ЖУЖИ — ИГРЫ",cream)
S["B3"]=page(topB+f'<div class=abs style="left:20px;top:106px"><div class=nb style="font-size:30px">Пчёлы</div><div class=muted>12 из 15 · Сад и Сюрпризы — здесь же</div></div>'+
  f'<div class=abs style="left:20px;top:170px;display:flex;gap:8px">'+"".join(f'<div style="height:40px;padding:0 16px;border-radius:20px;display:flex;align-items:center;gap:6px;font-family:NB;font-size:15px;{s}">{t}</div>' for t,s in [("Пчёлы","background:linear-gradient(#FFC23D,#FF9A12);color:#fff;box-shadow:0 3px 0 #C25F00"),("Сад •","background:#fff;box-shadow:0 3px 0 #EBCB98"),("Сюрпризы •","background:#fff;box-shadow:0 3px 0 #EBCB98")])+'</div>'+
  "".join(f'<div class=card style="left:{20+(i%3)*121}px;top:{230+(i//3)*150}px;width:108px;height:136px;text-align:center;padding-top:10px;{"" if i<8 else "filter:grayscale(1) brightness(1.1);opacity:.55"}"><img src="{A}bee_{n}.png" style="width:84px;height:84px;object-fit:contain"><div class=nb style="font-size:14px">{t}</div><div class=muted style="font-size:11px">{"ур. "+str(l) if i<8 else "?"}</div></div>' for i,(n,t,l) in enumerate([("zhuzha","Жужа",5),("boris","Борис",3),("pushinka","Пушинка",4),("solnyshko","Солнышко",2),("lavanda","Лаванда",2),("klevera","Клеверина",1),("vasilek","Василёк",1),("myatka","Мятка",1),("margo","Марго",0)]))+tabbar(2),
  "B · ДНЕВНИК ЖУЖИ — КОЛЛЕКЦИЯ",cream)
# ===== C: Живой улей (hive is the menu) =====
dusk="radial-gradient(circle at 50% 40%,#FFF3D2 0%,#FFE2A0 45%,#FFC86A 100%)"
topC=f'<div class=abs style="left:16px;top:50px"><div class=pill><img src="{A}honey.png">1 240</div></div><div class="rbtn abs" style="right:16px;top:48px">{GEAR}</div>'
def portal(cx,cy,s,icon,t,badge="",main=False):
    b=f'<div class=badge style="right:{s*0.08}px;top:{s*0.05}px">{badge}</div>' if badge else ""
    grad="linear-gradient(#FFD25A,#FF9A12)" if main else "linear-gradient(#FFFDF6,#FFEBC6)"
    sh="0 6px 0 #C25F00" if main else "0 6px 0 #DDB77A"
    return f'<div class=abs style="left:{cx-s/2+20}px;top:{cy-s*0.433}px;width:{s}px;height:{s*0.866}px;filter:drop-shadow({sh}) drop-shadow(0 14px 16px rgba(170,90,0,.25))"><div style="width:100%;height:100%;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);background:{grad};display:flex;flex-direction:column;align-items:center;justify-content:center"><img src="{A}{icon}" style="width:{s*0.46}px;height:{s*0.4}px;object-fit:contain"><div class=nb style="font-size:{15 if not main else 20}px;color:{"#fff" if main else "#6A3A08"};{"text-shadow:0 2px 0 #C25F00" if main else ""}">{t}</div></div>{b}</div>'
S["C1"]=page(topC+
  f'<div class=abs style="left:0;right:0;top:110px;text-align:center"><div class=nb style="font-size:28px;color:#7A4A12">Улей · ур. 5</div><div class=muted>каждая сота — дверь</div></div>'+
  portal(195,400,150,"cell1.png","Играть","",True)+portal(195,264,124,"honey.png","Мёд","!")+portal(88,332,124,"sunflower_bloom.webp","Сад","2")+portal(302,332,124,"box_wood.png","Сюрприз","1")+portal(88,468,124,"bee_lavanda.png","Пчёлы")+portal(302,468,124,"milk.png","Задания","1/3")+portal(195,536,124,"clover_bloom.webp","Луг")+
  bee("zhuzha",80,20,200,-10,shadow=False)+bee("boris",70,300,560,8,True,shadow=False)+
  f'<div class=card style="left:24px;right:24px;top:660px;height:96px;display:flex;align-items:center;gap:14px;padding:0 18px"><img src="{A}honey.png" style="width:56px"><div style="flex:1"><div class=nb style="font-size:17px">Мёд в улье · 1 960</div><div style="height:12px;border-radius:6px;background:#F7E5C3;margin-top:8px;overflow:hidden"><div style="width:88%;height:100%;background:linear-gradient(#FFC23D,#F58A00)"></div></div><div class=muted style="font-size:12px;margin-top:4px">тапни соту «Мёд», чтобы собрать</div></div></div>',
  "C · ЖИВОЙ УЛЕЙ — ДОМ",dusk)
S["C2"]=page(f'<div class=abs style="inset:0;background:rgba(90,50,10,.0)"></div>'+topC+
  portal(195,240,240,"cell1.png","Пазл дня","",True)+bee("zhuzha",90,40,150,-10,shadow=False)+
  f'<div class=card style="left:24px;right:24px;top:400px;height:170px;padding:18px"><div style="display:flex;justify-content:center;gap:6px;font-size:40px;color:#FFC020;text-shadow:0 3px 0 #D88A00">★<span style="color:#F1DDB8;text-shadow:0 3px 0 #DDC293">★</span><span style="color:#F1DDB8;text-shadow:0 3px 0 #DDC293">★</span></div><div class=nb style="text-align:center;font-size:18px;margin-top:6px">Лучший результат: 1 звезда</div><div class=muted style="text-align:center;margin-top:4px">3★ — восковая сота · цвет дня розовый ×1,5</div></div>'+
  '<div class="cta" style="top:600px">Играть</div>'+
  f'<div class=abs style="left:0;right:0;top:704px;display:flex;justify-content:center;gap:12px">'+"".join(f'<div style="height:52px;padding:0 18px 0 8px;border-radius:26px;background:rgba(255,255,255,.85);box-shadow:0 4px 0 #E5BF82;display:flex;align-items:center;gap:8px;font-family:NB;font-size:15px"><img src="{A}{i}" style="width:38px;height:38px;object-fit:contain">{t}</div>' for i,t in [("cell_wild.png","Бесконечный"),("clover_bloom.webp","Луг")])+'</div>',
  "C · ЖИВОЙ УЛЕЙ — СОТА «ИГРАТЬ»",dusk)
pots="".join(f'<div class=abs style="left:{30+(i%3)*112}px;top:{300+(i//3)*170}px;width:104px;text-align:center"><div style="position:relative;height:110px"><img src="{A}{f}" style="position:absolute;left:12px;bottom:18px;width:80px;height:92px;object-fit:contain;z-index:2"><div style="position:absolute;left:4px;right:4px;bottom:0;height:34px;border-radius:12px 12px 18px 18px;background:linear-gradient(#B9773E,#8C5023);box-shadow:inset 0 5px 0 #6B3A16,0 6px 10px rgba(80,40,0,.25)"></div></div><div class=nb style="font-size:13px;margin-top:6px;color:{c}">{t}</div></div>' for i,(f,t,c) in enumerate([("sunflower_bloom.webp","Готов! +4","#4E8A1E"),("lavender_bloom.webp","Готов! +3","#4E8A1E"),("mint_bud.webp","Полей","#E0662A"),("sprout.webp","Полей","#E0662A"),("cornflower_bloom.webp","2 ч","#A57A4A"),("clover_bloom.webp","1 ч","#A57A4A")]))
S["C3"]=page(f'<div class=abs style="inset:0;background:linear-gradient(#FFE8A8,#E8F4BC 40%,#C6E595)"></div>'+topC+
  f'<div class=abs style="left:0;right:0;top:110px;text-align:center"><div class=nb style="font-size:30px;color:#4E6A12">Сад</div><div class=muted style="color:#7A8A3A">открыт из соты · 4 грядки из 6</div></div>'+
  f'<div class=card style="left:24px;right:24px;top:190px;height:80px;display:flex;align-items:center;gap:12px;padding:0 16px"><img src="{A}nectar.png" style="width:44px"><div style="flex:1"><div class=nb style="font-size:16px">+16% мёда улья</div><div class=muted style="font-size:12px">каждый цветок на грядке +4%</div></div></div>'+pots+
  '<div class="cta" style="top:660px;background:linear-gradient(180deg,#9FE05A,#6CBF2A 60%,#55A41C);box-shadow:inset 0 3px 0 rgba(255,255,255,.5),0 7px 0 #3E7E10,0 16px 26px rgba(60,120,10,.3);text-shadow:0 2px 0 #3E7E10"><img src="a/can.png" style="width:44px">Полить всё</div>'+
  f'<div class=abs style="left:0;right:0;top:762px;text-align:center"><span class=nb style="background:#fff;border-radius:18px;padding:8px 16px;box-shadow:0 3px 0 #C9DE9A;font-size:14px">← В улей</span></div>',
  "C · ЖИВОЙ УЛЕЙ — САД","#E8F4BC")
for k,v in S.items(): open(k+".html","w").write(v)
