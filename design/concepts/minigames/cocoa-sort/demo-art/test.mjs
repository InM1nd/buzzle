import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,pour} from './engine.mjs';
const {levels}=JSON.parse(readFileSync(new URL('../levels-reference.json',import.meta.url)));
for(const l of levels){const g=createGame(l);for(const m of l.solution){const r=g.move(m.from,m.to);assert.ok(r);assert.equal(r.count,m.units);}assert.ok(g.snapshot().won);assert.ok(g.undo());assert.equal(g.snapshot().won,false);g.reset();assert.ok(g.add());assert.equal(g.add(),false);assert.equal(g.snapshot().cups.length,l.initialBottomToTop.length+1);}
const cups=[[0,1,1,1],[1,1,1],[],[2,2,2,2]];assert.equal(pour(cups,0,1).count,1);assert.deepEqual(cups[0],[0,1,1,1]);assert.equal(pour(cups,0,3),null);assert.equal(pour(cups,3,2),null);assert.equal(pour(cups,0,0),null);
const g=createGame(levels[0]);for(const m of levels[0].solution.slice(0,4))g.move(m.from,m.to);for(let i=0;i<3;i++)assert.ok(g.undo());assert.equal(g.undo(),false);console.log('PASS: two levels, capacity, maximal run, invalid moves, undo limit, extra cup, reset');
