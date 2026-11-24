from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageChops
import json,shutil
p=Path(__file__).resolve().parent;o=p.parent
m=json.loads((p/'generation.json').read_text())
(p/'sources').mkdir(exist_ok=True)
spec={
'q3-front':(400,620,702,[(395,697),(439,655),(475,601),(460,540),(400,525)]),
'side':(414,580,698,[(320,550),(520,510),(575,576),(548,600),(512,625),(423,663),(320,660)])}
layout={}
for pose,(x,y,w,polygon) in spec.items():
    source=m[pose]['source'];shutil.copy2(source,p/'sources'/(pose+'.png'))
    art=Image.open(source);assert art.mode=='RGBA'
    l,t,r,b=art.getchannel('A').point(lambda v:255 if v>=128 else 0).getbbox()
    art=art.crop((max(0,l-4),max(0,t-4),min(art.width,r+4),min(art.height,b+4)))
    art.save(p/f'scarf-{pose}.png');art.save(p/f'scarf-{pose}.webp',lossless=True)
    wp=Image.open(p/f'scarf-{pose}.webp').convert('RGBA')
    for bg in ('#FFF6E3','#171340'):
        back=Image.new('RGBA',art.size,bg)
        assert ImageChops.difference(Image.alpha_composite(back,art).convert('RGB'),Image.alpha_composite(back,wp).convert('RGB')).getbbox() is None
    base=Image.open(o/'zhuzha-turnaround-approved-front'/f'{pose}.png').convert('RGBA')
    h=round(art.height*w/art.width)
    layer=art.resize((w,h),Image.Resampling.LANCZOS)
    mask=Image.new('L',(w*3,h*3))
    ImageDraw.Draw(mask).polygon([((px-x)*3,(py-y)*3) for px,py in polygon],fill=255)
    mask=mask.resize((w,h),Image.Resampling.LANCZOS)
    layer.putalpha(ImageChops.multiply(layer.getchannel('A'),ImageChops.invert(mask)))
    layer.save(p/f'scarf-fitted-{pose}.png')
    for name,bee in [('fitting',base),('outfit',Image.open(o/'buzzle-winter-hat-layer-v2'/f'fitting-{pose}.png').convert('RGBA'))]:
        assert bee.size==base.size
        out=bee.copy();out.alpha_composite(layer,(x,y));out.save(p/f'{name}-{pose}.png')
    layout[pose]={'canvas':list(base.size),'scarf':dict(x=x,y=y,width=w,height=h,file=f'scarf-fitted-{pose}.png'),'drawOrder':['base','scarf']}
(p/'layout.json').write_text(json.dumps(layout,indent=2))
board=Image.new('RGB',(1350,1020),'#FFF6E3');d=ImageDraw.Draw(board)
f=ImageFont.truetype(str(o/'hive-run/assets/Nunito-ExtraBold.ttf'),23)
for i,(pose,title) in enumerate([('front','Анфас · v1'),('q3-front','Три четверти'),('side','Профиль')]):
    folder=o/'buzzle-winter-scarf-layer-v1' if pose=='front' else p
    d.text((i*450+25,16),title,font=f,fill='#4A2C12')
    for row,name in enumerate(['scarf','fitting','outfit']):
        a=Image.open(folder/f'{name}-{pose}.png').convert('RGBA');a.thumbnail((415,290),Image.Resampling.LANCZOS)
        board.paste(a,(i*450+(450-a.width)//2,55+315*row+(290-a.height)//2),a)
board.save(p/'preview.png')
