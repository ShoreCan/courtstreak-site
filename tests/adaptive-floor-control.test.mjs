import test from 'node:test';
import assert from 'node:assert/strict';
import {createPoundCounter,createPoundValidator} from '../src/lib/ai/poundCore.mjs';
import {shiftPreGoTimeline} from '../src/lib/ai/setupGuidance.mjs';

import {scenario} from './helpers/adaptive-pound-scenario.mjs';

for(const fps of [15,20,30])for(const travel of [16,24,32,48])test(`eight low floor contacts at ${fps}Hz and ${travel}px travel`,()=>{
 assert.equal(scenario({fps,travel}).count,8);
});
test('adaptive low-motion path removes the old 0.6-diameter requirement',()=>{
 assert.equal(scenario({revision:'COUNT 08',travel:32}).count,0);
 assert.equal(scenario({travel:32}).count,8);
});
for(const options of [{held:true},{held:true,jitter:9.6},{airborne:true},{wrongHand:true},{ambiguous:true}])
 test(`low-motion false-count control ${JSON.stringify(options)}`,()=>assert.equal(scenario(options).count,0));
test('verified right-hand floor cycles can finish outside the torso region',()=>assert.equal(scenario({outside:true}).count,8));
for(const fps of [15,30])test(`new detector jitter after six real contacts does not invent floor contacts at ${fps}Hz`,()=>assert.equal(scenario({fps,stopAfter:6,lateJitter:true}).count,6));
test('expired low proposals identify missing proof instead of accusing a mishandle',()=>{
 const r=scenario({airborne:true});assert.ok(r.rejected.length>0);
 assert.ok(r.rejected.every(e=>e.control_status==='unverified_rep'&&e.failed_checks.includes('unverified_floor')));
});
for(const fps of [15,20,30])for(const countdownMotion of ['reposition','warmup'])test(`countdown ${countdownMotion} clears after settling at ${fps}Hz`,()=>{
 const repaired=scenario({fps,countdownMotion});
 assert.equal(repaired.count,8);
 assert.equal(repaired.minimumMotion,3);
 assert.ok(repaired.noiseCalibration.samples>=5);
 assert.ok(repaired.noiseCalibration.end-repaired.noiseCalibration.start<=.5);
});
test('first repair demonstrates the countdown-motion rejection at phone cadence',()=>{
 const options={fps:15,countdownMotion:'reposition'};
 assert.equal(scenario({...options,revision:'COUNT 09'}).count,0);
 assert.equal(scenario(options).count,8);
});
for(const fps of [15,30])test(`recent stationary detector noise remains measured at ${fps}Hz`,()=>{
 const result=scenario({fps,held:true,jitter:9.6,countdownJitter:9.6});
 assert.equal(result.count,0);assert.ok(result.minimumMotion>16);
});
test('countdown pauses shift noise evidence with the observations and exclude old positions',()=>{
 const counter=createPoundCounter('COUNT 10'),state={counter,validator:{context:[]}};
 for(let i=-30;i<0;i++)counter.update(i/30,[400,80],720);
 shiftPreGoTimeline(state,.8);
 assert.ok(counter.noiseCalibration.end<-.8);
 for(let i=-18;i<0;i++)counter.update(i/30,[568,80],720);
 assert.equal(counter.minimumObservedMotion,3);
 assert.ok(counter.noiseCalibration.end-counter.noiseCalibration.start<=.5);
 const calibrated=structuredClone(counter.noiseCalibration);
 for(let i=0;i<8;i++)counter.update(i/30,[600+(i%2)*100,80],720);
 assert.deepEqual(counter.noiseCalibration,calibrated);
 assert.equal(counter.minimumObservedMotion,3);
});
for(const fps of [15,20,30])for(const period of [.2,.28,.65])for(const travel of [16,32,64])test(`low contacts after warmup at ${fps}Hz, ${period}s cycles, ${travel}px travel`,()=>{
 assert.equal(scenario({fps,period,travel,countdownMotion:'warmup'}).count,8);
});
for(const fps of [15,20,30])for(const travel of [128,160,200])test(`full-motion floor evidence at ${fps}Hz and ${travel}px travel`,()=>{
 assert.equal(scenario({fps,travel}).count,8);
 const airborne=scenario({fps,travel,airborne:true});
 assert.equal(airborne.count,0);
 assert.ok(airborne.rejected.every(e=>e.failed_checks.includes('unverified_floor')));
});
test('large airborne motions demonstrate the missing full-pound floor gate in the first repair',()=>{
 assert.equal(scenario({revision:'COUNT 09',travel:160,airborne:true}).count,8);
 assert.equal(scenario({travel:160,airborne:true}).count,0);
});
