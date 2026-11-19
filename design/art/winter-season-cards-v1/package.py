from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
P=Path(__file__).resolve().parent;R=P.parent.parent
M=json.loads((P/'generation.json').read_text());(P/'sources').mkdir(exist_ok=True)
checks={}
for name,item in M.items():
 shutil.copy2(item['source'],P/'sources'/(name+'-source.png'))
 im=Image.open(item['source']).convert('RGB')
 im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
 wp=Image.open(P/(name+'.webp')).convert('RGB');assert ImageChops.difference(im,wp).getbbox() is None
 checks[name]={'size':list(im.size),'mode':'RGB','pngWebpMatch':True,'cropped':False}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),21)
board=Image.new('RGB',(1600,1900),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((30,15),'Buzzle · сезонные карточки · без встроенного текста',font=font,fill='#4A2C12')
for i,(name,title) in enumerate([('winter_card','Зима · снежная пчёлка'),('christmas_card','Рождество · пряничная пчёлка')]):
 y=70+i*900
 d.text((30,y),title,font=font,fill='#4A2C12')
 im=Image.open(P/(name+'.png')).convert('RGB');im.thumbnail((1540,640),Image.Resampling.LANCZOS)
 board.paste(im,((1600-im.width)//2,y+45))
 thumb=Image.open(P/(name+'.png')).convert('RGB');thumb.thumbnail((360,200),Image.Resampling.LANCZOS)
 board.paste(thumb,(30,y+700));d.text((420,y+725),'Пример ширины 360 px · без кадрирования',font=small,fill='#4A2C12')
 d.text((420,y+760),'Название, сроки и кнопка добавляются интерфейсом.',font=small,fill='#4A2C12')
board.save(P/'preview.png');(P/'checks.json').write_text(json.dumps(checks,indent=2))
sizes='\n'.join('- '+name+': '+str(c['size'][0])+'×'+str(c['size'][1])+' px, RGB PNG и lossless WebP.' for name,c in checks.items())
(P/'README.ru.md').write_text('''# Сезонные карточки v1

30.10.2026. Иллюстрации на просмотре для карточек зимнего сезона и Рождества. Не новые игровые механики.

- winter_card — светлая зимняя карточка со снежной пчёлкой справа и спокойной светлой областью слева.
- christmas_card — вечерняя рождественская карточка с пряничной пчёлкой, фонариками и подарками, спокойная тёмная область слева.
- preview.png — оба варианта и уменьшение до ширины 360 px.
- sources/, generation.json — исходники, полные промпты и референсы; checks.json — размер/формат и совпадение PNG/WebP.

'''+sizes+'''

Созданы встроенным imagegen. Сохранена исходная композиция и разрешение, без кадрирования и перерисовки. Фон непрозрачный, надписей/логотипа/кнопок нет: локализованные название, сроки и CTA добавляются отдельно. Это цельные иллюстрации, пчёлы не выделены слоями для анимации. При другой пропорции карточки нельзя автоматически обрезать усики/крылья; сначала примерить contain или подготовить отдельную композицию.

Референсы: winter-bees-v6/bee-snow-front.png, bee-gingerbread-front.png; winter-unified-v3/baseline/winter-day/hive.png и christmas-evening/hive.png — палитра и материалы. Персонажи в карточках перерисованы генерацией по референсам, поэтому это не побайтная вставка исходных спрайтов.

Текущие assets/ и src/ не изменены. Примерка в конкретном интерфейсе и выбор финального оформления ещё впереди.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-season-cards-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md';s=status.read_text()
 row='| Сезонные карточки | Светлая зимняя и вечерняя рождественская: winter-season-cards-v1, на просмотре | Выбрать композицию, примерить заголовок и кнопку |\n'
 if '| Сезонные карточки |' not in s:s=s.replace('| Ежедневная серия |',row+'| Ежедневная серия |')
 status.write_text(s)
print(json.dumps(checks))
