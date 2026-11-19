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
d.text((25,20),'Buzzle · зимняя пчела · два направления',font=font,fill='#4A2C12');d.rectangle((0,515,1500,1010),fill='#171340')
items=[(R/'outputs/hive-run/assets/zhuzha.png','Жужа / исходная'),(P/'bee-snow-front.png','Снежная / концепт A'),(P/'bee-gingerbread-front.png','Пряничная / концепт B')]
for col,(path,title) in enumerate(items):
 art=fit(path).resize((420,420),Image.Resampling.LANCZOS)
 for y,color in [(65,'#4A2C12'),(535,'#FFF6E3')]:
  board.paste(art,(col*500+40,y),art);d.text((col*500+25,y+405),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  im=fit(path).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*500+140+j*145,1020+(96-size)//2),im)
 d.text((col*500+25,1130),'64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Зимняя пчела · концепты v1

29.10.2026. Два направления на просмотр. Не утверждённые новые виды и не замена Жуже.

- bee-snow-front.png / .webp — снежная пчёлка: кремовое тело, приглушённые черничные полоски, светлые крылья.
- bee-gingerbread-front.png / .webp — пряничная пчёлка: медово-коричное тело, шоколадные полоски и немного кремовой глазури.
- preview.png — два концепта рядом с канонической Жужей на светлом/ночном фоне, 64/96 px.

Каждый спрайт PNG 1024×1024 RGBA, lossless WebP. Фон прозрачный. sources/ — оригиналы; generation.json — промпты/референс; checks.json — технические проверки. После генерации только поля, пропорциональное масштабирование и лист сравнения.

Это цельные анфас-концепты. Крылья, тело и усики ещё не выделены в независимые слои; профиль, три четверти, задний вид и примерки нарядов не подготовлены. После выбора направления нужны разворот и слои с проверкой корней крыльев. Игровые свойства, редкость, имя и способ получения не назначались. Production assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-bees-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 s=s.replace('| Зимняя пчела | Отдельного концепта пока нет | Несколько вариантов на выбор, затем исходные слои и ракурсы |','| Зимняя пчела | Снежная и пряничная, анфас-концепты winter-bees-v1, на просмотре | Выбрать направление; затем ракурсы, слои и примерки |')
 status.write_text(s)
print(json.dumps(checks))
