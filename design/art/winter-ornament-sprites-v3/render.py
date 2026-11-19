from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
p=Path(__file__).resolve().parent;o=p.parent
m=json.loads((p/'generation.json').read_text())
(p/'sources').mkdir(exist_ok=True)
board=Image.new('RGB',(1080,1864),'#FFF6E3')
d=ImageDraw.Draw(board);d.rectangle((540,0,1080,1864),fill='#171340')
font=ImageFont.truetype(str(o/'hive-run/assets/Nunito-ExtraBold.ttf'),23)
for row,(n,label) in enumerate([('pinecone','1 · Шишка'),('bauble','2 · Шарик'),('bell','3 · Колокольчик'),('snowflake','4 · Снежинка'),('gingerbee','5 · Пряник-пчёлка'),('goldstar','6 · Золотая звезда')]):
 if n not in m:
  for ext in ('.png','.webp'):
   shutil.copyfile(o/'buzzle-winter-ornament-sprites-v2'/(n+ext),p/(n+ext))
  sprite=Image.open(p/(n+'.png')).convert('RGBA')
 else:
  source=Path(m[n]['source']);shutil.copy2(source,p/'sources'/(n+'.png'))
  a=Image.open(source);assert a.mode=='RGBA'
  l,t,r,b=a.getchannel('A').point(lambda x:255 if x>=128 else 0).getbbox()
  a=a.crop((max(0,l-4),max(0,t-4),min(a.width,r+4),min(a.height,b+4)))
  scale=420/max(a.size);a=a.resize(tuple(round(v*scale) for v in a.size),Image.Resampling.LANCZOS)
  sprite=Image.new('RGBA',(512,512));sprite.alpha_composite(a,((512-a.width)//2,(512-a.height)//2))
  sprite.save(p/(n+'.png'));sprite.save(p/(n+'.webp'),lossless=True)
 webp=Image.open(p/(n+'.webp')).convert('RGBA')
 for col,(bg,fg) in enumerate([('#FFF6E3','#4A2C12'),('#171340','#FFF6E3')]):
  base=Image.new('RGBA',sprite.size,bg)
  assert not ImageChops.difference(Image.alpha_composite(base,sprite).convert('RGB'),Image.alpha_composite(base,webp).convert('RGB')).getbbox()
  x=540*col;y=310*row
  d.text((x+20,y+15),label,font=font,fill=fg)
  large=sprite.resize((232,232),Image.Resampling.LANCZOS);board.paste(large,(x+18,y+56),large)
  for i,k in enumerate((32,40,56)):
   cx=x+275+i*79;cy=y+148;radius=k*.61
   d.polygon([(cx-radius,cy),(cx-radius/2,cy-radius*.866),(cx+radius/2,cy-radius*.866),(cx+radius,cy),(cx+radius/2,cy+radius*.866),(cx-radius/2,cy+radius*.866)],fill='#F2DFB8' if col==0 else '#384976')
   thumb=sprite.resize((k,k),Image.Resampling.LANCZOS)
   board.paste(thumb,(cx-k//2,cy-k//2),thumb)
   d.text((cx,y+205),str(k),font=font,fill=fg,anchor='mm')
board.save(p/'preview.png')
