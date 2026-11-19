# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
checks={}
def normalized(path,edge=860):
 im=Image.open(path).convert('RGBA');a=im.getchannel('A');b=a.point(lambda v:255 if v>128 else 0).getbbox();assert b
 im=im.crop((max(0,b[0]-6),max(0,b[1]-6),min(im.width,b[2]+6),min(im.height,b[3]+6)))
 scale=min(edge/im.width,edge/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(1024,1024));out.alpha_composite(im,((1024-im.width)//2,(1024-im.height)//2));return out
for key,item in M.items():
 src=Path(item['source']);shutil.copy2(src,P/'sources'/(key+'-source.png'))
 im=normalized(src);im.save(P/(key+'.png'));im.save(P/(key+'.webp'),lossless=True)
 webp=Image.open(P/(key+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,bg);b=a.copy();a.alpha_composite(im);b.alpha_composite(webp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[key]={'size':[1024,1024],'alpha':list(im.getchannel('A').getextrema()),'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),27)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1600,1170),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,20),'Buzzle · зимние награды · мёд и пыльца',font=font,fill='#4A2C12')
items=[(Path('/Users/oleksandrzabolotnyi/buzzle/assets/art/honey.webp'),'Мёд / текущий'),(P/'reward_winter_honey.png','Мёд / праздничный'),(Path('/Users/oleksandrzabolotnyi/buzzle/assets/art/pollen.webp'),'Пыльца / текущая'),(P/'reward_winter_pollen.png','Пыльца / праздничная')]
d.rectangle((0,510,1600,1010),fill='#171340')
for col,(path,title) in enumerate(items):
 art=normalized(path).resize((370,370),Image.Resampling.LANCZOS)
 for y,color in [(75,'#4A2C12'),(535,'#FFF6E3')]:
  board.paste(art,(col*400+15,y),art);d.text((col*400+25,y+395),title,font=font,fill=color)
 for j,size in enumerate([48,64,96]):
  im=normalized(path).resize((size,size),Image.Resampling.LANCZOS)
  board.paste(im,(col*400+55+j*105,1020+(96-size)//2),im)
 d.text((col*400+25,1130),'48 / 64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('# Зимние награды v1 · мёд и пыльца\n\n30.10.2026. Праздничное оформление существующих ресурсов, кандидаты на просмотр.\n\n- reward_winter_honey.png / .webp — медовая банка с кремовым колпачком и небольшой красной завязкой.\n- reward_winter_pollen.png / .webp — круглая медовая сота с розовыми крупинками пыльцы и небольшой лентой снаружи.\n- preview.png — рядом с текущими иконками ресурсов, светлый/ночной фон, 48/64/96 px.\n\nPNG 1024×1024 RGBA, lossless WebP. Иконки предназначены как варианты для зимних окон наград, не вводят новые валюты и не заменяют текущие HUD-иконки автоматически. Количество, стоимость, экономика и параметры награды не назначались. У пыльцы сохранена форма текущей pollen.webp; мешочек не создавался.\n\nsources/ — исходные генерации; generation.json — точные промпты/референсы; checks.json — размеры, альфа и видимое совпадение PNG/WebP на светлом/ночном фоне. Референсы: assets/art/honey.webp, pollen.webp и упаковка winter-advent-v1. После imagegen только поля, пропорциональный размер и лист сравнения. Production assets/ и src/ не менялись.\n')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-rewards-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 if '| Зимние награды |' not in s:
  anchor='| Адвент |';i=s.index(anchor);s=s[:i]+'| Зимние награды | Праздничные мёд и пыльца: winter-rewards-v1, на просмотре | Выбрать оформление и проверить в окне награды |\n'+s[i:]
 status.write_text(s)

print(json.dumps(checks))
