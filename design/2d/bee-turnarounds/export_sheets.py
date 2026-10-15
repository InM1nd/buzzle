"""Mechanical crop/registration only; no painting or color edits."""
import json,sys,shutil,re
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
out=root/'design/2d/bee-turnarounds/assets'
sources=json.loads(Path(sys.argv[1]).read_text())
def boxes(im):
 a=im.getchannel('A'); small=a.resize((160,round(im.height*160/im.width)),Image.Resampling.NEAREST)
 w,h=small.size;p=small.load();seen=set();comps=[]
 for y in range(h):
  for x in range(w):
   if (x,y) in seen or p[x,y]<100:continue
   todo=[(x,y)];seen.add((x,y));xs=[];ys=[]
   while todo:
    xx,yy=todo.pop();xs.append(xx);ys.append(yy)
    for nx,ny in [(xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1)]:
     if 0<=nx<w and 0<=ny<h and (nx,ny) not in seen and p[nx,ny]>=100:
      seen.add((nx,ny));todo.append((nx,ny))
   if len(xs)>40:comps.append((len(xs),(min(xs),min(ys),max(xs)+1,max(ys)+1)))
 main=sorted(comps,reverse=True)[:6]
 if len(main)!=6:raise ValueError(('Expected six sprites',main))
 main=sorted([b for _,b in main],key=lambda b:(b[1]+b[3])/2)
 ordered=[]
 for i in range(0,6,2):ordered+=sorted(main[i:i+2],key=lambda b:b[0])
 factor=im.width/w
 return [tuple(round(v*factor) for v in b) for b in ordered]
records=[]
for sp in json.loads((root/'design/2d/bee-turnarounds/species.json').read_text()):
 id=sp['id']
 if id not in sources:continue
 folder=out/id;folder.mkdir(parents=True,exist_ok=True)
 source=Path(sources[id]);im=Image.open(source).convert('RGBA');
 if source.resolve()!=(folder/'source-sheet.png').resolve():shutil.copy2(source,folder/'source-sheet.png')
 crops=[]
 for name,box in zip(['front','side','q3-back','back','wing-left','wing-right'],boxes(im)):
  x0,y0,x1,y1=box;pad=2
  crop=im.crop((max(0,x0-pad),max(0,y0-pad),min(im.width,x1+pad),min(im.height,y1+pad)))
  crop.save(folder/(name+'.png'));crops.append(crop)
 views={}
 for name,crop in zip(['front','side','q3-back','back'],crops):
  a=crop.getchannel('A');rows=[sum(v>=100 for v in a.crop((0,y,crop.width,y+1)).getdata()) for y in range(crop.height)]
  runs=[];start=None
  for y,n in enumerate(rows+[0]):
   if n>max(rows)*.35 and start is None:start=y
   if n<=max(rows)*.35 and start is not None:runs.append((start,y-1));start=None
  top,bottom=max(runs,key=lambda pair:pair[1]-pair[0])
  views[name]={'anchor':[crop.width/2,(top+bottom)/2],'scale':710/(bottom-top),'size':list(crop.size)}
 if id=='pushinka':views['q3-back']['excludeRects']=[[0,crops[2].height-6,170,6]]
 sp['views']=views;records.append(sp)
(root/'design/2d/bee-turnarounds/manifest.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
text=(root/'src/ui/ReferenceBee.tsx').read_text();constants=dict(re.findall(r'const (LEFT_WING|RIGHT_WING) = "([^"]+)"',text));config={}
for sp in records:
 match=re.search(r'\b'+sp['id']+r':\s*\{(.*?)\},',text,re.S)
 block=match.group(1)
 paths=[]
 for field in ['leftWing','rightWing']:
  value=re.search(field+r':\s*("([^"]+)"|LEFT_WING|RIGHT_WING)',block)
  paths.append(value.group(2) or constants[value.group(1)])
 roots=[list(map(float,re.search(field+r':\s*\[([^\]]+)\]',block).group(1).split(','))) for field in ['leftRoot','rightRoot']]
 config[sp['id']]={'paths':paths,'roots':roots}
(root/'design/2d/bee-turnarounds/reference-masks.json').write_text(json.dumps(config))
print('Exported',len(records),'species')
