# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent;meta=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True);checks={}
for k,item in meta.items():
 src=Path(item['source']);shutil.copy2(src,P/'sources'/(k+'-source.png'));im=Image.open(src).convert('RGBA');assert im.width==im.height;im=im.resize((1024,1024),Image.Resampling.LANCZOS);name='zhuzha-winter-'+k+'-front';im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 for color in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,color);b=a.copy();a.alpha_composite(im);b.alpha_composite(Image.open(P/(name+'.webp')).convert('RGBA'));assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':[1024,1024],'alpha':list(im.getchannel('A').getextrema()),'fullCharacter':True,'state':'front concept fitting, not separate accessory layers'}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),29);small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
items=[(R/'outputs/hive-run/assets/zhuzha.png','Исходная Жужа'),(P/'zhuzha-winter-hat-front.png','Шапка с помпоном'),(P/'zhuzha-winter-scarf-front.png','Зимний шарф'),(P/'zhuzha-winter-outfit-front.png','Весь комплект')]
board=Image.new('RGB',(1600,1170),'#FFF6E3');d=ImageDraw.Draw(board);d.text((30,20),'Buzzle · зимняя одежда · первая примерка на Жуже',font=font,fill='#4A2C12');d.rectangle((0,525,1600,1000),fill='#171340')
for i,(path,title) in enumerate(items):
 art=Image.open(path).convert('RGBA');art.thumbnail((380,380),Image.Resampling.LANCZOS)
 for y,color in [(90,'#4A2C12'),(555,'#FFF6E3')]:
  board.paste(art,(i*400+(400-art.width)//2,y+(380-art.height)//2),art);d.text((i*400+20,y+380),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  art=Image.open(path).convert('RGBA');art.thumbnail((size,size),Image.Resampling.LANCZOS);board.paste(art,(i*400+140+j*130,1020+(96-art.height)//2),art)
 d.text((i*400+20,1125),'64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
(P/'README.ru.md').write_text('''# Зимний гардероб · первая примерка

На просмотре, 29.10.2026. Чернично-медовая шапка с помпоном и шарф для Жужи анфас.

- zhuzha-winter-hat-front.png — Жужа в шапке: оба усика проходят через ткань, кончики видны.
- zhuzha-winter-scarf-front.png — Жужа с шарфом ниже улыбки, короткий хвост слева для зрителя.
- zhuzha-winter-outfit-front.png — примерка обоих предметов вместе.
- Все три PNG 1024×1024 RGBA; рядом lossless WebP.
- preview.png — исходная Жужа и три примерки на светлом/ночном фоне, размеры 64/96 px.
- sources/ — исходники генераций; generation.json — точные промпты, checks.json — размеры/альфа.

Встроенный imagegen. Первая пара сделана по канонической Жуже из outputs/hive-run/assets/zhuzha.png и зимнему снеговику как референсу материала; комплект — по двум примеркам. После генерации только пропорциональное масштабирование, экспорт и обзорный лист. Проверены наличие обоих усиков, свободное лицо, видимость крыльев, полный персонаж и читаемость маленького размера.

Это целиком нарисованные концепт-примерки. Они не являются отдельными слоями одежды и не заменяют канонические спрайты пчелы: генерация может немного менять фасеты тела. Самостоятельные аксессуары, маски усиков, профиль/три четверти, прочие пчёлы и анимационные слои пока не подготовлены. Сначала оценить форму и посадку, затем готовить игровые слои и ракурсы. Production assets/ и src/ не менялись; прежние аксессуары сохранены.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-wardrobe-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text();s=s.replace('| Гардероб | Новый зимний комплект ещё не нарисован | Шапка с помпоном, шарф, колпак, оленьи рожки; сначала Жужа, потом другие пчёлы и ракурсы |','| Гардероб | Первые примерки шапки с помпоном и шарфа на Жуже анфас, отдельно и вместе: winter-wardrobe-v1 | Оценить посадку; затем отдельные слои, другие ракурсы/пчёлы. Колпак и оленьи рожки ещё не нарисованы |');s=s.replace('Следующая партия: зимняя шапка и шарф, примерка на Жуже.','Следующий шаг: оценить первые примерки шапки и шарфа; после выбора готовить отдельные слои и ракурсы.');status.write_text(s)
print(json.dumps({'fittings':3,'size':[1024,1024],'checks':checks},ensure_ascii=False))
