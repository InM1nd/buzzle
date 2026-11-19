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
d.text((25,20),'Buzzle · пряничная пчёлка · три ракурса',font=font,fill='#4A2C12');d.rectangle((0,515,1500,1010),fill='#171340')
for ext in ['png','webp']:
 shutil.copy2(R/('outputs/buzzle-winter-bees-v1/bee-gingerbread-front.'+ext),P/('bee-gingerbread-front.'+ext))
items=[(P/'bee-gingerbread-front.png','Анфас / из v1'),(P/'bee-gingerbread-q3-front.png','Три четверти / новая'),(P/'bee-gingerbread-side.png','Профиль / новый')]
for col,(path,title) in enumerate(items):
 art=fit(path).resize((420,420),Image.Resampling.LANCZOS)
 for y,color in [(65,'#4A2C12'),(535,'#FFF6E3')]:
  board.paste(art,(col*500+40,y),art);d.text((col*500+25,y+405),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  im=fit(path).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*500+140+j*145,1020+(96-size)//2),im)
 d.text((col*500+25,1130),'64 / 96 px',font=small,fill='#4A2C12')
comparison=Image.new('RGB',(1200,730),'#FFF6E3');cd=ImageDraw.Draw(comparison)
cd.text((25,15),'Профиль · геометрия Жужи и пряничная пчёлка',font=font,fill='#4A2C12')
for i,(path,label) in enumerate([(R/'outputs/zhuzha-turnaround-approved-front/side.png','Жужа / исходный профиль'),(P/'bee-gingerbread-side.png','Пряничная / кандидат')]):
 art=fit(path).resize((590,590),Image.Resampling.LANCZOS);comparison.paste(art,(i*600+5,65),art);cd.text((i*600+25,675),label,font=font,fill='#4A2C12')
comparison.save(P/'profile-compare.png')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
both=Image.new('RGB',(1500,1150),'#FFF6E3');bd=ImageDraw.Draw(both)
bd.text((25,20),'Buzzle · зимние пчёлы · сравнение направлений',font=font,fill='#4A2C12')
for row,(folder,prefix,title) in enumerate([(R/'outputs/buzzle-winter-bees-v2','bee-snow','Снежная'),(P,'bee-gingerbread','Пряничная')]):
 for col,(angle,label) in enumerate([('front','Анфас'),('q3-front','Три четверти'),('side','Профиль')]):
  art=Image.open(folder/(prefix+'-'+angle+'.png')).convert('RGBA').resize((420,420),Image.Resampling.LANCZOS)
  both.paste(art,(col*500+40,row*530+75),art);bd.text((col*500+25,row*530+500),title+' / '+label,font=font,fill='#4A2C12')
both.save(P/'both-bees.png')
(P/'README.ru.md').write_text('# Зимние пчёлы v3 · пряничная, три ракурса\n\n29.10.2026. Кандидаты на просмотр. Снежная альтернатива сохранена в winter-bees-v2.\n\n- bee-gingerbread-q3-front.png / .webp — новый ракурс в три четверти.\n- bee-gingerbread-side.png / .webp — новый профиль вправо.\n- bee-gingerbread-front.png / .webp — анфас из v1, скопирован без изменений.\n- preview.png — три ракурса на светлом/ночном фоне, 64/96 px.\n- profile-compare.png — профиль исходной Жужи рядом с пряничной.\n- both-bees.png — снежная и пряничная рядом во всех трёх ракурсах.\n\nPNG 1024×1024 RGBA, lossless WebP. Сохранены медово-коричная палитра, шоколадные полоски, светлая глазурь и передние пуговки. Исходные ракурсы Жужи задают геометрию крыльев/усиков, анфас v1 — дизайн персонажа.\n\nЭто цельные концепты, не отдельные тело/крылья. Возможны отличия граней при генерации, канонические изображения не заменены. Задние ракурсы, слои для анимации, примерки нарядов, игровые свойства и способ получения пока не подготовлены и не назначены.\n\nsources/ — оригиналы; generation.json — точные промпты и референсы; checks.json — размеры/альфа и совпадение PNG/WebP. После imagegen только поля, пропорциональный размер и обзорные листы. Production assets/ и src/ не менялись.\n')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-bees-v3',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 if 'winter-bees-v3' not in s:
  s=s.replace('Снежная и пряничная анфас v1; снежная в трёх ракурсах winter-bees-v2, на просмотре','Снежная и пряничная анфас v1; снежная в трёх ракурсах v2, пряничная в трёх ракурсах winter-bees-v3, на просмотре')
 status.write_text(s)

print(json.dumps(checks))
