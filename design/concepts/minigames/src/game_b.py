from common import *
SEGS=[((40,130),(40,230),(60,275),(160,285)),((160,285),(250,295),(330,300),(320,390)),((320,390),(310,470),(110,420),(100,500)),((100,500),(92,560),(160,590),(195,628))]
def bez(p0,p1,p2,p3,t):
    u=1-t
    return (u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0], u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1])
def at(si,t): return bez(*SEGS[si],t)
D="M40 130 "+" ".join(f"C {c1[0]} {c1[1]}, {c2[0]} {c2[1]}, {p[0]} {p[1]}" for _,c1,c2,p in SEGS)
def path_svg():
    return (f'<svg class=abs style="left:0;top:0;z-index:2" width=390 height=844 fill=none>'
      f'<path d="{D}" stroke="#B89558" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" opacity=".55" transform="translate(0 4)"/>'
      f'<path d="{D}" stroke="#EBD79F" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>'
      f'<path d="{D}" stroke="#F8EBC2" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity=".7" stroke-dasharray="3 16"/></svg>')
def pad(cx,cy,free=False):
    pts=" ".join(f"{cx+30*__import__('math').cos(a):.1f},{cy+13+24*__import__('math').sin(a)*.62:.1f}" for a in [k*3.14159/3 for k in range(6)])
    if free:
        return f'<svg class=abs style="left:0;top:0;z-index:5" width=390 height=844><polygon points="{pts}" fill="rgba(255,255,255,.35)" stroke="#fff" stroke-width="3" stroke-dasharray="6 5"/></svg><div class=abs style="left:{cx-15}px;top:{cy-8}px;width:30px;height:30px;border-radius:50%;background:linear-gradient(#FFC23D,#FF9A12);color:#fff;font-family:NB;font-size:24px;display:grid;place-items:center;z-index:6;box-shadow:0 3px 0 #C25F00;line-height:26px">+</div>'
    return f'<svg class=abs style="left:0;top:0;z-index:5" width=390 height=844><polygon points="{pts}" fill="#C98A4B" stroke="#7A4519" stroke-width="3" transform="translate(0 3)"/><polygon points="{pts}" fill="#E5B070" stroke="#8F5522" stroke-width="3"/></svg>'
def guard(cx,cy,n,rng=64,ring=True,lvl=1,flip=False):
    s=''
    if ring: s+=f'<div class=abs style="left:{cx-rng}px;top:{cy-rng+4}px;width:{rng*2}px;height:{rng*2}px;border-radius:50%;background:rgba(255,255,255,.14);border:2px dashed rgba(255,255,255,.75);z-index:3"></div>'
    s+=pad(cx,cy+4)
    s+=f'<img class=bee src="{A}{n}.png" style="left:{cx-26}px;top:{cy-46}px;width:52px;z-index:21;transform:scaleX({-1 if flip else 1})">'
    s+=f'<div class=abs style="left:{cx-9}px;top:{cy+16}px;min-width:18px;height:16px;border-radius:8px;background:#fff;font-family:NB;font-size:10px;color:#C46A00;display:grid;place-items:center;z-index:22;box-shadow:0 1px 3px rgba(0,0,0,.3);padding:0 5px">Ур.{lvl}</div>'
    return s
BROWS=lambda w:(f'<div class=abs style="left:{w*.40}px;top:{w*.44}px;width:{w*.15}px;height:{w*.04}px;background:#3A1408;border-radius:3px;transform:rotate(22deg)"></div>'
                f'<div class=abs style="left:{w*.58}px;top:{w*.44}px;width:{w*.15}px;height:{w*.04}px;background:#3A1408;border-radius:3px;transform:rotate(-22deg)"></div>')
def wasp(n,cx,cy,w,hp,boss=False,flip=False):
    x,y=cx-w/2,cy-w/2
    s=f'<div class=abs style="left:{x}px;top:{y}px;width:{w}px;height:{w}px;z-index:{20+int(cy/10)}">'
    if boss: s+=f'<div class=abs style="left:{-w*.2}px;top:{-w*.2}px;width:{w*1.4}px;height:{w*1.4}px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,70,50,.55),rgba(255,70,50,0));z-index:-1"></div>'
    s+=f'<img src="{A}{n}.png" style="width:{w}px;transform:scaleX({-1 if flip else 1});filter:drop-shadow(0 8px 5px rgba(60,20,40,.3))">'+BROWS(w)
    bw=w*.8 if not boss else w*.9
    s+=f'<div class=abs style="left:{(w-bw)/2}px;top:{-10 if not boss else -16}px;width:{bw}px;height:{6 if not boss else 9}px;border-radius:5px;background:#3A1408;padding:1px"><div style="width:{hp*100}%;height:100%;border-radius:4px;background:{"linear-gradient(#FF8A7A,#E8412F)" if not boss else "linear-gradient(#FF8A7A,#C82418)"}"></div></div>'
    s+='</div>'
    return s
def shot(x1,y1,x2,y2):
    return f'<svg class=abs style="left:0;top:0;z-index:30" width=390 height=844><line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#FFB400" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 6" opacity=".9"/><circle cx="{x2}" cy="{y2}" r="5" fill="#FFB400" stroke="#fff" stroke-width="1.5"/></svg>'
def dmg(x,y,t,c="#fff"):
    return f'<div class=abs style="left:{x}px;top:{y}px;z-index:60;font-family:NB;font-size:15px;color:{c};text-shadow:0 2px 0 #7A2A10,0 0 6px rgba(0,0,0,.4)">{t}</div>'
