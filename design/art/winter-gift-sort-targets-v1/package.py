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
 out.save(P/('sack_'+name+'.png'));out.save(P/('sack_'+name+'.webp'),lossless=True)
 wp=Image.open(P/('sack_'+name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',out.size,bg);b=a.copy();a.alpha_composite(out);b.alpha_composite(wp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':[512,512],'alpha':list(out.getchannel('A').getextrema()),'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(O/'hive-run/assets/Nunito-ExtraBold.ttf'),24)
board=Image.new('RGB',(1120,800),'#FFF6E3');d=ImageDraw.Draw(board);d.rectangle((560,0,1120,800),fill='#171340')
for row,(name,title) in enumerate([('red','Красный мешок'),('green','Зелёный мешок')]):
 art=Image.open(P/('sack_'+name+'.png')).convert('RGBA')
 for col,ink in [(0,'#4A2C12'),(1,'#FFF6E3')]:
  x=560*col;y=400*row;d.text((x+22,y+16),title,font=font,fill=ink)
  big=art.resize((270,270),Image.Resampling.LANCZOS);board.paste(big,(x+5,y+55),big)
  for i,size in enumerate([56,72,88]):
   thumb=art.resize((size,size),Image.Resampling.LANCZOS);cx=x+310+i*78
   board.paste(thumb,(cx-size//2,y+148-size//2),thumb);d.text((cx,y+208),str(size),font=font,fill=ink,anchor='mm')
for row,name in enumerate(['red','green']):
 gift=Image.open(O/'buzzle-winter-gift-sort-sprites-v2'/('gift_'+name+'.png')).convert('RGBA').resize((48,48),Image.Resampling.LANCZOS)
 for col,ink in [(0,'#4A2C12'),(1,'#FFF6E3')]:
  x=560*col;y=400*row
  board.paste(gift,(x+285,y+280),gift)
  d.text((x+355,y+302),'в свой мешок',font=font,fill=ink,anchor='lm')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('# Сортировка подарков · открытые мешки v1\n\n17.11.2026. Красный (sack_red) и зелёный (sack_green) открытые мешки для сортировки, без встроенных санок. Снежинка и пустое широкое горлышко, шнур медового цвета. Цвета соответствуют коробкам winter-gift-sort-sprites-v2.\n\nPNG 512×512 RGBA и lossless WebP; общий холст, центр, максимальная сторона 420 px. preview.png — светлый/ночной фон, размеры 56/72/88 px и цветовая пара с подарками. sources/ — исходники; generation.json — полные промпты и референсы встроенного imagegen; checks.json — проверки новых экспортов. После imagegen только поля, пропорциональное масштабирование, экспорт и лист сравнения.\n\nЦельные статические мешки. Для падения подарка внутрь понадобятся передний край и маска горлышка: они пока не выделены. Мешки сгенерированы отдельно и не являются совмещёнными кадрами анимации. Золотой и голубой мешки ещё не готовы.\n\nassets/ и src/ не менялись, в игру не подключено.\n')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),O.parent/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-gift-sort-targets-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 s=s.replace('Мешки/санки и примерка с пчёлами','Красный/зелёный мешки: winter-gift-sort-targets-v1; золотой/голубой и примерка с пчёлами ещё нужны')
 status.write_text(s)
print(json.dumps(checks))
