from common import *
import random, math, heapq
COLS,ROWS=7,8
W_,H_=64,55.4; STEP=48; X0,Y0=19,214
def center(c,r): return (X0+c*STEP+W_/2, Y0+r*H_+(H_/2 if c%2 else 0)+H_/2)
def nb(c,r,d):
    odd=c%2
    dd=[(0,-1),((1,0) if odd else (1,-1)),((1,1) if odd else (1,0)),(0,1),((-1,1) if odd else (-1,0)),((-1,0) if odd else (-1,-1))][d]
    n=(c+dd[0],r+dd[1]); return n if 0<=n[0]<COLS and 0<=n[1]<ROWS else None
ANG=[-90,-30,30,90,150,210]
rnd=random.Random(11)
SRC=(3,0); TG=[(1,7),(3,7),(5,7)]
def shortest(src,dst):
    wt={}
    dist={src:0}; prev={}; pq=[(0,src)]
    while pq:
        d0,u=heapq.heappop(pq)
        if u==dst: break
        if d0>dist[u]: continue
        for d in range(6):
            v=nb(*u,d)
            if not v: continue
            w=1+rnd.random()*1.2
            if d0+w<dist.get(v,1e9): dist[v]=d0+w; prev[v]=(u,d); heapq.heappush(pq,(d0+w,v))
    path=[dst]; 
    while path[-1]!=src: path.append(prev[path[-1]][0])
    return path[::-1]
edges=set(); paths=[]
for t in TG:
    p=shortest(SRC,t); paths.append(p)
    for a,b in zip(p,p[1:]): edges.add((a,b)); edges.add((b,a))
ch={}  # cell -> set(dirs) (правильные)
def addedge(a,b):
    for d in range(6):
        if nb(*a,d)==b: ch.setdefault(a,set()).add(d); ch.setdefault(b,set()).add((d+3)%6)
for a,b in list(edges): addedge(a,b)
ch.setdefault(SRC,set()).add(0)
for t in TG: ch.setdefault(t,set()).add(3)
# боковые ветки
cells=list(ch)
for _ in range(7):
    a=rnd.choice(cells); d=rnd.randrange(6); b=nb(*a,d)
    if b and b not in ch: addedge(a,b); cells.append(b)
# какие плитки уже повернуты верно
correct=set(paths[0])|set(paths[1][:5])
rot={}
for c in ch:
    if c in correct: rot[c]=0
    else: rot[c]=rnd.choice([1,2,3,4,5])
cur={c:{(d+rot[c])%6 for d in ds} for c,ds in ch.items()}
# поток
flow=set(); 
if 0 in cur.get(SRC,()):
    stack=[SRC]; flow.add(SRC)
    while stack:
        u=stack.pop()
        for d in cur[u]:
            v=nb(*u,d)
            if v and v in cur and (d+3)%6 in cur[v] and v not in flow: flow.add(v); stack.append(v)
filled=[t for t in TG if t in flow and 3 in cur[t]]
print("flow",len(flow),"filled",filled)
def tile_svg(c):
    cx,cy=center(*c); fl=c in flow; s=''
    apo=H_/2
    ds=cur[c]
    out,mid,hi=("#B5660A","#FFB52E","#FFE88A") if fl else ("#8A4E1C","#D8B070","#FFF6DC")
    pts=[(cx+apo*math.cos(math.radians(ANG[d])),cy+apo*math.sin(math.radians(ANG[d]))) for d in ds]
    for w_,col in ((14,out),(9,mid),(3.5,hi)):
        if not fl and w_==3.5: continue
        for (x,y) in pts: s+=f'<line x1="{cx}" y1="{cy}" x2="{x}" y2="{y}" stroke="{col}" stroke-width="{w_}" stroke-linecap="round"/>'
        s+=f'<circle cx="{cx}" cy="{cy}" r="{w_/2+ (2 if w_>10 else 0)}" fill="{col}"/>'
    return s
