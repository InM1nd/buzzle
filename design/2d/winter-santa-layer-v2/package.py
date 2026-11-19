from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;O=P.parent;M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
layouts={};checks={}
front=O/'buzzle-winter-santa-layer-v1'
for old,new in [('santa-front','santa-front'),('hat-fitted','hat-fitted-front'),('antennae-overlay','antennae-front')]:
 for ext in ['png','webp']:
  shutil.copy2(front/f'{old}.{ext}',P/f'{new}.{ext}');assert (front/f'{old}.{ext}').read_bytes()==(P/f'{new}.{ext}').read_bytes()
shutil.copy2(front/'fitting-front.png',P/'fitting-front.png');layouts['front']=json.loads((front/'layout.json').read_text());checks['frontCopiedUnchanged']=True
for angle,(x,y,w,rect) in {'q3-front':(450,125,690,(470,65,1050,380)),'side':(475,195,600,(775,65,1095,385))}.items():
 item=M[angle];src=Path(item['source']);shutil.copy2(src,P/'sources'/f'santa-{angle}.png');hat=Image.open(src).convert('RGBA');b=hat.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox();hat=hat.crop((max(0,b[0]-6),max(0,b[1]-6),min(hat.width,b[2]+6),min(hat.height,b[3]+6)))
 hat.save(P/f'santa-{angle}.png');hat.save(P/f'santa-{angle}.webp',lossless=True)
 bee=Image.open(O/'zhuzha-turnaround-approved-front'/f'{angle}.png').convert('RGBA');placed=Image.new('RGBA',bee.size);h=round(w*hat.height/hat.width);placed.alpha_composite(hat.resize((w,h),Image.Resampling.LANCZOS),(x,y))
 ant=Image.new('RGBA',bee.size);bp=bee.load();hp=placed.load();ap=ant.load()
 for yy in range(rect[1],rect[3]):
  for xx in range(rect[0],rect[2]):
   r,g,b,a=bp[xx,yy];hr,hg,hb,ha=hp[xx,yy]
   if a>0 and (yy<310 or (r>g*1.2 and g<155 and b<110)) and ha>0 and hr>hg*1.6 and hr>hb*1.15:ap[xx,yy]=(r,g,b,a)
 for name,im in [(f'hat-fitted-{angle}',placed),(f'antennae-{angle}',ant)]:im.save(P/f'{name}.png');im.save(P/f'{name}.webp',lossless=True)
 fitting=Image.alpha_composite(Image.alpha_composite(bee,placed),ant);fitting.save(P/f'fitting-{angle}.png')
 outside=Image.new('L',bee.size,255);ImageDraw.Draw(outside).rectangle((x,y,x+w,y+h),fill=0)
 for ch in ImageChops.difference(bee,fitting).split():assert not ImageChops.multiply(ch,outside).getbbox()
 for name in [f'santa-{angle}',f'hat-fitted-{angle}',f'antennae-{angle}']:
  a=Image.open(P/f'{name}.png').convert('RGBA');b=Image.open(P/f'{name}.webp').convert('RGBA')
  for bg in ['#FFF6E3','#171340']:
   aa=Image.new('RGBA',a.size,bg);bb=aa.copy();aa.alpha_composite(a);bb.alpha_composite(b);assert not ImageChops.difference(aa,bb).convert('RGB').getbbox()
  checks[name]={'size':list(a.size),'visibleLosslessWebpMatch':True}
 layouts[angle]={'canvas':list(bee.size),'hat':{'x':x,'y':y,'width':w,'height':h,'file':f'santa-{angle}.png'},'drawOrder':[f'canonical {angle}.png',f'hat-fitted-{angle}.png',f'antennae-{angle}.png'],'fittedLayersOrigin':[0,0]}
 checks[angle]={'sourceBeeUnchanged':True,'allChangesWithinHatRegion':True}
