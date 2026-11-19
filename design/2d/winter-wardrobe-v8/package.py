# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
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
 if item.get('draftSource'):shutil.copy2(item['draftSource'],P/'sources'/(name+'-draft-missing-band.png'))
 im=fit(src);im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 webp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,bg);b=a.copy();a.alpha_composite(im);b.alpha_composite(webp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':[1024,1024],'alpha':list(im.getchannel('A').getextrema()),'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1500,1170),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,20),'Buzzle · праздничный комплект · три ракурса',font=font,fill='#4A2C12');d.rectangle((0,515,1500,1010),fill='#171340')
items=[(P/'zhuzha-winter-festive-set-front.png','Анфас / комплект'),(P/'zhuzha-winter-festive-set-q3-front.png','Три четверти / комплект'),(P/'zhuzha-winter-festive-set-side.png','Профиль / комплект')]
for col,(path,title) in enumerate(items):
 art=fit(path).resize((420,420),Image.Resampling.LANCZOS)
 for y,color in [(65,'#4A2C12'),(535,'#FFF6E3')]:
  board.paste(art,(col*500+40,y),art);d.text((col*500+25,y+405),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  im=fit(path).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*500+140+j*145,1020+(96-size)//2),im)
 d.text((col*500+25,1130),'64 / 96 px',font=small,fill='#4A2C12')
comparison=Image.new('RGB',(1200,730),'#FFF6E3');cd=ImageDraw.Draw(comparison)
cd.text((25,15),'Профиль · исходная Жужа и праздничный комплект',font=font,fill='#4A2C12')
for i,(path,label) in enumerate([(R/'outputs/zhuzha-turnaround-approved-front/side.png','Жужа / исходный профиль'),(P/'zhuzha-winter-festive-set-side.png','Комплект / кандидат')]):
 art=fit(path).resize((590,590),Image.Resampling.LANCZOS);comparison.paste(art,(i*600+5,65),art);cd.text((i*600+25,675),label,font=font,fill='#4A2C12')
comparison.save(P/'profile-compare.png')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('# Зимний гардероб v8 · венок и бант вместе\n\n29.10.2026. Три новые цельные примерки праздничного комплекта, на просмотре.\n\n- zhuzha-winter-festive-set-front.png / .webp — анфас.\n- zhuzha-winter-festive-set-q3-front.png / .webp — три четверти.\n- zhuzha-winter-festive-set-side.png / .webp — профиль вправо.\n- preview.png — комплект в трёх ракурсах на светлом/ночном фоне и 64/96 px.\n- profile-compare.png — исходный профиль рядом с комплектом.\n\nДизайн объединяет хвойный венок из v6 и кремово-золотой бант с красной лентой из v7. Оба исходных отдельных набора сохранены без замены. PNG 1024×1024 RGBA, lossless WebP; прозрачный фон.\n\nЭто цельные визуальные примерки, не отдельные слои нарядов и не готовая анимация. При генерации возможны отличия граней и пропорций. Задние ракурсы, другие пчёлы и выделение тела/крыльев/нарядов пока не подготовлены. Не считать сочетание технически подключённым в игру.\n\nsources/ — исходные генерации; generation.json — промпты и референсы; checks.json — размеры/альфа и совпадение PNG/WebP на светлом/ночном фоне. После imagegen только прозрачные поля, пропорциональный размер и листы сравнения. Production assets/ и src/ не менялись.\n')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-wardrobe-v8',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 if 'winter-wardrobe-v8' not in s:
  s=s.replace('бант в тех же ракурсах (winter-wardrobe-v7), на просмотре.','бант в тех же ракурсах (winter-wardrobe-v7), комплект венок+бант в трёх ракурсах (winter-wardrobe-v8), на просмотре.')
 status.write_text(s)

print(json.dumps(checks))
