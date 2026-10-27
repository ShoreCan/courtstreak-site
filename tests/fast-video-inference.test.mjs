import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BallIdentityTracker,createPoundCounter,createPoundValidator,geometry} from '../src/lib/ai/poundCore.mjs';
import {CURRENT_POUND_CONFIGURATION} from '../src/lib/ai/trackerConfiguration.mjs';
const d=JSON.parse(fs.readFileSync(new URL('./fixtures/fresh-inference/oct26-fast-partial.json',import.meta.url)));
function replay(enabled){
 const tracker=Object.assign(new BallIdentityTracker(),structuredClone(d.initial.tracker),{regularFloorContinuity:enabled,diagnostics:true});
 const counter=Object.assign(createPoundCounter('COUNT 08'),structuredClone(d.initial.counter));
 const validator=Object.assign(createPoundValidator('COUNT 08'),structuredClone(d.initial.validator));
 const changed=[];
 for(const f of d.frames){
  assert.deepEqual(tracker.roi(...d.source.frameSize),f.roi,'the candidate must not require a different detector crop');
  const b=tracker.select(f.balls,d.poses[f.pose],'drill',...d.source.frameSize,f.time);
  if(JSON.stringify(b)!==JSON.stringify(f.selected))changed.push({time:f.time,before:f.selected,after:b});
  const g=b?geometry(b):null,m=g?[...g.center,g.diameter]:null;
  validator.update(counter.update(f.time,m?m.slice(1):null,d.source.frameSize[1]),m,d.poses[f.pose],f.time,20).forEach(e=>counter.rememberControlledFloor(e));
 }
 return{count:validator.count,events:validator.confirmed.map(e=>e.event_timestamp_exact),changed};
}
test('fresh inference at the live proposal threshold reproduces the fast clip baseline without changing saved selections',()=>{
 const r=replay(false);assert.equal(r.count,d.expected.baseline);assert.deepEqual(r.changed,[]);assert.equal(d.source.minimumBallScore,.0001);
});
test('the current tracker retains the one observed floor ball and accepts 37 cycles with the same counter, poses and crops',()=>{
 assert.equal(CURRENT_POUND_CONFIGURATION.identityOptions.regularFloorContinuity,true);
 const a=replay(false),b=replay(true);assert.equal(b.count,d.expected.candidate);assert.equal(b.changed.length,1);
 assert.equal(b.changed[0].time,d.expected.changedAt);assert.ok(b.changed[0].before.score<.008);
 assert.ok(b.changed[0].after.score>.96);
 assert.ok(b.events.includes(d.expected.changedAt));assert.ok(a.events.every(time=>b.events.includes(time)));
 assert.equal(b.count,d.expected.visualCompletedCycles);
});
