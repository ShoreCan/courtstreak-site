import test from 'node:test';import assert from 'node:assert/strict';
import {trial} from './helpers/low-pound-scenario.mjs';
import {replayProfileCounter} from '../src/lib/ai/recordedProfile.mjs';
for(const fps of [20,24,30])for(const period of [.28,.4,.65])for(const amplitude of [.8,1,1.25])for(const scale of [.6,1,1.7])test(`COUNT 08 low rounds ${fps}fps ${period}s ${amplitude}d scale=${scale}`,()=>{const r=trial({revision:'COUNT 08',fps,period,amplitude,scale});assert.equal(r.v.count,8);r.events.forEach((e,i)=>assert.ok(Math.abs(e.event_timestamp_exact-(i+.5)*period)<=1/fps+.001));});
for(const mode of [{held:true},{held:true,jitter:.12},{airborne:true},{hand:false},{feet:false}])test(`COUNT 08 low negative ${JSON.stringify(mode)}`,()=>assert.equal(trial({revision:'COUNT 08',...mode}).v.count,0));
test('COUNT 08 low contacts retain deadline and configured reproduction',()=>{const r=trial({revision:'COUNT 08',deadline:.95});assert.equal(r.v.count,2);const p=replayProfileCounter(r.evidence);assert.equal(p.accepted,2);assert.equal(p.matchesRecordedAcceptedEvents,true);});
test('a later hand return cannot validate an earlier uncontrolled low cycle',()=>{const r=trial({revision:'COUNT 08',lateReturn:true});assert.equal(r.v.count,7);assert.ok(r.events.every(e=>Math.abs(e.event_timestamp_exact-.2)>.05));});
