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
for species,folder in [('snow','buzzle-winter-bees-v2'),('gingerbread','buzzle-winter-bees-v3')]:
 for angle in ['front','q3-front','side']:
  for ext in ['png','webp']:
   name='bee-'+species+'-'+angle+'.'+ext;source=R/'outputs'/folder/name;shutil.copy2(source,P/name);assert source.read_bytes()==(P/name).read_bytes()
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1500,1170),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,20),'Buzzle · зимние пчёлы · вид сзади',font=font,fill='#4A2C12');d.rectangle((0,515,1500,1010),fill='#171340')
items=[(R/'outputs/zhuzha-turnaround-approved-front/back.png','Жужа / исходный вид сзади'),(P/'bee-snow-back.png','Снежная / вид сзади'),(P/'bee-gingerbread-back.png','Пряничная / вид сзади')]
for col,(path,title) in enumerate(items):
 art=fit(path).resize((420,420),Image.Resampling.LANCZOS)
 for y,color in [(65,'#4A2C12'),(535,'#FFF6E3')]:
  board.paste(art,(col*500+40,y),art);d.text((col*500+25,y+405),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  im=fit(path).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*500+140+j*145,1020+(96-size)//2),im)
 d.text((col*500+25,1130),'64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
turn=Image.new('RGB',(2000,1230),'#FFF6E3');td=ImageDraw.Draw(turn)
td.text((25,20),'Buzzle · зимние пчёлы · четыре ракурса',font=font,fill='#4A2C12')
for row,(species,title) in enumerate([('snow','Снежная'),('gingerbread','Пряничная')]):
 for col,(angle,label) in enumerate([('front','Анфас'),('q3-front','Три четверти'),('side','Профиль'),('back','Сзади')]):
  im=Image.open(P/('bee-'+species+'-'+angle+'.png')).convert('RGBA').resize((430,430),Image.Resampling.LANCZOS)
  turn.paste(im,(col*500+35,row*570+90),im);td.text((col*500+25,row*570+535),title+' / '+label,font=font,fill='#4A2C12')
turn.save(P/'turnaround.png')
(P/'README.ru.md').write_text('# Зимние пчёлы v4 · виды сзади и общий разворот\n\n29.10.2026. Кандидаты на просмотр, не выбранные и не подключённые персонажи.\n\nНовые изображения:\n- bee-snow-back.png / .webp — снежная пчёлка, строго сзади.\n- bee-gingerbread-back.png / .webp — пряничная пчёлка, строго сзади.\n\nДля удобства в набор скопированы без изменения анфас, три четверти и профиль обеих пчёл из v2/v3. Всего восемь PNG и восемь WebP. Каждый PNG 1024×1024 RGBA, WebP без потерь.\n\n- preview.png — два новых вида рядом с исходным видом Жужи сзади, светлый/ночной фон, 64/96 px.\n- turnaround.png — обе пчёлки по четыре ракурса: анфас, три четверти, профиль, сзади.\n\nСнежинка снежной и пуговки пряничной относятся к передней части тела и сзади не дублируются. У пряничной глазурь продолжается по краю полоски, у снежной сохранена кремово-черничная палитра. Исходный back.png Жужи — референс геометрии, анфас v1 — референс дизайна.\n\nЭто цельные концепт-спрайты. Четыре ракурса не являются совмещёнными кадрами анимации. Задние три четверти, вид сверху, независимые слои тела/крыльев, примерки нарядов и игровое подключение пока не подготовлены. Редкость, бонусы, имена и способ получения не назначены.\n\nsources/ хранит две новые оригинальные генерации, generation.json — их промпты/референсы. Промпты ранних ракурсов остаются в v1–v3. checks.json — технические проверки новых экспортов. Копирование ранних изображений проверено побайтно. После imagegen только поля, пропорциональный размер и обзорные листы. Production assets/ и src/ не менялись.\n')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-bees-v4',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 if 'winter-bees-v4' not in s:
  s=s.replace('Снежная и пряничная анфас v1; снежная в трёх ракурсах v2, пряничная в трёх ракурсах winter-bees-v3, на просмотре','Снежная и пряничная: анфас/три четверти/профиль v1–v3 и вид сзади winter-bees-v4, на просмотре')
 status.write_text(s)

print(json.dumps(checks))
