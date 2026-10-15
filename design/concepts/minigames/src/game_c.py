from common import *
import random, math
TIERS=[("sprout",20),("mint_bud",26),("mint_bloom",32),("lavender_bloom",38),("cornflower_bloom",46),("sunflower_bloom",55),("goldsun_bloom",66)]
X0,X1,FLOOR=44,346,640
def sim(seq,seed=3):
    rnd=random.Random(seed); cs=[]
    for t in seq:
        r=TIERS[t][1]
        cs.append([rnd.uniform(X0+r,X1-r),FLOOR-400,r,t])
        for it in range(900):
            for c in cs: c[1]+=.9
            for _ in range(3):
                for i in range(len(cs)):
                    for j in range(i+1,len(cs)):
                        a,b=cs[i],cs[j]; dx=b[0]-a[0]; dy=b[1]-a[1]; d=math.hypot(dx,dy) or .01; ov=a[2]+b[2]-d
                        if ov>0:
                            ma,mb=a[2]**2,b[2]**2; k=ov/d
                            a[0]-=dx*k*mb/(ma+mb); a[1]-=dy*k*mb/(ma+mb); b[0]+=dx*k*ma/(ma+mb); b[1]+=dy*k*ma/(ma+mb)
                for c in cs:
                    c[0]=min(max(c[0],X0+c[2]),X1-c[2]); c[1]=min(c[1],FLOOR-c[2])
    return cs
SEQ=[5,4,3,4,3,2,3,1,2,0,2,1,3,0,1,2,0]
CS=sim(SEQ)
COL=[("#E9F7C8","#B6DE7A"),("#D2F0A8","#8FCB4E"),("#BDE8A0","#5FB23A"),("#E4D2FF","#A77BFF"),("#BFDDFF","#4C9BFF"),("#FFF0A0","#FFC21F"),("#FFE08A","#F2960C")]
def flower(c,glow=False):
    x,y,r,t=c; w=r*2
    ring="box-shadow:0 0 0 4px #fff,0 0 22px 8px rgba(255,235,120,.95);" if glow else "box-shadow:0 5px 0 rgba(90,60,20,.28),inset 0 -5px 8px rgba(0,0,0,.08);"
    return (f'<div class=abs style="left:{x-r}px;top:{y-r}px;width:{w}px;height:{w}px;border-radius:50%;z-index:10;overflow:hidden;border:3px solid rgba(255,255,255,.95);{ring}background:radial-gradient(circle at 35% 28%,#fff 0,{COL[t][0]} 28%,{COL[t][1]} 100%)">'
      f'<img src="{A}{TIERS[t][0]}.webp" style="position:absolute;left:{w*.04}px;top:{w*.02}px;width:{w*.92}px;filter:drop-shadow(0 3px 2px rgba(60,40,10,.25))"></div>')
def crate():
    s=f'<div class=abs style="left:{X0-16}px;top:300px;width:{X1-X0+32}px;height:{FLOOR-300+22}px;border-radius:14px 14px 20px 20px;background:rgba(255,248,226,.62);box-shadow:inset 0 0 24px rgba(160,110,40,.25);z-index:3"></div>'
    s+=f'<div class=abs wood style="left:{X0-24}px;top:292px;width:16px;height:{FLOOR-292+34}px;border-radius:8px;z-index:12;background:linear-gradient(90deg,#D9A163,#A8672C)"></div>'
    s+=f'<div class=abs wood style="left:{X1+8}px;top:292px;width:16px;height:{FLOOR-292+34}px;border-radius:8px;z-index:12;background:linear-gradient(90deg,#A8672C,#8F5522)"></div>'
    s+=f'<div class="abs wood" style="left:{X0-24}px;top:{FLOOR+4}px;width:{X1-X0+48}px;height:30px;border-radius:10px;z-index:12;background:linear-gradient(#D9A163,#9A5C26)"></div>'
    s+=sh(X0-20,FLOOR+24,X1-X0+40,24,.4,2)
    return s
