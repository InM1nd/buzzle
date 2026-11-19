from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
checks={}
def fit(path,size):
 im=Image.open(path).convert('RGBA');b=im.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox();assert b
 im=im.crop((max(0,b[0]-8),max(0,b[1]-8),min(im.width,b[2]+8),min(im.height,b[3]+8)))
 limit=(size[0]*.9,size[1]*.86);s=min(limit[0]/im.width,limit[1]/im.height)
 im=im.resize((round(im.width*s),round(im.height*s)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',size);out.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2));return out
for name,item in M.items():
 shutil.copy2(item['source'],P/'sources'/(name+'-source.png'))
 size=(1024,1024) if name.endswith('tree') else (2048,1024)
 im=fit(item['source'],size);assert im.getchannel('A').getextrema()==(0,255)
 im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 wp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,bg);b=a.copy();a.alpha_composite(im);b.alpha_composite(wp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':list(im.size),'alpha':[0,255],'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1600,1260),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,15),'Buzzle · игровой декор · более простые материалы',font=font,fill='#4A2C12')
for row,(name,title,box,y) in enumerate([('deco_winter_tree','Ёлочка',(500,500),65),('deco_winter_garland','Гирлянда',(760,380),610)]):
 for col,folder in enumerate([R/'outputs/buzzle-winter-decor-v2',P]):
  d.text((col*800+25,y),title+(' · было' if col==0 else ' · новый вариант'),font=font,fill='#4A2C12')
  im=Image.open(folder/(name+'.png')).convert('RGBA');im.thumbnail(box,Image.Resampling.LANCZOS)
  board.paste(im,(col*800+(800-im.width)//2,y+40),im)
for j,size in enumerate([64,96]):
 im=Image.open(P/'deco_winter_tree.png').resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(150+j*160,1090+(96-size)//2),im)
d.text((25,1210),'Ёлочка · 64 / 96 px',font=small,fill='#4A2C12')
im=Image.open(P/'deco_winter_garland.png').resize((360,180),Image.Resampling.LANCZOS);board.paste(im,(900,1040),im)
d.text((900,1220),'Гирлянда · ширина 360 px',font=small,fill='#4A2C12');board.save(P/'preview.png')
dark=Image.new('RGB',(1600,650),'#171340');dd=ImageDraw.Draw(dark)
dd.text((25,15),'Новые варианты · проверка на ночном фоне',font=font,fill='#FFF6E3')
for name,box,pos in [('deco_winter_tree',(500,500),(30,85)),('deco_winter_garland',(980,490),(580,100))]:
 im=Image.open(P/(name+'.png')).convert('RGBA');im.thumbnail(box,Image.Resampling.LANCZOS);dark.paste(im,pos,im)
dark.save(P/'dark-preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Зимний декор v5 · упрощение ёлочки и гирлянды

30.10.2026. Варианты на просмотре, исходные v2 сохранены. Направление: крупные грани, матовые материалы, умеренные блики и меньше мелких украшений, ближе к игровым спрайтам Buzzle.

- deco_winter_tree.png / .webp — ёлочка в медовом горшке, простые ярусы, небольшая звезда, три игрушки-соты и лента. 1024×1024 RGBA.
- deco_winter_garland.png / .webp — пять фонариков на шнуре, упрощённая хвоя, снег и мягкий свет. 2048×1024 RGBA.
- preview.png — v2 и v5 рядом, ёлочка 64/96 px и гирлянда шириной 360 px.
- dark-preview.png — новые предметы на #171340.
- sources/, generation.json — исходники и полные промпты/референсы; checks.json — проверки экспортов.

Встроенный imagegen, редактирование предметов из winter-decor-v2. После генерации только прозрачные поля, кадрирование, пропорциональное масштабирование и листы сравнения. WebP lossless, видимые пиксели совпадают с PNG на светлом и тёмном фонах.

Гирлянда пока цельная: огни и снег не выделены слоями для анимации. Свет встроен в стекло фонариков, отдельного светового ореола нет. Перед подключением нужны выбор варианта, масштаб и примерка в улье/саду. Production assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-decor-v5',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 s=s.replace('почтовый ящик и пряничный домик (v4)','почтовый ящик и пряничный домик (v4), упрощённые ёлочка и гирлянда (v5, на просмотре)')
 status.write_text(s)
print(json.dumps(checks))
