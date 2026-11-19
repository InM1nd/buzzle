# -*- coding: utf-8 -*-
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
checks={}
def fit(path):
 im=Image.open(path).convert('RGBA');b=im.getchannel('A').point(lambda v:255 if v>128 else 0).getbbox();assert b
 im=im.crop((max(0,b[0]-8),max(0,b[1]-8),min(im.width,b[2]+8),min(im.height,b[3]+8)))
 scale=min(860/im.width,860/im.height);im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(1024,1024));out.alpha_composite(im,((1024-im.width)//2,(1024-im.height)//2));return out
for name,item in M.items():
 src=Path(item['source']);shutil.copy2(src,P/'sources'/(name+'-source.png'))
 im=fit(src);im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 webp=Image.open(P/(name+'.webp')).convert('RGBA')
 for bg in ['#FFF6E3','#171340']:
  a=Image.new('RGBA',im.size,bg);b=a.copy();a.alpha_composite(im);b.alpha_composite(webp)
  assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
 checks[name]={'size':[1024,1024],'alpha':list(im.getchannel('A').getextrema()),'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1400,1270),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,20),'Buzzle · адвент · подарок и открытка',font=font,fill='#4A2C12');d.rectangle((0,550,1400,1100),fill='#171340')
for col,(name,title) in enumerate([('advent-gift-wrapped','Подарок / упаковка'),('advent-postcard-zhuzha','Открытка / Жужа')]):
 art=Image.open(P/(name+'.png')).resize((470,470),Image.Resampling.LANCZOS)
 for y,color in [(65,'#4A2C12'),(605,'#FFF6E3')]:
  board.paste(art,(col*700+115,y),art);d.text((col*700+35,y+445),title,font=font,fill=color)
 for j,size in enumerate([64,96,128]):
  im=Image.open(P/(name+'.png')).resize((size,size),Image.Resampling.LANCZOS);board.paste(im,(col*700+165+j*155,1110+(128-size)//2),im)
 d.text((col*700+35,1230),'64 / 96 / 128 px',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Адвент Buzzle · подарок и открытка v1

29.10.2026. Кандидаты на просмотр. Не подключены к игре, календарь и состав наград не определяют.

- advent-gift-wrapped.png / .webp — небольшой подарок в кремовой упаковке с красной лентой и медовой биркой.
- advent-postcard-zhuzha.png / .webp — открытка с Жужей слева и свободным светлым местом справа для локализованного поздравления.
- preview.png — светлый и ночной фон, проверка 64/96/128 px.

Два цельных изображения PNG 1024×1024 RGBA и lossless WebP. Без встроенных надписей и цен. Прозрачность снаружи; бумага открытки непрозрачная. Открытку лучше показывать крупно; маленькая иконка не предназначена для чтения будущего текста. Текст добавлять отдельным UI-слоем, финальную область и переносы проверить на реальном размере окна.

sources/ — оригинальные генерации; generation.json — точные промпты и референсы; checks.json — размеры/альфа и видимое совпадение PNG/WebP на #FFF6E3 и #171340. Стиль сверялся с канонической Жужей и рождественским сундуком winter-chests-v1. После генерации только пропорциональный размер, прозрачные поля и лист сравнения.

Пока нет открытого состояния подарка, независимых лент/банта, анимации, окошек календаря, состояний доступно/забрано/закрыто. Эти материалы готовить после выбора оформления и состава адвента. Production assets/ и src/ не менялись.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-advent-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 s=s.replace('| Адвент | Есть общие UI-концепты; отдельного финального комплекта нет | Подарочная упаковка, окошки/состояния и открытки Жужи после выбора состава |','| Адвент | Подарочная упаковка и открытка Жужи winter-advent-v1, на просмотре; общие UI-концепты | Выбор оформления и состава; окошки/состояния календаря, открытие подарка |')
 status.write_text(s)
print(json.dumps(checks))
