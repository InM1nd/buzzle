# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
checks={}
for name,item in M.items():
 src=Path(item['source']);shutil.copy2(src,P/'sources'/(name+'-source.png'))
 im=Image.open(src).convert('RGBA');b=im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();assert b
 im=im.crop((max(0,b[0]-8),max(0,b[1]-8),min(im.width,b[2]+8),min(im.height,b[3]+8)))
 scale=min(860/im.width,860/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(1024,1024));out.alpha_composite(im,((1024-im.width)//2,(1024-im.height)//2))
 out.save(P/(name+'.png'));out.save(P/(name+'.webp'),lossless=True)
 webp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',out.size,bg);d=a.copy();a.alpha_composite(out);d.alpha_composite(webp)
  assert ImageChops.difference(a,d).convert('RGB').getbbox() is None
 checks[name]={'size':[1024,1024],'alpha':list(out.getchannel('A').getextrema()),'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1400,1270),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,20),'Buzzle · адвент · окошко-конверт',font=font,fill='#4A2C12');d.rectangle((0,550,1400,1100),fill='#171340')
for col,(name,title) in enumerate([('advent-pocket-closed','Закрытый конверт'),('advent-pocket-open','Раскрытый конверт')]):
 art=Image.open(P/(name+'.png')).resize((470,470),Image.Resampling.LANCZOS)
 for y,color in [(65,'#4A2C12'),(605,'#FFF6E3')]:
  board.paste(art,(col*700+115,y),art);d.text((col*700+35,y+445),title,font=font,fill=color)
 for j,size in enumerate([64,96,128]):
  im=Image.open(P/(name+'.png')).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*700+165+j*155,1110+(128-size)//2),im)
 d.text((col*700+35,1230),'64 / 96 / 128 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Адвент Buzzle · конверт-сота v2

29.10.2026. Два концепта окошка на просмотр, без подключения к игре.

- advent-pocket-closed.png / .webp — закрытый кремовый конверт-сота с тонкой красной лентой.
- advent-pocket-open.png / .webp — раскрытый пустой конверт, кандидат для состояния после получения награды.
- preview.png — оба состояния на светлом/ночном фоне и 64/96/128 px.

PNG 1024×1024 RGBA, lossless WebP. Встроенных дат, текста и отметок нет. Номер дня, недоступность, отметку получения, нажатие и подсветку доступного дня добавлять отдельными UI-элементами. Иконку конкретной награды можно наложить в центре при проверке макета; содержимое не назначено. Количество дней и календарная логика не заданы.

Это два самостоятельных концепта, не совмещённые кадры анимации. Общая нормализация холста не фиксирует геометрию бумажного основания между генерациями. После выбора нужно совместить основание/масштаб и отдельно выделить клапаны, если потребуется раскрытие. Прямое переключение может давать скачок.

sources/ — оригинальные генерации, generation.json — промпты и референсы, checks.json — технические проверки. После imagegen только прозрачные поля, пропорциональный размер, экспорт и лист сравнения. Подарок и открытка — winter-advent-v1. Production assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-advent-v2',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 s=s.replace('Подарочная упаковка и открытка Жужи winter-advent-v1, на просмотре; общие UI-концепты','Подарок/открытка v1, закрытый/раскрытый конверт-сота v2, на просмотре; общие UI-концепты').replace('Выбор оформления и состава; окошки/состояния календаря, открытие подарка','Выбор оформления и состава; примерка сетки, UI-статусы, совмещение/слои раскрытия, открытие подарка')
 status.write_text(s)
print(json.dumps(checks))
