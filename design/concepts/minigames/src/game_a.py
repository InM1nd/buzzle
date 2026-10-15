from common import *
import random
LANES=[("y","sunflower_bloom","Подсолнух",12,.62),("b","cornflower_bloom","Василёк",9,.40),("p","lavender_bloom","Лаванда",11,.50),("r","clover_bloom","Клевер",8,.28)]
def jar(x,y,c,bloom,fill,glow=False,w=84):
    cols={"y":("#FFE27A","#FFB400"),"b":("#9CCBFF","#3D8BFF"),"p":("#D5B8FF","#9560F5"),"r":("#FFB0CE","#FF5C98")}[c]
    h=112
    s=''
    if glow: s+=f'<div class=abs style="left:{x-18}px;top:{y-34}px;width:{w+36}px;height:{h+62}px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,244,140,.95),rgba(255,222,80,.5) 60%,rgba(255,210,60,0));z-index:9"></div>'
    s+=sh(x-4,y+h-6,w+8,18,.35,10)
    # цветок-метка
    s+=f'<div class=abs style="left:{x+w/2-26}px;top:{y-62}px;width:52px;height:52px;border-radius:50%;background:#fff;box-shadow:0 3px 0 #E8C98F;z-index:12;display:grid;place-items:center;{"outline:4px solid #FFC23D;" if glow else ""}"><img src="{A}{bloom}.webp" style="width:48px"></div>'
    # банка
    s+=f'<div class=abs style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;z-index:11">'
    s+=f'<div class=abs style="left:6px;top:-8px;width:{w-12}px;height:14px;border-radius:6px;background:linear-gradient(#C98A4B,#8F5522);box-shadow:0 2px 0 #5E3412"></div>'
    s+=f'<div class=abs style="left:0;top:4px;width:{w}px;height:{h-4}px;border-radius:16px 16px 24px 24px;background:linear-gradient(90deg,rgba(255,255,255,.55),rgba(255,255,255,.2) 40%,rgba(255,255,255,.35));border:3px solid rgba(255,255,255,.95);box-shadow:inset 0 -6px 10px rgba(120,80,20,.12);overflow:hidden">'
    s+=f'<div class=abs style="left:0;right:0;bottom:0;height:{fill*100}%;background:linear-gradient({cols[0]},{cols[1]});border-top:3px solid rgba(255,255,255,.7)"></div>'
    s+='<div class=abs style="left:8px;top:8px;width:10px;height:56%;border-radius:6px;background:rgba(255,255,255,.55)"></div></div></div>'
    return s
def bee_carry(n,x,y,w,c,flip=False,o=1,rot=0,sz=22):
    s=f'<div class=abs style="left:{x}px;top:{y}px;width:{w}px;opacity:{o};z-index:20;transform:rotate({rot}deg)"><img src="{A}{n}.png" style="width:{w}px;filter:drop-shadow(0 8px 5px rgba(60,40,10,.25))">'
    s+=f'<div class=abs style="left:{w/2-sz/2}px;top:{w*.74}px">{orb(c,sz)}</div></div>'
    return s
