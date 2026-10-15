"""v1.5: copy owner's honey-crystal art (design/art) into assets/art at game size.
Each source is trimmed and fitted (keeping aspect) into the old asset's canvas, scaled up for @3x."""
from PIL import Image
import os
D="design/art/"; A="assets/art/"
M={  # target: (source, scale vs old canvas)
 **{f"cell{i}.png":(f"puzzle-tiles-honey-crystal-v1/cell{i}.png",1.2) for i in range(5)},
 "cell_wild.png":("puzzle-tiles-honey-crystal-v1/cell-wild.png",1.2),
 "bomb.png":("combs-specials-honey-crystal-v1/bomb.png",1.2),
 "comb.png":("combs-grid-fit-v1/comb@2x.png",None),"comb_empty.png":("combs-grid-fit-v1/comb_empty@2x.png",None),
 "comb_locked.png":("combs-grid-fit-v1/comb_locked@2x.png",None),"ring.png":("combs-grid-fit-v1/ring@2x.png",None),
 "honey.png":("items-honey-crystal-v1/honey.png",1.5),"jelly.png":("items-honey-crystal-v1/jelly.png",1.5),
 "can.png":("items-honey-crystal-v1/watering-can.png",1.5),"seed.png":("items-honey-crystal-v1/seeds.png",1.5),
 "shovel.png":("items-honey-crystal-v1/shovel.png",1.5),"garden/nectar.webp":("items-honey-crystal-v1/nectar.png",1),
 "star.png":("rewards-honey-crystal-v1/star.png",1.5),"star_off.png":("rewards-honey-crystal-v1/star-off.png",1.5),
 "flame.png":("rewards-honey-crystal-v1/flame.png",1.5),"chest.png":("rewards-honey-crystal-v1/chest.png",1.5),
 "pollen.webp":("halo-and-resources-v2/pollen.png",1.5),"fragment.webp":("halo-and-resources-v2/fragment.png",1.5),
 "boost_moves.webp":("boosters-honey-crystal-v1/boost-moves.png",1.5),"boost_shuffle.webp":("boosters-honey-crystal-v1/boost-shuffle.png",1.5),
 "freeze.webp":("boosters-honey-crystal-v1/freeze.png",1.5),
 **{f"items/box_{b}.webp":(f"boxes-honey-crystal-v1/box-{b}.png",1.3) for b in ["wood","wax","gold","royal"]},
 **{f"items/deco_{d}.webp":(f"decor-honey-crystal-v1/{d}.png",1.5) for d in ["barrel","bench","flags","fountain","gnome","lanterns","mushroom","pinwheel"]},
 **{f"garden/{p}.webp":(f"plants-honey-crystal-v1/{p}.png",1.3) for p in ["clover_bloom","clover_bud","lavender_bloom","lavender_bud","sprout","sunflower_bloom","sunflower_bud"]},
 **{f"garden/{p}.webp":(f"plants-honey-crystal-v2/{p}.png",1.3) for p in ["cornflower_bloom","cornflower_bud","goldsun_bloom","goldsun_bud","mint_bloom","mint_bud","moonpoppy_bloom","moonpoppy_bud"]},
}
def save(im,t):
    os.makedirs(os.path.dirname(A+t) or ".",exist_ok=True)
    if t.endswith(".webp"): im.save(A+t,"WEBP",quality=86,method=6)
    else: im.save(A+t,optimize=True)
for t,(s,k) in M.items():
    src=Image.open(D+s).convert("RGBA")
    old=Image.open(A+t).size
    if k is None:  # grid-ready comb: exact canvas, just resize
        save(src.resize((int(old[0]*1.5),int(old[1]*1.5)),Image.LANCZOS),t); continue
    src=src.crop(src.getbbox()); W,H=int(old[0]*k),int(old[1]*k)
    r=min(W/src.width,H/src.height)*0.96; im=src.resize((max(1,int(src.width*r)),max(1,int(src.height*r))),Image.LANCZOS)
    c=Image.new("RGBA",(W,H),(0,0,0,0)); c.paste(im,((W-im.width)//2,(H-im.height)//2),im); save(c,t)
# new: environment
os.makedirs(A+"env",exist_ok=True)
for s,t in [("hive-background.png","hive_bg.webp"),("garden-background.png","garden_bg.webp")]:
    im=Image.open(D+"environment-honey-crystal-v1/"+s).convert("RGB"); im=im.resize((720,int(im.height*720/im.width)),Image.LANCZOS); im.save(A+"env/"+t,"WEBP",quality=80,method=6)
for s,t in [("bed-dry.png","bed_dry.webp"),("bed-wet.png","bed_wet.webp")]:
    im=Image.open(D+"environment-honey-crystal-v1/"+s).convert("RGBA"); im=im.crop(im.getbbox()); im.thumbnail((360,360)); im.save(A+"env/"+t,"WEBP",quality=86,method=6)
print("ok",len(M))
