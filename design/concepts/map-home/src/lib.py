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

