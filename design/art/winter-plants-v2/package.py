# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import json, shutil
P=Path(__file__).resolve().parent
R=P.parent.parent
M=json.loads((P/'generation.json').read_text())
(P/'sources').mkdir(exist_ok=True)
checks={}; layout={}
for name,item in M.items():
 src=Path(item['source']);shutil.copy2(src,P/'sources'/(name+'-source.png'))
 im=Image.open(src).convert('RGBA');b=im.getchannel('A').point(lambda x:255 if x>128 else 0).getbbox()
 assert b
 im=im.crop((max(0,b[0]-5),max(0,b[1]-5),min(im.width,b[2]+5),min(im.height,b[3]+5)))
 target=430 if 'sprout' in name else 710
 scale=min(target/im.height,820/im.width);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(1024,1024));out.alpha_composite(im,((1024-im.width)//2,944-im.height))
 out.save(P/(name+'.png'));out.save(P/(name+'.webp'),lossless=True)
 decoded=Image.open(P/(name+'.webp')).convert('RGBA')
 for color in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',out.size,color);d=a.copy();a.alpha_composite(out);d.alpha_composite(decoded)
  assert ImageChops.difference(a,d).convert('RGB').getbbox() is None
 checks[name]={'size':[1024,1024],'alpha':list(out.getchannel('A').getextrema()),'losslessMatchOnBothBackgrounds':True}
 layout[name]={'canvas':[1024,1024],'plantingAnchor':[512,944],'visibleStageHeight':target}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1600,1480),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((30,20),'Buzzle · зимний сад · стадии роста',font=font,fill='#4A2C12')
for row,(species,title) in enumerate([('hellebore','Морозник'),('poinsettia','Пуансеттия')]):
 y=85+row*695
 d.text((30,y),title,font=font,fill='#4A2C12')
 for col,(stage,label) in enumerate([('sprout','Росток'),('bud','Бутон'),('bloom','Взрослое растение')]):
  path=(P if stage!='bloom' else R/'outputs/buzzle-winter-plants-v1')/(species+'_'+stage+'.png')
  art=Image.open(path).convert('RGBA');art=art.resize((420,420),Image.Resampling.LANCZOS)
  x=15+col*530
  board.paste(art,(x,y+35),art)
  d.text((x+25,y+465),label,font=font,fill='#4A2C12')
  d.rounded_rectangle((x+15,y+510,x+490,y+655),radius=15,fill='#171340')
  for j,size in enumerate([64,96]):
   art=Image.open(path).convert('RGBA').resize((size,size),Image.Resampling.LANCZOS)
   board.paste(art,(x+95+j*180,y+530+(96-size)//2),art)
  d.text((x+30,y+625),'64 / 96 px',font=small,fill='#FFF6E3')
board.save(P/'preview.png')
(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'layout.json').write_text(json.dumps(layout,indent=2))
(P/'README.ru.md').write_text('''# Зимние растения · ранние стадии v2

Кандидаты на просмотр, 29.10.2026. Не подключены к игре.

- hellebore_sprout.png / .webp — зелёный росток морозника.
- hellebore_bud.png / .webp — закрытый кремово-розовый бутон морозника.
- poinsettia_sprout.png / .webp — росток пуансеттии с заострёнными листьями.
- poinsettia_bud.png / .webp — молодая пуансеттия с ещё свёрнутыми красными прицветниками.
- preview.png — две цепочки роста рядом со взрослыми растениями из winter-plants-v1, проверка на тёмном фоне в 64/96 px.

Четыре отдельных изображения, PNG 1024×1024 RGBA и lossless WebP. Прозрачный фон, без встроенной грядки и почвы. Единая точка посадки (512,944); росток занимает 430 px по высоте, бутон 710 px, взрослое растение из v1 около 864 px. Масштабировать холст и точку посадки вместе, не обрезать прозрачные поля при импорте без пересчёта якоря.

sources/ хранит исходные генерации; generation.json — промпты и референсы; layout.json — расположение; checks.json — проверка альфа-канала и экспортов. После imagegen только пропорциональное масштабирование, прозрачные поля и сборка обзорного листа. Production assets/ и src/ не менялись.

Семена/пакетики и иконки для лавки пока не подготовлены. В текущем саду используется общий sprout.webp; два отдельных ростка — визуальные кандидаты, выбор способа подключения остаётся за разработчиком. Стоимость, сроки роста и награды не назначались.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-plants-v2',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md'
 s=status.read_text().replace('Взрослые морозник и пуансеттия: winter-plants-v1, на просмотре','Морозник и пуансеттия: взрослые v1, ростки и бутоны v2, на просмотре').replace('Семена/пакетики, ростки и бутоны; размещение/экспорт после выбора','Семена/пакетики и иконки лавки; размещение после выбора')
 status.write_text(s)
print(json.dumps(checks))
