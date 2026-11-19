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
 out=Image.new('RGBA',(1024,1024));out.alpha_composite(im,((1024-im.width)//2,944-im.height))
 out.save(P/(name+'.png'));out.save(P/(name+'.webp'),lossless=True)
 webp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',out.size,bg);d=a.copy();a.alpha_composite(out);d.alpha_composite(webp)
  assert ImageChops.difference(a,d).convert('RGB').getbbox() is None
 checks[name]={'size':[1024,1024],'alpha':list(out.getchannel('A').getextrema()),'pngWebpVisibleMatch':True,'baseAnchor':[512,944]}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),27)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1600,1170),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,20),'Buzzle · зимний декор · почта и пряничный домик',font=font,fill='#4A2C12');d.rectangle((0,515,1600,1010),fill='#171340')
items=[(R/'outputs/buzzle-winter-decor-v1/deco_winter_lantern.png','Фонарики / уже есть'),(P/'deco_winter_mailbox.png','Почтовый ящик / новый'),(R/'outputs/buzzle-winter-decor-v2/deco_winter_tree.png','Ёлочка / уже есть'),(P/'deco_winter_gingerbread_house.png','Пряничный домик / новый')]
for col,(path,title) in enumerate(items):
 art=Image.open(path).convert('RGBA').resize((380,380),Image.Resampling.LANCZOS)
 for y,color in [(85,'#4A2C12'),(555,'#FFF6E3')]:
  board.paste(art,(col*400+10,y),art);d.text((col*400+12,y+390),title,font=font,fill=color)
 for j,size in enumerate([64,96]):
  im=Image.open(path).convert('RGBA').resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*400+100+j*140,1020+(96-size)//2),im)
 d.text((col*400+20,1130),'64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Зимний декор v4 · почтовый ящик и пряничный домик

29.10.2026. Два новых декоративных кандидата на просмотр.

- deco_winter_mailbox.png / .webp — чернично-синий почтовый ящик на медовой стойке, снежная шапка, красный флажок и пиктограмма конверта.
- deco_winter_gingerbread_house.png / .webp — небольшой пряничный домик с кремовой глазурью и медовым окошком.
- preview.png — новые предметы рядом с существующими зимними фонариками и ёлочкой, светлый/ночной фон и 64/96 px.

PNG 1024×1024 RGBA, lossless WebP. Без фона и отдельно нарисованной тени на земле. Точка нижнего основания примерно (512,944), масштабировать вместе с холстом; реальное положение проверять на выбранной сцене. Фонарики/ёлка в сравнении взяты из v1/v2 без замены исходных файлов.

Это цельные статичные предметы. У домика свет нарисован внутри изображения, отдельного слоя света нет. Открытая дверца ящика, отдельный флажок и анимации не подготовлены. Предметы не задают новую механику почты или строительства, цены и бонусы не назначены.

sources/ — оригинальные генерации; generation.json — точные промпты и референсы; checks.json — размеры, альфа и совпадение PNG/WebP на #FFF6E3 и #171340. После imagegen только поля, пропорциональное масштабирование и лист сравнения. Production assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-decor-v4',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 s=s.replace('сосульки и звезда (v3) |','сосульки и звезда (v3), почтовый ящик и пряничный домик (v4) |')
 status.write_text(s)
print(json.dumps(checks))
