const angles=['front','q3-front','side','q3-back','back','q3-back-left','side-left','q3-front-left'];
const species=['pushinka','boris'],cache=new Map(),requests=new Map();
const el=id=>document.getElementById(id),panels=species.map(id=>({id,canvas:el(id),bees:Array.from({length:3},(_,i)=>({phase:i*2.1,heading:45,frame:1}))}));
let selected='scarf',bare=false,paused=false,time=0,last=0,revision=0,ready=false;
const wrap=a=>(a%360+360)%360,delta=(a,b)=>((b-a+540)%360)-180;
async function load(kind){
 if(requests.has(kind))return requests.get(kind);
 const task=Promise.all(species.flatMap(id=>angles.map(async a=>{const key=id+'/'+kind+'/'+a,im=new Image();im.src='assets/'+id+'/'+kind+'-'+a+'.png';await im.decode();cache.set(key,im)})));
 requests.set(kind,task);try{await task}catch(error){requests.delete(kind);throw error}return task;
}
async function choose(){const token=++revision;ready=false;el('status').textContent='Загрузка выбранного предмета…';try{await load(el('kind').value);if(token!==revision)return;selected=el('kind').value;ready=true;el('status').textContent='Готово · выбери размер, останови полёт или задай ракурс для сравнения.'}catch(e){if(token===revision)el('status').textContent='Не удалось загрузить предмет. Попробуй выбрать его ещё раз.';console.error(e)}}
el('kind').onchange=choose;
el('pause').onclick=function(){paused=!paused;this.textContent=paused?'Продолжить полёт':'Остановить полёт';this.setAttribute('aria-pressed',String(paused))};
el('bare').onclick=function(){bare=!bare;this.textContent=bare?'С аксессуаром':'Без аксессуара';this.setAttribute('aria-pressed',String(bare))};
function fit(canvas){const r=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1,w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}return {width:r.width,height:r.height,dpr}}
function board(ctx,w,h){ctx.fillStyle='#fff0c8';ctx.fillRect(0,0,w,h);const r=43,dy=Math.sqrt(3)*r;ctx.lineWidth=2;for(let col=0;col<Math.ceil(w/(r*1.5))+1;col++)for(let row=0;row<7;row++){const x=col*r*1.5,y=row*dy+(col%2)*dy/2;ctx.beginPath();for(let n=0;n<6;n++){const a=n*Math.PI/3;n?ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.moveTo(x+r,y)}ctx.closePath();ctx.fillStyle=(col+row)%3?'#ffd56a':'#ffe7a6';ctx.fill();ctx.strokeStyle='#e0b875';ctx.stroke();if(x>20&&x<w-20&&y>20&&y<h-20){ctx.fillStyle='#b47a30';ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.fillText(String((col+row)%4+1),x,y+7)}}}
function render(ms){const now=ms/1000,dt=last?Math.min(.05,now-last):0;last=now;if(!paused)time+=dt;
 for(const p of panels){const {width:w,height:h,dpr}=fit(p.canvas),ctx=p.canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);board(ctx,w,h);const size=Number(el('size').value),mode=el('direction').value;
  p.bees.forEach((bee,i)=>{const u=time*.48+bee.phase,rx=Math.max(30,w/2-65),ry=115,x=w/2+Math.sin(u)*rx,y=h/2+Math.sin(u*1.3+i*.4)*ry;
   let target=mode==='turn'?wrap(time*42):wrap(Math.atan2(Math.cos(u)*rx,Math.cos(u*1.3+i*.4)*ry*1.3)*180/Math.PI);
   if(mode==='auto'||mode==='turn'){if(!paused)bee.heading=wrap(bee.heading+Math.max(-dt*160,Math.min(dt*160,delta(bee.heading,target))));if(Math.abs(delta(bee.frame*45,bee.heading))>27)bee.frame=Math.round(bee.heading/45)%8}else bee.frame=Number(mode);
   const im=cache.get(p.id+'/'+(bare?'base':selected)+'/'+angles[bee.frame]);if(!im)return;ctx.save();ctx.translate(x,y+Math.sin(time*2.6+i)*1.2);ctx.rotate(Math.sin(u)*.025);ctx.drawImage(im,-size/2,-size*300/512,size,size);ctx.restore();
  });
 }requestAnimationFrame(render);
}
window.flightReview={load,setTime:t=>{time=t},state:()=>({time,paused,bare,selected,ready,size:Number(el('size').value),mode:el('direction').value,frames:panels.map(p=>p.bees.map(b=>b.frame)),loaded:cache.size})};
load('base').then(choose).catch(console.error);requestAnimationFrame(render);
