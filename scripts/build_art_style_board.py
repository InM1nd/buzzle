from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import base64,io,json,argparse
repo=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
out=args.output;out.mkdir(parents=True,exist_ok=True)
g=repo/'design/art/glyph-contrast-options-v1';h=repo/'design/art/halloween-assets-v1'
font=str(repo/'assets/fonts/Nunito-ExtraBold.ttf')
def f(n):return ImageFont.truetype(font,n)
W,C,G=3360,804,24
board=Image.new('RGB',(W,5000),'#f2eee6');d=ImageDraw.Draw(board);records=[];ys=[320]*4
styles=[('Текущий стиль игры','Основной набор + сезонные кандидаты'),('Мягкий кристалл','Глифы + две пробы декора'),('Матовая пастель','Только глифы'),('Тёплый воск','Глифы + ранняя сезонная проба')]
d.text((30,25),'Buzzle / Все варианты по стилям',font=f(44),fill='#352d25')
d.text((32,91),'Все последние сравнения глифов и сезонных ассетов. Исходные цвета сохранены.',font=f(23),fill='#665e55')
for c,(title,sub) in enumerate(styles):
 x=24+c*(C+G);d.rectangle((x,155,x+C,290),fill='#e5ded1');d.text((x+22,176),title,font=f(32),fill='#352d25');d.text((x+22,231),sub,font=f(21),fill='#665e55')
def uri(im):
 b=io.BytesIO();im.save(b,format='PNG');return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
def section(c,title,note):
 x=24+c*(C+G);y=ys[c];d.text((x+6,y),title,font=f(27),fill='#352d25');d.text((x+6,y+43),note,font=f(18),fill='#746859');ys[c]+=80
