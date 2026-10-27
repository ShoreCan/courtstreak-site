import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {ReadinessClock,cameraReadiness} from '../src/lib/ai/cameraReadiness.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/camera-readiness/check05-30-reps.json',import.meta.url)));
function replay(current){const resets=[];
 for(const attempt of fixture.rounds){const clock=new ReadinessClock();clock.reset(attempt.startedAt);let previous=0;
  for(const row of attempt.rows){const checks={...row.checks,...(!current?{refreshingBody:false}:{})};
   const c=cameraReadiness(checks,row.speedReady,true),r=clock.update(row.time,c.valid,c);
   if(r.reset)resets.push(row.frameId);
   if(current&&!c.valid){assert.equal(r.ready,false);assert.equal(r.elapsed,previous,'invalid observations must not advance the countdown');}
   previous=r.elapsed;
  }
 }
 return resets;
}
test('the supplied 30-rep round reproduces both recorded countdown resets under the previous grace policy',()=>{assert.deepEqual(replay(false),[495,685]);});
test('queued body refreshes retain countdown progress across the same two detector-only interruptions',()=>{assert.deepEqual(replay(true),[]);});
test('queued body data pauses before Go until a fresh valid check arrives',()=>{
 const clock=new ReadinessClock();clock.reset(0);for(let i=1;i<=49;i++)clock.update(i/10,true);
 const c=cameraReadiness({refreshingBody:true,valid:true,message:'Refreshing body tracking'},true,true);
 assert.equal(c.valid,false);
 for(let i=50;i<=59;i++){const r=clock.update(i/10,c.valid,c);assert.equal(r.ready,false);assert.equal(r.reset,false);assert.ok(r.elapsed<5);}
 const r=clock.update(6,true);assert.ok(r.elapsed<5);assert.ok(clock.update(6.2,true).elapsed>=5);
});
test('a long body interruption, observed framing loss or inadequate throughput retains the shorter safety checks',()=>{
 const c=cameraReadiness({refreshingBody:true,valid:false},true,true),clock=new ReadinessClock();clock.reset(0);
 for(let i=1;i<=14;i++)assert.equal(clock.update(i/10,false,c).reset,false);
 assert.equal(clock.update(1.6,false,c).reset,true);
 for(const condition of[cameraReadiness({valid:false,body:false},true,true),cameraReadiness({valid:false,refreshingBody:true},false,true)]){
  clock.reset(0);clock.update(.1,false,condition);assert.equal(clock.update(.7,false,condition).reset,true);
 }
 clock.reset(0);assert.equal(clock.update(.8,false,c).reset,true,'no observed camera frames retains the original gap limit');
});
