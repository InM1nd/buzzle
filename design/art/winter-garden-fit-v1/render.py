from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
P=Path(__file__).resolve().parent
O=P.parent
S=2
A=O/'hive-run/assets'
INK='#30284F'
def font(n):return ImageFont.truetype(str(A/'Nunito-ExtraBold.ttf'),n*S)
def pts(box):return tuple(round(v*S) for v in box)
def rr(box,r,fill):d.rounded_rectangle(pts(box),r*S,fill)
def txt(x,y,t,n,color=INK,anchor='lm'):d.text(pts((x,y)),t,fill=color,font=font(n),anchor=anchor)
def sprite(path,x,y,w,h,tint=None):
 a=Image.open(path).convert('RGBA')
 box=a.getchannel('A').point(lambda v:255 if v>32 else 0).getbbox()
 if tint:
  color=Image.new("RGBA",a.size,tint);color.putalpha(a.getchannel("A"));a=color
 a=a.crop(box);a.thumbnail(pts((w,h)),Image.Resampling.LANCZOS)
 im.alpha_composite(a,(round(x*S-a.width/2),round(y*S-a.height)))
def fit(width,phase):
 global im,d
 evening=phase=='evening'
 im=Image.new('RGBA',pts((width,810)),'#1B2449' if evening else '#FCF4E6');d=ImageDraw.Draw(im)
 fg='#FFF6E6' if evening else INK
 chip='#35416D' if evening else '#F3E7D0'
 for i,(icon,num) in enumerate(zip(['honey','drop','jelly','pollen','fragment'],['1240','400','12','86','27'])):
  x=10+i*(width-55)/5;w=(width-65)/5
  rr((x,12,x+w,43),11,chip)
  sprite(A/(icon+'.webp'),x+11,36,16,17)
  txt(x+22,28,num,10,fg)
 rr((width-44,12,width-10,43),10,chip)
 sprite(A/'gear.webp',width-27,37,21,21,fg)
 txt(19,73,'Улей',19,fg)
 rr((width-169,56,width-12,89),13,chip);rr((width-86,59,width-15,86),10,'#FFD384')
 txt(width-130,73,'Соты',12,fg,'mm');txt(width-50,73,'Сад',12,INK,'mm')
 x0=12;sw=width-24;top=105;sh=565
 path=O.parent/'work/buzzle/design/art/winter-unified-v3/baseline'/('winter-'+phase)/'garden.png'
 bg=ImageOps.fit(Image.open(path).convert('RGBA'),pts((sw,sh)),method=Image.Resampling.LANCZOS)
 mask=Image.new('L',bg.size);ImageDraw.Draw(mask).rounded_rectangle((0,0,bg.width-1,bg.height-1),20*S,255)
 im.paste(bg,pts((x0,top)),mask)
 rr((24,117,180,149),12,'#31395E' if evening else '#FFF5DF')
 txt(35,133,'Сад · 4 грядки',13,fg)
 sprite(O/'buzzle-winter-decor-v6/deco_winter_snowman.png',sw*.25+x0,238,60,75)
 sprite(O/'buzzle-winter-gift-sled-v1/deco_winter_gift_sled.png',sw*.75+x0,239,97,70)
 for i,(name,plant,state,w,h) in enumerate([
 ('Морозник','hellebore_bloom','wet',91,115),('Пуансеттия','poinsettia_bloom','wet',98,112),
 ('Бутон','hellebore_bud','dry',84,94),('Росток','poinsettia_sprout','dry',59,65)]):
  x=x0+sw*(.285 if i%2==0 else .715)
  y=388 if i<2 else 553
  sprite(O/f'buzzle-winter-garden-beds-v1/bed-winter-{state}.png',x,y,sw*.39,41)
  sprite(O/f'buzzle-winter-plants-v{1 if i<2 else 2}'/(plant+'.png'),x,y-17,w,h)
  rr((x-55,y+10,x+55,y+35),9,'#31395E' if evening else '#FFF5DF')
  txt(x,y+22,name,12,fg,'mm')
 rr((38,641,width-38,697),17,'#FFD384')
 sprite(O/'buzzle-winter-garden-tools-v1/garden_winter_can.png',width/2-56,682,31,31)
 txt(width/2+11,669,'Полить всё',16,INK,'mm')
 rr((12,734,width-12,794),20,'#31395E' if evening else '#FFFAEF')
 for i,(icon,t) in enumerate(zip(['hive','puzzle','bee','box','tasks'],['Улей','Играть','Пчёлы','Сюрпризы','Задания'])):
  x=12+(i+.5)*(width-24)/5
  if i==0:rr((x-29,738,x+29,789),14,'#FFD384')
  sprite(A/f'tab_{icon}.webp',x,767,24,24,INK if i==0 else fg);txt(x,779,t,10,INK if i==0 else fg,'mm')
 return im.convert('RGB')
day=fit(360,'day');night=fit(390,'evening')
day.save(P/'garden-day-360.png');night.save(P/'garden-evening-390.png')
board=Image.new('RGB',(1580,1758),'#ECE7DA')
d=ImageDraw.Draw(board)
txt(24,22,'Buzzle · зимний сад',16)
txt(24,44,'День · 360 px',12);txt(396,44,'Вечер · 390 px',12)
board.paste(day,(24,108));board.paste(night,(770,108))
board.save(P/'preview.png')
