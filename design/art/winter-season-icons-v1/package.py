from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
p=Path(__file__).resolve().parent;o=p.parent
m=json.loads((p/'generation.json').read_text())
(p/'sources').mkdir(exist_ok=True)
board=Image.new('RGB',(1120,655),'#FFF6E3')
d=ImageDraw.Draw(board);d.rectangle((560,0,1120,655),fill='#171340')
font=ImageFont.truetype(str(o/'hive-run/assets/Nunito-ExtraBold.ttf'),25)
for col,(bg,fg) in enumerate([('#FFF6E3','#4A2C12'),('#171340','#FFF6E3')]):
 for row,(n,label) in enumerate([('winter','Зима'),('christmas','Рождество')]):
  source=Path(m[n]['source'])
  if col==0:
   shutil.copy2(source,p/'sources'/(n+'.png'))
   art=Image.open(source);assert art.mode=='RGBA'
   l,t,r,b=art.getchannel('A').point(lambda x:255 if x>=128 else 0).getbbox()
   art=art.crop((max(0,l-4),max(0,t-4),min(art.width,r+4),min(art.height,b+4)))
   scale=860/max(art.size)
   art=art.resize(tuple(round(v*scale) for v in art.size),Image.Resampling.LANCZOS)
   canvas=Image.new('RGBA',(1024,1024));canvas.alpha_composite(art,((1024-art.width)//2,(1024-art.height)//2))
   canvas.save(p/(n+'.png'));canvas.save(p/(n+'.webp'),lossless=True)
  art,wp=[Image.open(p/(n+ext)).convert('RGBA') for ext in ('.png','.webp')]
  back=Image.new('RGBA',art.size,bg)
  assert not ImageChops.difference(Image.alpha_composite(back,art).convert('RGB'),Image.alpha_composite(back,wp).convert('RGB')).getbbox()
  x=560*col;y=320*row
  d.text((x+23,y+18),label,font=font,fill=fg)
  full=art.resize((240,240),Image.Resampling.LANCZOS);board.paste(full,(x+20,y+64),full)
  for i,k in enumerate((24,32,48,64)):
   thumb=art.resize((k,k),Image.Resampling.LANCZOS);cx=x+283+i*62
   board.paste(thumb,(cx+(64-k)//2,y+122+(64-k)//2),thumb)
   d.text((cx+17,y+208),str(k),font=font,fill=fg)
board.save(p/'preview.png')
