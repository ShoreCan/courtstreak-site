import test from 'node:test';
import assert from 'node:assert/strict';
import {trackingCadence,setupCadenceMessage} from '../src/lib/ai/liveTrackingBudget.mjs';
import {setupInstruction,setupCondition,SetupGuidance} from '../src/lib/ai/setupGuidance.mjs';
import {CountdownReadinessClock} from '../src/lib/ai/countdownReadiness.mjs';
const good={body:true,hand:true,floor:true,ball:true,owned:true,rightHand:true,valid:true};
test('processing, ball lock and ready cues are distinct for both drills',()=>{
 for(const handMode of ['right','either']){
  for(const [speed,lock,expected]of [[false,true,'Checking tracking speed'],[true,false,'Locking onto the ball'],[true,true,'Starting countdown']]){
   const condition=setupCondition(good,speed,lock,{handMode});
   assert.equal(setupInstruction(good,speed,lock,condition,{handMode}).screenText,expected);
  }
 }
});
test('phone cadence failure is visible while still preventing an unqualified countdown',()=>{
 for(const hz of [8,10,15,19]){
  const times=Array.from({length:Math.ceil(2*hz)+1},(_,i)=>i/hz),cadence=trackingCadence(times);
  assert.equal(cadence.ready,false);
  assert.match(setupCadenceMessage(cadence),/This test requires 20/);
  const countdown=new CountdownReadinessClock();
  for(let i=0;i<8*hz;i++){
   const r=countdown.update(i/hz,good,cadence.ready,true);
   assert.equal(r.ready,false);assert.equal(r.countdownElapsed,0);
  }
 }
});
test('sufficient steady measured cadence still completes the five-second countdown',()=>{
 const cadence=trackingCadence(Array.from({length:61},(_,i)=>i/30));
 assert.equal(cadence.ready,true);assert.match(setupCadenceMessage(cadence),/speed is ready/);
 const clock=new CountdownReadinessClock();let result;
 for(let i=0;i<=152;i++)result=clock.update(i/30,good,cadence.ready,true);
 assert.equal(result.ready,true);assert.equal(result.countdownElapsed,5);
 const uneven=trackingCadence([...Array.from({length:61},(_,i)=>i/30),2.2]);
 assert.equal(uneven.ready,false);assert.match(setupCadenceMessage(uneven),/gaps/);
});
test('a stable instruction key refreshes its visible measured explanation',()=>{
 const guide=new SetupGuidance();
 guide.update(0,{key:'speed',message:'Measuring'});
 assert.equal(guide.update(2,{key:'speed',message:'15 processed frames/sec'}).message,'15 processed frames/sec');
 assert.match(setupCadenceMessage(null),/Measuring/);
});