def gameplay():
    s=ground()+crate()
    # враг-линия
    s+=f'<div class=abs style="left:{X0-8}px;top:300px;width:{X1-X0+16}px;height:0;border-top:3px dashed #E8412F;z-index:30;opacity:.85"></div><div class=abs style="left:{X0-6}px;top:276px;z-index:30;font-family:NB;font-size:10px;color:#fff;background:#E8412F;border-radius:8px;padding:1px 7px">ГРАНИЦА</div>'
    # цветы
    pair=None
    for i in range(len(CS)):
        for j in range(i+1,len(CS)):
            a,b=CS[i],CS[j]
            if a[3]==b[3] and a[3]>=1 and math.hypot(a[0]-b[0],a[1]-b[1])<a[2]+b[2]+6: pair=pair or (i,j)
    print('pair',pair,[ (c[3]) for c in CS])
    for i,c in enumerate(CS):
        s+=flower(c, glow=(pair is not None and i in pair))
    # вспышка слияния между лавандами idx 4,6 (tier3?) — подсветим пару
    a,b=(CS[pair[0]],CS[pair[1]]) if pair else (CS[4],CS[6])
    mx,my=(a[0]+b[0])/2,(a[1]+b[1])/2
    s+=f'<div class=abs style="left:{mx-60}px;top:{my-60}px;width:120px;height:120px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.9),rgba(255,235,120,.4) 60%,rgba(255,235,120,0));z-index:40"></div>'
    s+=f'<div class=abs style="left:{mx-26}px;top:{my-44}px;z-index:50;font-family:NB;font-size:24px;color:#fff;text-shadow:0 3px 0 #C25F00,0 0 8px #FFB400">+60</div>'
    # падающий цветок и пчела
    s+='<svg class=abs style="left:0;top:0;z-index:18" width=390 height=844><line x1="248" y1="240" x2="248" y2="296" stroke="#fff" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round" opacity=".9"/></svg>'
    s+=f'<img class=bee src="{A}b_zhuzha_crown_q3.png" style="left:204px;top:176px;width:90px;z-index:60">'
    s+=f'<img src="{A}mint_bud.webp" style="position:absolute;left:226px;top:232px;width:44px;z-index:61;filter:drop-shadow(0 4px 3px rgba(60,40,10,.3))">'
    # HUD
    s+=hud("Цветочное слияние")
    s+=pill(16,98,"star","1 480",120)
    s+=f'<div class=pill style="left:146px;top:98px;z-index:70"><span style="color:#9A6A34;font-size:12px;font-family:NR">рекорд</span> 3 920</div>'
    s+=f'<div class=abs style="left:290px;top:92px;width:84px;height:62px;border-radius:20px;background:#fff;box-shadow:0 3px 0 #F0D7AE;z-index:70;text-align:center"><div class=nb style="font-size:10px;color:#9A6A34;letter-spacing:1px;margin-top:4px">ДАЛЬШЕ</div><img src="{A}sprout.webp" style="width:36px;margin:0 auto"></div>'
    s+=f'<div class=abs style="left:20px;top:180px;z-index:60;font-family:NB;font-size:13px;color:#fff;background:#6B4423;border-radius:12px;padding:3px 10px">Касание — бросить цветок</div>'
    # цепочка
    s+='<div class=abs style="left:10px;right:10px;top:718px;height:76px;border-radius:24px;background:rgba(255,255,255,.93);box-shadow:0 4px 0 #E8C98F;z-index:70"></div>'
    for i,(n,r) in enumerate(TIERS):
        x=18+i*50
        sel='background:#FFF0C4;outline:3px solid #FFC23D;' if i==5 else ''
        s+=f'<div class=abs style="left:{x}px;top:728px;width:44px;height:44px;border-radius:50%;{sel}z-index:75;display:grid;place-items:center"><img src="{A}{n}.webp" style="width:{30+i*2.4}px"></div>'
        if i<6: s+=f'<div class=abs style="left:{x+39}px;top:742px;z-index:76;font-family:NB;font-size:13px;color:#C46A00">›</div>'
    s+='<div class=abs style="left:0;right:0;top:798px;text-align:center;z-index:70;font-family:NB;font-size:12px;color:#fff;text-shadow:0 2px 3px rgba(40,70,10,.7)">Два одинаковых цветка сливаются в следующий. Дойди до золотого подсолнуха!</div>'
    return s
def result():
    return blur(gameplay())+result_card("Золотой подсолнух!","Цветочное слияние · новый рекорд",[1,1,1],"4 120",[("Слияний","47"),("Лучшая цепочка","×5"),("Высший цветок","Золотой подсолнух")],[("honey","+180"),("seed","+2")],[("Ещё раз","o"),("В улей","w")],bee="goldsun_bloom.webp")+confetti()
open("C1.html","w").write(page(gameplay(),"ЦВЕТОЧНОЕ СЛИЯНИЕ · КАДР ИГРЫ · КОНЦЕПТ"))
open("C2.html","w").write(page(result(),"ЦВЕТОЧНОЕ СЛИЯНИЕ · РЕЗУЛЬТАТ · КОНЦЕПТ"))
