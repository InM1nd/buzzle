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
d.text((25,15),'Buzzle · почтовый ящик и пряничный домик',font=font,fill='#4A2C12')
d.rectangle((0,470,1600,925),fill='#171340')
items=[('deco_winter_mailbox','deco_winter_mailbox.png','Почтовый ящик'),('deco_winter_gingerbread_house','deco_winter_gingerbread_house.png','Домик')]
for group,(name,original,title) in enumerate(items):
    for y,ink in [(65,'#4A2C12'),(490,'#FFF6E3')]:
        for j,path in enumerate([R/'outputs/buzzle-winter-decor-v4'/original,P/(name+'.png')]):
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

(P/'README.ru.md').write_text('''# Зимний декор v7

17.11.2026. Два варианта для просмотра, без подключения в игру.

- deco_winter_mailbox — черничный почтовый ящик со снежной крышкой.
- deco_winter_gingerbread_house — пряничный домик с кремовой глазурью и медовым окном-сотой.
- preview.png — сравнение с v4 на светлом и тёмном фоне и размеры 48/64/96 px.

Прозрачные PNG и lossless WebP 1024×1024. Иллюстрации переработаны встроенным imagegen, промпты и референсы в generation.json. Варианты v4 сохранены.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
    shutil.copytree(P,repo/'design/art/winter-decor-v7',dirs_exist_ok=True)
print(json.dumps(checks))
