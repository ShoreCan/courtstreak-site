import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {replayBallLock} from '../scripts/replay-ball-lock.mjs';
import {BALL_IDENTITY_REVISION,EXPERIMENTAL_COUNTER_REVISION} from '../src/lib/ai/poundCore.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${n}.json`,import.meta.url)));
const options={handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,strongContinuity:true,corroboratedContinuity:true,floorContinuity:true,directionalPeaks:true,timeWindows:true,earlyConfirmation:true};
const fast=read('oct24-lock07-fast35');
// Independently reviewed turns in the counted video. Its export timing differs
// from original camera capture timestamps; adjacent turn midpoints define windows.
const turns=[2.005,2.498,2.898,3.217,3.683,4.152,4.613,5.010,5.398,5.865,6.318,6.695,7.157,7.607,7.980,8.423,8.798,9.317,9.763,10.203,10.715,11.153,11.590,12.030,12.538,12.973,13.408,13.845,14.278,14.780,15.278,15.783,16.238,16.743,17.175];
const window=i=>[i?(turns[i-1]+turns[i])/2:1.5,i<turns.length-1?(turns[i]+turns[i+1])/2:17.6];
const inWindow=(e,i)=>{const [lo,hi]=window(i);return e.time>=lo&&e.time<hi;};
test('LOCK 07 reproduces all 839 recorded selections, 34 proposals and 33 accepted timestamps',()=>{
 const r=replayBallLock(fast,options);assert.equal(fast.droppedFrameRecords,0);assert.equal(r.frames,839);assert.equal(r.selectionMatches,r.frames);assert.equal(r.roiMismatches,0);assert.equal(r.accepted,33);assert.equal(r.proposed,34);assert.deepEqual(r.events.map(e=>e.time),fast.countedReps.map(e=>e.time));
 const empty=turns.map((_,i)=>r.events.filter(e=>inWindow(e,i)).length);assert.deepEqual(empty.map((n,i)=>n===0?i+1:null).filter(Boolean),[14,28]);assert.ok(empty.every(n=>n<=1));
});
test('LOCK 08 accepts one event in each of the 35 independently reviewed turn windows',()=>{
 const a=replayBallLock(fast,options),b=replayBallLock(fast,{...options,turnContinuity:true});
 assert.equal(b.proposed,35);assert.equal(b.accepted,35);assert.equal(b.roiMismatches,0);
 turns.forEach((_,i)=>assert.equal(b.events.filter(e=>inWindow(e,i)).length,1,`turn ${i+1}`));
 assert.ok(Math.abs(b.events[13].time-7.45)<1e-9);assert.ok(Math.abs(b.events[27].time-13.76)<1e-9);
 for(const e of a.events)assert.ok(b.events.some(p=>Math.abs(p.time-e.time)<=.101),'retain every old contact with a bounded timing shift');
 assert.ok(b.events.every(e=>e.time<17.6),'no new count while holding the ball at the end');
});
for(const name of ['19-reps','20-reps','21-reps','5-reps','oct22-count05-fast25','oct22-lock03-slow15','oct22-medium20','oct22-slow17','oct24-lock06-fast15','oct24-lock06-slow15-pass','oct24-lock06-normal15-pass'])test(`LOCK 08 preserves accepted times and paths in ${name}`,()=>{
 const d=read(name),a=replayBallLock(d,options),b=replayBallLock(d,{...options,turnContinuity:true});assert.deepEqual(b.events,a.events);assert.equal(b.proposed,a.proposed);assert.equal(b.roiMismatches,a.roiMismatches);
});
for(const mode of ['missing wrist','no controlled return'])test(`observed turn recovery cannot score with ${mode}`,()=>{
 const d=structuredClone(fast);for(const f of d.frames)if(['active','review'].includes(f.inputPhase)&&f.person){if(mode==='missing wrist')f.person.confidence[10]=0;else f.person.xy[10][0]+=2000;}
 const r=replayBallLock(d,{...options,turnContinuity:true});assert.ok(r.proposed>0);assert.equal(r.accepted,0);
});
test('the live experimental machine and every reset enable the tested LOCK 08 option',()=>{
 const text=fs.readFileSync(new URL('../src/components/ai/IPhonePoundTest.jsx',import.meta.url),'utf8');assert.equal(BALL_IDENTITY_REVISION,'LOCK 08');assert.ok(['COUNT 06','COUNT 07'].includes(EXPERIMENTAL_COUNTER_REVISION));assert.match(text,/turnContinuity:freshFrames/);assert.match(text,/m\.current=machine\(freshFrames\)/);assert.match(text,/\.\.\.machine\(freshFrames\)/);
});