def gameplay():
    s=ground()+sh(60,330,270,40,.15)
    # деревянный жёлоб-конвейер вниз
    s+=f'<div class=abs style="left:150px;top:232px;width:90px;height:326px;border-radius:40px;background:linear-gradient(90deg,rgba(255,255,255,.0),rgba(255,247,200,.45),rgba(255,255,255,0));z-index:2"></div>'
    s+=hud("Сортировка пыльцы")
    s+=pill(16,98,"clock","0:42",96).replace('<img src="a/clock.webp"','<img src="a/clock.webp" style="%s"'%BROWN)+pill(124,98,"star","1 240",112)
    s+=f'<div class=pill style="left:248px;top:98px;z-index:70;background:linear-gradient(#FFC23D,#FF9A12);color:#fff;box-shadow:0 3px 0 #C25F00;padding:0 14px 0 8px"><img src="{A}flame.webp">×4</div>'
    # склад
    s+=f'<div class=abs style="left:16px;right:16px;top:148px;height:34px;border-radius:17px;background:rgba(255,255,255,.9);box-shadow:0 3px 0 #F0D7AE;z-index:70;display:flex;align-items:center;gap:10px;padding:0 12px;font-family:NB;font-size:12px;color:#7A4A1A">Склад пыльцы<div style="flex:1;height:12px;border-radius:6px;background:#F7E5C3;overflow:hidden"><div style="width:50%;height:100%;border-radius:6px;background:linear-gradient(#FFC23D,#FF9A12)"></div></div><span style="color:#C46A00">5/10</span></div>'
    # очередь пчёл сверху (дальше — мельче и бледнее)
    s+='<div class=abs style="left:16px;top:196px;font-family:NB;font-size:11px;color:#7A4A1A;letter-spacing:1px;z-index:30">ДАЛЬШЕ</div>'
    for i,(n,c) in enumerate([("b_myatka_q3","y"),("b_boris_q3","b"),("b_solnyshko_q3","r"),("b_lavanda_q3","p")]):
        s+=bee_carry(n,92+i*70,206+(i%2)*10,56,c,o=1-i*.18,sz=16)
    # текущая пчела (перетаскивается к лаванде)
    s+=f'<div class=abs style="left:128px;top:340px;width:150px;height:150px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.7),rgba(255,255,255,0));z-index:19"></div>'
    s+=bee_carry("b_zhuzha_crown_q3",146,326,110,"p",rot=8,sz=34)
    # пунктир-траектория к банке лаванды
    s+='<svg class=abs style="left:0;top:0;z-index:18" width=390 height=844 fill=none><path d="M214 492 C 232 508, 240 520, 246 534" stroke="#fff" stroke-width="5" stroke-dasharray="2 10" stroke-linecap="round"/></svg>'
    # банки
    xs=[14,108,202,296]
    for i,(c,b,nm,fl,fill) in enumerate(LANES):
        s+=jar(xs[i],604,c,b,fill,glow=(c=="p"),w=80)
    s+=f'<div class=abs style="left:262px;top:520px;z-index:40;font-family:NB;font-size:22px;color:#fff;text-shadow:0 2px 0 #5E35B8,0 0 8px #fff">+25</div>'
    s+=f'<div class=abs style="left:44px;top:430px;z-index:40;transform:rotate(-8deg);background:#fff;border-radius:16px;padding:6px 14px;font-family:NB;font-size:18px;color:#E07B00;box-shadow:0 4px 0 #E8C98F">Комбо ×4!</div>'
    # декор
    s+=img("deco_mushroom.webp",330,440,36,"z-index:6")+img("deco_pinwheel.webp",12,330,30,"z-index:6")+img("deco_bench.webp",300,330,50,"z-index:6")
    # подсказка
    s+=f'<div class=abs style="left:0;right:0;top:770px;text-align:center;z-index:70;font-family:NB;font-size:13px;color:#fff;text-shadow:0 2px 3px rgba(40,70,10,.7)">Перетащи пчелу в банку её цвета до того, как склад заполнится</div>'
    return s
def result():
    return blur(gameplay())+result_card("Смена окончена!","Сортировка пыльцы",[1,1,0],"1 860",[("Собрано пыльцы","62"),("Лучшее комбо","×7"),("Точность","94%")],[("pollen","+62"),("jelly","+1")],[("Ещё раз","o"),("В улей","w")])+confetti()
open("A1.html","w").write(page(gameplay(),"СОРТИРОВКА ПЫЛЬЦЫ · КАДР ИГРЫ · КОНЦЕПТ"))
open("A2.html","w").write(page(result(),"СОРТИРОВКА ПЫЛЬЦЫ · РЕЗУЛЬТАТ · КОНЦЕПТ"))
