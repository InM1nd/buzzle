import {createFluid,layersOf,removeVolume} from './fluid.mjs';
import {createGame,pour,complete} from './engine.mjs';
const {levels}=await fetch('../levels-reference.json').then(r=>r.json());
const colors=['#81513c','#bd7b1e','#397952','#b33761','#d9bb79'];
const symbols=['●','◆','♣','♥','✿'];
const names=['Какао','Сбитень','Мятный чай','Морс','Молоко с мёдом'];
const $=s=>document.querySelector(s);
let level=0,game=createGame(levels[0]),selected=null,busy=false,nectar=false,motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
const models=new Map();let effect=null,animationState=null;
const fx=document.createElement('canvas');fx.id='fluid-fx';fx.setAttribute('aria-hidden','true');document.body.append(fx);const fxctx=fx.getContext('2d');
function drawFrame(time){
 if(!document.hidden){for(const model of models.values())model.draw(motion?time:0);
 const dpr=Math.min(3,devicePixelRatio||1);if(fx.width!==Math.round(innerWidth*dpr)||fx.height!==Math.round(innerHeight*dpr)){fx.width=Math.round(innerWidth*dpr);fx.height=Math.round(innerHeight*dpr);}fxctx.setTransform(dpr,0,0,dpr,0,0);fxctx.clearRect(0,0,innerWidth,innerHeight);
 if(effect){const {x,y,tx,ty,color}=effect;fxctx.beginPath();fxctx.moveTo(x,y);fxctx.quadraticCurveTo(x+(tx-x)*.8,y+(ty-y)*.25,tx,ty);fxctx.strokeStyle=color;fxctx.lineWidth=6;fxctx.lineCap='round';fxctx.stroke();fxctx.strokeStyle='#fff3ca99';fxctx.lineWidth=1.5;fxctx.stroke();
 for(let k=0;k<3;k++){const t=((time*.0018+k/3)%1);const u=1-t,cx=x+(tx-x)*.8,cy=y+(ty-y)*.25;fxctx.beginPath();fxctx.arc(u*u*x+2*u*t*cx+t*t*tx,u*u*y+2*u*t*cy+t*t*ty,2,0,Math.PI*2);fxctx.fillStyle='#ffeac3';fxctx.fill();}}
 }requestAnimationFrame(drawFrame);
}requestAnimationFrame(drawFrame);
function tween(duration,update){if(!duration){update(1);return Promise.resolve();}return new Promise(resolve=>{const begin=performance.now();function tick(now){const t=Math.min(1,(now-begin)/duration);update(t);if(t<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});}
function rating(s){const par=levels[level].solution.length;return s.moves<=par+3?3:s.moves<=par+8?2:1;}
function render(message='Выбери кружку, затем другую'){
 const s=game.snapshot();$('#moves').textContent=`Ходы: ${s.moves}`;$('#stars').textContent='★'.repeat(rating(s))+'☆'.repeat(3-rating(s));$('#status').textContent=message;
 $('#board').classList.toggle('wide',s.cups.length>6);models.clear();$('#board').innerHTML='';
 s.cups.forEach((cup,i)=>{
  const el=document.createElement('button');el.className='cup'+(selected===i?' selected':'')+(complete(cup)?' locked':'')+(selected!==null&&pour(s.cups,selected,i)?' target':'');el.dataset.cup=i;
  el.setAttribute('aria-label',`${nectar?'Баночка':'Кружка'} ${i+1}: ${cup.length?cup.map(c=>names[c]).join(', ')+', снизу вверх':'пустая'}${complete(cup)?', собрана':''}`);el.setAttribute('aria-pressed',selected===i);
  el.innerHTML=`<span class="vessel"><canvas class="drink-canvas" aria-hidden="true"></canvas><img class="vessel-art" src="art/${nectar?'jar':'mug'}-v2.webp" alt="">${complete(cup)?`<span class="garnish ${cup[0]===2?'mint':'mallows'}"></span><span class="steam">∿ ∿</span><span class="mark">✓</span>`:''}</span><span class="cup-name">${i+1} · ${cup.length}/4</span>`;el.onclick=()=>choose(i);$('#board').append(el);models.set(i,createFluid(el.querySelector('canvas'),cup,nectar));
 });
 $('#undo').textContent=`Отменить · ${s.undos}`;$('#undo').disabled=!s.undos||!s.moves||busy;$('#add').disabled=s.added||s.won||busy;$('#add').textContent=`+ пустая ${nectar?'баночка':'кружка'} · ${s.added?0:1}`;
 $('#result').hidden=!s.won;$('#summary').textContent=`${s.moves} ходов · ${'★'.repeat(rating(s))}`;$('#next').textContent=level===0?'Следующий уровень':'Пройти ещё раз';
 $('#legend').innerHTML=names.map((name,i)=>`<span class="legend-item"><span class="dot" style="background:${colors[i]}">${symbols[i]}</span>${nectar?['Медовый','Янтарный','Травяной','Ягодный','Цветочный'][i]:name}</span>`).join('');
 document.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.level)===level));
}
async function choose(i){
 if(busy||game.snapshot().won)return;
 const s=game.snapshot();
 if(selected===i){selected=null;render();return;}
 if(selected===null){if(!s.cups[i].length||complete(s.cups[i])){render(complete(s.cups[i])?'Этот напиток уже собран':'Выбери непустую кружку');return;}selected=i;render('Выбери кружку с тем же верхним цветом или пустую');return;}
 const from=selected,result=pour(s.cups,from,i);
 if(!result){render('Нужен тот же верхний цвет или пустая кружка со свободным местом');const b=$(`[data-cup="${i}"]`);b.classList.add('shake');return;}
 busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);
 const source=$(`[data-cup="${from}"] .vessel`),target=$(`[data-cup="${i}"] .vessel`);
 const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
 const ghost=source.cloneNode(true);ghost.classList.add('ghost');Object.assign(ghost.style,{position:'fixed',left:a.left+'px',top:a.top+'px',width:a.width+'px',height:a.height+'px',zIndex:30,pointerEvents:'none',transformOrigin:'50% 50%'});document.body.append(ghost);source.style.visibility='hidden';
 const fluid=createFluid(ghost.querySelector('canvas'),s.cups[from],nectar);models.set('ghost',fluid);const receiving=models.get(i);
 const reduced=!motion,theta=.88;
 const lipX=a.width*(nectar?.72:.65),lipY=a.height*.28;
 const rotatedX=a.width/2+(lipX-a.width/2)*Math.cos(theta)-(lipY-a.height/2)*Math.sin(theta);
 const rotatedY=a.height/2+(lipX-a.width/2)*Math.sin(theta)+(lipY-a.height/2)*Math.cos(theta);
 const tx=b.left+b.width*(nectar?.5:.47),ty=b.top+b.height*(nectar?.30:.28);
 const endX=Math.max(6,Math.min(innerWidth-a.width-6,tx-rotatedX)),endY=Math.max(8,ty-rotatedY-48);
 const dx=endX-a.left,dy=endY-a.top;
 animationState={phase:'lift',progress:0};
 await tween(reduced?0:380,t=>{const e=t*t*(3-2*t);ghost.style.transform=`translate(${dx*e}px,${dy*e}px) rotate(${theta*e}rad)`;fluid.angle=theta*e;});
 animationState.phase='pour';
 await tween(reduced?0:850+result.count*150,t=>{
  fluid.layers=removeVolume(s.cups[from],result.count*t);receiving.layers=[...layersOf(s.cups[i]),{color:result.color,units:result.count*t}];receiving.ripple=1;
  animationState={phase:'pour',progress:t,sourceVolume:s.cups[from].length-result.count*t,targetVolume:s.cups[i].length+result.count*t};
  if(!reduced)effect={x:endX+rotatedX,y:endY+rotatedY,tx,ty:ty+5,color:colors[result.color]};
 });
 effect=null;animationState.phase='return';
 await tween(reduced?0:330,t=>{const e=t*t*(3-2*t);ghost.style.transform=`translate(${dx*(1-e)}px,${dy*(1-e)}px) rotate(${theta*(1-e)}rad)`;fluid.angle=theta*(1-e);receiving.ripple=1-e;});
 ghost.remove();models.delete('ghost');animationState=null;

 game.move(from,i);selected=null;busy=false;$('#stream').hidden=true;document.querySelectorAll('button').forEach(b=>b.disabled=false);render(game.snapshot().won?'Отлично! Все напитки собраны':`Перелито слоёв: ${result.count}`);if(complete(result.cups[i]))$(`[data-cup="${i}"]`).classList.add('celebrate');
}
function start(n){if(busy)return;level=n;game=createGame(levels[n]);selected=null;render();}
document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>start(Number(b.dataset.level)));
$('#undo').onclick=()=>{if(busy)return;if(game.undo()){selected=null;render('Ход отменён');}};
$('#add').onclick=()=>{if(busy)return;if(game.add()){selected=null;render('Добавлена пустая кружка');}};
$('#reset').onclick=()=>start(level);$('#next').onclick=()=>start(level===0?1:level);
$('#skin').onclick=()=>{if(busy)return;nectar=!nectar;document.body.classList.toggle('nectar',nectar);$('#skin').textContent=nectar?'Тема: нектар':'Тема: какао';$('h1').textContent=nectar?'Нектар-сорт':'Какао-сорт';render();};
$('#motion').onclick=()=>{if(busy)return;motion=!motion;$('#motion').textContent=motion?'Анимация: вкл.':'Анимация: выкл.';$('#motion').setAttribute('aria-pressed',motion);};$('#motion').textContent=motion?'Анимация: вкл.':'Анимация: выкл.';$('#motion').setAttribute('aria-pressed',motion);
window.cocoaDemo={snapshot:()=>game.snapshot(),animation:()=>animationState};render();
