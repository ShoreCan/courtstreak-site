import test from 'node:test';
import assert from 'node:assert/strict';
import {SetupReadinessClock,SETUP_REFRESH_BRIDGE_SECONDS} from '../src/lib/ai/setupReadiness.mjs';
import {ReadinessClock} from '../src/lib/ai/cameraReadiness.mjs';
import {CameraPositionGate} from '../src/lib/ai/cameraSetup.mjs';
import {SetupGuidance,setupCondition,shiftPreGoTimeline} from '../src/lib/ai/setupGuidance.mjs';
import {createPoundTrackingState} from '../src/lib/ai/poundTrackingState.mjs';

const good={body:true,hand:true,floor:true,ball:true,owned:true,rightHand:true,valid:true};
const queued={body:false,hand:false,floor:false,ball:true,owned:false,rightHand:false,valid:false,refreshingBody:true};

// Synthetic scheduler cadence: a slow independent body job leaves a short
// interval of fresh pose evidence, then a queued refresh. No camera, model,
// extra body jobs or private trial inputs are needed for this regression.
function round(candidate){
 const clock=candidate?new SetupReadinessClock():new ReadinessClock(),gate=new CameraPositionGate();
 let phase='setup',start=null,go=null;const digits=[];
 for(let i=0;i<800;i++){
  const now=i/20,checks=i%16<6?good:queued,condition=setupCondition(checks,true,true);
  const r=candidate?clock.update(now,checks,true,true):clock.update(now,condition.valid,condition);
  if(r.reset){assert.equal(phase,'setup','routine healthy refreshes must not restart a countdown');gate.reset();}
  if(phase==='setup'){
   if(r.ready&&gate.update(r.elapsed,checks,{}, {ready:()=>true},true)>=1){
    phase='countdown';start=now;digits.push(5);clock.reset(now,{retainPosition:true});
   }
  }else{
   const digit=Math.max(0,Math.ceil(5-(candidate?r.countdownElapsed:r.elapsed)));
   if(digit!==digits.at(-1))digits.push(digit);
   if(digit===0&&r.ready){go=now;break;}
   if(checks.refreshingBody)assert.equal(r.ready,false,'a queued body check must never authorize Go');
  }
 }
 return {start,go,duration:go-start,digits};
}
test('routine asynchronous body refreshes no longer stretch a five-second countdown',()=>{
 const before=round(false),after=round(true);
 assert.ok(before.duration>12);assert.ok(after.duration>=5&&after.duration<5.9);
 assert.ok(after.start<1.5&&after.start<before.start);
 assert.deepEqual(after.digits,[5,4,3,2,1,0]);
});

test('refresh bridging needs an existing fully verified right-hand setup and a live ball',()=>{
 const neverReady=new SetupReadinessClock();
 for(let i=0;i<100;i++){const r=neverReady.update(i/20,queued,true,true);assert.equal(r.refreshBridged,false);assert.equal(r.ready,false);assert.equal(r.elapsed,0);}
 for(const [checks,speed,lock] of [[{...queued,ball:false},true,true],[queued,false,true],[queued,true,false]]){
  const clock=new SetupReadinessClock();clock.update(0,good,true,true);
  const result=clock.update(.1,checks,speed,lock);assert.equal(result.refreshBridged,false);assert.equal(result.ready,false);
  assert.equal(clock.update(.2,queued,true,true).refreshBridged,false,'a broken prerequisite must invalidate the old bridge');
 }
});

test('fresh cropping, hidden wrists, wrong-hand holding and unowned balls veto a prior position',()=>{
 for(const property of ['body','hand','floor','owned','rightHand']){
  const clock=new SetupReadinessClock();clock.update(0,good,true,true);
  const checks={...good,[property]:false,...(property==='rightHand'?{}:{valid:false})};
  const result=clock.update(.1,checks,true,true);assert.equal(result.ready,false,property);assert.equal(result.refreshBridged,false,property);
  assert.equal(clock.update(.2,queued,true,true).refreshBridged,false,property);
 }
});

test('a failed or stopped body worker cannot extend a bridge indefinitely',()=>{
 const clock=new SetupReadinessClock();clock.update(0,good,true,true);let reset=false;
 for(let i=1;i<=40;i++){
  const now=i/20,r=clock.update(now,queued,true,true);
  assert.equal(r.ready,false);
  if(now>=SETUP_REFRESH_BRIDGE_SECONDS)assert.equal(r.refreshBridged,false);
  reset||=r.reset;
 }
 assert.equal(reset,true);
});

test('camera frame gaps and explicit resets still require fresh confirmation',()=>{
 const clock=new SetupReadinessClock();clock.update(0,good,true,true);
 const gap=clock.update(.8,queued,true,true);assert.equal(gap.reset,true);assert.equal(gap.elapsed,0);
 clock.update(.9,good,true,true);clock.reset(1);
 assert.equal(clock.update(1.1,queued,true,true).refreshBridged,false);
 assert.equal(clock.update(1.2,good,true,true).ready,true);
});

test('the final digit waits for a fresh valid body check without creating pre-Go reps',()=>{
 const clock=new SetupReadinessClock(),state=createPoundTrackingState();clock.reset(0);let countdownAt=0;
 for(let i=0;i<=107;i++){
  const now=i/20,waiting=now>=4.85&&now<5.35,checks=waiting?queued:good,r=clock.update(now,checks,true,true);
  const revised=now-r.countdownElapsed;shiftPreGoTimeline(state,Math.max(0,revised-countdownAt));countdownAt=revised;
  const digit=Math.ceil(5-r.countdownElapsed);
  if(waiting){assert.equal(r.ready,false);assert.ok(digit>=1);}
  if(now<5.35){
   const time=now-(countdownAt+5);assert.ok(time<0);
   const proposals=state.counter.update(time,[300,80],720);state.validator.update(proposals,[760,300,80],null,time,20);
   for(const p of state.counter.points)assert.ok(p.timestamp<0);
   assert.equal(state.validator.count,0);
  }else{assert.equal(r.ready,true);assert.equal(digit,0);}
 }
});

test('routine refreshes do not erase a useful cue or prevent a stable new cue from appearing',()=>{
 const guidance=new SetupGuidance(),ball={key:'ball',message:'Show your basketball.'},frame={key:'floor',message:'Include floor below your feet.'},refresh={key:'refresh',message:'Rechecking.'};
 assert.equal(guidance.update(0,ball),ball);
 assert.equal(guidance.update(.1,frame),ball);
 for(const t of [.2,.3,.4,.5])assert.equal(guidance.update(t,refresh),ball);
 assert.equal(guidance.update(.7,frame),frame);
 assert.equal(guidance.update(.8,refresh),frame);
});
