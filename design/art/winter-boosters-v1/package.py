from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
def fit(path):
 im=Image.open(path).convert('RGBA');b=im.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox();assert b
 im=im.crop((max(0,b[0]-8),max(0,b[1]-8),min(im.width,b[2]+8),min(im.height,b[3]+8)))
 s=min(840/im.width,840/im.height);im=im.resize((round(im.width*s),round(im.height*s)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(1024,1024));out.alpha_composite(im,((1024-im.width)//2,(1024-im.height)//2));return out
checks={}
for name,item in M.items():
 shutil.copy2(item['source'],P/'sources'/(name+'-source.png'))
 im=fit(item['source']);assert im.getchannel('A').getextrema()==(0,255)
 im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 wp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,bg);b=a.copy();a.alpha_composite(im);b.alpha_composite(wp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':list(im.size),'alpha':[0,255],'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),27)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1800,1170),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,15),'Buzzle · зимние усилители головоломки',font=font,fill='#4A2C12');d.rectangle((0,470,1800,940),fill='#171340')
items=[('boost_winter_bomb','boost_bomb.webp','Бомба'),('boost_winter_shuffle','boost_shuffle.webp','Перемешивание'),('boost_winter_moves','boost_moves.webp','Дополнительные ходы')]
for col,(name,file,title) in enumerate(items):
 for y,ink in [(65,'#4A2C12'),(495,'#FFF6E3')]:
  d.text((col*600+25,y),title,font=font,fill=ink)
  for j,path in enumerate([Path('/Users/oleksandrzabolotnyi/buzzle/assets/art')/file,P/(name+'.png')]):
   im=fit(path).resize((280,280),Image.Resampling.LANCZOS);board.paste(im,(col*600+10+j*300,y+45),im)
   d.text((col*600+25+j*300,y+350),'Сейчас' if j==0 else 'Зима',font=font,fill=ink)
 for j,size in enumerate([48,64,96]):
  im=Image.open(P/(name+'.png')).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*600+150+j*130,975+(96-size)//2),im)
 d.text((col*600+25,1125),'48 / 64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Зимние усилители головоломки v1

30.10.2026. Три сезонных варианта на просмотре; это иконки кнопок усилителей, не глифы на поле.

- boost_winter_bomb.png / .webp — кремово-медовый шар с небольшой короной, розовыми камнями и ледяным акцентом на основании короны.
- boost_winter_shuffle.png / .webp — синяя сота с двумя кремовыми круговыми стрелками, лёгкий иней у внутреннего края.
- boost_winter_moves.png / .webp — зелёная сота с «+3», лёгкие зимние акценты у края.
- preview.png — текущие и зимние иконки на светлом/ночном фоне, размеры 48/64/96 px.
- sources/ — исходные генерации; generation.json — полный набор промптов и референсов; checks.json — проверка экспортов.

PNG 1024×1024 RGBA и WebP lossless. Общее поле и максимальная сторона объекта 840 px; бомба не получает увеличенного масштаба. Видимые пиксели PNG/WebP совпадают на #FFF6E3 и #171340.

Созданы встроенным imagegen по assets/art/boost_bomb.webp, boost_shuffle.webp, boost_moves.webp. После генерации только поля, кадрирование, пропорциональное масштабирование и лист сравнения. Надпись +3 сохранена для узнаваемости текущего усилителя; счётчики остаются отдельными слоями UI.

Текущие assets/ и src/ не менялись. Перед подключением нужны выбор оформления и примерка в HUD на реальных размерах. Механики/цены/эффекты усилителей не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-boosters-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 row='| Усилители головоломки | Бомба, перемешивание, +3 хода: winter-boosters-v1, на просмотре | Выбрать оформление и примерить в HUD |\n'
 if '| Усилители головоломки |' not in s:s=s.replace('| Зимние награды |',row+'| Зимние награды |')
 status.write_text(s)
print(json.dumps(checks))
