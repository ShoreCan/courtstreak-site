import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createPoundCounter,createPoundValidator,geometry} from '../src/lib/ai/poundCore.mjs';
import {createPoundTrackingState,resetPoundTrackingCounter} from '../src/lib/ai/poundTrackingState.mjs';
import {replayProfileCounter} from '../src/lib/ai/recordedProfile.mjs';
import {replayBallLock} from '../scripts/replay-ball-lock.mjs';

import {trial} from './helpers/low-pound-scenario.mjs';

test('COUNT 06 misses eight controlled low pounds that COUNT 07 validates without a high-bounce warmup',()=>{
 assert.equal(trial({revision:'COUNT 06'}).v.count,0);const r=trial();assert.equal(r.v.count,8);assert.ok(r.events.every(e=>e.validation_path==='controlled_low_pound'));assert.equal(r.events[0].floor_reference,null);
});
for(const fps of [20,24,30])for(const period of [.28,.4,.65])for(const amplitude of [.8,1,1.25])for(const scale of [.6,1,1.7]){
 test(`eight controlled low pounds: ${fps}fps, ${period}s, ${amplitude} ball diameters, scale ${scale}`,()=>{
  const r=trial({fps,period,amplitude,scale});assert.equal(r.v.count,8);r.events.forEach((e,i)=>assert.ok(Math.abs(e.event_timestamp_exact-(i+.5)*period)<=1/fps+.001));
 });
}
for(const phase of [0,.013,.026])for(const crouched of [true,false])test(`low pounds count with crouched=${crouched}, phase=${phase}`,()=>assert.equal(trial({phase,crouched}).v.count,8));
test('a held ball adds no counts',()=>assert.equal(trial({held:true}).v.count,0));
test('small held-ball detector jitter adds no counts',()=>assert.equal(trial({held:true,jitter:.12}).v.count,0));
test('shallow airborne movement below the knees still fails floor-region evidence',()=>assert.equal(trial({airborne:true}).v.count,0));
test('a low pound returning only to the other hand is not a right-hand rep',()=>assert.equal(trial({hand:false}).v.count,0));
test('uncertain feet cannot bootstrap low floor contacts without established floor evidence',()=>assert.equal(trial({feet:false}).v.count,0));
test('missing floor detections cannot supply the fully observed low-turn proof',()=>assert.equal(trial({missing:true}).events.filter(e=>e.validation_path==='controlled_low_pound').length,0));
test('regaining the hand on a later bounce does not validate an earlier uncontrolled return',()=>{const r=trial({lateReturn:true});assert.equal(r.v.count,7);assert.ok(r.events.every(e=>Math.abs(e.event_timestamp_exact-.2)>.05));});
test('low contacts after the deadline are excluded',()=>{const r=trial({deadline:.95});assert.equal(r.v.count,2);assert.ok(r.events.every(e=>e.event_timestamp_exact<1));});
test('saved COUNT 07 inputs use the same low counter and validator as live',()=>{
 const r=trial(),replay=replayProfileCounter(r.evidence);assert.equal(replay.available,true);assert.equal(replay.accepted,8);assert.equal(replay.matchesRecordedAcceptedEvents,true);
});
test('live initialization and countdown reset share the revision-aware control factory',()=>{
 const source=fs.readFileSync(new URL('../src/components/ai/IPhonePoundTest.jsx',import.meta.url),'utf8');assert.match(source,/resetSessionTrackingCounter\(s\)/);
 const state=createPoundTrackingState();assert.equal(state.validator.lowControlledPounds,true);state.validator.count=5;resetPoundTrackingCounter(state);assert.equal(state.validator.lowControlledPounds,true);assert.equal(state.validator.count,0);
});
const opts={handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,strongContinuity:true,corroboratedContinuity:true,floorContinuity:true,turnContinuity:true,directionalPeaks:true,timeWindows:true,earlyConfirmation:true};
for(const name of ['19-reps','20-reps','21-reps','5-reps','oct22-count05-fast25','oct22-lock03-slow15','oct22-medium20','oct22-slow17','oct24-lock06-fast15','oct24-lock06-slow15-pass','oct24-lock06-normal15-pass','oct24-lock07-fast35'])test(`COUNT 07 preserves accepted contacts in saved ${name}`,()=>{
 const d=JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${name}.json`,import.meta.url))),a=replayBallLock(d,opts),b=replayBallLock(d,{...opts,lowControlledPounds:true});assert.deepEqual(b.events,a.events);
});
