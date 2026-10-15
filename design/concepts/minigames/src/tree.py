from lib import *
def svg(x,y,w,h,vb,body,z=6,extra=""):
    return f'<svg class=abs viewBox="{vb}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;z-index:{z};overflow:visible;{extra}">{body}</svg>'
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

