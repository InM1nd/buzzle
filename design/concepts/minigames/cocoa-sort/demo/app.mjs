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
  el.innerHTML=`${complete(cup)?'<span class="mark">✓</span>':''}<span class="glass">${cup.map(c=>`<span class="layer" style="background:${colors[c]}">${symbols[c]}</span>`).join('')}${Array.from({length:4-cup.length},()=>'<span class="empty"></span>').join('')}</span><span class="cup-name">${i+1} · ${cup.length}/4</span>`;el.onclick=()=>choose(i);$('#board').append(el);
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
 const source=$(`[data-cup="${from}"]`),target=$(`[data-cup="${i}"]`);source.classList.add('pouring');
 const a=source.getBoundingClientRect(),b=target.getBoundingClientRect(),x=a.left+a.width/2,y=a.top+35,dx=b.left+b.width/2-x,dy=b.top+35-y;
 Object.assign($('#stream').style,{left:x+'px',top:y+'px',width:Math.hypot(dx,dy)+'px',background:colors[result.color],transform:`rotate(${Math.atan2(dy,dx)}rad)`});$('#stream').hidden=false;
 await new Promise(r=>setTimeout(r,matchMedia('(prefers-reduced-motion: reduce)').matches?0:400));
 game.move(from,i);selected=null;busy=false;$('#stream').hidden=true;document.querySelectorAll('button').forEach(b=>b.disabled=false);render(game.snapshot().won?'Отлично! Все напитки собраны':`Перелито слоёв: ${result.count}`);
}
function start(n){if(busy)return;level=n;game=createGame(levels[n]);selected=null;render();}
document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>start(Number(b.dataset.level)));
$('#undo').onclick=()=>{if(busy)return;if(game.undo()){selected=null;render('Ход отменён');}};
$('#add').onclick=()=>{if(busy)return;if(game.add()){selected=null;render('Добавлена пустая кружка');}};
$('#reset').onclick=()=>start(level);$('#next').onclick=()=>start(level===0?1:level);
$('#skin').onclick=()=>{if(busy)return;nectar=!nectar;document.body.classList.toggle('nectar',nectar);$('#skin').textContent=nectar?'Тема: нектар':'Тема: какао';$('h1').textContent=nectar?'Нектар-сорт':'Какао-сорт';render();};
window.cocoaDemo={snapshot:()=>game.snapshot()};render();
