import test from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import{createPoundCounter,createPoundValidator}from'../src/lib/ai/poundCore.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/observation-gap/moderate-pose-gap.json',import.meta.url)));
function replay(extra=false){let counter=createPoundCounter('COUNT 08'),validator=createPoundValidator('COUNT 08'),added=false,last=-Infinity;
 const step=(time,measurement,person)=>{assert.ok(time>last,`observations must be chronological: ${time} after ${last}`);last=time;const p=counter.update(time,measurement?measurement.slice(1):null,fixture.height);validator.update(p,measurement,person,time,20).forEach(e=>counter.rememberControlledFloor(e));};
 for(const row of fixture.rows){if(row.reset){counter=createPoundCounter('COUNT 08');validator=createPoundValidator('COUNT 08');last=-Infinity;}
  if(extra&&!added&&row.time>4.11){for(const f of fixture.additional)step(f.time,f.measurement,fixture.poses[fixture.additionalPose]);added=true;}
  step(row.time,row.measurement,fixture.poses[row.pose]);
 }
 return validator;
}
test('the retained counter inputs reproduce the 19-rep result and its rejected incomplete bounce path',()=>{const r=replay();assert.equal(r.count,19);assert.equal(r.rejected.length,1);assert.equal(r.rejected[0].control_status,'rejected_above_knee');});
test('actual ball-model observations inside the blind gap recover the seventh bounce with unchanged floor and control rules',()=>{
 const a=replay(),b=replay(true);assert.equal(b.count,20);assert.equal(b.rejected.length,0);
 const times=b.confirmed.map(x=>x.event_timestamp_exact);for(const e of a.confirmed)assert.ok(times.some(t=>Math.abs(t-e.event_timestamp_exact)<1e-8));
 assert.equal(b.confirmed[6].validation_path,'clean_full_pound');assert.ok(b.confirmed[6].bottom_center_y>1800);
});
