from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import json, shutil
P=Path(__file__).resolve().parent
R=P.parent.parent
M=json.loads((P/'generation.json').read_text())
(P/'sources').mkdir(exist_ok=True)
def fit(path):
    im=Image.open(path).convert('RGBA')
    box=im.getchannel('A').point(lambda a:255 if a>128 else 0).getbbox()
    assert box
    im=im.crop((max(0,box[0]-8),max(0,box[1]-8),min(im.width,box[2]+8),min(im.height,box[3]+8)))
    im.thumbnail((860,860),Image.Resampling.LANCZOS)
    if max(im.size)<850:
        scale=min(860/im.width,860/im.height)
        im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
    out=Image.new('RGBA',(1024,1024))
    out.alpha_composite(im,((1024-im.width)//2,(1024-im.height)//2))
    return out
checks={}
for name,item in M.items():
    shutil.copy2(item['source'],P/'sources'/(name+'-source.png'))
    im=fit(item['source'])
    assert im.getchannel('A').getextrema()==(0,255)
    im.save(P/(name+'.png'));im.save(P/(name+'.webp'),lossless=True)
    wp=Image.open(P/(name+'.webp')).convert('RGBA')
    for color in ['#FFF6E3','#171340']:
        a=Image.new('RGBA',im.size,color);b=a.copy();a.alpha_composite(im);b.alpha_composite(wp)
        assert ImageChops.difference(a,b).convert('RGB').getbbox() is None
    checks[name]={'size':list(im.size),'alpha':[0,255],'pngWebpVisibleMatch':True}
font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),28)
small=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-Bold.ttf'),21)
board=Image.new('RGB',(1600,1120),'#FFF6E3');d=ImageDraw.Draw(board)
d.text((25,15),'Buzzle · снеговик и фонарный столб',font=font,fill='#4A2C12')
d.rectangle((0,470,1600,925),fill='#171340')
items=[('deco_winter_snowman','deco_winter_snowman.png','Снеговик'),('deco_winter_lantern','deco_winter_lantern.png','Фонарики')]
for group,(name,original,title) in enumerate(items):
    for y,ink in [(65,'#4A2C12'),(490,'#FFF6E3')]:
        for j,path in enumerate([R/'outputs/buzzle-winter-decor-v1'/original,P/(name+'.png')]):
            x=group*800+j*400
            d.text((x+25,y),title+(' · было' if j==0 else ' · новый'),font=font,fill=ink)
            im=fit(path).resize((350,350),Image.Resampling.LANCZOS)
            board.paste(im,(x+25,y+35),im)
    for j,size in enumerate([48,64,96]):
        im=Image.open(P/(name+'.png')).resize((size,size),Image.Resampling.LANCZOS)
        board.paste(im,(group*800+180+j*150,950+(96-size)//2),im)
    d.text((group*800+25,1075),'48 / 64 / 96 px',font=small,fill='#4A2C12')
board.save(P/'preview.png')
(P/'checks.json').write_text(json.dumps(checks,indent=2))
collection=Image.new('RGB',(1800,1250),'#FFF6E3');cd=ImageDraw.Draw(collection)
cd.text((25,15),'Buzzle · упрощённый зимний декор · четыре предмета',font=font,fill='#4A2C12')
for i,(name,title,folder) in enumerate([('deco_winter_snowman','Снеговик',P),('deco_winter_lantern','Фонарный столб',P),('deco_winter_tree','Ёлочка',R/'outputs/buzzle-winter-decor-v5')]):
 im=Image.open(folder/(name+'.png')).convert('RGBA');im.thumbnail((520,520),Image.Resampling.LANCZOS)
 collection.paste(im,(i*600+(600-im.width)//2,80),im);cd.text((i*600+30,610),title,font=font,fill='#4A2C12')
im=Image.open(R/'outputs/buzzle-winter-decor-v5/deco_winter_garland.png').convert('RGBA');im.thumbnail((1180,590),Image.Resampling.LANCZOS)
collection.paste(im,((1800-im.width)//2,650),im);cd.text((30,710),'Гирлянда',font=font,fill='#4A2C12');collection.save(P/'collection.png')
(P/'README.ru.md').write_text('# Зимний декор v6 · снеговик и фонарный столб\n\n30.10.2026. Доработка существующих предметов в более простом матовом направлении v5. Кандидаты на просмотре; прежние v1 сохранены.\n\n- deco_winter_snowman.png / .webp — снеговик с медово-синей шапкой и шарфом, упрощёнными гранями и мягкими снежными тенями.\n- deco_winter_lantern.png / .webp — деревянный столб с двумя медовыми фонариками, простыми снежными крышками и небольшой веточкой.\n- preview.png — v1/v6 рядом на светлом и ночном фоне, размеры 48/64/96 px.\n- collection.png — новые снеговик и столб вместе с ёлочкой/гирляндой v5, для проверки единства стиля; v5 не перерисованы.\n- sources/, generation.json — исходные генерации, полные промпты и референсы; checks.json — параметры экспортов.\n\nНовые PNG 1024×1024 RGBA, WebP lossless. Видимые пиксели совпадают на #FFF6E3 и #171340. Общий холст с прозрачными полями. Созданы встроенным imagegen по winter-decor-v1 с winter-decor-v5/deco_winter_tree.png как референсом материалов. После генерации только поля, пропорциональное масштабирование и обзорные листы.\n\nСтатичные предметы: отдельные маски света и анимации пока не подготовлены. Перед подключением нужны выбор варианта, масштаб и примерка в улье/саду. Production assets/ и src/ не менялись.\n')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
    shutil.copytree(P,repo/'design/art/winter-decor-v6',dirs_exist_ok=True)
    status=repo/'design/art/winter-collection/STATUS.ru.md'
    s=status.read_text()
    s=s.replace('упрощённые ёлочка и гирлянда (v5, на просмотре)','упрощённые ёлочка и гирлянда (v5), снеговик и фонарный столб (v6, на просмотре)')
    status.write_text(s)
print(json.dumps(checks))
