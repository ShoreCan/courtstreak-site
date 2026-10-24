import test from 'node:test';import assert from 'node:assert/strict';
import {corroboratedBallContinuation as recover} from '../src/lib/ai/ballTiming.mjs';
const samples=()=>Array.from({length:8},(_,i)=>({at:i*.03,center:[800,1100+i*10],diameter:100}));
const ball=(x=805,y=1600,d=110,score=.45)=>({box:[x-d/2,y-d/2,x+d/2,y+d/2],score});
const pending=()=>recover([ball()],samples(),.51,100,null).pending;
test('one existing ball proposal cannot establish a recovery',()=>assert.equal(recover([ball()],samples(),.51,100,null).index,null));
test('two consistent observed proposals can recover the same descending ball',()=>{
 const r=recover([ball(806,1680,110,.8)],samples(),.54,100,pending());assert.equal(r.index,0);assert.deepEqual(r.velocity,[1,80]);
});
for(const [label,change] of [
 ['ambiguous balls',()=>({candidates:[ball(),ball(790,1590)]})],
 ['small background object',()=>({candidates:[ball(805,1600,38,.9)]})],
 ['large unrelated object',()=>({candidates:[ball(805,1600,200,.9)]})],
 ['distant lateral object',()=>({candidates:[ball(1000,1600)]})],
 ['excessive spatial jump',()=>({candidates:[ball(805,1900)]})],
 ['stationary or held ball',()=>({candidates:[ball(800,1170)]})],
 ['upward transfer',()=>({candidates:[ball(805,1000)]})],
 ['long unobserved interval',()=>({now:.7})],
 ['reversed clock',()=>({now:.1})],
 ['insufficient observed history',()=>({history:samples().slice(-3)})],
 ['held-ball history',()=>({history:samples().map(x=>({...x,center:[800,1170]}))})],
 ['upward history',()=>({history:samples().map((x,i)=>({...x,center:[800,1170-i*10]}))})],
 ['nonfinite clock',()=>({now:NaN})],
 ['nonfinite scale',()=>({scale:Infinity})],
 ['malformed box',()=>({candidates:[{box:[1,2,NaN,4],score:.9}]})],
 ['weak candidate',()=>({candidates:[ball(805,1600,110,.09)]})],
 ])test(`recovery rejects ${label}`,()=>{
  const x=change();const r=recover(x.candidates??[ball()],x.history??samples(),x.now??.51,x.scale??100,null);assert.equal(r,null);
 });
for(const [label,candidate,now,previous] of [
 ['weak corroboration',ball(806,1680,110,.39),.54,pending()],
 ['stale provisional observation',ball(806,1680,110,.8),.64,pending()],
 ['uncertain direction',ball(806,1580,110,.8),.54,pending()],
 ['sudden diameter change',ball(806,1680,85,.8),.54,pending()],
 ['malformed provisional observation',ball(806,1680,110,.8),.54,{at:.51,center:[NaN,1600],diameter:110,score:.8}],
 ])test(`a second proposal cannot confirm with ${label}`,()=>{
  const r=recover([candidate],samples(),now,100,previous);assert.equal(r?.index??null,null);
 });
