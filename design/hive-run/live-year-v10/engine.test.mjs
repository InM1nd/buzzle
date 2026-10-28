import assert from 'node:assert/strict';
import {createRun,start,tick,collect,boost,allocate,setMeadow,sum,RULES} from './engine.mjs';
const invariant=s=>{assert(s.population>=0);assert(s.foragers>=0&&s.workers>=0);assert(s.foragers+s.workers<=s.population);assert([...s.pollen,...s.jar].every(n=>Number.isInteger(n)&&n>=0));assert(s.cells.every(c=>c.amount>=0&&c.amount<=RULES.cellCapacity));assert.equal(sum(s.jar)+s.cells.reduce((a,c)=>a+c.amount,0)+s.metrics.eaten+s.metrics.boostSpent+s.metrics.quotaPaid,23+s.metrics.made);assert.equal(sum(s.pollen)+s.metrics.made,12+s.metrics.gathered);};
{const s=createRun();assert.equal(collect(s,0),2);assert.equal(collect(s,0),0);invariant(s);assert(!allocate(s,9,1));assert(!allocate(s,1.5,2));assert(allocate(s,4,4));}
{const s=createRun();start(s);tick(s,8);assert(s.metrics.gathered>0);tick(s,4);assert.equal(s.metrics.eaten,2);invariant(s);const before=s.metrics.boostSpent;assert(boost(s));assert(!boost(s));assert.equal(s.metrics.boostSpent,before+8);invariant(s);}
{const s=createRun();start(s);for(let t=0;t<120;t++){s.cells.forEach((_,i)=>collect(s,i));tick(s);invariant(s);}assert.equal(s.status,'won');assert.equal(s.metrics.quotaPaid,80);assert(s.metrics.born>=3);const time=s.time;tick(s,40);assert.equal(s.time,time);}
{const s=createRun();start(s);tick(s,120);assert.equal(s.status,'lost');assert.equal(s.metrics.quotaPaid,0);invariant(s);}
{const a=createRun(9),b=createRun(9);start(a);start(b);setMeadow(a,1);setMeadow(b,1);tick(a,56);tick(b,56);assert.deepEqual(a,b);invariant(a);}
{const s=createRun();s.jar=[0,0];s.cells.forEach(c=>c.amount=0);start(s);tick(s,24);assert(s.metrics.lost>0);}
console.log('PASS: collection, resource conservation, allocation, feeding, boost, win/loss, seeded risk, starvation, terminal run');
