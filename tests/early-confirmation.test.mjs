import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {simulate} from './helpers/pound-scenarios.mjs';
import {replayBallLock} from '../scripts/replay-ball-lock.mjs';
for(const fps of [10,15,20,24,30])for(const period of [.25,.4,.8,1.6,2])for(const scale of [.5,1,2])for(const phase of [0,.013])for(const jitter of [0,.05]){
 test(`early returns preserve known contacts: ${fps}fps ${period}s scale ${scale} phase ${phase} noise ${jitter}`,()=>{
  const opts={fps,period,scale,phase,jitter},a=simulate(opts),b=simulate({...opts,earlyConfirmation:true});
  assert.equal(b.events.length,8);assert.deepEqual(b.events.map(e=>e.event_timestamp_exact),a.events.map(e=>e.event_timestamp_exact));
  b.events.forEach((e,i)=>assert.ok(e.emittedAt<=a.events[i].emittedAt+1e-9));
 });
}
for(const fps of [10,15,20,24,30])for(const jitter of [0,.05,.1]){
 test(`early hold/restart/mixed cadence safeguards: ${fps}fps noise ${jitter}`,()=>{
  assert.equal(simulate({fps,jitter,held:true,earlyConfirmation:true}).counter.count,0);
  for(const extra of [{pause:2},{cadenceJitter:.2,periods:[1.6,.8,.4,.25,.4,.8,1.6,2]}]){
   const a=simulate({fps,jitter,...extra}),b=simulate({fps,jitter,...extra,earlyConfirmation:true});
   assert.deepEqual(b.events.map(e=>e.event_timestamp_exact),a.events.map(e=>e.event_timestamp_exact));
  }
 });
}
for(const fps of [10,15,20,24,30])for(const gap of [.05,.15,.3,.6]){
 test(`early confirmation cannot invent missing-data contacts: ${fps}fps gap ${gap}`,()=>{
  const b=simulate({fps,earlyConfirmation:true,missing:({t})=>t>=2.3&&t<2.3+gap});
  assert.ok(b.events.length<=b.contacts.length);const seen=new Set();
  for(const e of b.events){const i=b.contacts.findIndex(t=>Math.abs(e.event_timestamp_exact-t)<.22);assert.ok(i>=0);assert.ok(!seen.has(i));seen.add(i);}
 });
}
const opts={handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,strongContinuity:true,directionalPeaks:true,timeWindows:true};
for(const name of ['19-reps','20-reps','21-reps','5-reps','oct22-count05-fast25','oct22-lock03-slow15','oct22-medium20','oct22-slow17']){
 test(`early confirmation retains every accepted event and path in ${name}`,()=>{
  const d=JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${name}.json`,import.meta.url))),a=replayBallLock(d,opts),b=replayBallLock(d,{...opts,earlyConfirmation:true});
  assert.deepEqual(b.events,a.events);assert.equal(b.roiMismatches,0);
  assert.ok(b.confirmationDelayMs.median<=a.confirmationDelayMs.median+1e-8);
  if(name==='oct22-count05-fast25'){assert.equal(b.accepted,25);assert.ok(a.confirmationDelayMs.median-b.confirmationDelayMs.median>90);}
 });
}
