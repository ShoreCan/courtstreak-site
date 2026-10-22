import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {simulate} from './helpers/pound-scenarios.mjs';
import {replayBallLock} from '../scripts/replay-ball-lock.mjs';
function exact(result,fps){
 assert.equal(result.events.length,result.contacts.length);
 result.events.forEach((e,i)=>{
  assert.ok(Math.abs(e.event_timestamp_exact-result.contacts[i])<=(result.jitter?result.durations[i]*.1:0)+1.6/fps,`contact ${i+1} has no matching bounce`);
  assert.ok(e.emittedAt-e.event_timestamp_exact<=Math.max(.5,8/fps)+2/fps,'excessive proposal delay');
 });
}
for(const fps of [10,15,20,24,30])for(const period of [.25,.4,.8,1.6,2])for(const scale of [.5,1,2])for(const phase of [0,.013])for(const jitter of [0,.05]){
 test(`known contacts: ${fps}fps, ${period}s cycle, scale ${scale}, phase ${phase}, noise ${jitter}`,()=>exact(simulate({fps,period,scale,phase,jitter}),fps));
}
for(const fps of [10,15,20,24,30])for(const jitter of [0,.05,.1]){
 test(`held-ball noise creates zero proposals: ${fps}fps, noise ${jitter}`,()=>assert.equal(simulate({fps,jitter,held:true}).counter.count,0));
 test(`pause and restart: ${fps}fps, noise ${jitter}`,()=>exact(simulate({fps,jitter,pause:2}),fps));
 test(`mixed speeds and irregular cadence: ${fps}fps, noise ${jitter}`,()=>exact(simulate({fps,jitter,cadenceJitter:.2,periods:[1.6,.8,.4,.25,.4,.8,1.6,2]}),fps));
}
for(const fps of [10,15,20,24,30])for(const gap of [.05,.15,.3,.6]){
 test(`missing data never adds a bounce: ${fps}fps, ${gap}s gap`,()=>{
  const r=simulate({fps,missing:({t})=>t>=2.3&&t<2.3+gap});
  assert.ok(r.events.length<=r.contacts.length);
  const matched=new Set();for(const e of r.events){const i=r.contacts.findIndex(t=>Math.abs(e.event_timestamp_exact-t)<.22);assert.ok(i>=0,'invented contact');assert.ok(!matched.has(i),'duplicate contact');matched.add(i);}
 });
}
for(const name of ['19-reps','20-reps','21-reps','5-reps','oct22-lock03-slow15','oct22-medium20','oct22-slow17']){
 test(`time-window change preserves every accepted event in ${name}`,()=>{
  const d=JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${name}.json`,import.meta.url)));
  const opts={handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,directionalPeaks:true};
  const a=replayBallLock(d,opts),b=replayBallLock(d,{...opts,timeWindows:true});
  assert.equal(b.roiMismatches,0);assert.deepEqual(b.events,a.events);
 });
}
test('the new slow-motion regression fails under the previous fixed-frame window',()=>{assert.equal(simulate({fps:30,period:1.6,timeWindows:false}).counter.count,0);assert.equal(simulate({fps:30,period:1.6}).counter.count,8);});
