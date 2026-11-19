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
 im=Image.open(src).convert('RGBA').resize((1024,1024),Image.Resampling.LANCZOS) if name=='winter-reward-sparkle' else fit(src)
 im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 webp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,bg);b=a.copy();a.alpha_composite(im);b.alpha_composite(webp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':[1024,1024],'alpha':list(im.getchannel('A').getextrema()),'pngWebpVisibleMatch':True}
 if name=='winter-reward-sparkle':
  checks[name]['centerAlpha']=im.getpixel((512,512))[3]
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),27)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1500,1190),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,20),'Buzzle · адвент · раскрытый подарок и искры',font=font,fill='#4A2C12');d.rectangle((0,515,1500,1030),fill='#171340')
items=[(R/'outputs/buzzle-winter-advent-v1/advent-gift-wrapped.png','Подарок / закрыт'),(P/'advent-gift-open.png','Подарок / раскрыт'),(P/'winter-reward-sparkle.png','Искры / отдельный слой')]
for col,(path,title) in enumerate(items):
 art=Image.open(path).convert('RGBA').resize((420,420),Image.Resampling.LANCZOS)
 for y,color in [(65,'#4A2C12'),(570,'#FFF6E3')]:
  board.paste(art,(col*500+40,y),art);d.text((col*500+25,y+405),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  im=Image.open(path).convert('RGBA').resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*500+140+j*145,1040+(96-size)//2),im)
 d.text((col*500+25,1150),'64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Адвент Buzzle v3 · открытый подарок и эффект награды

29.10.2026. Новые варианты на просмотр, не подключены к игре.

- advent-gift-open.png / .webp — раскрытая кремовая подарочная коробка с красной лентой, крышка с бантом позади. Внутри нет нарисованной награды.
- winter-reward-sparkle.png / .webp — отдельный слой медовых искр и светлых снежинок с пустым центром.
- preview.png — закрытый подарок из v1, новый раскрытый и эффект на светлом/ночном фоне, малые размеры.

PNG 1024×1024 RGBA, lossless WebP. У эффекта сохранена композиция полного исходного холста, центр (512,512); его можно масштабировать/затухать над наградой. Это статичная текстура, движение и тайминг добавляет игра. Награда рендерится отдельным объектом. Текст и игровые свойства не назначались.

Раскрытая коробка — самостоятельный концепт, не pixel-aligned кадр к закрытой. Общая нормализация не фиксирует основание и масштаб между генерациями. Для анимации открытия нужны совмещённое основание, отдельные крышка/бант и якоря. Не обещает готовую покадровую анимацию.

sources/ — оригиналы; generation.json — промпты/референс; checks.json — альфа, размеры и совпадение PNG/WebP на светлом/ночном фоне. После imagegen только поля, пропорциональное масштабирование и обзорный лист. Production assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-advent-v3',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 s=s.replace('Подарок/открытка v1, закрытый/раскрытый конверт-сота v2, на просмотре; общие UI-концепты','Подарок/открытка v1, конверт-сота v2, раскрытый подарок и искры v3, на просмотре').replace('Выбор оформления и состава; примерка сетки, UI-статусы, совмещение/слои раскрытия, открытие подарка','Выбор оформления и состава; примерка сетки, UI-статусы, совмещение/слои раскрытия и анимация')
 status.write_text(s)
print(json.dumps(checks))
