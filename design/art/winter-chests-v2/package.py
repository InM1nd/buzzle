# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
checks={}
def fit(path):
 im=Image.open(path).convert('RGBA');b=im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();assert b
 im=im.crop((max(0,b[0]-6),max(0,b[1]-6),min(im.width,b[2]+6),min(im.height,b[3]+6)))
 scale=min(860/im.width,860/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(1024,1024));out.alpha_composite(im,((1024-im.width)//2,944-im.height));return out
for name,item in M.items():
 src=Path(item['source']);shutil.copy2(src,P/'sources'/(name+'-source.png'))
 im=fit(src);im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 webp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,bg);b=a.copy();a.alpha_composite(im);b.alpha_composite(webp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':[1024,1024],'alpha':list(im.getchannel('A').getextrema()),'losslessVisibleMatch':True}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),26)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1600,1150),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,20),'Buzzle · зимние сундуки · закрыто / открыто',font=font,fill='#4A2C12');d.rectangle((0,505,1600,1000),fill='#171340')
items=[]
for season,title in [('winter','Зимний'),('christmas','Рождественский')]:
 for state,label in [('closed','закрыт'),('open','открыт')]:
  path=(R/'outputs/buzzle-winter-chests-v1' if state=='closed' else P)/('chest-'+season+'-'+state+'.png')
  items.append((path,title+' / '+label))
for i,(path,title) in enumerate(items):
 art=fit(path).resize((370,370),Image.Resampling.LANCZOS)
 for y,col in [(75,'#4A2C12'),(545,'#FFF6E3')]:
  board.paste(art,(i*400+15,y),art);d.text((i*400+12,y+380),title,font=font,fill=col)
 for j,size in enumerate([64,96]):
  im=fit(path).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(i*400+100+j*135,1005+(96-size)//2),im)
 d.text((i*400+20,1110),'64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Зимние сундуки v2 · открытые состояния

29.10.2026. Варианты на просмотр, не подключены в игру.

- chest-winter-open.png / .webp — открытый медово-золотой сундук со снежной крышкой и голубой снежинкой.
- chest-christmas-open.png / .webp — открытый рождественский сундук с красным бантом, лентами и звездой.
- preview.png — оба рядом с закрытыми вариантами winter-chests-v1, светлый/ночной фон и 64/96 px.

Два целых спрайта PNG 1024×1024 RGBA, lossless WebP. Пустой проём, без нарисованных наград. Исходники и точные промпты сохранены в sources/ и generation.json. Проверки размеров, прозрачности и совпадения экспортов — checks.json.

Это концепты открытого состояния, НЕ pixel-aligned кадры анимации. Генерация может менять геометрию основания относительно закрытого исходника. Нормализация общего силуэта не гарантирует одинаковый масштаб коробки при переключении closed/open. После выбора нужны неподвижное основание, отдельная крышка с якорем петли и отдельный слой света либо совмещённые кадры. Не использовать текущую пару как покадровую анимацию без этой подготовки.

Стиль и декор взяты из winter-chests-v1; существующие закрытые изображения сохранены. После imagegen только поля, пропорциональный размер и обзорный лист. Production assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-chests-v2',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 s=s.replace('Зимний и рождественский, закрытые, winter-chests-v1','Зимний и рождественский: закрытые v1, открытые концепты v2, на просмотре').replace('Открытые состояния и слои/кадры открытия','Оценить открытые состояния; отдельные слои/совмещённые кадры открытия')
 status.write_text(s)
print(json.dumps(checks))
