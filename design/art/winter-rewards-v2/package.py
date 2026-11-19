# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
checks={}
def fit(path):
 im=Image.open(path).convert('RGBA');b=im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();assert b
 im=im.crop((max(0,b[0]-8),max(0,b[1]-8),min(im.width,b[2]+8),min(im.height,b[3]+8)))
 scale=min(860/im.width,860/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(1024,1024));out.alpha_composite(im,((1024-im.width)//2,(1024-im.height)//2));return out
for name,item in M.items():
 src=Path(item['source']);shutil.copy2(src,P/'sources'/(name+'-source.png'))
 im=fit(src);im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 webp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,bg);b=a.copy();a.alpha_composite(im);b.alpha_composite(webp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':[1024,1024],'alpha':list(im.getchannel('A').getextrema()),'pngWebpVisibleMatch':True}
for name in ['reward_winter_honey','reward_winter_pollen']:
 for ext in ['png','webp']:
  src=R/'outputs/buzzle-winter-rewards-v1'/(name+'.'+ext);shutil.copy2(src,P/src.name);assert src.read_bytes()==(P/src.name).read_bytes()
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),27)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1800,1210),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,15),'Buzzle · зимние награды · нектар, молочко и фрагмент',font=font,fill='#4A2C12');d.rectangle((0,500,1800,1005),fill='#171340')
repo=Path('/Users/oleksandrzabolotnyi/buzzle/assets/art')
items=[('reward_winter_nectar','drop.webp','Нектар'),('reward_winter_jelly','jelly.webp','Маточное молочко'),('reward_winter_fragment','fragment.webp','Фрагмент')]
for col,(name,file,title) in enumerate(items):
 for y,color in [(65,'#4A2C12'),(525,'#FFF6E3')]:
  d.text((col*600+25,y),title,font=font,fill=color)
  for j,path in enumerate([repo/file,P/(name+'.png')]):
   im=fit(path).resize((280,280),Image.Resampling.LANCZOS);board.paste(im,(col*600+10+j*300,y+45),im)
   d.text((col*600+25+j*300,y+350),'В игре' if j==0 else 'Зимний вариант',font=font,fill=color)
 for j,size in enumerate([48,64,96]):
  im=Image.open(P/(name+'.png')).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*600+150+j*125,1035+(96-size)//2),im)
 d.text((col*600+25,1160),'48 / 64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png')
all_items=[('reward_winter_honey','Мёд'),('reward_winter_pollen','Пыльца'),('reward_winter_nectar','Нектар'),('reward_winter_jelly','Маточное молочко'),('reward_winter_fragment','Фрагмент')]
overview=Image.new('RGB',(1500,1050),'#FFF6E3');od=ImageDraw.Draw(overview)
od.text((25,15),'Buzzle · пять праздничных наград',font=font,fill='#4A2C12')
for i,(name,title) in enumerate(all_items):
 col=i%3;row=i//3;im=Image.open(P/(name+'.png')).resize((390,390),Image.Resampling.LANCZOS)
 overview.paste(im,(col*500+55,row*480+60),im);od.text((col*500+25,row*480+450),title,font=font,fill='#4A2C12')
overview.save(P/'all-rewards.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Зимние награды v2 · полный набор из пяти ресурсов

30.10.2026. Кандидаты для зимних окон наград, не новые валюты.

Новые: reward_winter_nectar.png / .webp — жёлтая капля нектара; reward_winter_jelly.png / .webp — сиреневая капля маточного молочка; reward_winter_fragment.png / .webp — фиолетовый фрагмент с пчелой. Праздничные ленты не перекрывают основной цвет/символ.

Мёд и пыльца скопированы из v1 без изменений, копирование проверено побайтно. Все пять PNG 1024×1024 RGBA, рядом lossless WebP.

- preview.png — три новых варианта рядом с текущими иконками, светлый/ночной фон и 48/64/96 px.
- all-rewards.png — все пять праздничных наград на одном листе.
- sources/ — три новые генерации; generation.json — их промпты/референсы; checks.json — проверки новых экспортов.

Референсы: assets/art/drop.webp, jelly.webp, fragment.webp и подарочный мёд из v1. Текущие HUD-иконки не заменены. Размеры наград, цены, экономика, сохранения и игровая логика не менялись. После imagegen только поля, пропорциональное масштабирование и листы сравнения. Production assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-rewards-v2',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text().replace('Праздничные мёд и пыльца: winter-rewards-v1, на просмотре','Пять праздничных ресурсов: winter-rewards-v1/v2, на просмотре');status.write_text(s)
print(json.dumps(checks))
