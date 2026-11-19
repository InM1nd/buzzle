from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;O=P.parent;M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
src=Path(M['source']);shutil.copy2(src,P/'sources/santa-front.png');hat=Image.open(src).convert('RGBA');bbox=hat.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox();hat=hat.crop((max(0,bbox[0]-6),max(0,bbox[1]-6),min(hat.width,bbox[2]+6),min(hat.height,bbox[3]+6)))
hat.save(P/'santa-front.png');hat.save(P/'santa-front.webp',lossless=True)
bee=Image.open(O/'zhuzha-turnaround-approved-front/front.png').convert('RGBA');placed=Image.new('RGBA',bee.size)
w=720;h=round(w*hat.height/hat.width);x=385;y=90;placed.alpha_composite(hat.resize((w,h),Image.Resampling.LANCZOS),(x,y))
# Restore only canonical brown antenna pixels where the red hat cloth covers them.
old=Image.open(O/'buzzle-winter-hat-layer-v1/antennae-front.png').convert('RGBA');patch=Image.new('RGBA',bee.size);patch.alpha_composite(old,(375,100));ant=Image.new('RGBA',bee.size)
pp=patch.load();hp=placed.load();ap=ant.load()
for yy in range(100,368):
 for xx in range(375,991):
  r,g,b,a=pp[xx,yy];hr,hg,hb,ha=hp[xx,yy]
  if a>0 and (yy<310 or (r>g*1.2 and g<155 and b<110)) and ha>0 and hr>hg*1.6 and hr>hb*1.15:
   ap[xx,yy]=(r,g,b,a)
ant.save(P/'antennae-overlay.png');ant.save(P/'antennae-overlay.webp',lossless=True)
placed.save(P/'hat-fitted.png');placed.save(P/'hat-fitted.webp',lossless=True)
fitting=Image.alpha_composite(Image.alpha_composite(bee,placed),ant);fitting.save(P/'fitting-front.png')
checks={}
for name in ['santa-front','antennae-overlay','hat-fitted']:
 a=Image.open(P/f'{name}.png').convert('RGBA');b=Image.open(P/f'{name}.webp').convert('RGBA')
 for color in ['#FFF6E3','#171340']:
  aa=Image.new('RGBA',a.size,color);bb=aa.copy();aa.alpha_composite(a);bb.alpha_composite(b);assert not ImageChops.difference(aa,bb).convert('RGB').getbbox()
 checks[name]={'size':list(a.size),'alpha':list(a.getchannel('A').getextrema()),'losslessWebpVisibleMatch':True}
# Changes must be contained in hat or antenna overlay; canonical source is unmodified.
change=ImageChops.difference(bee,fitting);outside=Image.new('L',bee.size,255);ImageDraw.Draw(outside).rectangle((x,y,x+w,y+h),fill=0);assert not ImageChops.multiply(change.getchannel('R'),outside).getbbox()
checks['fitting']={'canonicalBeeSourceUnmodified':True,'allEditsInsideHatRegion':True,'canvas':list(bee.size)}
layout={'canvas':list(bee.size),'hat':{'file':'santa-front.png','x':x,'y':y,'width':w,'height':h},'fittedHat':'hat-fitted.png','antennaeOverlay':'antennae-overlay.png','drawOrder':['canonical front.png','hat-fitted.png','antennae-overlay.png'],'note':'Fitted layers use the entire canonical canvas and origin (0,0). Original antenna geometry reused, not redrawn. Overlay is specific to this cap placement.'}
(P/'layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2));(P/'checks.json').write_text(json.dumps(checks,indent=2))
font=ImageFont.truetype(str(O/'hive-run/assets/Nunito-ExtraBold.ttf'),28)
board=Image.new('RGB',(1400,1000),'#FFF6E3');d=ImageDraw.Draw(board);d.rectangle((700,0,1400,1000),fill='#171340')
for col,ink in [(0,'#4A2C12'),(1,'#FFF6E3')]:
 left=700*col;d.text((left+350,38),'Рождественский колпак · отдельный слой',font=font.font_variant(size=24),fill=ink,anchor='mm')
 thumb=hat.copy();thumb.thumbnail((330,200),Image.Resampling.LANCZOS);board.paste(thumb,(left+(700-thumb.width)//2,75),thumb)
 f=fitting.resize((650,round(650*fitting.height/fitting.width)),Image.Resampling.LANCZOS);board.paste(f,(left+25,300),f)
 for i,size in enumerate([64,96,128]):
  f=fitting.resize((size,round(size*fitting.height/fitting.width)),Image.Resampling.LANCZOS);board.paste(f,(left+110+i*185-size//2,870-f.height//2),f);d.text((left+110+i*185,958),str(size)+' px',font=font.font_variant(size=20),fill=ink,anchor='mm')
board.save(P/'preview.png')
(P/'README.ru.md').write_text('''# Рождественский колпак · отдельный слой, анфас

19.11.2026. Кандидат на просмотр. Дизайн по winter-wardrobe-v3, посадка проверяется на канонической Жуже анфас, без перерисовки пчелы.

- santa-front.png/.webp — отдельный колпак с прозрачным фоном в исходном разрешении после обрезки полей.
- hat-fitted.png/.webp — колпак на полном холсте Жужи 1366×1151, готовая примерочная посадка.
- antennae-overlay.png/.webp — исходные фрагменты усиков, восстановленные только поверх красной ткани. Холст 1366×1151. Усики не перерисованы и не сдвинуты. Это привязанный к конкретной посадке слой, не универсальный комплект анатомии.
- fitting-front.png — статическая сборка для просмотра.
- preview.png — колпак, сборка и размеры 64/96/128 px на светлом/ночном фоне.
- layout.json — координаты и порядок слоёв; checks.json — размеры, альфа и проверка экспорта.
- sources/ и generation.json — оригинал встроенного imagegen, точный промпт и референсы.

Собирать: каноническая Жужа → hat-fitted → antennae-overlay. Все три слоя под одной трансформацией, начало (0,0). Для других ракурсов этот колпак не растягивать и не поворачивать плоской картинкой: нужны отдельные ракурсы. Формы крыльев, усиков, тела и лицо берутся из исходника; самостоятельной анимации здесь нет. Старые примерки сохранены. assets/ и src/ не менялись, в игру не подключено.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),O.parent/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-santa-layer-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text().replace('отдельные слои и другие пчёлы пока не готовы','Колпак анфас отдельным слоем: winter-santa-layer-v1, на просмотре. Остальные ракурсы колпака, отдельные рожки и другие пчёлы ещё нужны');status.write_text(s)
print(json.dumps({'hatPlacement':layout['hat'],'checks':checks}))
