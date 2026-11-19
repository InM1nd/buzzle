from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import json, shutil, math
P=Path(__file__).resolve().parent; O=P.parent; S=O/'buzzle-winter-gift-sort-targets-v2'
colors=['red','green','gold','blue']; labels=['Красный','Зелёный','Золотой','Голубой']
# Traced against each existing 512 px sprite; coordinates remain in original canvas.
fronts={
'red':[(83,128),(107,143),(126,155),(151,167),(180,176),(212,182),(235,183),(253,186),(276,183),(303,181),(330,174),(359,164),(384,152),(405,139),(429,127)],
'green':[(86,128),(111,145),(137,158),(167,168),(200,176),(230,180),(258,182),(285,179),(315,174),(344,166),(371,155),(398,141),(425,127)],
'gold':[(83,130),(110,146),(138,160),(166,170),(195,178),(225,182),(255,186),(283,183),(314,177),(345,167),(372,156),(399,142),(428,129)],
'blue':[(84,129),(111,146),(139,160),(168,171),(198,178),(228,184),(257,186),(287,182),(317,177),(347,166),(375,155),(400,140),(429,128)]}
upper={
'red':[(107,128),(121,106),(150,91),(183,80),(218,73),(254,73),(291,74),(327,83),(361,96),(386,111),(403,130)],
'green':[(111,128),(127,107),(156,92),(188,84),(222,79),(258,80),(296,81),(333,89),(365,102),(390,116),(401,130)],
'gold':[(108,130),(125,106),(155,90),(185,80),(220,74),(255,74),(292,77),(330,85),(364,100),(387,115),(402,130)],
'blue':[(109,129),(126,106),(155,89),(187,79),(221,74),(259,74),(295,78),(332,87),(364,101),(387,115),(402,129)]}
checks={}; assets={}
for c in colors:
 art=Image.open(S/f'sack_{c}.png').convert('RGBA'); alpha=art.getchannel('A')
 cut=Image.new('L',(512,512));ImageDraw.Draw(cut).polygon(fronts[c]+[(512,128),(512,512),(0,512),(0,128)],fill=255)
 front=art.copy();front.putalpha(ImageChops.multiply(alpha,cut))
 back=art.copy();back.putalpha(ImageChops.subtract(alpha,front.getchannel('A')))
 mouth=Image.new('L',(512,512));ImageDraw.Draw(mouth).polygon(upper[c]+list(reversed(fronts[c][1:-1])),fill=255)
 for name,im in [('front',front),('back',back)]:
  im.save(P/f'sack_{c}_{name}.png'); im.save(P/f'sack_{c}_{name}.webp',lossless=True)
 mask=Image.new('RGBA',(512,512),'white');mask.putalpha(mouth);mask.save(P/f'sack_{c}_mouth-mask.png')
 shutil.copy2(S/f'gift_{c}.png',P/f'gift_{c}.png')
 combined=Image.alpha_composite(back,front)
 for bg in ['#171340','#FFF6E3']:
  a=Image.new('RGBA',(512,512),bg);b=a.copy();a.alpha_composite(art);b.alpha_composite(combined)
  assert not ImageChops.difference(a,b).convert('RGB').getbbox()
 for name in ['front','back']:
  png=Image.open(P/f'sack_{c}_{name}.png').convert('RGBA'); webp=Image.open(P/f'sack_{c}_{name}.webp').convert('RGBA')
  for bg in ['#171340','#FFF6E3']:
   a=Image.new('RGBA',(512,512),bg);b=a.copy();a.alpha_composite(png);b.alpha_composite(webp)
   assert not ImageChops.difference(a,b).convert('RGB').getbbox()
 checks[c]={'size':[512,512],'reconstructsOriginalOnBothBackgrounds':True,'losslessWebpVisibleMatch':True,'maskBBox':list(mouth.getbbox())}
 assets[c]=(back,front,Image.open(P/f'gift_{c}.png').convert('RGBA'))
