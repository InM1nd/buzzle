from PIL import Image,ImageDraw,ImageFont,ImageChops
from pathlib import Path
import json,shutil
P=Path(__file__).resolve().parent;O=P.parent;G=O/'buzzle-winter-gift-sort-sprites-v2'
refs={'zhuzha':O/'zhuzha-turnaround-approved-front/front.png','snow':O/'buzzle-winter-bees-v6/bee-snow-front.png','gingerbread':O/'buzzle-winter-bees-v6/bee-gingerbread-front.png'}
colors=['red','green','gold','blue'];labels={'zhuzha':'Жужа','snow':'Снежная','gingerbread':'Пряничная'}
(P/'sources').mkdir(exist_ok=True);layouts={};checks={}
for species,path in refs.items():
 src=Image.open(path).convert('RGBA');shutil.copy2(path,P/'sources'/f'{species}.png')
 bbox=src.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();bee=src.crop(bbox);scale=min(850/bee.width,750/bee.height);size=(round(bee.width*scale),round(bee.height*scale));bee=bee.resize(size,Image.Resampling.LANCZOS)
 x=(1024-bee.width)//2;y=100;bottom=y+bee.height
 layer=Image.new('RGBA',(1024,1200));layer.alpha_composite(bee,(x,y));layer.save(P/f'bee_{species}.png')
 # Keep the original silhouette entirely intact. Gift sits behind the lowermost paws.
 for color in colors:
  gift=Image.open(G/f'gift_{color}.png').convert('RGBA');gb=gift.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();gift=gift.crop(gb);gs=310/gift.width;gift=gift.resize((310,round(gift.height*gs)),Image.Resampling.LANCZOS)
  gx=357;gy=bottom-88
  gl=Image.new('RGBA',(1024,1200));gl.alpha_composite(gift,(gx,gy));gl.save(P/f'gift_{species}_{color}.png')
  result=Image.alpha_composite(gl,layer);result.save(P/f'carrier_{species}_{color}.png');result.save(P/f'carrier_{species}_{color}.webp',lossless=True)
  bounds=result.getchannel('A').getbbox();assert bounds[0]>0 and bounds[1]>0 and bounds[2]<1024 and bounds[3]<1200
  for bg in ['#FFF6E3','#171340']:
   a=Image.new('RGBA',result.size,bg);b=a.copy();a.alpha_composite(result);b.alpha_composite(Image.open(P/f'carrier_{species}_{color}.webp').convert('RGBA'));assert not ImageChops.difference(a,b).convert('RGB').getbbox()
  layouts[f'{species}_{color}']={'canvas':[1024,1200],'bee':{'file':f'bee_{species}.png','source':str(path.relative_to(O)),'sourceBBox':list(bbox),'position':[x,y],'size':list(size)},'gift':{'file':f'gift_{species}_{color}.png','position':[gx,gy],'size':list(gift.size)},'layerOrder':['gift','bee'],'attachment':[512,bottom-28]}
  checks[f'{species}_{color}']={'noClipping':True,'visibleWebpMatch':True}
font=ImageFont.truetype(str(O/'hive-run/assets/Nunito-ExtraBold.ttf'),27)
board=Image.new('RGB',(1280,1560),'#FFF6E3');d=ImageDraw.Draw(board)
for row,species in enumerate(refs):
 if row==1:d.rectangle((0,520,1280,1040),fill='#171340')
 ink='#FFF6E3' if row==1 else '#4A2C12'
 for col,c in enumerate(colors):
  im=Image.open(P/f'carrier_{species}_{c}.png').resize((300,352),Image.Resampling.LANCZOS);board.paste(im,(320*col+10,520*row+50),im)
  d.text((320*col+160,520*row+27),labels[species],font=font,fill=ink,anchor='mm')
  for i,w in enumerate([64,88]):
   im=Image.open(P/f'carrier_{species}_{c}.png').resize((w,round(w*1200/1024)),Image.Resampling.LANCZOS);board.paste(im,(320*col+60+i*125,520*row+405),im)
