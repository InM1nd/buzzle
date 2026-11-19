from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;O=P.parent;M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
src=Path(M['source']);shutil.copy2(src,P/'sources/wreath-front.png');art=Image.open(src).convert('RGBA');bbox=art.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox();art=art.crop((max(0,bbox[0]-6),max(0,bbox[1]-6),min(art.width,bbox[2]+6),min(art.height,bbox[3]+6)))
art.save(P/'wreath-front.png');art.save(P/'wreath-front.webp',lossless=True)
bee=Image.open(O/'zhuzha-turnaround-approved-front/front.png').convert('RGBA');placed=Image.new('RGBA',bee.size)
w=600;h=round(w*art.height/art.width);x=(bee.width-w)//2;y=270;placed.alpha_composite(art.resize((w,h),Image.Resampling.LANCZOS),(x,y))
old=Image.open(O/'buzzle-winter-hat-layer-v1/antennae-front.png').convert('RGBA');patch=Image.new('RGBA',bee.size);patch.alpha_composite(old,(375,100));ant=Image.new('RGBA',bee.size)
pp=patch.load();hp=placed.load();ap=ant.load()
for yy in range(100,368):
 for xx in range(375,991):
  r,g,b,a=pp[xx,yy]
  if a>0 and (yy<310 or (r>g*1.2 and g<155 and b<110)) and hp[xx,yy][3]>0:ap[xx,yy]=(r,g,b,a)
for name,im in [('wreath-fitted',placed),('antennae-overlay',ant)]:im.save(P/f'{name}.png');im.save(P/f'{name}.webp',lossless=True)
fitting=Image.alpha_composite(Image.alpha_composite(bee,placed),ant);fitting.save(P/'fitting-front.png')
checks={}
for name in ['wreath-front','wreath-fitted','antennae-overlay']:
 a=Image.open(P/f'{name}.png').convert('RGBA');b=Image.open(P/f'{name}.webp').convert('RGBA')
 for color in ['#FFF6E3','#171340']:
  aa=Image.new('RGBA',a.size,color);bb=aa.copy();aa.alpha_composite(a);bb.alpha_composite(b);assert not ImageChops.difference(aa,bb).convert('RGB').getbbox()
 checks[name]={'size':list(a.size),'alpha':list(a.getchannel('A').getextrema()),'visibleLosslessWebpMatch':True}
change=ImageChops.difference(bee,fitting);outside=Image.new('L',bee.size,255);ImageDraw.Draw(outside).rectangle((x,y,x+w,y+h),fill=0)
for channel in change.split():assert not ImageChops.multiply(channel,outside).getbbox()
checks['fitting']={'allChangesWithinAccessoryRegion':True,'canonicalBeeSourceUnchanged':True,'noAntennaOrWingRepositioning':True}
layout={'canvas':list(bee.size),'accessory':{'file':'wreath-front.png','x':x,'y':y,'width':w,'height':h},'fittedLayer':'wreath-fitted.png','antennaeOverlay':'antennae-overlay.png','drawOrder':['canonical front.png','wreath-fitted.png','antennae-overlay.png']}
(P/'layout.json').write_text(json.dumps(layout,indent=2));(P/'checks.json').write_text(json.dumps(checks,indent=2))
font=ImageFont.truetype(str(O/'hive-run/assets/Nunito-ExtraBold.ttf'),24)
board=Image.new('RGB',(1400,1000),'#FFF6E3');d=ImageDraw.Draw(board);d.rectangle((700,0,1400,1000),fill='#171340')
for col,ink in [(0,'#4A2C12'),(1,'#FFF6E3')]:
 left=700*col;d.text((left+350,38),'Рождественский венок · отдельный слой',font=font,fill=ink,anchor='mm')
 thumb=art.copy();thumb.thumbnail((470,210),Image.Resampling.LANCZOS);board.paste(thumb,(left+(700-thumb.width)//2,85),thumb)
 f=fitting.resize((650,round(650*fitting.height/fitting.width)),Image.Resampling.LANCZOS);board.paste(f,(left+25,300),f)
 for i,size in enumerate([64,96,128]):
  f=fitting.resize((size,round(size*fitting.height/fitting.width)),Image.Resampling.LANCZOS);board.paste(f,(left+110+i*185-size//2,870-f.height//2),f);d.text((left+110+i*185,958),str(size)+' px',font=font.font_variant(size=20),fill=ink,anchor='mm')
board.save(P/'preview.png')
(P/'README.ru.md').write_text('''# Рождественский венок · отдельный слой, анфас

19.11.2026. Кандидат на просмотр. Хвойно-лиственный ободок с красными ягодами и маленькой медовой сотой, по дизайну winter-wardrobe-v5. Пчела — каноническая Жужа анфас, исходник не перерисован.

- wreath-front.png/.webp — самостоятельный аксессуар RGBA в исходном разрешении после обрезки полей.
- wreath-fitted.png/.webp — тот же аксессуар на полном холсте Жужи 1366×1151, начало (0,0).
- antennae-overlay.png/.webp — сохранённые оригинальные фрагменты усиков только в области пересечения с аксессуаром; полный холст, без сдвигов. Это привязанный к текущей примерке слой.
- fitting-front.png — статическая сборка для просмотра.
- preview.png — светлый/ночной фон, самостоятельный слой и примерка, миниатюры 64/96/128 px.
- layout.json — координаты и порядок слоёв. checks.json — размеры/альфа/проверки экспорта и неизменности вне области аксессуара.
- sources/ и generation.json — оригинал встроенного imagegen, полный промпт и референс.

Порядок сборки: исходная Жужа → wreath-fitted → antennae-overlay. Все слои масштабировать одной трансформацией. Не обрезать готовые слои по отдельности. Усики и крылья не переставлялись; геометрия тела, лицо и лапки не менялись. Для профиля и три четверти нужны свои изображения аксессуара. Старые примерки сохранены. assets/ и src/ не менялись, игрового подключения нет.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),O.parent/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-wreath-layer-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';t=status.read_text().replace('Далее отдельные венок/бант и другие пчёлы','Венок анфас отдельным слоем: winter-wreath-layer-v1, на просмотре. В текущем блоке осталось два ракурса венка и три ракурса банта');status.write_text(t)
print(json.dumps(layout))
