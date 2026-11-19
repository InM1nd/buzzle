# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent;meta=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True);checks={}
for k,item in meta.items():
 src=Path(item['source']);shutil.copy2(src,P/'sources'/(k+'-source.png'));im=Image.open(src).convert('RGBA');box=im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();box=(max(0,box[0]-8),max(0,box[1]-8),min(im.width,box[2]+8),min(im.height,box[3]+8));obj=im.crop(box)
 size=(1536,768) if k=='icicles' else (1024,1024);obj.thumbnail((int(size[0]*.84),int(size[1]*.84)),Image.Resampling.LANCZOS);out=Image.new('RGBA',size);out.alpha_composite(obj,((size[0]-obj.width)//2,(size[1]-obj.height)//2));name='deco_winter_'+k;out.save(P/(name+'.png'));out.save(P/(name+'.webp'),lossless=True)
 checks[name]={'size':list(size),'alpha':list(out.getchannel('A').getextrema()),'source':str(src),'operation':'transparent crop and proportional resize only'}
 other=Image.open(P/(name+'.webp')).convert('RGBA')
 for c in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',size,c);b=a.copy();a.alpha_composite(out);b.alpha_composite(other);assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),30);small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
items=[(R/'outputs/buzzle-winter-decor-v1/deco_winter_snowman.png','Снеговик'),(R/'outputs/buzzle-winter-decor-v1/deco_winter_lantern.png','Фонарики'),(R/'outputs/buzzle-winter-decor-v2/deco_winter_tree.png','Ёлочка'),(R/'outputs/buzzle-winter-decor-v2/deco_winter_garland.png','Гирлянда'),(P/'deco_winter_icicles.png','Сосульки'),(P/'deco_winter_star.png','Звезда')]
board=Image.new('RGB',(1800,1000),'#FFF6E3');d=ImageDraw.Draw(board);d.text((30,20),'Buzzle · зимний декор · шесть предметов на просмотре',font=font,fill='#4A2C12');d.rectangle((0,460,1800,850),fill='#171340')
for i,(path,title) in enumerate(items):
 art=Image.open(path).convert('RGBA');art.thumbnail((285,305),Image.Resampling.LANCZOS)
 for y,color in [(85,'#4A2C12'),(480,'#FFF6E3')]:
  board.paste(art,(i*300+(300-art.width)//2,y+(305-art.height)//2),art);d.text((i*300+20,y+315),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  art=Image.open(path).convert('RGBA');art.thumbnail((size,size),Image.Resampling.LANCZOS);board.paste(art,(i*300+90+j*110,865+(96-art.height)//2),art)
 d.text((i*300+8,970),'64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
(P/'README.ru.md').write_text('''# Зимний декор · третья партия

На просмотре, не утверждён и не подключён к игре. Дополняет v1/v2, не заменяет предыдущие рисунки.

- deco_winter_icicles.png — снежная полоса с пятью сосульками для края/крыши улья, 1536×768 RGBA. Это отдельный оверлей, без крыши.
- deco_winter_star.png — золотая пятиконечная звезда с маленьким креплением, 1024×1024 RGBA. Независимое украшение улья.
- Lossless WebP рядом; PNG и WebP проверены на светлом и черничном фоне.
- preview.png — все шесть зимних украшений на двух фонах, пробы 64/96 px.
- sources/ — исходные генерации; generation.json — точные промпты и исходники, checks.json — размеры и альфа.

Встроенный imagegen, референсы — фонарики winter-decor-v1 и ёлка winter-decor-v2. После генерации только прозрачные поля, пропорциональное масштабирование и экспорт, без перекрашивания. Слои для анимации и примерка на улье пока не готовились. Старые варианты сохранены. Production assets/ и src/ не менялись.
''')
status='''# Зимняя коллекция Buzzle · состояние на 29.10.2026

«Есть» означает сохранённые варианты на просмотре, не автоматическое утверждение или подключение к игре.

| Набор | Уже есть | Что ещё нужно |
|---|---|---|
| Фоны | День/вечер, зима/Рождество для улья, сада и головоломки; варианты winter-unified-v3 | Выбор финального комплекта, экспорт при подключении |
| Глифы | Зимние варианты существующих стилей и ивентовая снежинка | Финальный выбор/игровой экспорт |
| Сундуки | Зимний и рождественский, закрытые, winter-chests-v1 | Открытые состояния и слои/кадры открытия |
| Декор | Снеговик, фонарики (winter-decor-v1), ёлочка, гирлянда (v2), сосульки и звезда (v3) | Примерки и при необходимости отдельные слои света/анимации |
| Гардероб | Новый зимний комплект ещё не нарисован | Шапка с помпоном, шарф, колпак, оленьи рожки; сначала Жужа, потом другие пчёлы и ракурсы |
| Растения | Отдельные зимние растения ещё не нарисованы | Морозник и пуансеттия: семена, росток, зрелое растение |
| Адвент | Есть общие UI-концепты; отдельного финального комплекта нет | Подарочная упаковка, окошки/состояния и открытки Жужи после выбора состава |
| Зимняя пчела | Отдельного концепта пока нет | Несколько вариантов на выбор, затем исходные слои и ракурсы |

Следующая партия: зимняя шапка и шарф, примерка на Жуже. Не переносить автоматически проблемные посадки старых аксессуаров.

Общая библиотека: http://127.0.0.1:8110/buzzle-style-board/ . Зимние наборы: #search=winter&scope=review .
'''
(P/'WINTER_STATUS.ru.md').write_text(status)
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-decor-v3',dirs_exist_ok=True)
 dst=repo/'design/art/winter-collection';dst.mkdir(exist_ok=True);(dst/'STATUS.ru.md').write_text(status)
print(json.dumps({'generated':2,'decorTotal':6,'checks':checks},ensure_ascii=False))
