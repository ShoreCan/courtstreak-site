import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {replayBallLock} from '../scripts/replay-ball-lock.mjs';
const traces=['21-reps','20-reps','19-reps','5-reps'];
for(const name of traces)test(`cached ${name} trace retains all baseline selections and crop decisions`,()=>{
 const d=JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${name}.json`,import.meta.url)));
 const a=replayBallLock(d),b=replayBallLock(d,{handContinuity:true});
 assert.equal(a.selectionMatches,d.frames.length);
 assert.equal(a.roiMismatches,0);assert.equal(b.roiMismatches,0);
 assert.deepEqual(b.lostFrames,[]);
 if(name==='21-reps'){
  assert.equal(a.accepted,21);assert.equal(b.accepted,20);
  assert.equal(b.selectedFrames-a.selectedFrames,24);
  assert.deepEqual(b.events,a.events.filter(e=>Math.abs(e.time-6.84)>1e-8));
  assert.equal(b.events.length,d.countedReps.length-1);
 }else{assert.deepEqual(b.events,a.events);assert.equal(b.selectionMatches,d.frames.length);}
});
test('a log with discarded inputs cannot report an exact replay',()=>{
 assert.throws(()=>replayBallLock({droppedFrameRecords:1}),/discarded/);
});
