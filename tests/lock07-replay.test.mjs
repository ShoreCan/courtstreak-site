import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {replayBallLock} from '../scripts/replay-ball-lock.mjs';
import {BALL_IDENTITY_REVISION,EXPERIMENTAL_COUNTER_REVISION} from '../src/lib/ai/poundCore.mjs';
import {createPoundTrackingState} from '../src/lib/ai/poundTrackingState.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${name}.json`,import.meta.url)));
const options={handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,strongContinuity:true,corroboratedContinuity:true,directionalPeaks:true,timeWindows:true,earlyConfirmation:true};
const fast=read('oct24-lock06-fast15');
test('complete LOCK 06 input replay reproduces the four saved accepts and all 1,079 selected-ball decisions',()=>{
 const r=replayBallLock(fast,options);
 assert.equal(fast.droppedFrameRecords,0);assert.equal(r.frames,1079);assert.equal(r.selectionMatches,r.frames);assert.equal(r.roiMismatches,0);
 assert.equal(r.proposed,5);assert.equal(r.accepted,4);
 assert.deepEqual(r.events.map(e=>e.time),fast.countedReps.map(e=>e.time));
});
test('LOCK 07 selects the existing first floor detection and recovers all 15 separately reviewed contacts',()=>{
 const r=replayBallLock(fast,{...options,floorContinuity:true});
 const contacts=[2.167,2.533,2.900,3.300,3.700,4.067,4.467,4.867,5.233,5.633,6.033,6.433,6.833,7.233,7.633];
 assert.equal(r.accepted,15);assert.equal(r.proposed,15);assert.equal(r.roiMismatches,0);assert.deepEqual(r.changedFrames,[665,666]);
 r.events.forEach((e,i)=>{assert.ok(Math.abs(e.time-contacts[i])<.12,`distinct contact ${i+1}: ${e.time}`);assert.equal(e.path,'clean_full_pound');});
 for(const e of fast.countedReps)assert.ok(r.events.some(p=>p.time===e.time),'preserve each saved acceptance');
 assert.ok(r.events.every(e=>e.time<8),'no extra count during hold or while placing the ball on the ground');
 assert.ok(fast.frames.find(f=>f.frameId===665).balls.some(c=>c.score>.8),'use an actual detector proposal');
});
for(const name of ['19-reps','20-reps','21-reps','5-reps','oct22-count05-fast25','oct22-lock03-slow15','oct22-medium20','oct22-slow17','oct24-lock06-slow15-pass','oct24-lock06-normal15-pass']){
 test(`LOCK 07 preserves prior event times, paths, selections and crops in ${name}`,()=>{
  const d=read(name),a=replayBallLock(d,options),b=replayBallLock(d,{...options,floorContinuity:true});
  assert.deepEqual(b.events,a.events);assert.equal(b.proposed,a.proposed);assert.deepEqual(b.changedFrames,a.changedFrames);assert.equal(b.roiMismatches,a.roiMismatches);
  if(name.endsWith('pass')){assert.equal(a.accepted,15);assert.equal(a.selectionMatches,a.frames);}
 });
}
test('live experimental initialization and resets enable the tested recovery and identify LOCK 07',()=>{
 const source=fs.readFileSync(new URL('../src/components/ai/IPhonePoundTest.jsx',import.meta.url),'utf8');
 assert.ok(['LOCK 07','LOCK 08','LOCK 09','LOCK 10'].includes(BALL_IDENTITY_REVISION));assert.ok(['COUNT 06','COUNT 07','COUNT 08'].includes(EXPERIMENTAL_COUNTER_REVISION));
 assert.equal(createPoundTrackingState().tracker.floorContinuity,true);assert.match(source,/m\.current=machine\(freshFrames,drillKey\)/);assert.match(source,/\.\.\.machine\(freshFrames,drillKey\)/);
});
for(const mode of ['missing wrist','no controlled return'])test(`floor recovery still rejects reps with ${mode}`,()=>{
 const d=structuredClone(fast);
 for(const f of d.frames){if(!['active','review'].includes(f.inputPhase)||!f.person)continue;
  if(mode==='missing wrist')f.person.confidence[10]=0;
  else f.person.xy[10]=[f.person.xy[10][0]+2000,f.person.xy[10][1]];
 }
 const r=replayBallLock(d,{...options,floorContinuity:true});
 assert.ok(r.proposed>0);assert.equal(r.accepted,0);
});
