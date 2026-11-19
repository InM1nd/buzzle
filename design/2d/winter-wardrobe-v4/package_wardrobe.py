# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent;M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True);checks={}
def fit(path):
 im=Image.open(path).convert('RGBA');b=im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();b=(max(0,b[0]-8),max(0,b[1]-8),min(im.width,b[2]+8),min(im.height,b[3]+8));obj=im.crop(b);obj.thumbnail((880,880),Image.Resampling.LANCZOS);out=Image.new('RGBA',(1024,1024));out.alpha_composite(obj,((1024-obj.width)//2,(1024-obj.height)//2));return out
paths={k:Path(v['source']) for k,v in M.items() if not k.startswith('draft-')}
for k in ['santa','antlers']:paths[k+'-front']=R/'outputs/buzzle-winter-wardrobe-v3'/('zhuzha-winter-'+k+'-front.png')
for key,path in paths.items():
 shutil.copy2(path,P/'sources'/(key+'-source.png'));im=fit(path);n='zhuzha-winter-'+key;im.save(P/(n+'.png'));im.save(P/(n+'.webp'),lossless=True)
 for color in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,color);b=a.copy();a.alpha_composite(im);b.alpha_composite(Image.open(P/(n+'.webp')).convert('RGBA'));assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[n]={'size':[1024,1024],'alpha':list(im.getchannel('A').getextrema()),'pngWebpMatch':True,'status':'concept fitting'}
for key,item in M.items():
 if key.startswith('draft-'):shutil.copy2(Path(item['source']),P/'sources'/(key+'.png'))
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),30);small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1500,1450),'#FFF6E3');d=ImageDraw.Draw(board);d.text((25,20),'Buzzle · колпак и рожки · три ракурса',font=font,fill='#4A2C12');angles=['front','q3-front','side'];labels=['Анфас','Три четверти','Профиль']
for row,kind in enumerate(['santa','antlers']):
 y=80+row*505;d.text((25,y),'Рождественский колпак' if kind=='santa' else 'Оленьи рожки',font=font,fill='#4A2C12')
 for i,angle in enumerate(angles):
  art=Image.open(P/('zhuzha-winter-'+kind+'-'+angle+'.png'));art.thumbnail((450,410),Image.Resampling.LANCZOS);board.paste(art,(i*500+(500-art.width)//2,y+40),art);d.text((i*500+25,y+445),labels[i],font=font,fill='#4A2C12')
d.rectangle((0,1100,1500,1450),fill='#171340')
for i,(kind,angle) in enumerate([(k,a) for k in ['santa','antlers'] for a in angles]):
 art=Image.open(P/('zhuzha-winter-'+kind+'-'+angle+'.png'));art.thumbnail((210,210),Image.Resampling.LANCZOS);board.paste(art,(i*250+20,1150),art);d.text((i*250+15,1380),('Колпак' if kind=='santa' else 'Рожки')+' / '+angle,font=small,fill='#FFF6E3')
board.save(P/'preview.png')
profile=Image.new('RGB',(1500,600),'#FFF6E3');d=ImageDraw.Draw(profile);d.text((25,20),'Профиль · сравнение с исходной Жужей',font=font,fill='#4A2C12')
for i,(path,label) in enumerate([(R/'outputs/zhuzha-turnaround-approved-front/side.png','Исходная Жужа'),(P/'zhuzha-winter-santa-side.png','Колпак'),(P/'zhuzha-winter-antlers-side.png','Рожки')]):
 art=fit(path);art.thumbnail((460,460),Image.Resampling.LANCZOS);profile.paste(art,(i*500+20,80),art);d.text((i*500+25,550),label,font=font,fill='#4A2C12')
profile.save(P/'profile-compare.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Рождественские головные уборы · дополнительные ракурсы

29.10.2026. На просмотре. Четыре новых примерки: santa-q3-front, santa-side, antlers-q3-front, antlers-side. Анфас обоих предметов скопирован из winter-wardrobe-v3 с нормализацией полей, без новой генерации.

Файлы zhuzha-winter-*.png — 1024×1024 RGBA, рядом lossless WebP. preview.png — оба предмета в трёх ракурсах на светлом и ночном фоне. profile-compare.png — исходная Жужа рядом с двумя профильными примерками. sources/ — исходники; generation.json — точные промпты; checks.json — размеры/альфа и проверка экспортов.

Встроенный imagegen. Источник позы — outputs/zhuzha-turnaround-approved-front/side.png или q3-front.png; дизайн предметов — front из v3. В колпаке три четверти дополнительно исправлено слишком низкое дальнее крыло; первая генерация сохранена в sources как draft. Проверяются родные усики и их кончики, раздельность коротких светлых рожек, свободное лицо, исходная перекрывающаяся пара крыльев в профиль. После генерации — только прозрачные поля, пропорциональное масштабирование и экспорт.

Это цельные концепт-примерки, не отдельные игровые слои и не пиксельно точная замена тела Жужи. Самостоятельные аксессуары/маски, другие пчёлы, задние и зеркальные ракурсы, анимационные слои ещё не готовы. Предыдущие версии сохранены. Production assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/2d/winter-wardrobe-v4',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text().replace('Колпак и оленьи рожки — первые примерки анфас в winter-wardrobe-v3, другие ракурсы и слои пока не готовы','Колпак и оленьи рожки — анфас (winter-wardrobe-v3), три четверти и профиль (winter-wardrobe-v4); отдельные слои и другие пчёлы пока не готовы');status.write_text(s)
print(json.dumps({'newFittings':4,'frontReused':2,'pngWebpChecked':len(checks)}))
