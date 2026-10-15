from lib import *
import tree
from tree import tree_hive, hive_cluster
def svg(x,y,w,h,vb,body,z=6,extra=""):
    return f'<svg class=abs viewBox="{vb}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;z-index:{z};overflow:visible;{extra}">{body}</svg>'
def sh(x,y,w,h,o=.3,z=4):
    return f'<div class=abs style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:50%;background:radial-gradient(closest-side,rgba(40,70,10,{o}),rgba(40,70,10,0));z-index:{z}"></div>'
def ground(op=1):
    return (f'<div class=abs style="inset:0;background:url({A}garden_bg.webp) center top/cover"></div>'
      '<div class=abs style="inset:0;background:linear-gradient(120deg,rgba(255,244,170,.38),rgba(255,244,170,0) 55%)"></div>'
      '<div class=abs style="inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(255,255,255,0) 55%,rgba(30,60,10,.18) 100%)"></div>')
BROWN="filter:brightness(0) saturate(100%) invert(48%) sepia(35%) saturate(700%) hue-rotate(350deg) brightness(95%)"
def circ(x,y,ic,badge=None):
    return f'<div class=abs style="left:{x}px;top:{y}px;width:44px;height:44px;border-radius:50%;background:#fff;box-shadow:0 3px 0 #F0D7AE,0 8px 16px rgba(170,100,20,.18);display:grid;place-items:center;z-index:70;font-family:NB;font-size:22px;color:#9A6A34">{ic}</div>'
def gearc(x,y):
    return f'<div class=abs style="left:{x}px;top:{y}px;width:44px;height:44px;border-radius:50%;background:#fff;box-shadow:0 3px 0 #F0D7AE,0 8px 16px rgba(170,100,20,.18);display:grid;place-items:center;z-index:70"><img src="{A}gear.webp" style="width:26px;{BROWN}"></div>'
def pill(x,y,icon,text,w=None,extra=""):
    ws=f"width:{w}px;" if w else ""
    return f'<div class=pill style="left:{x}px;top:{y}px;{ws}z-index:70;{extra}"><img src="{A}{icon}.webp">{text}</div>'
def title(t):
    return f'<div class=abs style="left:70px;right:70px;top:44px;height:44px;border-radius:22px;background:#6B4423;color:#FFF4DF;display:grid;place-items:center;font-family:NB;font-size:15px;letter-spacing:.4px;z-index:70;box-shadow:0 3px 0 #4a2e14">{t}</div>'
def hud(t): return circ(16,44,"‹")+title(t)+gearc(330,44)
def cap(t): return f'<div class=cap style="top:4px;font-size:10px;padding:3px 12px">{t}</div>'
def orb(c,s=22):
    cols={"y":("#FFE27A","#FFB400","#C77F00"),"b":("#9CCBFF","#3D8BFF","#1F55B8"),"p":("#D5B8FF","#9560F5","#5E35B8"),"r":("#FFB0CE","#FF5C98","#C42A68")}[c]
    return f'<div style="width:{s}px;height:{s}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0 7%,{cols[0]} 12%,{cols[1]} 58%,{cols[2]} 100%);box-shadow:0 3px 3px rgba(60,30,0,.3),0 0 8px {cols[1]}88"></div>'
def star(x,y,w,on=True):
    return f'<img src="{A}{"star" if on else "star_off"}.webp" style="position:absolute;left:{x}px;top:{y}px;width:{w}px;z-index:90;filter:drop-shadow(0 4px 3px rgba(120,60,0,.35))">'
def btn(x,y,w,text,kind="o",h=52,icon=None):
    st="background:linear-gradient(#FFC23D,#FF9A12);color:#fff;box-shadow:0 4px 0 #C25F00" if kind=="o" else "background:#fff;color:#C46A00;box-shadow:0 4px 0 #E8C98F"
    ic=f'<img src="{A}{icon}.webp" style="width:26px;height:26px;object-fit:contain;margin-right:6px">' if icon else ""
    return f'<div class=abs style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:{h/2}px;{st};display:flex;align-items:center;justify-content:center;font-family:NB;font-size:18px;z-index:92">{ic}{text}</div>'
def result_card(titl,sub,stars_on,score,rows,rewards,buttons,top=196,h=486,bee="b_zhuzha_crown_q3"):
    s=f'<div class=abs style="inset:0;background:rgba(80,46,12,.38);z-index:80"></div>'
    s+=f'<div class=abs style="left:24px;right:24px;top:{top}px;height:{h}px;border-radius:30px;background:linear-gradient(#FFFDF4,#FFF1D3);box-shadow:0 8px 0 #E2B866,0 24px 40px rgba(60,30,0,.4);z-index:85"></div>'
    s+=f'<img src="{A}{bee if "." in bee else bee+".png"}" style="position:absolute;left:130px;top:{top-66}px;width:130px;z-index:95;filter:drop-shadow(0 8px 6px rgba(60,30,0,.3))">'
    s+=f'<div class=abs style="left:24px;right:24px;top:{top+70}px;text-align:center;z-index:90"><div class=nb style="font-size:26px;color:#5A3410">{titl}</div><div style="font-size:13px;color:#9A6A34;margin-top:2px">{sub}</div></div>'
    for i,on in enumerate(stars_on):
        sz=62 if i==1 else 50
        s+=star(195-95+i*68+(0 if i==1 else 6),top+122+(0 if i==1 else 10),sz,on)
    s+=f'<div class=abs style="left:24px;right:24px;top:{top+190}px;text-align:center;z-index:90"><div class=nb style="font-size:44px;line-height:46px;color:#E07B00">{score}</div><div style="font-size:12px;color:#9A6A34">очков</div></div>'
    y=top+262
    for lab,val in rows:
        s+=f'<div class=abs style="left:48px;right:48px;top:{y}px;display:flex;justify-content:space-between;font-family:NB;font-size:14px;color:#7A4A1A;z-index:90"><span style="font-family:NR">{lab}</span><span>{val}</span></div>'
        y+=24
    # награды
    y+=6
    chips="".join(f'<div style="display:flex;align-items:center;gap:6px;background:#fff;border-radius:18px;height:38px;padding:0 12px 0 6px;box-shadow:0 3px 0 #F0D7AE;font-family:NB;font-size:16px;color:#5A3410"><img src="{A}{ic}.webp" style="width:28px;height:28px;object-fit:contain">{t}</div>' for ic,t in rewards)
    s+=f'<div class=abs style="left:24px;right:24px;top:{y}px;display:flex;justify-content:center;gap:8px;z-index:90">{chips}</div>'
    bx=top+h-72
    if len(buttons)==2:
        s+=btn(44,bx,140,buttons[0][0],buttons[0][1])+btn(206,bx,140,buttons[1][0],buttons[1][1])
    else: s+=btn(44,bx,302,buttons[0][0],buttons[0][1])
    return s
def confetti(n=26):
    import random; r=random.Random(5); s=''
    cols=["#FFC23D","#FF6FA3","#7CC03E","#4C9BFF","#A77BFF"]
    for i in range(n):
        x=r.randint(10,370); y=r.randint(120,330); c=cols[i%5]; rot=r.randint(0,120)
        s+=f'<div class=abs style="left:{x}px;top:{y}px;width:12px;height:12px;background:{c};clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);transform:rotate({rot}deg);z-index:84;opacity:.95"></div>'
    return s
def page(body,caption,extra=""):
    return f'<!doctype html><meta charset=utf-8><style>{CSS}</style><body>{body}{cap(caption)}{extra}</body>'
def blur(body): return f'<div class=abs style="inset:0;filter:blur(3px)">{body}</div>'
