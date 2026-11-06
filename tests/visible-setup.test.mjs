import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateVisibleSetup} from '../src/lib/ai/visibleSetup.mjs';
import {evaluateCameraSetup,CameraPositionGate} from '../src/lib/ai/cameraSetup.mjs';
import {SetupReadinessClock} from '../src/lib/ai/setupReadiness.mjs';
import {CountdownReadinessClock} from '../src/lib/ai/countdownReadiness.mjs';
import {setupProcessingReadiness} from '../src/lib/ai/liveTrackingBudget.mjs';
import {createSessionTrackingState} from '../src/lib/ai/sessionTracking.mjs';
import {person,ball} from './helpers/crossover-scenarios.mjs';

test('natural framing can start without face detection, two visible ankles or both idle wrists',()=>{
 const p=person(),b=ball(840,350);
 p.confidence[0]=0;p.confidence[15]=0;p.confidence[9]=0;
 assert.equal(evaluateVisibleSetup(p,b,1280,720).valid,true);
 assert.equal(evaluateCameraSetup(p,b,1280,720).valid,false);
 p.confidence[10]=0;
 assert.equal(evaluateVisibleSetup(p,b,1280,720).valid,false);
});
test('crossover setup accepts either held hand while right-pound still acquires its working hand',()=>{
 const p=person();p.confidence[10]=0;
 const left=ball(...p.xy[9],60);
 assert.equal(evaluateVisibleSetup(p,left,1280,720,{handMode:'both'}).valid,true);
 assert.equal(evaluateVisibleSetup(p,left,1280,720).valid,false);
});
test('unseen body, absent ball, clipped ball, no floor clearance and unowned background objects do not start',()=>{
 const b=ball(840,350);
 assert.equal(evaluateVisibleSetup(null,b,1280,720).valid,false);
 assert.equal(evaluateVisibleSetup(person(),null,1280,720).valid,false);
 assert.equal(evaluateVisibleSetup(person(),ball(10,350),1280,720).valid,false);
 assert.equal(evaluateVisibleSetup(person(),ball(640,600),1280,720).valid,false);
 const p=person();p.confidence[15]=p.confidence[16]=0;
 assert.equal(evaluateVisibleSetup(p,b,1280,720).valid,false);
});
test('visible floor and ball no longer need fixed percentage margins',()=>{
 const p=person();p.xy[15][1]=p.xy[16][1]=720*.97;
 assert.equal(evaluateVisibleSetup(p,ball(840,350),1280,720).valid,true);
 p.xy[10]=[60,350];
 assert.equal(evaluateVisibleSetup(p,ball(60,350),1280,720).valid,true);
});
test('both drills progress through calibration, setup and countdown at 12 fps with natural framing',()=>{
 for(const drill of ['right-hand-pound','stationary-crossover']){
  const state=createSessionTrackingState(true,drill,'CROSS 11',false,{enhancedTracking:true});
  const options={handMode:drill==='right-hand-pound'?'right':'both'};
  const clock=new SetupReadinessClock({handMode:drill==='right-hand-pound'?'right':'either'}),gate=new CameraPositionGate();
  const p=person(),b=ball(840,350);p.confidence[0]=0;p.confidence[15]=0;
  const times=[];let countdown=null,go=null;
  for(let i=0;i<12*12;i++){
   const now=i/12;times.push(now);
   const selected=state.tracker.select([b],p,countdown?'countdown':'setup',1280,720,now);
   const checks=evaluateVisibleSetup(p,selected,1280,720,options);
   const speed=setupProcessingReadiness(times,now,now-.06).ready;
   const readiness=(countdown??clock).update(now,checks,speed,state.tracker.ready());
   if(!countdown){
    if(readiness.reset)gate.reset();
    if(readiness.ready&&gate.update(readiness.elapsed,checks,selected,state.tracker,speed)>=1){countdown=new CountdownReadinessClock(clock.options);countdown.reset(now);state.tracker.freezeCalibration();}
   }else if(readiness.ready&&readiness.countdownElapsed===5){go=now;break;}
  }
  assert.ok(go>5&&go<10,`${drill}: Go at ${go}`);
  assert.equal(state.counter.count,0,'starting never fabricates a counted rep');
 }
});
