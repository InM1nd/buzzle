from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import json,shutil
p=Path(__file__).resolve().parent
o=p.parent
src=o/'buzzle-winter-garden-beds-v1'
shutil.copyfile(src/'bed-winter-dry.png',p/'bed-winter-dry.png')
dry=Image.open(p/'bed-winter-dry.png').convert('RGBA')
ref=Image.open(src/'bed-winter-wet.png').convert('RGBA')
assert dry.size==ref.size==(1536,768)
# Transfer only the already-generated wet soil. The dry sprite is the fixed frame.
polygon=[(249,323),(299,304),(380,296),(1197,296),(1231,300),(1282,323),(1307,377),(1321,414),(1296,425),(231,425),(218,414)]
mask=Image.new('L',dry.size)
ImageDraw.Draw(mask).polygon(polygon,fill=255)
mask=mask.filter(ImageFilter.GaussianBlur(2))
mask=mask.point(lambda x:0 if x<3 else x)
assert min(ref.getchannel('A').getdata())==0
wet=Image.composite(ref,dry,mask)
wet.putalpha(dry.getchannel('A'))
diff=ImageChops.difference(dry.convert('RGB'),wet.convert('RGB'))
assert diff.getbbox() and not ImageChops.multiply(diff,mask.point(lambda x:0 if x else 255).convert('RGB')).getbbox()
assert dry.getchannel('A').tobytes()==wet.getchannel('A').tobytes()
wet.save(p/'bed-winter-wet.png')
for n,a in [('dry',dry),('wet',wet)]:
 f=p/f'bed-winter-{n}.webp';a.save(f,lossless=True)
 b=Image.open(f).convert('RGBA')
 for bg in ('#FFF6E3','#171340'):
  c=Image.new('RGBA',a.size,bg)
  assert not ImageChops.difference(Image.alpha_composite(c,a).convert('RGB'),Image.alpha_composite(c,b).convert('RGB')).getbbox()
plant=Image.open(o/'buzzle-winter-plants-v1/hellebore_bloom.png').convert('RGBA')
plant=plant.crop(plant.getchannel('A').point(lambda x:255 if x>32 else 0).getbbox())
plant.thumbnail((235,250),Image.Resampling.LANCZOS)
plant.save(p/'demo-plant.webp',lossless=True)
box=(72,189,1464,581)
board=Image.new('RGB',(1480,760),'#FFF6E3')
d=ImageDraw.Draw(board)
d.rectangle((0,405,1480,760),fill='#171340')
font=ImageFont.truetype(str(o/'hive-run/assets/Nunito-ExtraBold.ttf'),29)
for i,(t,a) in enumerate([('Сухая',dry),('После полива',wet)]):
 x=i*740
 d.text((x+30,18),t,font=font,fill='#4A2C12')
 d.text((x+30,423),t+' · с растением',font=font,fill='#FFF6E3')
 art=a.crop(box).resize((680,191),Image.Resampling.LANCZOS)
 board.paste(art,(x+30,100),art)
 art=art.resize((440,124),Image.Resampling.LANCZOS)
 board.paste(art,(x+150,618),art)
 pl=plant.resize(tuple(round(v*.71) for v in plant.size),Image.Resampling.LANCZOS)
 board.paste(pl,(x+370-pl.width//2,681-pl.height),pl)
board.save(p/'preview.png')
(p/'checks.json').write_text(json.dumps({'size':list(dry.size),'identicalAlpha':True,'identicalOutsideSoil':True,'changedBounds':list(diff.getbbox()),'plantAnchor':[768,390]},indent=2))
