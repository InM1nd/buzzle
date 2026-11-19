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
for species,folder in [('snow','buzzle-winter-bees-v5'),('gingerbread','buzzle-winter-bees-v5')]:
 for angle in ['front','q3-front','side','back','q3-back']:
  for ext in ['png','webp']:
   name='bee-'+species+'-'+angle+'.'+ext;source=R/'outputs'/folder/name;shutil.copy2(source,P/name);assert source.read_bytes()==(P/name).read_bytes()
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1500,1170),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,20),'Buzzle · зимние пчёлы · вид сверху',font=font,fill='#4A2C12');d.rectangle((0,515,1500,1010),fill='#171340')
items=[(R/'outputs/zhuzha-turnaround-approved-front/top.png','Жужа / исходный вид сверху'),(P/'bee-snow-top.png','Снежная / сверху'),(P/'bee-gingerbread-top.png','Пряничная / сверху')]
for col,(path,title) in enumerate(items):
 art=fit(path).resize((420,420),Image.Resampling.LANCZOS)
 for y,color in [(65,'#4A2C12'),(535,'#FFF6E3')]:
  board.paste(art,(col*500+40,y),art);d.text((col*500+25,y+405),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  im=fit(path).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*500+140+j*145,1020+(96-size)//2),im)
 d.text((col*500+25,1130),'64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
turn=Image.new('RGB',(3000,1230),'#FFF6E3');td=ImageDraw.Draw(turn)
td.text((25,20),'Buzzle · зимние пчёлы · шесть ракурсов',font=font,fill='#4A2C12')
for row,(species,title) in enumerate([('snow','Снежная'),('gingerbread','Пряничная')]):
 for col,(angle,label) in enumerate([('front','Анфас'),('q3-front','Три четверти'),('side','Профиль'),('back','Сзади'),('q3-back','¾ сзади'),('top','Сверху')]):
  im=Image.open(P/('bee-'+species+'-'+angle+'.png')).convert('RGBA').resize((430,430),Image.Resampling.LANCZOS)
  turn.paste(im,(col*500+35,row*570+90),im);td.text((col*500+25,row*570+535),title+' / '+label,font=font,fill='#4A2C12')
turn.save(P/'turnaround.png')
(P/'README.ru.md').write_text('# Зимние пчёлы v6 · вид сверху и шесть ракурсов\n\n30.10.2026. Кандидаты на просмотр; финальный выбор и игровое подключение не выполнены.\n\nНовые изображения:\n- bee-snow-top.png / .webp — снежная пчёлка, вид сверху.\n- bee-gingerbread-top.png / .webp — пряничная пчёлка, вид сверху.\n\nПредыдущие пять ракурсов обеих пчёл скопированы без изменений из v5, копирование проверено побайтно. Всего 12 PNG 1024×1024 RGBA и 12 lossless WebP.\n\n- preview.png — верхние виды рядом с исходным top.png Жужи, светлый/ночной фон и 64/96 px.\n- turnaround.png — обе серии по шесть ракурсов: анфас, передние три четверти, профиль, сзади, задние три четверти, сверху.\n\nГеометрия и камера — по top.png канонической Жужи. Сверху нет лица, передних значков и пуговиц; сохранены палитры/полоски и глазурь пряничной. Это цельные концепты, не независимые тело/крылья и не совмещённые кадры анимации. Возможны отличия граней/пропорций между генерациями.\n\nДалее нужны выбор направления, при необходимости выравнивание масштаба/геометрии, выделение слоёв и проверка нарядов. Зеркальные направления, игровые параметры и способ получения здесь не назначались. Production assets/ и src/ не менялись.\n\nsources/ — две новые оригинальные генерации; generation.json — их промпты/референсы; checks.json — размеры/альфа и совпадение новых PNG/WebP. Промпты предыдущих видов остаются в v1–v5. После imagegen только поля, пропорциональный размер и обзорные листы.\n')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-bees-v6',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 if 'winter-bees-v6' not in s:
  s=s.replace('Снежная и пряничная: пять ракурсов v1–v5 (winter-bees-v5), на просмотре','Снежная и пряничная: шесть ракурсов v1–v6 (winter-bees-v6), на просмотре')
 status.write_text(s)

print(json.dumps(checks))
