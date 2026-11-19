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
 scale=min(1360/im.width,540/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(1536,768));out.alpha_composite(im,((1536-im.width)//2,(768-im.height)//2));return out
for name,item in M.items():
 src=Path(item['source']);shutil.copy2(src,P/'sources'/(name+'-source.png'))
 im=fit(src);im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 webp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,bg);b=a.copy();a.alpha_composite(im);b.alpha_composite(webp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':[1536,768],'alpha':list(im.getchannel('A').getextrema()),'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),26)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1600,1170),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,20),'Buzzle · зимние грядки · сухая / политая',font=font,fill='#4A2C12');d.rectangle((0,370,1600,720),fill='#171340')
repo=Path('/Users/oleksandrzabolotnyi/buzzle')
items=[(repo/'assets/art/env/bed_dry.webp','Текущая / сухая'),(P/'bed-winter-dry.png','Зимняя / сухая'),(repo/'assets/art/env/bed_wet.webp','Текущая / политая'),(P/'bed-winter-wet.png','Зимняя / политая')]
for col,(path,title) in enumerate(items):
 art=fit(path).resize((390,195),Image.Resampling.LANCZOS)
 for y,color in [(100,'#4A2C12'),(440,'#FFF6E3')]:
  board.paste(art,(col*400+5,y),art);d.text((col*400+15,y+205),title,font=font,fill=color)
d.text((25,745),'Примерка растений · масштаб условный',font=font,fill='#4A2C12')
for col,(bed,plant) in enumerate([('bed-winter-dry','hellebore'),('bed-winter-wet','poinsettia')]):
 x=col*800
 im=Image.open(P/(bed+'.png')).convert('RGBA').resize((620,310),Image.Resampling.LANCZOS)
 board.paste(im,(x+90,850),im)
 flower=Image.open(R/('outputs/buzzle-winter-plants-v1/'+plant+'_bloom.png')).convert('RGBA').resize((250,250),Image.Resampling.LANCZOS)
 board.paste(flower,(x+275,780),flower)
 d.text((x+35,1120),'Морозник / сухая' if col==0 else 'Пуансеттия / политая',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Зимние грядки v1

29.10.2026. Варианты на просмотр, не импортированы в игру.

- bed-winter-dry.png / .webp — низкая медовая грядка, светлая сухая почва и небольшие снежные шапки на краях.
- bed-winter-wet.png / .webp — тот же тип грядки с более тёмной политой почвой.
- preview.png — рядом с существующими грядками на светлом/ночном фоне и условные примерки морозника/пуансеттии.

PNG 1536×768 RGBA, lossless WebP. Без растений и фона. Снег по краям, почва открыта. Источники стиля: assets/art/env/bed_dry.webp и bed_wet.webp. sources/ хранит оригиналы; generation.json — промпты и референсы; checks.json — технические проверки. После генерации только прозрачные поля, пропорциональное масштабирование и обзорный лист.

Две независимые генерации: форма основания и снег могут различаться. Для production-переключения dry/wet после выбора нужно зафиксировать единое основание/снег и менять слой почвы, иначе возможен скачок контура. Примерки иллюстрируют сочетание ассетов и не задают проверенные игровые координаты. Посадочные точки и масштаб проверять в фактическом контейнере сада. Production assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-garden-beds-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 if '| Зимние грядки |' not in s:
  anchor='| Растения |';i=s.index(anchor)
  s=s[:i]+'| Зимние грядки | Сухая и политая: winter-garden-beds-v1, на просмотре | Выбрать вид; единое основание/снег, слой почвы и проверка в саду |\n'+s[i:]
 status.write_text(s)
print(json.dumps(checks))
