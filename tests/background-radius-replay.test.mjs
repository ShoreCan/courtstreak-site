import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {replayBallLock} from '../scripts/replay-ball-lock.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL(`./fixtures/ball-lock/${name}.json`,import.meta.url)));
const run=(d,enabled)=>replayBallLock(d,{handContinuity:true,objectBackgroundRadius:enabled});
// Approximate visually checked contact windows in the saved video, not exact
// exposure timestamps. The older compressed export has less precise alignment.
const contacts={
 'oct22-slow17':[1.967,3.1,3.933,4.967,6.067,7.167,8.133,9.2,10.3,11.333,12.467,13.6,14.7,15.8,16.833,17.733,18.767],
 'oct22-medium20':[1.933,2.5,3.1,3.667,4.267,4.9,5.367,6.033,6.6,7.167,7.7,8.3,8.833,9.467,10.033,10.6,11.167,11.7,12.333,12.9],
 '5-reps':[2.167,2.533,3,3.267,3.667,4.133,4.4,4.8,5.233,5.533,5.967,6.3,6.7,7.1,7.533,7.833,8.333,8.667,8.933,9.433]
};
function uniqueContacts(events,times){
 const used=new Set();for(const e of events){let index=-1,best=Infinity;times.forEach((t,i)=>{const delta=Math.abs(t-e.time);if(!used.has(i)&&delta<best){best=delta;index=i;}});assert.ok(best<=.22,`Unmatched event at ${e.time}`);used.add(index);}return used;
}
test('the live slow trace reproduces 14, then recovers all 17 reviewed bounces',()=>{
 const d=read('oct22-slow17'),a=run(d,false),b=run(d,true);
 assert.equal(a.selectionMatches,d.frames.length);assert.equal(a.accepted,14);assert.equal(b.accepted,17);
 assert.equal(uniqueContacts(b.events,contacts['oct22-slow17']).size,17);assert.equal(b.roiMismatches,0);
 for(const t of [6.04,16.866,18.805])assert.ok(b.events.some(e=>Math.abs(e.time-t)<1e-8));
});
test('the live medium trace stays at 20 with one event per reviewed bounce',()=>{
 const d=read('oct22-medium20'),a=run(d,false),b=run(d,true);
 assert.equal(a.selectionMatches,d.frames.length);assert.equal(a.accepted,20);assert.equal(b.accepted,20);
 assert.equal(uniqueContacts(b.events,contacts['oct22-medium20']).size,20);assert.equal(b.roiMismatches,0);
});
for(const name of ['21-reps','20-reps','19-reps'])test(`${name} retains its complete LOCK 02 accepted event sequence`,()=>{
 const d=read(name),a=run(d,false),b=run(d,true);assert.deepEqual(b.events,a.events);assert.equal(b.roiMismatches,0);
});
test('the older partial fast trace gains real-bounce matches without duplicate video contacts',()=>{
 const d=read('5-reps'),a=run(d,false),b=run(d,true);assert.equal(a.accepted,4);assert.equal(b.accepted,11);
 assert.equal(uniqueContacts(b.events,contacts['5-reps']).size,11);assert.equal(b.roiMismatches,0);
 // The original display of five includes an event absent from its saved log.
 assert.equal(d.displayedCount,5);assert.equal(d.countedReps.length,4);
});
