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
 im=fit(src);im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 webp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,bg);b=a.copy();a.alpha_composite(im);b.alpha_composite(webp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':[1024,1024],'alpha':list(im.getchannel('A').getextrema()),'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1500,1170),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,20),'Buzzle · хвойный венок · три ракурса',font=font,fill='#4A2C12');d.rectangle((0,515,1500,1010),fill='#171340')
for ext in ['png','webp']:
 shutil.copy2(R/('outputs/buzzle-winter-wardrobe-v5/zhuzha-winter-wreath-front.'+ext),P/('zhuzha-winter-wreath-front.'+ext))
items=[(P/'zhuzha-winter-wreath-front.png','Анфас / из v5'),(P/'zhuzha-winter-wreath-q3-front.png','Три четверти / новая'),(P/'zhuzha-winter-wreath-side.png','Профиль / новый')]
for col,(path,title) in enumerate(items):
 art=fit(path).resize((420,420),Image.Resampling.LANCZOS)
 for y,color in [(65,'#4A2C12'),(535,'#FFF6E3')]:
  board.paste(art,(col*500+40,y),art);d.text((col*500+25,y+405),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  im=fit(path).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*500+140+j*145,1020+(96-size)//2),im)
 d.text((col*500+25,1130),'64 / 96 px',font=small,fill='#4A2C12')
comparison=Image.new('RGB',(1200,730),'#FFF6E3');cd=ImageDraw.Draw(comparison)
cd.text((25,15),'Профиль · исходные крылья и примерка венка',font=font,fill='#4A2C12')
for i,(path,label) in enumerate([(R/'outputs/zhuzha-turnaround-approved-front/side.png','Жужа / исходный профиль'),(P/'zhuzha-winter-wreath-side.png','С венком / кандидат')]):
 art=fit(path).resize((590,590),Image.Resampling.LANCZOS);comparison.paste(art,(i*600+5,65),art);cd.text((i*600+25,675),label,font=font,fill='#4A2C12')
comparison.save(P/'profile-compare.png')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('# Зимний гардероб v6 · хвойный венок, три ракурса\n\n29.10.2026. Кандидаты на просмотр.\n\n- zhuzha-winter-wreath-q3-front.png / .webp — новая примерка в три четверти.\n- zhuzha-winter-wreath-side.png / .webp — новая примерка в профиль вправо.\n- zhuzha-winter-wreath-front.png / .webp — исходная примерка анфас из v5, скопирована без изменений.\n- preview.png — три ракурса, светлый/ночной фон и 64/96 px.\n- profile-compare.png — канонический профиль Жужи рядом с новой примеркой для оценки крыльев и усиков.\n\nPNG 1024×1024 RGBA, lossless WebP. Две новые цельные примерки, не отдельные слои аксессуара. Канонические side.png и q3-front.png использованы как источники геометрии, фронт v5 — как источник дизайна венка. Возможны отличия граней и деталей при генерации; канонические изображения не заменены.\n\nНезависимые слои венка/тела/крыльев, задние ракурсы, примерки на других пчёлах и анимация пока не подготовлены. Примерка банта в профиль и три четверти остаётся отдельным следующим набором.\n\nsources/ — оригиналы; generation.json — точные промпты и референсы; checks.json — размеры/альфа и совпадение PNG/WebP. После imagegen только прозрачные поля, пропорциональный размер и листы сравнения. Production assets/ и src/ не менялись.\n')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-wardrobe-v6',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 if 'winter-wardrobe-v6' not in s:
  s=s.replace('Хвойный венок и праздничный бант — анфас (winter-wardrobe-v5), на просмотре.','Хвойный венок и праздничный бант — анфас (winter-wardrobe-v5), венок в три четверти и профиль (winter-wardrobe-v6), на просмотре.')
 status.write_text(s)

print(json.dumps(checks))