font=ImageFont.truetype(str(O/'hive-run/assets/Nunito-ExtraBold.ttf'),27)
board=Image.new('RGB',(1500,1530),'#FFF6E3');d=ImageDraw.Draw(board);d.rectangle((0,300,1500,830),fill='#171340')
for col,(angle,title) in enumerate([('front','Анфас'),('q3-front','Три четверти'),('side','Профиль')]):
 x=500*col;d.text((x+250,35),title,font=font,fill='#4A2C12',anchor='mm');hat=Image.open(P/f'santa-{angle}.png').convert('RGBA');hat.thumbnail((390,210),Image.Resampling.LANCZOS);board.paste(hat,(x+(500-hat.width)//2,75),hat)
 fit=Image.open(P/f'fitting-{angle}.png').convert('RGBA');im=fit.resize((480,round(480*fit.height/fit.width)),Image.Resampling.LANCZOS)
 for top in [340,865]:board.paste(im,(x+10,top),im)
 for i,size in enumerate([64,96,128]):
  im=fit.resize((size,round(size*fit.height/fit.width)),Image.Resampling.LANCZOS);board.paste(im,(x+85+i*165-size//2,1390-im.height//2),im);d.text((x+85+i*165,1490),str(size)+' px',font=font.font_variant(size=18),fill='#4A2C12',anchor='mm')
board.save(P/'preview.png');(P/'layout.json').write_text(json.dumps(layouts,ensure_ascii=False,indent=2));(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Рождественский колпак · три ракурса отдельными слоями

19.11.2026. Новые: передние три четверти q3-front и правый профиль side. Анфас front скопирован из winter-santa-layer-v1 без изменений. Кандидаты на просмотр, не автоматическое утверждение.

Для каждого ракурса:
- santa-ANGLE.png/.webp — самостоятельный колпак с прозрачным фоном.
- hat-fitted-ANGLE.png/.webp — тот же колпак на полном каноническом холсте 1366×1151.
- antennae-ANGLE.png/.webp — исходные фрагменты усиков, восстановленные только поверх красной ткани, без смещения и перерисовки.
- fitting-ANGLE.png — статическая сборка для просмотра.

preview.png — все ракурсы отдельно и на Жуже, на тёмном и светлом фоне, с миниатюрами 64/96/128 px. layout.json — координаты и порядок слоёв; checks.json — копия анфаса, сохранение пикселей вне области колпака и PNG/WebP на двух фонах. Анфас использует те же имена слоёв по ракурсам, что и новые виды.

Новые ракурсы сделаны встроенным imagegen по отдельному колпаку анфас и прежним примеркам winter-wardrobe-v4. Оригиналы в sources/, точные промпты и референсы в generation.json. Два ракурса — самостоятельные рисунки; мелкие грани могут различаться. Плоского поворота анфаса нет. Тела, лица и крылья взяты из канонических исходников Жужи без изменений.

При сборке использовать одну трансформацию для канонической пчелы, hat-fitted и antennae. Начало всех готовых слоёв (0,0). Это статические ракурсы, не совмещённые кадры покадровой анимации. Старые варианты сохранены. assets/ и src/ не менялись, в игру не подключено.
''')
# Make front layout refer to the actual filenames in this self-contained package.
layouts['front']['fittedHat']='hat-fitted-front.png';layouts['front']['antennaeOverlay']='antennae-front.png';layouts['front']['drawOrder']=['canonical front.png','hat-fitted-front.png','antennae-front.png'];(P/'layout.json').write_text(json.dumps(layouts,ensure_ascii=False,indent=2))
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),O.parent/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-santa-layer-v2',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text().replace('Остальные ракурсы обоих аксессуаров и другие пчёлы ещё нужны','Колпак в трёх ракурсах отдельными слоями: winter-santa-layer-v2, на просмотре. Для рожек нужны профиль и три четверти; далее отдельные венок/бант и другие пчёлы');status.write_text(s)
print(json.dumps(layouts))