layout={'canvas':[512,512],'layerOrder':['sack_COLOR_back','moving gift','sack_COLOR_front'],'layerOrigin':[0,0],'giftExample':{'size':[132,132],'centerX':256,'topY':[-110,220]},'mouthMasks':{c:checks[c]['maskBBox'] for c in colors},'note':'Masks use alpha, not luminance. Mouth bbox is only a bound; use the actual alpha contour. Front/back must keep the same transform and pixel alignment.'}
(P/'layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2));(P/'checks.json').write_text(json.dumps(checks,indent=2))
font=ImageFont.truetype(str(O/'hive-run/assets/Nunito-ExtraBold.ttf'),25)
def scene(c,top,bg='#171340'):
 b,f,g=assets[c];im=Image.new('RGBA',(512,650),bg);im.alpha_composite(b,(0,138));g=g.resize((132,132),Image.Resampling.LANCZOS);im.alpha_composite(g,(190,138+top));im.alpha_composite(f,(0,138));return im
board=Image.new('RGB',(1200,1190),'#171340');d=ImageDraw.Draw(board)
for col,c in enumerate(colors):
 d.text((col*300+150,28),labels[col],font=font,fill='#FFF6E3',anchor='mm')
 for row,(top,title) in enumerate([(-100,'Над мешком'),(118,'Проходит за краем'),(220,'Внутри')]):
  im=scene(c,top).resize((280,355),Image.Resampling.LANCZOS);board.paste(im,(col*300+10,50+row*380));d.text((col*300+150,410+row*380),title,font=font.font_variant(size=19),fill='#FFF6E3',anchor='mm')
board.save(P/'preview.png')
frames=[]
for i in range(40):
 t=min(1,max(0,(i-5)/25));top=round(-110+330*t*t);frame=Image.new('RGB',(1000,360),'#171340')
 for col,c in enumerate(colors):
  im=scene(c,top).resize((250,317),Image.Resampling.LANCZOS);frame.paste(im,(250*col,36));ImageDraw.Draw(frame).text((250*col+125,19),labels[col],font=font.font_variant(size=19),fill='#FFF6E3',anchor='mm')
 frames.append(frame)
frames[0].save(P/'drop-preview.webp',save_all=True,append_images=frames[1:],duration=65,loop=0,quality=85)
html='''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Buzzle · Подарки в мешках</title><style>*{box-sizing:border-box}body{margin:0;background:#171340;color:#fff6e3;font:18px system-ui;text-align:center}main{max-width:1150px;margin:auto;padding:24px 12px}h1{font-size:26px}p{color:#ccc6df}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.sack{position:relative;aspect-ratio:512/650;overflow:hidden}.sack img{position:absolute;left:0;top:21.23%;width:100%}.sack .gift{width:25.78125%;left:37.109375%;animation:fall 2.6s infinite}.sack .front{z-index:2}button{border:0;border-radius:20px;background:#ffc56b;color:#493018;padding:14px 24px;font:inherit;cursor:pointer;margin:8px}@keyframes fall{0%,12%{transform:translateY(-83.333%)}78%,100%{transform:translateY(166.666%)}}.paused .gift{animation-play-state:paused}.light{background:#fff6e3;color:#493018}.light p{color:#725b46}@media(max-width:650px){.grid{grid-template-columns:repeat(2,1fr)}}@media(prefers-reduced-motion:reduce){.sack .gift{animation:none;transform:translateY(89.39%)}}</style><main><h1>Подарок падает внутрь мешка</h1><p>Исходные мешки сохранены. Передний край скрывает падающую коробку.</p><button id="pause" aria-pressed="false">Пауза</button><button id="bg">Светлый фон</button><div class="grid">'''
for c,label in zip(colors,labels):html+=f'<section><h2>{label}</h2><div class="sack"><img src="sack_{c}_back.png" alt=""><img class="gift" src="gift_{c}.png" alt="Подарок"><img class="front" src="sack_{c}_front.png" alt="Мешок"></div></section>'
html+='''</div><p>Проба слоёв — без игровой логики.</p></main><script>document.getElementById('pause').onclick=function(){const p=document.body.classList.toggle('paused');this.textContent=p?'Продолжить':'Пауза';this.setAttribute('aria-pressed',p)};document.getElementById('bg').onclick=function(){const l=document.body.classList.toggle('light');this.textContent=l?'Тёмный фон':'Светлый фон'}</script></html>'''
(P/'index.html').write_text(html)
(P/'README.ru.md').write_text('''# Сортировка подарков · слои мешков

17.11.2026. Техническая подготовка существующего winter-gift-sort-targets-v2, без перерисовки. На просмотре, в игру не подключено.

Для каждого red/green/gold/blue:
- sack_COLOR_back.png/.webp — задняя часть и интерьер, 512×512 RGBA.
- sack_COLOR_front.png/.webp — передний край и корпус, 512×512 RGBA.
- sack_COLOR_mouth-mask.png — белая маска проёма в альфе, 512×512. Вне проёма alpha=0; читайте альфу, не яркость RGB.
- gift_COLOR.png — исходный подарок без изменений для примерки.

Порядок: back → движущийся подарок → front. Оба слоя мешка находятся в (0,0), одинакового размера, не обрезайте их по отдельности. При масштабировании используйте единый контейнер. Подарок в примере 132×132, x=190, y от −110 до 220 в координатах мешка. Ближе к концу он полностью закрывается передней частью; следом можно добавить подпрыгивание и очки в игре. Маска нужна для попадания/эффектов внутри проёма; в этой пробе предмет уже центрирован и скрывается передним слоем.

index.html — циклическое падение, пауза и светлый/тёмный фон, учитывается настройка уменьшения движения. drop-preview.webp — движущееся превью четырёх цветов. preview.png — три состояния для каждого цвета. layout.json — размеры/порядок/пример координат; checks.json — проверки сборки.

Проверки: объединённые слои в исходном масштабе совпадают с оригиналом по видимым пикселям на #171340 и #FFF6E3; lossless WebP совпадает с PNG. Разрезы вручную размечены по внутреннему краю проёма отдельно для каждого цвета, геометрия самих мешков не менялась. В игре при дробном масштабе стоит проверять шов на устройстве; слои держать под одной трансформацией. С падением пчелы-носильщика ещё не совмещали. assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),O.parent/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-gift-sort-layers-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text().replace('Четыре мешка: winter-gift-sort-targets-v2; маски горлышка и примерка с пчёлами ещё нужны','Четыре мешка: winter-gift-sort-targets-v2; слои, маски проёма и проба падения: winter-gift-sort-layers-v1. Ещё нужна примерка с пчёлами');status.write_text(s)
print(json.dumps(checks))