def gameplay():
    s=f'<div class=abs style="inset:0;background:url({A}hive_bg.webp) center top/cover"></div>'
    s+='<div class=abs style="inset:0;background:radial-gradient(ellipse at 50% 45%,rgba(255,250,230,.55),rgba(255,250,230,0) 70%)"></div>'
    # плитки
    for c in range(COLS):
        for r in range(ROWS):
            x=X0+c*STEP; y=Y0+r*H_+(H_/2 if c%2 else 0)
            op=1 if (c,r) in ch else .55
            s+=f'<img src="{A}comb_empty.webp" style="position:absolute;left:{x}px;top:{y}px;width:{W_}px;opacity:{op};z-index:4;filter:drop-shadow(0 3px 2px rgba(120,70,10,.3))">'
    svgb=''.join(tile_svg(c) for c in ch)
    s+=f'<svg class=abs style="left:0;top:0;z-index:6" width=390 height=844>{svgb}</svg>'
    # источник (банка мёда сверху)
    sx,sy=center(*SRC)
    s+=f'<img src="{A}honey.webp" style="position:absolute;left:{sx-40}px;top:{Y0-70+ H_/2-4}px;width:80px;z-index:8;transform:rotate(180deg);filter:drop-shadow(0 6px 4px rgba(120,60,0,.35))">'
    s+=f'<svg class=abs style="left:0;top:0;z-index:7" width=390 height=844><line x1="{sx}" y1="{Y0+H_/2-4}" x2="{sx}" y2="{sy-H_/2}" stroke="#FFB52E" stroke-width="10" stroke-linecap="round"/><line x1="{sx}" y1="{Y0+H_/2-4}" x2="{sx}" y2="{sy-H_/2}" stroke="#FFE88A" stroke-width="3.5" stroke-linecap="round"/></svg>'
    # цели
    for i,t in enumerate(TG):
        cx,cy=center(*t); ok=t in filled
        y=cy+H_/2+2
        s+=sh(cx-34,y+34,68,14,.35,9)
        s+=f'<img src="{A}honey.webp" style="position:absolute;left:{cx-32}px;top:{y-4}px;width:64px;z-index:9;{"" if ok else "filter:grayscale(1) brightness(1.5) opacity(.55);"}">'
        if ok: s+=f'<div class=abs style="left:{cx-38}px;top:{y-10}px;width:76px;height:76px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,240,130,.9),rgba(255,240,130,0));z-index:8"></div><div class=abs style="left:{cx+14}px;top:{y-6}px;width:24px;height:24px;border-radius:50%;background:#62A82A;color:#fff;font-family:NB;font-size:15px;display:grid;place-items:center;z-index:12;border:2px solid #fff">✓</div>'
    # подсветка нажатой плитки
    tc=(2,3) if (2,3) in ch else sorted(ch)[10]
    cx,cy=center(*tc)
    s+=f'<div class=abs style="left:{cx-36}px;top:{cy-36}px;width:72px;height:72px;border-radius:50%;border:4px solid #fff;box-shadow:0 0 0 4px rgba(255,190,40,.6),0 0 20px 6px rgba(255,200,60,.8);z-index:20"></div><div class=abs style="left:{cx-14}px;top:{cy-52}px;z-index:21;font-family:NB;font-size:28px;color:#fff;text-shadow:0 2px 0 #C25F00,0 0 6px #FFB400">↻</div>'
    # лист/пчела
    s+=f'<img class=bee src="{A}b_zhuzha_crown_side.png" style="left:290px;top:150px;width:64px;z-index:30">'
    s+=hud("Медовая тропа")
    s+=pill(16,98,"honey","1/3 баночек",150) if False else f'<div class=pill style="left:16px;top:98px;z-index:70;padding:0 14px 0 8px"><img src="{A}honey.webp">Баночки {len(filled)}/3</div>'
    s+=f'<div class=pill style="left:166px;top:98px;z-index:70;padding:0 14px 0 14px">Ходы 14/20</div>'
    s+=f'<div class=pill style="left:286px;top:98px;z-index:70;padding:0 10px 0 10px;gap:2px"><img src="{A}star.webp" style="width:22px;height:22px"><img src="{A}star.webp" style="width:22px;height:22px"><img src="{A}star_off.webp" style="width:22px;height:22px"></div>'
    s+=f'<div class=abs style="left:20px;top:150px;z-index:60;font-family:NB;font-size:12px;color:#7A4A1A;max-width:200px;line-height:14px">Поворачивай соты, пусть мёд дойдёт до всех баночек</div>'
    # нижние кнопки
    s+=btn(24,770,160,"Подсказка","w",h=46,icon="seed")+btn(206,770,160,"Заново","w",h=46)
    return s
def result():
    return blur(gameplay())+result_card("Все баночки полны!","Медовая тропа · уровень 12",[1,1,1],"1 200",[("Ходов","17 из 20"),("Баночек","3/3"),("Серия уровней","5")],[("honey","+150"),("pollen","+10")],[("Дальше","o"),("Уровни","w")],bee="b_zhuzha_crown_q3")+confetti()
open("D1.html","w").write(page(gameplay(),"МЕДОВАЯ ТРОПА · КАДР ИГРЫ · КОНЦЕПТ"))
open("D2.html","w").write(page(result(),"МЕДОВАЯ ТРОПА · РЕЗУЛЬТАТ · КОНЦЕПТ"))