board.save(P/'preview.png')
(P/'layout.json').write_text(json.dumps(layouts,ensure_ascii=False,indent=2));(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Пчёлы-носильщики · примерка v1

17.11.2026. На просмотре. Статическая примерка: Жужа, снежная и пряничная пчела, по четыре цвета подарков. Исходные анфасы сохранены в sources/. Никакие части пчёл не перерисованы: одинаковый пропорциональный масштаб и перенос всей картинки, без перестановки крыльев, усиков и лапок.

carrier_SPECIES_COLOR.png/.webp — 12 композиций 1024×1200 RGBA, lossless WebP. bee_SPECIES.png — три прозрачных слоя пчёл на том же холсте. gift_SPECIES_COLOR.png — 12 отдельных подарков с готовой посадкой на том же холсте. Подарок находится за пчелой, верхний край частично прикрыт лапками/нижним силуэтом. Это условная переноска без нового жеста рук: отдельную хватательную позу не рисовали.

layout.json — привязки и размеры; checks.json — отсутствие обрезки и совпадение экспорта PNG/WebP на светлом и тёмном фонах. preview.png — 12 примерок и миниатюры шириной 64/88 px. index.html — проверка общей группы и отдельного отпускания подарка, с паузой и сменой фона. Холст каждой части одинаковый: для отпускания анимировать gift отдельно, не двигая пчелу вниз. Не использовать готовую carrier-композицию для раздельной анимации; слои bee/gift даны именно для этого.

Эта примерка не задаёт новые игровые виды, характеристики, валюты или правила. Зимние пчёлы всё ещё кандидаты. Существующие мешки и их слои остаются в winter-gift-sort-layers-v1. assets/ и src/ не менялись; игровой импорт не выполнялся.
''')
html='''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Buzzle · Пчёлы с подарками</title><style>*{box-sizing:border-box}body{margin:0;background:#171340;color:#fff6e3;font:18px system-ui;text-align:center}main{max-width:1150px;margin:auto;padding:20px 12px}h1{font-size:26px}p{font-size:16px}button,select{padding:12px 18px;margin:6px;border:0;border-radius:16px;background:#ffc56b;color:#493018;font:inherit}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.stage{aspect-ratio:1024/1600;position:relative;overflow:hidden}.stage img{position:absolute;width:100%;left:0;top:0}.stage .bee{animation:hover 3s ease-in-out infinite}.stage .gift{animation:release 3s ease-in-out infinite}.stage .sack{width:68%;left:16%;top:61.5%}.stage .front{z-index:3}@keyframes hover{0%,20%,100%{transform:translateY(0)}50%,80%{transform:translateY(-4%)}}@keyframes release{0%,20%{transform:translateY(0)}62%,90%{transform:translateY(39%);opacity:1}91%{transform:translateY(39%);opacity:0}99%{transform:translateY(0);opacity:0}100%{transform:translateY(0);opacity:1}}.paused img{animation-play-state:paused!important}.light{background:#fff6e3;color:#493018}@media(max-width:650px){.grid{grid-template-columns:repeat(2,1fr)}}@media(prefers-reduced-motion:reduce){.stage img{animation:none!important}}</style><main><h1>Пчёлы-носильщики</h1><p>Примерка размера и переноски. Подарок отдельным слоем; пчёлы сохранены целиком.</p><select id="species" aria-label="Пчела"><option value="zhuzha">Жужа</option><option value="snow">Снежная</option><option value="gingerbread">Пряничная</option></select><button id="pause" aria-pressed="false">Пауза</button><button id="bg">Светлый фон</button><div class="grid">'''
# Copy only the current back/front sack layers, preserving bytes.
for c,title in zip(colors,['Красный','Зелёный','Золотой','Голубой']):
 for part in ['back','front']:shutil.copy2(O/f'buzzle-winter-gift-sort-layers-v1/sack_{c}_{part}.png',P/f'sack_{c}_{part}.png')
 html+=f'<section><h2>{title}</h2><div class="stage"><img class="sack" src="sack_{c}_back.png" alt=""><img class="gift" data-color="{c}" src="gift_zhuzha_{c}.png" alt="Подарок"><img class="bee" src="bee_zhuzha.png" alt="Пчела"><img class="sack front" src="sack_{c}_front.png" alt="Мешок"></div></section>'
html+='''</div><p>В игре жест захвата ещё можно уточнить. Это проверка существующих спрайтов, без изменения механик.</p><a style="color:inherit" href="preview.png">Все 12 примерок</a></main><script>species.onchange=()=>{document.querySelectorAll('.bee').forEach(x=>x.src='bee_'+species.value+'.png');document.querySelectorAll('.gift').forEach(x=>x.src='gift_'+species.value+'_'+x.dataset.color+'.png')};pause.onclick=()=>{const p=document.body.classList.toggle('paused');pause.textContent=p?'Продолжить':'Пауза';pause.setAttribute('aria-pressed',p)};bg.onclick=()=>{const l=document.body.classList.toggle('light');bg.textContent=l?'Тёмный фон':'Светлый фон'}</script></html>'''
(P/'index.html').write_text(html)
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),O.parent/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-gift-carriers-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text().replace('Ещё нужна примерка с пчёлами','Примерки с Жужей и зимними пчёлами: winter-gift-carriers-v1, на просмотре');status.write_text(s)
print('12 carriers, 3 bee layers, 12 gift layers; checks passed')
