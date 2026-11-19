from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;O=P.parent;M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
layouts={};checks={}
spec={'front':(358,725,650,[]),'q3-front':(390,690,700,[(395,697),(439,655),(475,601),(460,540),(400,525)]),'side':(455,610,650,[(320,550),(520,510),(575,576),(548,600),(512,625),(423,663),(320,660)])}
for angle,(x,y,w,wing) in spec.items():
 item=M[angle];src=Path(item['source']);shutil.copy2(src,P/'sources'/f'bow-{angle}.png');art=Image.open(src).convert('RGBA');bbox=art.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox();art=art.crop((max(0,bbox[0]-6),max(0,bbox[1]-6),min(art.width,bbox[2]+6),min(art.height,bbox[3]+6)))
 art.save(P/f'bow-{angle}.png');art.save(P/f'bow-{angle}.webp',lossless=True)
 bee=Image.open(O/'zhuzha-turnaround-approved-front'/f'{angle}.png').convert('RGBA');layer=Image.new('RGBA',bee.size);h=round(w*art.height/art.width);layer.alpha_composite(art.resize((w,h),Image.Resampling.LANCZOS),(x,y))
 # Existing body silhouette and near wing occlude the wrapping ribbon.
 clip=bee.getchannel('A').copy();free={'front':(.25,.75),'q3-front':(.54,.96),'side':(.75,1)}[angle];ImageDraw.Draw(clip).rectangle((round(x+w*free[0]),y,round(x+w*free[1]),y+h),fill=255)
 layer.putalpha(ImageChops.multiply(layer.getchannel('A'),clip))
 if wing:
  wm=Image.new('L',(bee.width*3,bee.height*3));ImageDraw.Draw(wm).polygon([(a*3,b*3)for a,b in wing],fill=255);wm=wm.resize(bee.size,Image.Resampling.LANCZOS);layer.putalpha(ImageChops.multiply(layer.getchannel('A'),ImageChops.invert(wm)))
 layer.save(P/f'bow-fitted-{angle}.png');layer.save(P/f'bow-fitted-{angle}.webp',lossless=True);fitting=Image.alpha_composite(bee,layer);fitting.save(P/f'fitting-{angle}.png')
 for stem in [f'bow-{angle}',f'bow-fitted-{angle}']:
  a=Image.open(P/f'{stem}.png').convert('RGBA');b=Image.open(P/f'{stem}.webp').convert('RGBA')
  for bg in ['#FFF6E3','#171340']:
   aa=Image.new('RGBA',a.size,bg);bb=aa.copy();aa.alpha_composite(a);bb.alpha_composite(b);assert not ImageChops.difference(aa,bb).convert('RGB').getbbox()
  checks[stem]={'size':list(a.size),'visibleLosslessWebpMatch':True}
 outside=Image.new('L',bee.size,255);ImageDraw.Draw(outside).rectangle((x,y,x+w,y+h),fill=0)
 for ch in ImageChops.difference(bee,fitting).split():assert not ImageChops.multiply(ch,outside).getbbox()
 layouts[angle]={'canvas':list(bee.size),'accessory':{'file':f'bow-{angle}.png','position':[x,y],'size':[w,h]},'fittedLayer':f'bow-fitted-{angle}.png','fittedLayerOrigin':[0,0],'drawOrder':[f'canonical {angle}.png',f'bow-fitted-{angle}.png'],'nearWingOcclusionPolygon':wing,'bodySilhouetteClipping':True}
font=ImageFont.truetype(str(O/'hive-run/assets/Nunito-ExtraBold.ttf'),27)
board=Image.new('RGB',(1500,1530),'#FFF6E3');d=ImageDraw.Draw(board);d.rectangle((0,300,1500,830),fill='#171340')
for col,(angle,title) in enumerate([('front','Анфас'),('q3-front','Три четверти'),('side','Профиль')]):
 x=500*col;d.text((x+250,35),title,font=font,fill='#4A2C12',anchor='mm');art=Image.open(P/f'bow-{angle}.png').convert('RGBA');art.thumbnail((390,210),Image.Resampling.LANCZOS);board.paste(art,(x+(500-art.width)//2,75),art)
 fit=Image.open(P/f'fitting-{angle}.png').convert('RGBA');im=fit.resize((480,round(480*fit.height/fit.width)),Image.Resampling.LANCZOS)
 for top in [340,865]:board.paste(im,(x+10,top),im)
 for i,size in enumerate([64,96,128]):
  im=fit.resize((size,round(size*fit.height/fit.width)),Image.Resampling.LANCZOS);board.paste(im,(x+85+i*165-size//2,1390-im.height//2),im);d.text((x+85+i*165,1490),str(size)+' px',font=font.font_variant(size=18),fill='#4A2C12',anchor='mm')
board.save(P/'preview.png');(P/'layout.json').write_text(json.dumps(layouts,ensure_ascii=False,indent=2));(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Праздничный бант · три отдельных ракурса

19.11.2026. На просмотре. Кремовые петли, красный узел и короткие хвостики, тонкая красная лента вокруг тела. Дизайн по winter-wardrobe-v5/v7.

Для каждого front/q3-front/side:
- bow-ANGLE.png/.webp — самостоятельный аксессуар с лентой, RGBA.
- bow-fitted-ANGLE.png/.webp — готовая посадка на каноническом холсте Жужи 1366×1151, начало (0,0). Края ленты ограничены силуэтом тела и уходят под ближнее крыло; сам бант может выступать за силуэт.
- fitting-ANGLE.png — статическая сборка для просмотра.

preview.png — три ракурса отдельно и на Жуже, светлый/ночной фон, 64/96/128 px. layout.json — координаты, порядок и перекрытия; checks.json — экспорт PNG/WebP и сохранение исходника вне аксессуара. sources/ и generation.json — три оригинальные генерации встроенного imagegen, точные промпты и референсы.

Пчёлы взяты из канонических анфаса/три четверти/профиля, без перерисовки лиц, усиков и крыльев. Для сборки каноническая пчела → bow-fitted на том же полном холсте под одной трансформацией. Отдельный bow — исходник для новой посадки, а не замена готовой привязки. Это независимые статические ракурсы, не совмещённая покадровая анимация. На другом виде пчелы нужны свои привязки. Старые варианты сохранены, assets/ и src/ не менялись, в игру не подключено.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),O.parent/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-bow-layer-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text().replace('В текущем блоке осталось три ракурса банта','Бант в трёх ракурсах отдельными слоями: winter-bow-layer-v1, на просмотре. Блок 4 предмета × 3 ракурса нарисован; остаётся общая проверка и выбор');status.write_text(s)
print(json.dumps(layouts))
