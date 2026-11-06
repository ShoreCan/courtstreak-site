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
test('both drills reach Go at the 7.9–9.5 fps speeds observed in the screen recording',()=>{
 for(const hz of [7.9,8.6,9.4,9.5,12])for(const drill of ['right-hand-pound','stationary-crossover']){
  const state=createSessionTrackingState(true,drill,'CROSS 11',false,{enhancedTracking:true});
  const options={handMode:drill==='right-hand-pound'?'right':'both'};
  const clock=new SetupReadinessClock({handMode:drill==='right-hand-pound'?'right':'either'}),gate=new CameraPositionGate();
  const p=person(),b=ball(840,350);p.confidence[0]=0;p.confidence[15]=0;
  const times=[];let countdown=null,go=null;
  for(let i=0;i<hz*12;i++){
   const now=i/hz;times.push(now);
   const selected=state.tracker.select([b],p,countdown?'countdown':'setup',1280,720,now);
   const checks=evaluateVisibleSetup(p,selected,1280,720,options);
   const speed=setupProcessingReadiness(times,now,now-.06,{visibilityFirst:true}).ready;
   const readiness=(countdown??clock).update(now,checks,speed,state.tracker.ready());
   if(!countdown){
    if(readiness.reset)gate.reset();
    if(readiness.ready&&gate.update(readiness.elapsed,checks,selected,state.tracker,speed)>=1){countdown=new CountdownReadinessClock(clock.options);countdown.reset(now);state.tracker.freezeCalibration();}
   }else if(readiness.ready&&readiness.countdownElapsed===5){go=now;break;}
  }
  assert.ok(go>5&&go<10,`${drill} at ${hz} fps: Go at ${go}`);
  assert.equal(state.counter.count,0,'starting never fabricates a counted rep');
 }
});

test('the screen-recorded processing range blocks the published setup but not visible-observation setup',()=>{
 const rates=[9.4,9.5,8.6,7.9,9.2,8.7];
 function run(visibilityFirst){
  const s=createSessionTrackingState(true,'right-hand-pound',undefined,false,{enhancedTracking:true});
  const position=new SetupReadinessClock(),gate=new CameraPositionGate(),times=[];let countdown=null,now=0;
  while(now<30){
   const hz=rates[Math.min(rates.length-1,Math.floor(now/4))];now+=1/hz;times.push(now);
   const p=person(),selected=s.tracker.select([ball(840,350)],p,countdown?'countdown':'setup',1280,720,now);
   const checks=evaluateVisibleSetup(p,selected,1280,720);
   const processing=setupProcessingReadiness(times,now,now-.1,{visibilityFirst});
   const r=(countdown??position).update(now,checks,processing.ready,s.tracker.ready());
   if(!countdown){if(r.reset)gate.reset();if(r.ready&&gate.update(r.elapsed,checks,selected,s.tracker,processing.ready)>=1){countdown=new CountdownReadinessClock();countdown.reset(now);s.tracker.freezeCalibration();}}
   else if(r.ready&&r.countdownElapsed===5)return now;
  }
  return null;
 }
 assert.equal(run(false),null,'published setup never gets past the 10 fps gate');
 const go=run(true);assert.ok(go>5&&go<9,`updated setup reaches Go at ${go}s`);
});
