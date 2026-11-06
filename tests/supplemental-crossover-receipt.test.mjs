import test from 'node:test';import assert from 'node:assert/strict';
import {createCrossoverCounter} from '../src/lib/ai/crossoverCounter.mjs';
import {trial,person} from './helpers/crossover-scenarios.mjs';
const run=(frames,revision)=>{const c=createCrossoverCounter(revision);for(const f of frames)c.update([],f.measurement,f.person,f.time,20);return c;};
test('supplemental receipt preserves complete primary hand-to-floor-to-hand events',()=>{
 const frames=trial({reps:8}).frames,a=run(frames,'CROSS 11'),b=run(frames,'CROSS 12');
 assert.equal(b.count,a.count);assert.deepEqual(b.confirmed.map(e=>[e.floor_contact_time_seconds,e.from_hand,e.to_hand]),a.confirmed.map(e=>[e.floor_contact_time_seconds,e.from_hand,e.to_hand]));
});
for(const options of [{noBounce:true},{sameHand:true},{noBounce:true,missing:({phase})=>phase>.3&&phase<.7}])
 test(`supplemental receipt cannot turn an invalid transfer into a rep ${JSON.stringify(options)}`,()=>assert.equal(run(trial(options).frames,'CROSS 12').count,0));
test('supplemental receipt retains the original primary state after a missing-observation rejection',()=>{
 const frames=trial({reps:6,period:.8,missing:({rep,phase})=>rep===1&&phase>.6&&phase<.98}).frames;
 const a=run(frames,'CROSS 11'),b=run(frames,'CROSS 12');
 for(const e of a.confirmed)assert.ok(b.confirmed.some(x=>x.floor_contact_time_seconds===e.floor_contact_time_seconds&&x.from_hand===e.from_hand));
 assert.deepEqual(b.primary.snapshot(),a.snapshot());
});
const observedFloorGap=(receiptAt=.46)=>[
 [-.2,[840,350,60]],[-.1,[840,350,60]],[0,[800,420,60]],
 [.1,[620,630,60]],[.16,[560,580,60]],[.24,null],[.35,null],[.42,null],
 [receiptAt,[440,350,60]],[receiptAt+.06,[440,350,60]],
].map(([time,measurement])=>({time,measurement,person:person()}));
test('a 300ms post-floor observation gap can finish with two observed opposite-hand control samples',()=>{
 const frames=observedFloorGap(),baseline=run(frames,'CROSS 11'),candidate=run(frames,'CROSS 12');
 assert.equal(baseline.count,0);assert.equal(candidate.count,1);
 assert.equal(candidate.confirmed[0].floor_contact_time_seconds,.1);
 assert.equal(candidate.confirmed[0].control_evidence,'observed_hand_control');
 assert.deepEqual(candidate.confirmed[0].evidence_sources,['observed_floor_gap_receipt']);
});
test('a receipt outside the bounded gap cannot reuse an older floor contact',()=>assert.equal(run(observedFloorGap(.56),'CROSS 12').count,0));
