import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {replayBallLock} from '../scripts/replay-ball-lock.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${name}.json`,import.meta.url)));
const base={handContinuity:true,objectBackgroundRadius:true};
const candidate={...base,timedContinuity:true,directionalPeaks:true};
const contacts=[1.967,3.1,4.167,5.5,6.667,7.867,9.133,10.433,11.667,12.9,14.233,15.567,17,18.367,19.6];
test('the latest trace reproduces its extra count and missed contact before changing anything',()=>{
 const d=read('oct22-lock03-slow15'),a=replayBallLock(d,base);
 assert.equal(a.selectionMatches,d.frames.length);assert.equal(a.accepted,15);
 assert.ok(a.events.some(e=>Math.abs(e.time-2.052)<1e-8));assert.ok(!a.events.some(e=>e.time>7.6&&e.time<8.2));
});
test('counter correction alone removes the duplicate and exposes the remaining miss',()=>{
 const a=replayBallLock(read('oct22-lock03-slow15'),{...base,directionalPeaks:true});
 assert.equal(a.accepted,14);assert.ok(!a.events.some(e=>Math.abs(e.time-2.052)<1e-8));
});
test('tracking correction alone recovers the miss while retaining the old duplicate',()=>{
 const a=replayBallLock(read('oct22-lock03-slow15'),{...base,timedContinuity:true});
 assert.equal(a.accepted,16);assert.ok(a.events.some(e=>Math.abs(e.time-2.052)<1e-8));assert.ok(a.events.some(e=>Math.abs(e.time-7.894)<1e-8));
});
test('combined candidate matches each of the 15 reviewed video contacts exactly once',()=>{
 const a=replayBallLock(read('oct22-lock03-slow15'),candidate);
 assert.equal(a.accepted,15);assert.equal(a.roiMismatches,0);assert.ok(a.restoredFrames.includes(471));
 assert.ok(a.events.some(e=>Math.abs(e.time-7.894)<1e-8));assert.ok(!a.events.some(e=>Math.abs(e.time-2.052)<1e-8));
 a.events.forEach((e,i)=>assert.ok(Math.abs(e.time-contacts[i])<.22,`Contact ${i+1} mismatch`));
});
for(const [name,count]of [['oct22-slow17',17],['oct22-medium20',20],['21-reps',20],['20-reps',20],['19-reps',20],['5-reps',11]]){
 test(`${name} retains its LOCK 03 count, with bounded shifts rather than new events`,()=>{
  const d=read(name),a=replayBallLock(d,base),b=replayBallLock(d,candidate);assert.equal(a.accepted,count);assert.equal(b.accepted,count);assert.equal(b.roiMismatches,0);
  a.events.forEach((e,i)=>assert.ok(Math.abs(e.time-b.events[i].time)<.22));
 });
}
