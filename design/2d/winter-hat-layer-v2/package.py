from PIL import Image, ImageDraw, ImageFont, ImageChops
from pathlib import Path
import json, shutil

P = Path(__file__).resolve().parent
O = P.parent
specs = {'q3-front': (514,65,515,(470,65,1050,372)), 'side': (620,120,446,(775,65,1095,385))}
layout = {}
(P/'sources').mkdir(exist_ok=True)
m = json.loads((P/'generation.json').read_text())
for pose,(x,y,w,rect) in specs.items():
    source = Path(m[pose]['source'])
    shutil.copy2(source,P/'sources'/(pose+'.png'))
    hat = Image.open(source)
    assert hat.mode=='RGBA'
    bounds=hat.getchannel('A').point(lambda v: 255 if v>=128 else 0).getbbox()
    hat=hat.crop(tuple(max(0,v-4) if i<2 else min(hat.size[i-2],v+4) for i,v in enumerate(bounds)))
    hat.save(P/f'hat-{pose}.png')
    hat.save(P/f'hat-{pose}.webp',lossless=True)
    size=(w,round(hat.height*w/hat.width))
    bee=Image.open(O/'zhuzha-turnaround-approved-front'/f'{pose}.png').convert('RGBA')
    overlay=Image.new('RGBA',bee.size)
    overlay.alpha_composite(hat.resize(size,Image.Resampling.LANCZOS),(x,y))
    antenna=bee.crop(rect)
    mask=Image.new('L',antenna.size)
    mask.putdata([round(a*oa) if r>g*1.35 and g>b and r<155 and g<110 else 0
                  for (r,g,b,a),(rr,gg,bb,aa) in zip(antenna.getdata(),overlay.crop(rect).getdata())
                  for oa in [aa/255 if bb>rr*1.2 and bb>gg*1.2 else 0]])
    antenna.putalpha(mask)
    antenna.save(P/f'antennae-{pose}.png')
    antenna.save(P/f'antennae-{pose}.webp',lossless=True)
    fitting=Image.alpha_composite(bee,overlay)
    fitting.alpha_composite(antenna,rect[:2])
    fitting.save(P/f'fitting-{pose}.png')
    layout[pose]={'canvas':list(bee.size),'hat':{'x':x,'y':y,'width':size[0],'height':size[1]},'antennae':{'x':rect[0],'y':rect[1],'width':antenna.width,'height':antenna.height},'drawOrder':['base','hat','antennae']}
    for name in (f'hat-{pose}',f'antennae-{pose}'):
        a,b=[Image.open(P/(name+ext)).convert('RGBA') for ext in ('.png','.webp')]
        for bg in ('#FFF6E3','#171340'):
            back=Image.new('RGBA',a.size,bg)
            assert ImageChops.difference(Image.alpha_composite(back,a).convert('RGB'),Image.alpha_composite(back,b).convert('RGB')).getbbox() is None
(P/'layout.json').write_text(json.dumps(layout,indent=2))
board=Image.new('RGB',(1260,900),'#FFF6E3')
d=ImageDraw.Draw(board)
font=ImageFont.truetype(str(O/'hive-run/assets/Nunito-ExtraBold.ttf'),25)
for i,(pose,title) in enumerate([('front','Анфас · v1'),('q3-front','Три четверти'),('side','Профиль')]):
    folder=O/'buzzle-winter-hat-layer-v1' if pose=='front' else P
    x=420*i
    d.text((x+25,18),title,font=font,fill='#4A2C12')
    for name,y,box in [('hat',65,(325,315)),('fitting',415,(405,440))]:
        art=Image.open(folder/f'{name}-{pose}.png').convert('RGBA')
        art.thumbnail(box,Image.Resampling.LANCZOS)
        board.paste(art,(x+(420-art.width)//2,y+(box[1]-art.height)//2),art)
board.save(P/'preview.png')