def defbtn(x,icon,name,price,sel=False,isimg=True):
    bd="outline:3px solid #FFC23D;background:#FFF6DC" if sel else "background:#fff"
    return f'<div class=abs style="left:{x}px;top:742px;width:112px;height:80px;border-radius:20px;{bd};box-shadow:0 4px 0 #E8C98F;z-index:75;text-align:center"><img src="{A}{icon}" style="width:40px;height:40px;object-fit:contain;margin:5px auto 0"><div class=nb style="font-size:12px;color:#5A3410;margin-top:0;white-space:nowrap">{name}</div><div class=nb style="font-size:12px;color:#C46A00;display:flex;gap:3px;justify-content:center;align-items:center"><img src="{A}honey.webp" style="width:14px;height:14px">{price}</div></div>'
def gameplay():
    s=ground()+path_svg()
    # улей (дерево) внизу
    s+=sh(140,668,110,18,.4)+tree_hive(142,508,104)
    # стражи
    s+=guard(110,350,"b_zhuzha_crown_q3",lvl=3)+guard(236,222,"b_solnyshko_q3",lvl=2)+guard(214,452,"b_lavanda_q3",lvl=2,flip=True)
    s+=pad(68,296,True)+pad(40,470,True)
    # враги
    p=at(0,.92); s+=wasp("wasp1",p[0]-6,p[1]-24,50,.7)
    p=at(1,.52); s+=wasp("wasp2",p[0],p[1]-22,46,.4)
    p=at(1,.88); s+=wasp("wasp1",p[0]-2,p[1]-26,48,.85,flip=True)
    bp=at(0,.55); s+=wasp("wasp3",bp[0]+6,bp[1]-30,78,.82,True)  # шершень-босс
    p=at(2,.62); s+=wasp("wasp2",p[0],p[1]-22,46,.55,flip=True)
    # выстрелы
    s+=shot(110,330,at(0,.92)[0]+2,at(0,.92)[1]-18)+shot(236,230,at(1,.52)[0],at(1,.52)[1]-18)+shot(214,432,at(2,.62)[0]+4,at(2,.62)[1]-16)
    s+=dmg(at(0,.92)[0]+10,at(0,.92)[1]-52,"-14")+dmg(at(1,.52)[0]-28,at(1,.52)[1]-50,"-9")+dmg(at(2,.62)[0]-6,at(2,.62)[1]-48,"КРИТ -30","#FFE27A")
    # липкая лужа
    s+=f'<div class=abs style="left:276px;top:380px;width:84px;height:34px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,170,0,.85),rgba(255,170,0,.3) 70%,rgba(255,170,0,0));z-index:3"></div><div class=abs style="left:300px;top:368px;font-size:10px;font-family:NB;color:#fff;background:#C46A00;border-radius:8px;padding:1px 6px;z-index:40">медл.</div>'
    # HUD
    s+=hud("Защита улья")
    s+=f'<div class=pill style="left:16px;top:98px;z-index:70;padding:0 14px 0 14px">Волна 3/5</div>'
    s+=f'<div class=pill style="left:122px;top:98px;z-index:70;padding:0 14px 0 8px"><img src="{A}check.webp" style="display:none"><span style="color:#E8412F;font-size:20px">♥</span>Улей 8/10</div>'
    s+=pill(252,98,"honey","85",122)
    s+=f'<div class=abs style="left:16px;right:16px;top:146px;z-index:70;height:12px;border-radius:6px;background:rgba(255,255,255,.7);box-shadow:inset 0 2px 3px rgba(120,80,20,.2);overflow:hidden"><div style="width:80%;height:100%;background:linear-gradient(#FF8A7A,#E8412F);border-radius:6px"></div></div>'
    # босс-полоса
    s+=f'<div class=abs style="left:100px;top:196px;z-index:70;background:#3A1408;color:#FFD0C8;border-radius:10px;padding:2px 10px;font-family:NB;font-size:11px;letter-spacing:.5px">ШЕРШЕНЬ-ВОЖАК</div>'
    # нижняя панель
    s+='<div class=abs style="left:0;right:0;top:722px;height:122px;background:rgba(255,244,223,.92);border-radius:28px 28px 0 0;box-shadow:0 -6px 20px rgba(120,70,10,.25);z-index:74"></div>'
    s+=defbtn(10,"b_zhuzha_crown_q3.png","Страж","20",True)+defbtn(139,"drop.webp","Липкая капля","15")+defbtn(268,"deco_barrel.webp","Бочка-ловушка","35")
    s+='<div class=abs style="left:130px;top:728px;z-index:80;font-family:NB;font-size:10px;color:#9A6A34;display:none"></div>'
    return s
def fix_btn(s): return s
def result():
    return blur(gameplay())+result_card("Волна 3 отбита!","Шершень-вожак побеждён",[1,1,1],"2 340",[("Осы разогнаны","18 из 18"),("Улей цел","8/10 ♥"),("Лучший страж","Жужа · Ур.3")],[("honey","+120"),("box_wood","1")],[("Волна 4 ▶","o"),("Стражи","w")],bee="b_zhuzha_crown_side")+confetti()
open("B1.html","w").write(page(gameplay(),"ЗАЩИТА УЛЬЯ · КАДР ИГРЫ · КОНЦЕПТ"))
open("B2.html","w").write(page(result(),"ЗАЩИТА УЛЬЯ · РЕЗУЛЬТАТ ВОЛНЫ · КОНЦЕПТ"))