def card(c,im,label,source,dx,y,w,hei,trim=False):
 x=24+c*(C+G)+dx;d.rectangle((x,y,x+w,y+hei),fill='#fffaf0');a=im.copy().convert('RGBA')
 if trim:a=a.crop(a.getchannel('A').point(lambda v:255 if v>=128 else 0).getbbox())
 a.thumbnail((w-24,hei-64),Image.Resampling.LANCZOS);board.paste(a,(x+(w-a.width)//2,y+10+(hei-64-a.height)//2),a)
 d.text((x+12,y+hei-42),label,font=f(18),fill='#554637')
 records.append({'x':x,'y':y,'w':w,'h':hei,'label':label,'style':styles[c][0],'source':str(source.relative_to(repo)) if source else 'Текущие cell0…4, cell_wild, bomb.webp','image':uri(im)})
# Current glyph strip, composed without editing original pixels.
current=[Image.open(repo/'assets/art'/f'{n}.webp').convert('RGBA') for n in ['cell0','cell1','cell2','cell3','cell4','cell_wild']]
b=current[0].copy();b.alpha_composite(Image.open(repo/'assets/art/bomb.webp').convert('RGBA'));current.append(b)
strip=Image.new('RGBA',(1536,1024))
for i,a in enumerate(current):
 a=a.copy();a=a.crop(a.getchannel('A').point(lambda v:255 if v>=128 else 0).getbbox());a.thumbnail((340,340),Image.Resampling.LANCZOS);cx=192+i*384 if i<4 else 384+(i-4)*384;cy=320 if i<4 else 710;strip.alpha_composite(a,(cx-a.width//2,cy-a.height//2))
section(0,'Глифы / сейчас в игре','Текущая бомба показана внутри соты')
card(0,strip,'Текущий набор',None,0,ys[0],C,560);ys[0]+=590
for c,ordinary,season in [(1,'01-soft-crystal.png','04a-halloween-soft-crystal.png'),(2,'02-matte-pastel.png','04b-halloween-matte-pastel.png'),(3,'03-warm-wax.png','04-halloween.png')]:
 for name,title,note in [(ordinary,'Глифы / обычные','Альтернатива текущим глифам'),(season,'Глифы / Хеллоуин','Ранняя проба: не выбранная 4А или 4Б' if c==3 else ('Сохранённая версия 4А' if c==1 else 'Сохранённая версия 4Б'))]:
  section(c,title,note);src=g/name;card(c,Image.open(src),title,src,0,ys[c],C,560);ys[c]+=590
section(0,'Бомба / отдельная правка','Компактный символ; не привязан к новой теме')
card(0,Image.open(g/'bomb-compact.png'),'Компактная бомба',g/'bomb-compact.png',0,ys[0],C,225,True);ys[0]+=250
for group,title,note,items,hei in [
 ('environment-honey-crystal-v1','Фоны / исходник / сезон','Слева обычный фон, справа осень или Хеллоуин',[('garden-background','Сад'),('hive-background','Улей')],510),
 ('decor-honey-crystal-v1','Декор / исходник / Хеллоуин','Текущие материалы игры сохранены',[('lanterns','Фонарики'),('flags','Флажки')],270),
 ('boxes-honey-crystal-v1','Коробки / исходник / Хеллоуин','Сезонные повреждения и сундук ещё не нарисованы.',[(f'box-{k}',v) for k,v in [('wood','Деревянная'),('wax','Восковая'),('gold','Золотая'),('royal','Королевская')]],250)]:
 section(0,title,note)
 for name,label in items:
  for i,src in enumerate([repo/'design/art'/group/f'{name}.png',h/f'{name}.png']):card(0,Image.open(src),label+(' / сейчас' if i==0 else ' / сезон'),src,i*408,ys[0],396,hei,group!='environment-honey-crystal-v1')
  ys[0]+=hei+20
section(1,'Декор / эксперимент','Только два предмета; не стиль всего сезонного набора')
for name,label in [('lanterns','Фонарики / мягкий кристалл'),('flags','Флажки / мягкий кристалл')]:
 src=h/f'{name}-soft-crystal.png';card(1,Image.open(src),label,src,0,ys[1],C,430,True);ys[1]+=450
H=max(ys)+60;assert H<board.height,H
board=board.crop((0,0,W,H));board.save(out/'all-styles.png',optimize=True)
preview=board.copy();preview.thumbnail((1680,2400));preview.save(out/'overview.png',optimize=True)
data=json.dumps(records,ensure_ascii=False).replace('</','<\\/')
css='''*{box-sizing:border-box}body{margin:0;font:14px system-ui,sans-serif;color:#352d25;background:#f2eee6}header{min-height:104px;border-bottom:1px solid #d9d1c5;padding:14px 22px;display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap}h1{font-size:21px;margin:0 0 5px}p{margin:0;color:#6c6257;font-size:13px}nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap}button{font:inherit;cursor:pointer;background:#fffaf0;border:1px solid #c9bdac;padding:8px 12px;border-radius:7px;color:inherit}button:hover{background:#e9decc}#viewport{overflow:auto;overscroll-behavior:contain;position:relative}#board{position:relative;transform-origin:top left}#board>img{display:block;width:100%;height:100%}.hit{position:absolute;border:0;padding:0;background:transparent;border-radius:0}.hit:hover{background:transparent;outline:3px solid #996b39;outline-offset:-3px}.hit:focus-visible{outline:4px solid #996b39}#spacer{position:relative;overflow:hidden}#hint{font-size:12px;color:#6c6257}dialog{padding:0;border:1px solid #bcae9c;border-radius:10px;max-width:94vw;max-height:94dvh;background:#fffaf0;color:inherit}dialog::backdrop{background:#1b1713bb}.modal-head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 18px;border-bottom:1px solid #e1d8ca}.modal-head strong{font-size:17px}#large{display:block;max-width:90vw;max-height:76dvh;margin:auto;object-fit:contain;background:#fff8e9}#source{padding:12px 18px;overflow-wrap:anywhere;max-width:900px;font-size:12px}input{width:110px;accent-color:#82582c}@media(max-width:750px){header{padding:10px 12px}h1{font-size:18px}nav{gap:5px}button{padding:6px 9px}#hint{display:none}}'''
page='''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Buzzle — доска стилей</title><style>__CSS__</style><header><div><h1>Buzzle — доска стилей</h1><p>Все последние варианты · нажми на изображение для крупного просмотра</p></div><nav aria-label="Масштаб и стили"><button id="fit">Вся доска</button><button data-col="0">Игра</button><button data-col="1">Кристалл</button><button data-col="2">Пастель</button><button data-col="3">Воск</button><label>Масштаб <input id="zoom" type="range" min="8" max="140" value="40" aria-label="Масштаб доски"></label><span id="percent"></span></nav><span id="hint">Ctrl/⌘ + колесо — масштаб · прокрутка — перемещение · Esc — закрыть</span></header><main id="viewport"><div id="spacer"><div id="board"><img src="__BOARD__" alt="Все варианты Buzzle по стилям"></div></div></main><dialog id="detail"><div class="modal-head"><strong id="caption"></strong><button id="close" aria-label="Закрыть изображение">Закрыть ×</button></div><img id="large" alt=""><p id="source"></p></dialog><script>const assets=__DATA__;const W=__W__,H=__H__;const vp=document.querySelector('#viewport'),board=document.querySelector('#board'),spacer=document.querySelector('#spacer'),zoom=document.querySelector('#zoom'),percent=document.querySelector('#percent'),dlg=document.querySelector('#detail');let scale=1;board.style.width=W+'px';board.style.height=H+'px';function height(){vp.style.height=(innerHeight-document.querySelector('header').offsetHeight)+'px'}function setScale(s){scale=Math.min(1.4,Math.max(.08,s));board.style.transform='scale('+scale+')';spacer.style.width=W*scale+'px';spacer.style.height=H*scale+'px';zoom.value=scale*100;percent.textContent=Math.round(scale*100)+'%'}function fit(){height();setScale((vp.clientWidth-24)/W);vp.scrollTo(0,0)}document.querySelector('#fit').onclick=fit;zoom.oninput=()=>setScale(+zoom.value/100);document.querySelectorAll('[data-col]').forEach(b=>b.onclick=()=>{setScale(Math.min(1,(vp.clientWidth-32)/804));vp.scrollTo({left:(24+(+b.dataset.col)*828)*scale-10,top:145*scale,behavior:'smooth'})});assets.forEach(a=>{const b=document.createElement('button');b.className='hit';b.style.cssText=`left:${a.x}px;top:${a.y}px;width:${a.w}px;height:${a.h}px`;b.setAttribute('aria-label',a.style+' — '+a.label);b.title=a.style+' — '+a.label;b.onclick=()=>{document.querySelector('#caption').textContent=a.style+' / '+a.label;document.querySelector('#large').src=a.image;document.querySelector('#large').alt=a.label;document.querySelector('#source').textContent=a.source;dlg.showModal()};board.append(b)});document.querySelector('#close').onclick=()=>dlg.close();dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()});vp.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const r=vp.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,ax=(vp.scrollLeft+px)/scale,ay=(vp.scrollTop+py)/scale;setScale(scale*Math.exp(-e.deltaY*.003));vp.scrollLeft=ax*scale-px;vp.scrollTop=ay*scale-py},{passive:false});addEventListener('keydown',e=>{if(dlg.open)return;if(e.key==='+'||e.key==='=')setScale(scale*1.15);if(e.key==='-')setScale(scale/1.15)});addEventListener('resize',height);fit();</script></html>'''
page=page.replace('__CSS__',css).replace('__BOARD__',uri(board)).replace('__DATA__',data).replace('__W__',str(W)).replace('__H__',str(H))
(out/'styles.html').write_text(page)
(out/'manifest.json').write_text(json.dumps([{k:v for k,v in a.items() if k!='image'} for a in records],ensure_ascii=False,indent=2))
print('Clickable groups:',len(records),'Board:',W,H,'HTML bytes:',len(page))
