from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil,math
P=Path(__file__).resolve().parent;R=P.parent.parent
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
def fit(path):
 im=Image.open(path).convert('RGBA');box=im.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox();assert box
 im=im.crop(box);im.thumbnail((1000,866),Image.Resampling.LANCZOS)
 scale=min(1000/im.width,866/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(1000,866));out.alpha_composite(im,((1000-im.width)//2,(866-im.height)//2));return out
checks={}
for name,item in M.items():
 shutil.copy2(item['source'],P/'sources'/(name+'-source.png'))
 im=fit(item['source']);im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 wp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,bg);b=a.copy();a.alpha_composite(im);b.alpha_composite(wp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':list(im.size),'alpha':list(im.getchannel('A').getextrema()),'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),27)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1800,1120),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,15),'Buzzle · зимние соты улья · три состояния',font=font,fill='#4A2C12');d.rectangle((0,450,1800,900),fill='#171340')
items=[('comb_winter_full','comb.webp','С мёдом'),('comb_winter_empty','comb_empty.webp','Пустая'),('comb_winter_locked','comb_locked.webp','Закрытая')]
for col,(name,file,title) in enumerate(items):
 for y,ink in [(65,'#4A2C12'),(475,'#FFF6E3')]:
  d.text((col*600+25,y),title,font=font,fill=ink)
  for j,path in enumerate([Path('/Users/oleksandrzabolotnyi/buzzle/assets/art')/file,P/(name+'.png')]):
   im=fit(path).resize((280,242),Image.Resampling.LANCZOS);board.paste(im,(col*600+10+j*300,y+50),im)
   d.text((col*600+25+j*300,y+310),'Сейчас' if j==0 else 'Зима',font=font,fill=ink)
 for j,size in enumerate([48,64,96]):
  im=Image.open(P/(name+'.png')).resize((size,round(size*.866)),Image.Resampling.LANCZOS)
  board.paste(im,(col*600+150+j*130,940+(96-size)//2),im)
 d.text((col*600+25,1070),'48 / 64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png')
grid=Image.new('RGB',(1400,1150),'#FFF6E3');gd=ImageDraw.Draw(grid)
gd.text((25,15),'Зимние соты · проверка соседства на сетке',font=font,fill='#4A2C12')
tiles=[Image.open(P/(key+'.png')).resize((240,208),Image.Resampling.LANCZOS) for key,_,_ in items]
for q in range(-2,3):
 for r in range(-2,3):
  if max(abs(q),abs(r),abs(q+r))>2:continue
  x=700+180*q;y=570+104*(2*r+q)
  im=tiles[(q-r)%3];grid.paste(im,(round(x-120),round(y-104)),im)
gd.text((25,1090),'Концепты: перед подключением нужен общий внешний контур трёх состояний.',font=small,fill='#4A2C12')
grid.save(P/'grid.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Зимние соты улья v1

30.10.2026. Три концепта на просмотре, не подключены в игру.

- comb_winter_full.png / .webp — с мёдом, тёплый янтарный центр.
- comb_winter_empty.png / .webp — пустая, кремовый восковой центр.
- comb_winter_locked.png / .webp — закрытая, приглушённый воск без встроенного замка.
- preview.png — текущие и зимние варианты на светлом/ночном фоне и 48/64/96 px.
- grid.png — 19 сот на flat-top сетке, смешанные состояния.
- sources/, generation.json — исходники и полный набор промптов/референсов; checks.json — проверка экспортов.

Все PNG 1000×866 RGBA, WebP lossless. Сохранены прозрачность, пропорции, центральный якорь. После встроенного imagegen только кадрирование/масштабирование/поля и листы проверки. Иней внутри края; цифры, плюсы и замки остаются слоями UI.

Референсы: assets/art/comb.webp, comb_empty.webp, comb_locked.webp, требования design/art/combs-grid-fit-v1/README.ru.md. Кандидаты сгенерированы отдельно, поэтому внешняя альфа и грани трёх состояний пока различаются. Это не финальный взаимозаменяемый комплект: перед игровым экспортом необходимы общий контур и проверка отсутствия сдвига при переключении. grid.png — визуальная примерка, не замена игровой проверки.

Текущие assets/ и src/ не менялись. Размеры/координаты игровой сетки и механика улья не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-combs-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 row='| Соты улья | Зимние заполненная/пустая/закрытая: winter-combs-v1, на просмотре | Выбор вида; единый внешний контур состояний и игровой экспорт |\n'
 if '| Соты улья |' not in s:s=s.replace('| Глифы |',row+'| Глифы |')
 status.write_text(s)
print(json.dumps(checks))
