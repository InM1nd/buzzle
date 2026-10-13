import {loadSprites as loadZhuzha,drawBee as drawZhuzha} from '../zhuzha-turnaround/sprite.js';
export {normalize,delta,direction} from '../zhuzha-turnaround/sprite.js';
const fetchJSON=async file=>{const r=await fetch(file);if(!r.ok)throw Error(file);return r.json();};
const image=async url=>{const im=new Image();im.src=url;await im.decode();return im;};
const reducedCanvas=()=>Object.assign(document.createElement('canvas'),{width:512,height:432});
// Keep the wing's connected alpha silhouette; neighboring sheet fragments stay invisible.
function cleanWing(im){const c=Object.assign(document.createElement('canvas'),{width:im.width,height:im.height}),ctx=c.getContext('2d');ctx.drawImage(im,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height),seen=new Uint8Array(c.width*c.height);let largest=[];
for(let p=0;p<seen.length;p++){if(seen[p]||pixels.data[p*4+3]<16)continue;const group=[p];seen[p]=1;for(let n=0;n<group.length;n++){const k=group[n],x=k%c.width,y=Math.floor(k/c.width);for(let yy=Math.max(0,y-1);yy<=Math.min(c.height-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(c.width-1,x+1);xx++){const v=yy*c.width+xx;if(!seen[v]&&pixels.data[v*4+3]>=16){seen[v]=1;group.push(v);}}}if(group.length>largest.length)largest=group;}
const keep=new Uint8Array(seen.length);largest.forEach(p=>keep[p]=1);for(let p=0;p<keep.length;p++)if(!keep[p])pixels.data[p*4+3]=0;ctx.putImageData(pixels,0,0);return c;}
let manifest,masks;const cache=new Map();
export async function catalog(){manifest=await fetchJSON('manifest.json');masks=await fetchJSON('reference-masks.json');return [{id:'zhuzha',name:'Жужа'},...manifest];}
export async function loadSpecies(id){
 if(cache.has(id))return cache.get(id);
 const pending=(async()=>{
 if(id==='zhuzha')return (await loadZhuzha()).map(s=>({...s,kind:'zhuzha'}));
 const sp=manifest.find(s=>s.id===id);if(!sp)throw Error(`Unknown species ${id}`);
 const files=['front','side','q3-back','back','wing-left','wing-right'];const imgs=await Promise.all(files.map(n=>image(`assets/${id}/${n}.png`)));const pictures=Object.fromEntries(files.map((n,i)=>[n,imgs[i]]));pictures['wing-left']=cleanWing(pictures['wing-left']);pictures['wing-right']=cleanWing(pictures['wing-right']);
 const ref=await image(`../../../assets/art/bees-prototype/${sp.reference}`);
 const body=reducedCanvas(),bc=body.getContext('2d');bc.scale(512/1366,432/1151);bc.drawImage(ref,0,0);const config=masks[id];
 const wings=config.paths.map(path=>{const layer=reducedCanvas(),lc=layer.getContext('2d');lc.scale(512/1366,432/1151);lc.clip(new Path2D(path));lc.drawImage(ref,0,0);bc.globalCompositeOperation='destination-out';bc.fill(new Path2D(path));return layer;});
 const original={kind:'reference',body,wings,roots:config.roots,anchor:id==='boris'?[755,710]:[742,705],scale:.94};
 for(const [file,view] of Object.entries(sp.views)){if(!view.excludeRects)continue;const im=pictures[file],clean=Object.assign(document.createElement('canvas'),{width:im.width,height:im.height}),c=clean.getContext('2d');c.drawImage(im,0,0);view.excludeRects.forEach(rect=>c.clearRect(...rect));pictures[file]=clean;}
 const views=['front','side','q3-back','back'].map((file,i)=>({kind:'generated',image:pictures[file],view:sp.views[file],file,wingImages:[pictures['wing-left'],pictures['wing-right']],species:id}));
 return [views[0],original,views[1],views[2],views[3],views[2],views[1],original].map((s,i)=>({...s,mirror:i>4}));
 })();cache.set(id,pending);try{return await pending;}catch(e){cache.delete(id);throw e;}
}
export function drawBee(ctx,s,x,y,size,time,options={}){
 if(s.kind==='zhuzha')return drawZhuzha(ctx,s,x,y,size,time,options);
 const {flap=true,motion=true,bank=0}=options;const wave=flap?Math.sin(time*Math.PI*16):0;
 ctx.save();ctx.translate(x,y+(motion?Math.sin(time*2.6)*size*.013:0));ctx.rotate(bank+(motion?Math.sin(time*2)*.012:0));ctx.scale((s.mirror?-1:1)*size/1366,size/1366);
 if(s.kind==='reference'){
  ctx.scale(s.scale,s.scale);ctx.translate(-s.anchor[0],-s.anchor[1]);
  s.wings.forEach((im,i)=>{const [rx,ry]=s.roots[i];ctx.save();ctx.translate(rx,ry);ctx.rotate(wave*.06*(i?1:-1));ctx.scale(1,flap?.93+wave*.07:1);ctx.drawImage(im,-rx,-ry,1366,1151);ctx.restore();});ctx.drawImage(s.body,0,0,1366,1151);
 }else{
  // Clean generated bodies contain no wings. Wing roots lie behind the body silhouette.
  const arrangements={front:[[470,570,0,1,0],[890,570,0,1,1]],side:[[480,490,.5,.8,0],[500,550,.04,1,0]],'q3-back':[[490,540,.1,1,0],[915,590,-.2,.8,1]],back:[[470,570,0,1,0],[890,570,0,1,1]]};
  for(const [rx,ry,rotation,ratio,which] of arrangements[s.file]){
   const im=s.wingImages[which],w=330*ratio,h=w*im.height/im.width;
   ctx.save();ctx.translate(rx-683,ry-680);ctx.rotate(rotation+wave*.06*(which?1:-1));ctx.scale(1,flap?.93+wave*.07:1);ctx.drawImage(im,-w*(which?.04:.96),-h*.80,w,h);ctx.restore();
  }
  ctx.save();ctx.scale(s.view.scale,s.view.scale);ctx.drawImage(s.image,-s.view.anchor[0],-s.view.anchor[1]);ctx.restore();
 }
 ctx.restore();
}
