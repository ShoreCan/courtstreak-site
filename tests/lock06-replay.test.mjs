import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {replayRetainedRound} from './helpers/replay-retained-round.mjs';
import {replayBallLock} from '../scripts/replay-ball-lock.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${n}.json`,import.meta.url)));
const evidence=read('oct24-count06-slow15');
test('retained setup reproduces all recorded active selections and the original 13-count result',()=>{
 const a=replayRetainedRound(evidence);
 assert.equal(a.activeFrames,426);assert.equal(a.activeMatches,a.activeFrames);assert.equal(a.accepted,13);assert.equal(a.proposed,14);
 assert.deepEqual(a.events.map(e=>e.event_timestamp_exact),evidence.countedReps.map(e=>e.time));
 assert.equal(a.exactIdentityReplay,false);assert.equal(a.droppedSetupFrames,146);
});
test('LOCK 06 recovers the first and sixth video-reviewed contacts exactly once',()=>{
 const a=replayRetainedRound(evidence),b=replayRetainedRound(evidence,true);
 const contacts=[1.90,2.99,4.12,5.23,6.40,7.56,8.76,9.90,11.23,12.43,13.60,14.71,15.89,17.07,18.23];
 assert.equal(b.accepted,15);assert.equal(b.proposed,15);
 b.events.forEach((e,i)=>assert.ok(Math.abs(e.event_timestamp_exact-contacts[i])<.22,`Contact ${i+1}`));
 const extra=b.events.filter(e=>!a.events.some(old=>old.event_timestamp_exact===e.event_timestamp_exact));
 assert.deepEqual(extra.map(e=>e.event_timestamp_exact),[1.9199999999999875,7.5660000000000025]);
 assert.deepEqual(b.changes,[2152,2153,2154,2259]);
});
const baseline={handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,strongContinuity:true,directionalPeaks:true,timeWindows:true,earlyConfirmation:true};
for(const name of ['19-reps','20-reps','21-reps','5-reps','oct22-count05-fast25','oct22-lock03-slow15','oct22-medium20','oct22-slow17']){
 test(`LOCK 06 preserves every prior accepted event in ${name}`,()=>{
  const d=read(name),a=replayBallLock(d,baseline),b=replayBallLock(d,{...baseline,corroboratedContinuity:true});
  assert.deepEqual(b.events,a.events);assert.equal(b.roiMismatches,0);
 });
}
