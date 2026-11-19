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

font=ImageFont.truetype(str(R/'outputs/hive-run/assets/Nunito-ExtraBold.ttf'),26)
board=Image.new('RGB',(1200,650),'#FFF6E3')
d=ImageDraw.Draw(board);d.rectangle((600,0,1200,650),fill='#171340')
im=Image.open(P/'deco_winter_gift_sled.png')
for i,fg in enumerate(['#4A2C12','#FFF6E3']):
 x=600*i
 d.text((x+24,18),'Санки с подарками',font=font,fill=fg)
 large=im.resize((480,480),Image.Resampling.LANCZOS);board.paste(large,(x+60,45),large)
 for j,n in enumerate((48,64,96)):
  thumb=im.resize((n,n),Image.Resampling.LANCZOS);board.paste(thumb,(x+130+130*j,625-n),thumb)
board.save(P/'preview.png')
(P/'checks.json').write_text(json.dumps(checks,indent=2))
(P/'README.ru.md').write_text('''# Санки с подарками

Новый вариант зимнего декора сада, на просмотре. PNG и lossless WebP 1024×1024 с прозрачным фоном. preview.png — светлый и ночной фоны, пробы 48/64/96 px. Исходник, промпт и референс встроенного imagegen сохранены рядом. В игру не подключено.
''')
for repo in [Path('/Users/oleksandrzabolotnyi/buzzle'),R/'work/buzzle']:
 shutil.copytree(P,repo/'design/art/winter-gift-sled-v1',dirs_exist_ok=True)
 status=repo/'design/art/winter-collection/STATUS.ru.md'
 s=status.read_text()
 if 'winter-gift-sled-v1' not in s:
  status.write_text(s.replace('| Гардероб |','| Санки с подарками | winter-gift-sled-v1, на просмотре | Примерить в саду |\n| Гардероб |'))
print(json.dumps(checks))
