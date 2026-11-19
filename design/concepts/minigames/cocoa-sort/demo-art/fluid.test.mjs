import assert from 'node:assert/strict';
import {area,below,surface,removeVolume} from './fluid.mjs';
const p=[[0,0],[100,0],[100,160],[0,160]];
for(const angle of [0,.3,.88,-.88])for(const fraction of [.1,.25,.5,.75,1]){
 const t=surface(p,angle,fraction),actual=area(below(p,Math.sin(angle),Math.cos(angle),t))/area(p);
 assert.ok(Math.abs(actual-fraction)<.0001);
}
for(const progress of [0,.2,.5,.8,1]){
 const remaining=removeVolume([0,1,1],progress*2).reduce((s,l)=>s+l.units,0);
 assert.ok(Math.abs(remaining+progress*2-3)<1e-8);
}
console.log('PASS: area preservation under rotation; continuous transfer conservation');
