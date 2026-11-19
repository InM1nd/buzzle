from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
checks={}
for name,item in M.items():
 shutil.copy2(item['source'],P/'sources'/(name+'-source.png'))
 im=Image.open(item['source']).convert('RGB');im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 wp=Image.open(P/(name+'.webp')).convert('RGB');assert ImageChops.difference(im,wp).getbbox() is None
 checks[name]={'size':list(im.size),'mode':'RGB','pngWebpMatch':True,'cropped':False}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),26)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),20)
board=Image.new('RGB',(1600,1040),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,15),'Сезонные карточки · меньше декора, крупнее грани',font=font,fill='#4A2C12')
for row,(name,title) in enumerate([('winter_card','Зима'),('christmas_card','Рождество')]):
 y=60+row*460
 for col,folder in enumerate([R/'outputs/buzzle-winter-season-cards-v1',P]):
  x=20+col*800;d.text((x,y),title+(' · было' if col==0 else ' · новый вариант'),font=font,fill='#4A2C12')
  im=Image.open(folder/(name+'.png')).convert('RGB');im.thumbnail((760,390),Image.Resampling.LANCZOS)
  board.paste(im,(x+(760-im.width)//2,y+40+(390-im.height)//2))
d.text((25,1000),'Исходные v1 сохранены. Надписи и кнопки добавляются интерфейсом.',font=small,fill='#4A2C12')
board.save(P/'compare.png')
preview=Image.new('RGB',(1600,1080),'#FFF6E3');pd=ImageDraw.Draw(preview)
pd.text((25,15),'Buzzle · сезонные карточки v2',font=font,fill='#4A2C12')
for row,(name,title) in enumerate([('winter_card','Зима'),('christmas_card','Рождество')]):
 y=60+row*500;pd.text((25,y),title,font=font,fill='#4A2C12')
 im=Image.open(P/(name+'.png')).convert('RGB');im.thumbnail((1500,430),Image.Resampling.LANCZOS)
 preview.paste(im,((1600-im.width)//2,y+35))
preview.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
sizes='\n'.join('- '+name+': '+str(c['size'][0])+'×'+str(c['size'][1])+' px, RGB PNG и lossless WebP.' for name,c in checks.items())
(P/'README.ru.md').write_text('''# Сезонные карточки v2 · упрощённый декор

30.10.2026. Переработка по отзыву владельца: плотные украшения v1 выглядят слишком реалистично/глянцево и не соответствуют Buzzle. v1 сохранены без изменений. Новые варианты на просмотре.

- winter_card — светлая зимняя композиция, крупные грани, спокойное место слева, снежная пчёлка справа.
- christmas_card — рождественская вечерняя композиция с пряничной пчёлкой, упрощёнными матовыми украшениями вместо плотных гирлянд.
- compare.png — v1/v2 рядом для обоих сезонов.
- preview.png — два новых варианта.
- sources/, generation.json — исходные генерации, полный набор промптов и референсов; checks.json — параметры экспортов.

'''+sizes+'''

Встроенный imagegen, редактирование карточек v1 с референсами отдельных снежной/пряничной пчёл из winter-bees-v6. Сохранены назначение, композиция справа/слева, сезонные палитры. Персонажи являются частью генерации, не отдельными игровыми спрайтами. После генерации только экспорт и листы сравнения, без кадрирования готовых иллюстраций.

Без текста, логотипа и кнопок: локализация остаётся в UI. PNG/WebP совпадают по видимым пикселям. Текущие assets/ и src/ не менялись. Финальный выбор и примерка в приложении ещё не выполнены.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-season-cards-v2',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 s=s.replace('Светлая зимняя и вечерняя рождественская: winter-season-cards-v1, на просмотре','Светлая зимняя и вечерняя рождественская: упрощённый декор winter-season-cards-v2 на просмотре; v1 сохранены для сравнения')
 status.write_text(s)
print(json.dumps(checks))
