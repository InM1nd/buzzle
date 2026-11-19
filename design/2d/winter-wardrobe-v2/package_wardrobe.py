# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import shutil,json
P=Path(__file__).resolve().parent;R=P.parent.parent;M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True);checks={}
def normalized(path):
 im=Image.open(path).convert('RGBA');box=im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();box=(max(0,box[0]-8),max(0,box[1]-8),min(im.width,box[2]+8),min(im.height,box[3]+8));obj=im.crop(box);obj.thumbnail((880,880),Image.Resampling.LANCZOS);out=Image.new('RGBA',(1024,1024));out.alpha_composite(obj,((1024-obj.width)//2,(1024-obj.height)//2));return out
paths={'front':R/'outputs/buzzle-winter-wardrobe-v1/zhuzha-winter-outfit-front.png',**{k:Path(v['source']) for k,v in M.items()}}
for angle,path in paths.items():
 shutil.copy2(path,P/'sources'/(angle+'-source.png'));im=normalized(path);n='zhuzha-winter-outfit-'+angle;im.save(P/(n+'.png'));im.save(P/(n+'.webp'),lossless=True)
 for c in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,c);b=a.copy();a.alpha_composite(im);b.alpha_composite(Image.open(P/(n+'.webp')).convert('RGBA'));assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[n]={'size':[1024,1024],'alpha':list(im.getchannel('A').getextrema()),'source':str(path),'status':'fitting concept, not layered game sprite'}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28);small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),21)
board=Image.new('RGB',(1500,1430),'#FFF6E3');d=ImageDraw.Draw(board);d.text((30,18),'Buzzle · зимний комплект · анфас, три четверти, профиль',font=font,fill='#4A2C12')
canon={'front':R/'outputs/hive-run/assets/zhuzha.png','q3-front':R/'outputs/zhuzha-turnaround-approved-front/q3-front.png','side':R/'outputs/zhuzha-turnaround-approved-front/side.png'}
labels=['Анфас','Три четверти','Профиль']
for i,angle in enumerate(['front','q3-front','side']):
 for y,path,label in [(75,canon[angle],labels[i]+' / исходная'),(550,P/('zhuzha-winter-outfit-'+angle+'.png'),labels[i]+' / комплект')]:
  art=normalized(path);art.thumbnail((450,405),Image.Resampling.LANCZOS);board.paste(art,(i*500+(500-art.width)//2,y),art);d.text((i*500+20,y+400),label,font=font,fill='#4A2C12')
d.rectangle((0,1010,1500,1430),fill='#171340')
for i,angle in enumerate(['front','q3-front','side']):
 for j,size in enumerate([64,96,240]):
  art=Image.open(P/('zhuzha-winter-outfit-'+angle+'.png'));art.thumbnail((size,size),Image.Resampling.LANCZOS);x=i*500+[30,125,235][j];board.paste(art,(x,1070+(240-art.height)//2),art)
 d.text((i*500+25,1355),labels[i]+' · 64 / 96 / 240 px',font=small,fill='#FFF6E3')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
(P/'README.ru.md').write_text('''# Зимний комплект Жужи · дополнительные ракурсы

29.10.2026, на просмотре. Дополняет winter-wardrobe-v1.

- zhuzha-winter-outfit-q3-front.png — новая примерка шапки и шарфа в три четверти вправо.
- zhuzha-winter-outfit-side.png — новая примерка в профиль вправо.
- zhuzha-winter-outfit-front.png — предыдущий анфас из v1, только нормализованы прозрачные поля для общего листа, не новая генерация.
- PNG 1024×1024 RGBA и lossless WebP; preview.png — исходные ракурсы над примерками, проверка на тёмном фоне и в маленьком размере.
- sources/ — исходники; generation.json — точные промпты двух новых изображений; checks.json — размеры/альфа.

Встроенный imagegen. Референс позы — соответствующий исходный ракурс outputs/zhuzha-turnaround-approved-front/; одежды — комплект анфас из v1. В профиле проверены перекрывающаяся пара крыльев у верхней части спины, два усика через шапку, свободные глаз и улыбка, короткий хвост шарфа ниже крыла. После генерации — только прозрачные поля, пропорциональное масштабирование и экспорт.

Это полные концепт-примерки, не отдельные слои и не пиксельно точная замена канонической пчелы: фасеты тела могут отличаться. Отдельные шапка/шарф, маски, задние и зеркальные ракурсы, остальные пчёлы и анимационные слои ещё не готовились. Production assets/ и src/ не менялись. Старые примерки сохранены.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-wardrobe-v2',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text().replace('Первые примерки шапки с помпоном и шарфа на Жуже анфас, отдельно и вместе: winter-wardrobe-v1','Примерки шапки и шарфа на Жуже: анфас отдельно/вместе (winter-wardrobe-v1), комплект в три четверти и профиль (winter-wardrobe-v2)');status.write_text(s)
print(json.dumps({'newFittings':2,'anglesInSheet':3,'size':[1024,1024]}))
