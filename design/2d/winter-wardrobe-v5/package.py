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
d.text((25,20),'Buzzle · праздничные наряды · примерки анфас',font=font,fill='#4A2C12');d.rectangle((0,515,1500,1010),fill='#171340')
items=[(R/'outputs/hive-run/assets/zhuzha.png','Жужа / исходная'),(P/'zhuzha-winter-wreath-front.png','Хвойный венок'),(P/'zhuzha-winter-bow-front.png','Праздничный бант')]
for col,(path,title) in enumerate(items):
 art=fit(path).resize((420,420),Image.Resampling.LANCZOS)
 for y,color in [(65,'#4A2C12'),(535,'#FFF6E3')]:
  board.paste(art,(col*500+40,y),art);d.text((col*500+25,y+405),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  im=fit(path).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*500+140+j*145,1020+(96-size)//2),im)
 d.text((col*500+25,1130),'64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('# Зимний гардероб v5 · венок и праздничный бант\n\n29.10.2026. Примерки на канонической Жуже анфас, кандидаты на просмотр.\n\n- zhuzha-winter-wreath-front.png / .webp — низкий хвойный венок с красными ягодами и медовым акцентом.\n- zhuzha-winter-bow-front.png / .webp — небольшой кремово-золотой бант с красной серединкой ниже улыбки.\n- preview.png — рядом с исходной Жужей, светлый/ночной фон и 64/96 px.\n\nДва цельных спрайта PNG 1024×1024 RGBA и lossless WebP. Это примерки, НЕ отдельные слои аксессуаров. Исходная Жужа не заменена, возможны отличия граней при генерации. Другие ракурсы/пчёлы, независимые крылья и анимации не подготовлены. После оценки посадки нужны отдельные слои и проверка совместимости с другими нарядами.\n\nsources/ — оригиналы, generation.json — промпты/референсы, checks.json — технические проверки. Стиль сверялся с канонической Жужей и зимней ёлкой v2. После imagegen только поля, пропорциональный размер, экспорт и обзорный лист. Production assets/ и src/ не менялись.\n')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-wardrobe-v5',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 marker='Оценить посадку; затем отдельные слои, другие ракурсы/пчёлы.'
 if 'winter-wardrobe-v5' not in s:
  s=s.replace(marker,'Хвойный венок и праздничный бант — анфас (winter-wardrobe-v5), на просмотре. '+marker)
 status.write_text(s)

print(json.dumps(checks))
