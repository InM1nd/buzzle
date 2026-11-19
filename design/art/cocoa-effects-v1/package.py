from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;O=P.parent;C=Path('/Users/oleksandrzabolotnyi/buzzle/assets/art/cocoa')
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True);checks={}
for name,item in M.items():
 src=Path(item['source']);shutil.copy2(src,P/'sources'/f'{name}.png');im=Image.open(src).convert('RGBA')
 # Preserve generated opacity: only crop, proportional fit and transparent padding.
 bbox=im.getchannel('A').point(lambda a:255 if a>8 else 0).getbbox();assert bbox
 im=im.crop((max(0,bbox[0]-12),max(0,bbox[1]-12),min(im.width,bbox[2]+12),min(im.height,bbox[3]+12)))
 scale=min(440/im.width,440/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 art=Image.new('RGBA',(512,512));art.alpha_composite(im,((512-im.width)//2,(512-im.height)//2));art.save(P/f'{name}.png');art.save(P/f'{name}.webp',lossless=True)
 wp=Image.open(P/f'{name}.webp').convert('RGBA')
 for bg in ['#171340','#FFF6E3']:
  a=Image.new('RGBA',art.size,bg);b=a.copy();a.alpha_composite(art);b.alpha_composite(wp);assert not ImageChops.difference(a,b).convert('RGB').getbbox()
 checks[name]={'size':[512,512],'alphaExtrema':list(art.getchannel('A').getextrema()),'visibleLosslessWebpMatch':True}
font=ImageFont.truetype(str(O/'hive-run/assets/Nunito-ExtraBold.ttf'),28)
board=Image.new('RGB',(1200,1060),'#FFF6E3');d=ImageDraw.Draw(board);d.rectangle((600,0,1200,530),fill='#171340');d.rectangle((0,530,1200,1060),fill='#171340')
for col,ink in [(0,'#4A2C12'),(1,'#FFF6E3')]:
 x=600*col;d.text((x+300,35),'Какао-сорт · эффекты',font=font,fill=ink,anchor='mm')
 for i,name in enumerate(['steam_wisps','completion_sparkles']):
  im=Image.open(P/f'{name}.png').resize((260,260),Image.Resampling.LANCZOS);board.paste(im,(x+20+i*300,95),im);d.text((x+150+i*300,397),'Пар' if i==0 else 'Готово',font=font,fill=ink,anchor='mm')
 d.text((x+300,468),'Светлый фон' if col==0 else 'Ночной фон',font=font.font_variant(size=20),fill=ink,anchor='mm')
layout=json.loads((C/'vessel_layout.json').read_text());mug=Image.open(C/'mug_glass.png').convert('RGBA');mask=Image.open(C/'mug_liquid_mask.png').convert('RGBA').getchannel('A')
# Existing vessel's static full-drink example only; not a pouring simulation.
for col,(name,title) in enumerate([('cocoa','Какао'),('sbiten','Сбитень'),('mint','Мята'),('berry','Морс'),('milk_honey','Молоко с мёдом')]):
 drink=layout['drinks'][name];liquid=Image.new('RGBA',mug.size,drink['color']);liquid.putalpha(mask);cup=Image.alpha_composite(liquid,mug)
 card=Image.new('RGBA',(240,470),'#171340');steam=Image.open(P/'steam_wisps.png').convert('RGBA').resize((140,140),Image.Resampling.LANCZOS);card.alpha_composite(steam,(44,18))
 card.alpha_composite(cup.resize((230,230),Image.Resampling.LANCZOS),(5,135))
 top=Image.open(C/drink['topper']).convert('RGBA');box=top.getchannel('A').getbbox();top=top.crop(box);top.thumbnail((72,55),Image.Resampling.LANCZOS);card.alpha_composite(top,(round(5+473*230/1024-top.width/2),round(135+142*230/1024-top.height/2)))
 spark=Image.open(P/'completion_sparkles.png').convert('RGBA').resize((230,230),Image.Resampling.LANCZOS);card.alpha_composite(spark,(5,135))
 ImageDraw.Draw(card).text((120,410),title,font=font.font_variant(size=22),fill='#FFF6E3',anchor='mm');board.paste(card,(col*240,580));card.save(P/f'example_{name}.png')
d.text((600,557),'Пример на существующих кружках и украшениях',font=font.font_variant(size=22),fill='#FFF6E3',anchor='mm');board.save(P/'preview.png')
(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Какао-сорт · эффекты готового напитка v1

17.11.2026. Новые рисунки на просмотре для выбранной зимней мини-игры «Какао-сорт», интерфейс C.

- steam_wisps.png/.webp — один прозрачный спрайт из трёх струек пара, 512×512 RGBA.
- completion_sparkles.png/.webp — небольшие медовые блики с пустым центром, 512×512 RGBA.
- preview.png — оба эффекта на светлом/ночном фоне и пример с пятью существующими напитками.
- example_*.png — статические примерки на существующей кружке, без изменения исходных ассетов.
- sources/ — оригиналы встроенного imagegen; generation.json — точные промпты/референсы; checks.json — размеры, альфа, совпадение PNG/WebP.

Это текстуры частиц, не готовая анимация жидкости или последовательность кадров. Пар при подключении можно медленно поднимать, немного масштабировать и плавно менять прозрачность; блики коротко показывать при завершении кружки. Не пускать постоянную яркую вспышку над каждой кружкой. Пять примерок показывают максимум одновременно ради сравнения. Струя и наклон жидкости остаются геометрией в коде, не частью этих PNG.

Существующие фон, кружка, полки и украшения: assets/art/cocoa/. Они не перерисованы и не заменены. Новые кандидаты сохранены только в design/art/cocoa-effects-v1/; после выбора можно экспортировать в игру. Механики, src/ и assets/ этим набором не менялись. Кромки и видимость проверены в обзорном листе, потери видимых цветов при экспорте lossless WebP нет.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),O.parent/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/cocoa-effects-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 row='| Какао-сорт | Кружка, маска, фон, полки, 5 украшений, UI: assets/art/cocoa/. Новые эффекты пара и завершения: cocoa-effects-v1, на просмотре | Выбор эффектов, подключение в выбранный режим и проверка реального переливания |'
 if row not in s:s=s.replace('| Сортировка подарков |',row+'\n| Сортировка подарков |')
 status.write_text(s)
print(json.dumps(checks))
