// Layer area, rather than texture height, represents drink volume.
export function area(poly){return Math.abs(poly.reduce((s,p,i)=>{const q=poly[(i+1)%poly.length];return s+p[0]*q[1]-q[0]*p[1];},0))/2;}
export function below(poly,s,c,t){
 const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=s*a[0]+c*a[1]-t,db=s*b[0]+c*b[1]-t;
  if(da>=0)out.push(a);
  if((da>=0)!==(db>=0)){const f=da/(da-db);out.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);}
 }
 return out;
}
export function surface(poly,angle,fraction){
 const s=Math.sin(angle),c=Math.cos(angle),values=poly.map(p=>s*p[0]+c*p[1]);
 let lo=Math.min(...values)-.01,hi=Math.max(...values)+.01;const target=area(poly)*Math.max(0,Math.min(1,fraction));
 for(let k=0;k<18;k++){const mid=(lo+hi)/2;if(area(below(poly,s,c,mid))>target)lo=mid;else hi=mid;}
 return (lo+hi)/2;
}
export const layersOf=cup=>cup.map(color=>({color,units:1}));
export function removeVolume(cup,units){const layers=layersOf(cup);for(let i=layers.length-1;i>=0&&units>0;i--){const take=Math.min(units,layers[i].units);layers[i].units-=take;units-=take;}return layers.filter(l=>l.units>1e-6);}
const palette=['#915439','#d79531','#579565','#c65b79','#edcd8b'];
function path(ctx,p){ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
export function createFluid(canvas,cup,jar=false){
 const ctx=canvas.getContext('2d');
 const model={layers:layersOf(cup),angle:0,ripple:0};
 let cacheKey='',layout=[];
 model.draw=time=>{
  const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
  const dpr=Math.min(3,devicePixelRatio||1);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);cacheKey='';}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const shape=jar?[[.29,.29],[.71,.29],[.85,.525],[.71,.80],[.29,.80],[.15,.525]]:[[.29,.27],[.64,.27],[.77,.49],[.64,.73],[.29,.73],[.16,.49]];
  const poly=shape.map(([x,y])=>[x*w,y*h]);
  const key=w+':'+h+':'+model.angle.toFixed(4)+JSON.stringify(model.layers);
  if(key!==cacheKey){cacheKey=key;let total=0;layout=model.layers.map(l=>{total+=l.units;const t=surface(poly,model.angle,total/4);return {color:l.color,t,poly:below(poly,Math.sin(model.angle),Math.cos(model.angle),t)};});}
  ctx.save();path(ctx,poly);ctx.clip();
  ctx.fillStyle='#50382138';ctx.fillRect(0,0,w,h);
  for(let i=layout.length-1;i>=0;i--){const l=layout[i];if(l.poly.length<3)continue;path(ctx,l.poly);ctx.fillStyle=palette[l.color];ctx.fill();
   const shade=ctx.createLinearGradient(w*.2,0,w*.75,0);shade.addColorStop(0,'#ffffff1a');shade.addColorStop(.5,'#ffffff00');shade.addColorStop(1,'#00000016');ctx.fillStyle=shade;ctx.fill();
  }
  const top=layout.at(-1);
  if(top){const s=Math.sin(model.angle),c=Math.cos(model.angle),amp=.65+model.ripple*2.2;
   ctx.beginPath();for(let x=0;x<=w;x+=2){const y=(top.t-s*x)/c+Math.sin(x*.09+time*.004)*amp;(x?ctx.lineTo(x,y):ctx.moveTo(x,y));}ctx.strokeStyle='#fff1cd9c';ctx.lineWidth=1.5;ctx.stroke();
   if(model.ripple>0){const y=(top.t-s*w*.5)/c;ctx.beginPath();ctx.ellipse(w*.47,y,4+((time*.025)%12),2,0,0,Math.PI*2);ctx.strokeStyle=`rgba(255,245,218,${model.ripple*.6})`;ctx.stroke();}
  }
  ctx.restore();
 };
 return model;
}
