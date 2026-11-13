import test from 'node:test';
import assert from 'node:assert/strict';
import {CountdownReadinessClock} from '../src/lib/ai/countdownReadiness.mjs';
import {DrillStartEvidence} from '../src/lib/ai/liveTrackingBudget.mjs';
import {evaluateVisibleSetup} from '../src/lib/ai/visibleSetup.mjs';
import {flightPoseDecision,repairObservationPolicy} from '../src/lib/ai/repairPolicy.mjs';
import {ball,person} from './helpers/crossover-scenarios.mjs';

const checks={valid:true,body:true,hand:true,floor:true,ball:true,owned:true};
test('counting readiness needs both wrists and floor references for either drill',()=>{
 for(const handMode of ['either','right']){
  const p=person();
  const evaluate=()=>evaluateVisibleSetup(p,ball(840,350),1280,720,{handMode,completeLandmarks:true});
  assert.equal(evaluate().valid,true);
  p.confidence[9]=.3;
  assert.equal(evaluate().hand,false);
  p.confidence[9]=.9;p.xy[15][1]=720;
  assert.equal(evaluate().floor,false);
 }
});
test('the start gate rejects slow or stale observations and recovers on a healthy window',()=>{
 const e=new DrillStartEvidence(),seen=(t,poseAt=t,completedAt=t+.03)=>e.observe(t,{checks,poseAt,completedAt});
 for(let i=0;i<=15;i++)assert.equal(seen(i*.075).ready,false);
 for(let i=1;i<=30;i++)seen(1.125+i*.04,1.125+Math.floor(i/2)*.08);
 assert.equal(seen(2.365).ready,true);
 assert.equal(seen(2.405,2.4,2.56).reason,'latency');
 const stale=new DrillStartEvidence();
 for(let i=0;i<40;i++)assert.equal(stale.observe(i*.04,{checks,poseAt:0,completedAt:i*.04+.02}).ready,false);
});
test('the five-second countdown holds at one until the tracking check passes',()=>{
 const clock=new CountdownReadinessClock({trackingCheck:true,bridgeBallDropouts:true});
 clock.reset(0);
 for(let i=0;i<=120;i++)clock.update(i/20,checks,true,true,false);
 const held=clock.update(6.05,checks,true,true,false);
 assert.equal(held.countdownElapsed,4.999);
 assert.equal(held.ready,false);
 assert.equal(clock.update(6.1,checks,true,true,true).ready,true);
});
test('a missing wrist gets an early refresh even during a brief ball dropout',()=>{
 const p=person();p.confidence[9]=0;
 const input={person:p,poseAt:1,lastRequestedAt:1,now:1.10,ball:null,ballAt:1.09,phase:'active',drillKey:'stationary-crossover'};
 assert.equal(flightPoseDecision({...input,policy:repairObservationPolicy(input.drillKey,'TRACKING REPAIR 09')}),null);
 assert.equal(flightPoseDecision({...input,policy:repairObservationPolicy(input.drillKey)}),'refresh_wrists');
 assert.equal(flightPoseDecision({...input,now:1.04,policy:repairObservationPolicy(input.drillKey)}),null);
});
test('the live schedule protects a floor turn and resumes routine pose after a sustained gap',()=>{
 const policy=repairObservationPolicy('stationary-crossover');
 const input={person:person(),poseAt:1,lastRequestedAt:1,now:1.23,ball:ball(640,620),ballAt:1.22,
  previousBall:{ball:ball(700,550),at:1.18},phase:'active',drillKey:'stationary-crossover',policy};
 assert.equal(flightPoseDecision(input),'protect_floor');
 assert.equal(flightPoseDecision({...input,now:1.26}),'routine');
});
