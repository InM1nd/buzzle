import {createGame,pour,complete} from './engine.mjs';
const {levels}=await fetch('../levels-reference.json').then(r=>r.json());
const colors=['#81513c','#bd7b1e','#397952','#b33761','#d9bb79'];
const symbols=['●','◆','♣','♥','✿'];
const names=['Какао','Сбитень','Мятный чай','Морс','Молоко с мёдом'];
const $=s=>document.querySelector(s);
let level=0,game=createGame(levels[0]),selected=null,busy=false,nectar=false;
function rating(s){const par=levels[level].solution.length;return s.moves<=par+3?3:s.moves<=par+8?2:1;}
function render(message='Выбери кружку, затем другую'){
 const s=game.snapshot();$('#moves').textContent=`Ходы: ${s.moves}`;$('#stars').textContent='★'.repeat(rating(s))+'☆'.repeat(3-rating(s));$('#status').textContent=message;
 $('#board').classList.toggle('wide',s.cups.length>6);$('#board').innerHTML='';
 s.cups.forEach((cup,i)=>{
  const el=document.createElement('button');el.className='cup'+(selected===i?' selected':'')+(complete(cup)?' locked':'')+(selected!==null&&pour(s.cups,selected,i)?' target':'');el.dataset.cup=i;
  el.setAttribute('aria-label',`${nectar?'Баночка':'Кружка'} ${i+1}: ${cup.length?cup.map(c=>names[c]).join(', ')+', снизу вверх':'пустая'}${complete(cup)?', собрана':''}`);el.setAttribute('aria-pressed',selected===i);
  el.innerHTML=`<span class="vessel"><span class="liquid">${cup.map(c=>`<span class="layer" style="--drink:${colors[c]}"><small>${symbols[c]}</small></span>`).join('')}</span><img class="vessel-art" src="art/${nectar?'jar':'mug'}.webp" alt="">${complete(cup)?`<span class="garnish ${cup[0]===2?'mint':'mallows'}"></span><span class="steam">∿ ∿</span><span class="mark">✓</span>`:''}</span><span class="cup-name">${i+1} · ${cup.length}/4</span>`;el.onclick=()=>choose(i);$('#board').append(el);
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
 const ghost=source.cloneNode(true);ghost.classList.add('ghost');Object.assign(ghost.style,{position:'fixed',left:a.left+'px',top:a.top+'px',width:a.width+'px',height:a.height+'px',zIndex:30,pointerEvents:'none'});document.body.append(ghost);source.style.visibility='hidden';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const dx=Math.max(0,Math.min(innerWidth-a.width,b.left-a.width*.6))-a.left,dy=b.top-a.height*.65-a.top;
 const pose=`translate(${dx}px,${dy}px) rotate(48deg)`;
 if(!reduced)await ghost.animate([{transform:'none'},{transform:pose}],{duration:260,fill:'forwards',easing:'ease-in-out'}).finished;
 else ghost.style.transform=pose;
 const g=ghost.getBoundingClientRect(),x=g.left+g.width*.72,y=g.top+g.height*.3,tx=b.left+b.width*.45,ty=b.top+b.height*.18;
 Object.assign($('#stream').style,{left:x+'px',top:y+'px',width:Math.hypot(tx-x,ty-y)+'px',background:colors[result.color],transform:`rotate(${Math.atan2(ty-y,tx-x)}rad)`});$('#stream').hidden=reduced;
 const layers=[...ghost.querySelectorAll('.layer')],liquid=target.querySelector('.liquid');
 const growing=document.createElement('span');growing.className='layer';growing.style.setProperty('--drink',colors[result.color]);growing.style.height='0%';liquid.append(growing);
 const duration=reduced?0:480;
 await Promise.all([growing.animate([{height:'0%'},{height:(result.count*25)+'%'}],{duration,fill:'forwards'}).finished,...layers.slice(-result.count).map(el=>el.animate([{height:'25%'},{height:'0%'}],{duration,fill:'forwards'}).finished)]);
 $('#stream').hidden=true;
 if(!reduced)await ghost.animate([{transform:pose},{transform:'none'}],{duration:240,fill:'forwards',easing:'ease-in-out'}).finished;
 ghost.remove();

 game.move(from,i);selected=null;busy=false;$('#stream').hidden=true;document.querySelectorAll('button').forEach(b=>b.disabled=false);render(game.snapshot().won?'Отлично! Все напитки собраны':`Перелито слоёв: ${result.count}`);if(complete(result.cups[i]))$(`[data-cup="${i}"]`).classList.add('celebrate');
}
function start(n){if(busy)return;level=n;game=createGame(levels[n]);selected=null;render();}
document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>start(Number(b.dataset.level)));
$('#undo').onclick=()=>{if(busy)return;if(game.undo()){selected=null;render('Ход отменён');}};
$('#add').onclick=()=>{if(busy)return;if(game.add()){selected=null;render('Добавлена пустая кружка');}};
$('#reset').onclick=()=>start(level);$('#next').onclick=()=>start(level===0?1:level);
$('#skin').onclick=()=>{if(busy)return;nectar=!nectar;document.body.classList.toggle('nectar',nectar);$('#skin').textContent=nectar?'Тема: нектар':'Тема: какао';$('h1').textContent=nectar?'Нектар-сорт':'Какао-сорт';render();};
window.cocoaDemo={snapshot:()=>game.snapshot()};render();
