from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
p=Path(__file__).resolve().parent
o=p.parent
m=json.loads((p/'generation.json').read_text())
(p/'sources').mkdir(exist_ok=True)
shutil.copy2(m['source'],p/'sources/scarf-source.png')
im=Image.open(m['source'])
assert im.mode=='RGBA'
b=im.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox()
im=im.crop((max(0,b[0]-4),max(0,b[1]-4),min(im.width,b[2]+4),min(im.height,b[3]+4)))
im.save(p/'scarf-front.png')
im.save(p/'scarf-front.webp',lossless=True)
wp=Image.open(p/'scarf-front.webp').convert('RGBA')
for bg in ('#FFF6E3','#171340'):
 back=Image.new('RGBA',im.size,bg)
 assert ImageChops.difference(Image.alpha_composite(back,im).convert('RGB'),Image.alpha_composite(back,wp).convert('RGB')).getbbox() is None
bee=Image.open(o/'zhuzha-turnaround-approved-front/front.png').convert('RGBA')
hatted=Image.open(o/'buzzle-winter-hat-layer-v1/fitting-front.png').convert('RGBA')
assert bee.size==hatted.size
x,y,w=303,585,698
h=round(im.height*w/im.width)
part=im.resize((w,h),Image.Resampling.LANCZOS)
for n,art in [('fitting-front',bee),('outfit-front',hatted)]:
 art.alpha_composite(part,(x,y))
 art.save(p/(n+'.png'))
(p/'layout.json').write_text(json.dumps({'canvas':list(bee.size),'scarf':dict(x=x,y=y,width=w,height=h),'drawOrder':['base','scarf']},indent=2))
board=Image.new('RGB',(1500,560),'#FFF6E3');d=ImageDraw.Draw(board)
f=ImageFont.truetype(str(o/'hive-run/assets/Nunito-ExtraBold.ttf'),26)
for i,(title,art) in enumerate([('Шарф отдельно',im),('Примерка на Жуже',bee),('Комплект с шапкой',hatted)]):
 art=art.copy();art.thumbnail((460,475),Image.Resampling.LANCZOS);x=i*500
 d.text((x+25,20),title,font=f,fill='#4A2C12')
 board.paste(art,(x+(500-art.width)//2,60+(475-art.height)//2),art)
board.save(p/'preview.png')
print(im.size,bee.size,(w,h))
