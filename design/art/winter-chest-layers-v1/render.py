from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import shutil,json
p=Path(__file__).resolve().parent;o=p.parent
meta=json.loads((p/'generation.json').read_text())
(p/'sources').mkdir(exist_ok=True)
shutil.copy2(meta['source'],p/'sources/chest-sheet.png')
src=Image.open(meta['source'])
assert src.mode=='RGBA'
mask=src.getchannel('A').point(lambda a:255 if a>128 else 0)
empty=[y for y in range(src.height*2//5,src.height*3//5) if not mask.crop((0,y,src.width,y+1)).getbbox()]
assert empty
split=empty[len(empty)//2]
def part(y0,y1):
 box=mask.crop((0,y0,src.width,y1)).getbbox()
 l,t,r,b=box
 return src.crop((l-4,t+y0-4,r+4,b+y0+4))
lid=part(0,split)
base=part(split,src.height)
# Preserve the native scale of both parts.
w=lid.width
lid=lid.resize((w,round(lid.height*w/lid.width)),Image.Resampling.LANCZOS)
reg=json.loads((p/'placement.json').read_text())
W,H=src.width,round(src.height*.85)
bx=(W-base.width)//2;by=H-base.height-34
lx=(W-lid.width)//2+reg.get('offsetX',0);closed=by+reg['rimY']-lid.height
opened=closed-reg['lift']
assert opened>=0 and bx>=0 and lx>=0
for n,im in [('base',base),('lid',lid)]:
 im.save(p/(n+'.png'));im.save(p/(n+'.webp'),lossless=True)
 b=Image.open(p/(n+'.webp')).convert('RGBA')
 for bg in ('#FFF6E3','#171340'):
  c=Image.new('RGBA',im.size,bg)
  assert not ImageChops.difference(Image.alpha_composite(c,im).convert('RGB'),Image.alpha_composite(c,b).convert('RGB')).getbbox()
layout={'canvas':{'width':W,'height':H},'base':dict(x=bx,y=by,width=base.width,height=base.height),'lid':dict(x=lx,width=lid.width,height=lid.height,closedY=closed,openY=opened),'drawOrder':['base','lid']}
(p/'layout.json').write_text(json.dumps(layout,indent=2))
board=Image.new('RGB',(1230,600),'#191639');d=ImageDraw.Draw(board)
font=ImageFont.truetype(str(o/'hive-run/assets/Nunito-ExtraBold.ttf'),23)
for i,(n,label,y) in enumerate([('closed','Закрыт',closed),('intermediate','Крышка поднимается',round((closed+opened)/2)),('open','Открыт',opened)]):
 frame=Image.new('RGBA',(W,H));frame.alpha_composite(base,(bx,by));frame.alpha_composite(lid,(lx,y))
 frame.save(p/(n+'.png'))
 frame.thumbnail((390,540),Image.Resampling.LANCZOS)
 board.paste(frame,(i*410+(410-frame.width)//2,55),frame)
 d.text((i*410+205,24),label,anchor='mm',font=font,fill='#FFF6E3')
board.save(p/'preview.png')
print(layout, 'source',src.size,'split',split)
