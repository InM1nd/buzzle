from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;O=P.parent
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
checks={}
for name,item in M.items():
 source=Path(item['source']);shutil.copy2(source,P/'sources'/(name+'.png'))
 art=Image.open(source).convert('RGBA');box=art.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();assert box
 art=art.crop((max(0,box[0]-4),max(0,box[1]-4),min(art.width,box[2]+4),min(art.height,box[3]+4)))
 scale=min(420/art.width,420/art.height);art=art.resize((round(art.width*scale),round(art.height*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(512,512));out.alpha_composite(art,((512-art.width)//2,(512-art.height)//2))
 out.save(P/('gift_'+name+'.png'));out.save(P/('gift_'+name+'.webp'),lossless=True)
 wp=Image.open(P/('gift_'+name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',out.size,bg);b=a.copy();a.alpha_composite(out);b.alpha_composite(wp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':[512,512],'alpha':list(out.getchannel('A').getextrema()),'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(O/'hive-run/assets/Nunito-ExtraBold.ttf'),24)
board=Image.new('RGB',(1120,700),'#FFF6E3');d=ImageDraw.Draw(board);d.rectangle((560,0,1120,700),fill='#171340')
for row,(name,title) in enumerate([('red','Красный подарок'),('green','Зелёный подарок')]):
 art=Image.open(P/('gift_'+name+'.png')).convert('RGBA')
 for col,ink in [(0,'#4A2C12'),(1,'#FFF6E3')]:
  x=560*col;y=350*row;d.text((x+22,y+16),title,font=font,fill=ink)
  big=art.resize((270,270),Image.Resampling.LANCZOS);board.paste(big,(x+5,y+55),big)
  for i,size in enumerate([32,48,64]):
   thumb=art.resize((size,size),Image.Resampling.LANCZOS);cx=x+310+i*78
   board.paste(thumb,(cx-size//2,y+148-size//2),thumb);d.text((cx,y+208),str(size),font=font,fill=ink,anchor='mm')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Сортировка подарков · отдельные коробки v1

17.11.2026. Красная (gift_red) и зелёная (gift_green) коробки с кремовой лентой и бантом. Прозрачные PNG 512×512 и lossless WebP, общий холст, центр и максимальная сторона 420 px.

preview.png — светлый/ночной фон и размеры 32/48/64 px. sources/ — исходники; generation.json — полный набор промптов и референсов встроенного imagegen; checks.json — размеры, альфа и совпадение PNG/WebP на двух фонах.

Референсы: gift-sort/gameplay-v2/drag.png (подарки, не пчёлы) и зимние санки с подарками (материалы). После imagegen только поля, пропорциональное масштабирование, экспорт и лист сравнения. Цвета — существующие категории мини-игры, не новые ресурсы. Золотая и голубая коробки, отдельные мешки/санки пока не в этом наборе.

На просмотре. assets/ и src/ не менялись, в игру не подключено.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),O.parent/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-gift-sort-sprites-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 row='| Сортировка подарков | Красная и зелёная коробки: winter-gift-sort-sprites-v1, на просмотре | Золотая/голубая коробки, мешки/санки, примерка с пчёлами |\n'
 if '| Сортировка подарков |' not in s:s=s.replace('| Гардероб |',row+'| Гардероб |')
 status.write_text(s)
print(json.dumps(checks))
