from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,shutil
P=Path(__file__).resolve().parent;O=P.parent
angles=['front','q3-front','side'];titles=['Анфас','Три четверти','Профиль']
sets=[('Колпак','buzzle-winter-santa-layer-v2'),('Рожки','buzzle-winter-antlers-layer-v2'),('Венок','buzzle-winter-wreath-layer-v2'),('Бант','buzzle-winter-bow-layer-v1')]
font=ImageFont.truetype(str(O/'hive-run/assets/Nunito-ExtraBold.ttf'),24)
board=Image.new('RGB',(1200,1950),'#FFF6E3');d=ImageDraw.Draw(board);files={}
for row,(title,folder) in enumerate(sets+[('Венок + бант','')]):
 bg='#171340' if row%2 else '#FFF6E3';ink='#FFF6E3' if row%2 else '#4A2C12';d.rectangle((0,row*390,1200,(row+1)*390),fill=bg)
 for col,(angle,view) in enumerate(zip(angles,titles)):
  if folder:
   path=O/folder/f'fitting-{angle}.png';fit=Image.open(path).convert('RGBA');files[f'{title}/{angle}']=str(path.relative_to(O))
  else:
   bee=Image.open(O/'zhuzha-turnaround-approved-front'/f'{angle}.png').convert('RGBA');w=O/'buzzle-winter-wreath-layer-v2';b=O/'buzzle-winter-bow-layer-v1'
   fit=Image.alpha_composite(bee,Image.open(w/f'wreath-fitted-{angle}.png').convert('RGBA'));fit=Image.alpha_composite(fit,Image.open(w/f'antennae-{angle}.png').convert('RGBA'));fit=Image.alpha_composite(fit,Image.open(b/f'bow-fitted-{angle}.png').convert('RGBA'));fit.save(P/f'outfit-{angle}.png')
  d.text((col*400+200,row*390+25),title+' · '+view,font=font.font_variant(size=21),fill=ink,anchor='mm');fit=fit.resize((380,round(380*fit.height/fit.width)),Image.Resampling.LANCZOS);board.paste(fit,(col*400+10,row*390+48),fit)
board.save(P/'overview.png');(P/'sources.json').write_text(json.dumps(files,ensure_ascii=False,indent=2))
(P/'README.ru.md').write_text('''# Зимний гардероб · общий просмотр отдельных слоёв

19.11.2026. Текущий блок отрисовки закончен: 4 предмета × 3 ракурса = 12 отдельных аксессуаров. Все кандидаты на просмотр, не автоматическое утверждение и не игровой импорт.

Обзор overview.png: колпак, рожки, венок, бант; пятая строка — совместная примерка венка и банта. outfit-front/q3-front/side.png — три сборки комплекта без перерисовки пчелы. sources.json — ссылки на исходные примерки.

Наборы:
- design/2d/winter-santa-layer-v2/ — 3 ракурса колпака, посадки, усики.
- design/2d/winter-antlers-layer-v2/ — 3 ракурса рожек, посадки, усики.
- design/2d/winter-wreath-layer-v2/ — 3 ракурса венка, посадки, усики.
- design/2d/winter-bow-layer-v1/ — 3 ракурса банта с лентой и масками перекрытия.

Проверено в отдельных наборах: вид на светлом и #171340, читаемость 64/96/128 px, сохранение канонической пчелы вне аксессуара, соответствие PNG/lossless WebP. У венка в три четверти повторной генерацией убрана светлая подложка, у банта в профиль сохранён выступающий за тело объём и лента под ближним крылом. Усики и крылья не переставлялись.

Остаётся выбор владельца и точечные правки по общему листу. Перед игровым импортом проверить реальный размер в UI, добавить привязки для других видов пчёл при необходимости. Это независимые статические ракурсы, не покадровая анимация: мелкая сетка граней между ними различается. Жужа здесь берётся целиком из канонических исходников; крылья не выделялись заново. Новые предметы к этому блоку не добавляем. assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),O.parent/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-wardrobe-layers-review-v1',dirs_exist_ok=True)
 p=repo/'design/art/winter-collection/STATUS.ru.md';s=p.read_text().replace('Блок 4 предмета × 3 ракурса нарисован; остаётся общая проверка и выбор','Блок 4 предмета × 3 ракурса нарисован. Общий просмотр и комплект венок+бант: winter-wardrobe-layers-review-v1. Остаются выбор и точечные правки');p.write_text(s)
print('12 accessory fittings + 3 combined outfits on overview.')
