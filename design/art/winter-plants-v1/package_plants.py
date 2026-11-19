# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent;M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True);checks={};layout={}
def fit(path):
 im=Image.open(path).convert('RGBA');b=im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();b=(max(0,b[0]-8),max(0,b[1]-8),min(im.width,b[2]+8),min(im.height,b[3]+8));obj=im.crop(b);scale=min(864/obj.width,864/obj.height);obj=obj.resize((round(obj.width*scale),round(obj.height*scale)),Image.Resampling.LANCZOS);out=Image.new('RGBA',(1024,1024));out.alpha_composite(obj,((1024-obj.width)//2,944-obj.height));return out
for key,item in M.items():
 src=Path(item['source']);shutil.copy2(src,P/'sources'/(key+'-source.png'));im=fit(src);name=key+'_bloom';im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 for color in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,color);b=a.copy();a.alpha_composite(im);b.alpha_composite(Image.open(P/(name+'.webp')).convert('RGBA'));assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':[1024,1024],'alpha':list(im.getchannel('A').getextrema()),'pngWebpMatch':True}
 layout[name]={'canvas':[1024,1024],'plantingAnchor':[512,944],'note':'Align visible stem bottom to bed planting point; scale image and anchor uniformly.'}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28);small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
repo=Path('/Users/oleksandrzabolotnyi/buzzle');items=[(repo/'assets/art/garden/sunflower_bloom.webp','Подсолнух / в игре'),(repo/'assets/art/garden/moonpoppy_bloom.webp','Лунный мак / в игре'),(P/'hellebore_bloom.png','Морозник / новый'),(P/'poinsettia_bloom.png','Пуансеттия / новая')]
board=Image.new('RGB',(1600,1210),'#FFF6E3');d=ImageDraw.Draw(board);d.text((25,20),'Buzzle · зимние растения · взрослые формы',font=font,fill='#4A2C12');d.rectangle((0,520,1600,1030),fill='#171340')
for i,(path,title) in enumerate(items):
 art=fit(path);art.thumbnail((380,390),Image.Resampling.LANCZOS)
 for y,color in [(85,'#4A2C12'),(560,'#FFF6E3')]:
  board.paste(art,(i*400+(400-art.width)//2,y),art);d.text((i*400+15,y+390),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  art=fit(path);art.thumbnail((size,size),Image.Resampling.LANCZOS);board.paste(art,(i*400+130+j*135,1060+(96-art.height)//2),art)
 d.text((i*400+15,1170),'64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2));(P/'layout.json').write_text(json.dumps(layout,indent=2))
(P/'README.ru.md').write_text('''# Зимние растения · взрослые формы

29.10.2026. Кандидаты на просмотр, не подключены к игре.

- hellebore_bloom.png — морозник: пять кремовых лепестков с нежно-розовыми краями, светло-зелёная сердцевина и медовые тычинки.
- poinsettia_bloom.png — пуансеттия: клюквенно-красная розетка с медовой сердцевиной и зелёными листьями.
- Оба PNG 1024×1024 RGBA, рядом lossless WebP. Без горшка, почвы и встроенной грядки.
- layout.json — общая точка посадки (512,944) в полном холсте, для последующего размещения на грядке. Масштабировать вместе с изображением.
- preview.png — рядом с существующими подсолнухом и лунным маком, светлый/ночной фон и размеры 64/96 px.
- sources/ — исходные генерации; generation.json — точные промпты, checks.json — размеры/альфа и проверка экспортов.

Встроенный imagegen. Стиль сверялся с assets/art/garden/sunflower_bloom.webp, moonpoppy_bloom.webp и mint_bloom.webp. После генерации только прозрачные поля, пропорциональное масштабирование, экспорт и обзорный лист; без перекрашивания. Исходные садовые ассеты не менялись.

Пока готовы только взрослые формы. Семена/пакетики, ростки, бутоны, цветовые/нектарные индикаторы и анимации не нарисованы. Игровые бонусы и стоимость не назначены. Следующий шаг — ранние стадии роста после оценки внешнего вида. Production assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-plants-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text().replace('| Растения | Отдельные зимние растения ещё не нарисованы | Морозник и пуансеттия: семена, росток, зрелое растение |','| Растения | Взрослые морозник и пуансеттия: winter-plants-v1, на просмотре | Семена/пакетики, ростки и бутоны; размещение/экспорт после выбора |');status.write_text(s)
print(json.dumps({'newPlants':2,'checks':checks},ensure_ascii=False))
