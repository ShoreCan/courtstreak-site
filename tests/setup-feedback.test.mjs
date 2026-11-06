import test from 'node:test';
import assert from 'node:assert/strict';
import {trackingCadence,setupProcessingReadiness,setupProcessingMessage} from '../src/lib/ai/liveTrackingBudget.mjs';
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
test('previously eligible live speeds no longer fail just for being below 20 fps',()=>{
 for(const hz of [10,12,15,19,30]){
  const times=Array.from({length:Math.ceil(2*hz)+1},(_,i)=>i/hz),last=times.at(-1);
  const processing=setupProcessingReadiness(times,last,last-.05);
  assert.equal(processing.ready,true,`${hz} fps`);
  assert.match(setupProcessingMessage(processing),/speed is ready/);
  if(hz<20)assert.equal(trackingCadence(times).ready,false,'quality target remains inspectable');
  const countdown=new CountdownReadinessClock();let result;
  for(let i=0;i<=Math.ceil(5.2*hz);i++)result=countdown.update(i/hz,good,processing.ready,true);
  assert.equal(result.ready,true);assert.equal(result.countdownElapsed,5);
 }
});
test('freshness, inadequate processing, warmup and long passes remain explicit blockers',()=>{
 const times=hz=>Array.from({length:2*hz+1},(_,i)=>i/hz);
 for(const [values,last,start,reason]of [[times(8),2,1.95,'speed'],[[0,.1],.1,.05,'warming'],[times(30),2,1.6,'latency'],[[0,0,1],1,.95,'freshness']]){
  const r=setupProcessingReadiness(values,last,start);assert.equal(r.ready,false);assert.equal(r.reason,reason);
  assert.doesNotMatch(setupProcessingMessage(r),/Hold comfortably|move closer|step back/);
 }
});
test('a stable instruction key refreshes its visible measured explanation',()=>{
 const guide=new SetupGuidance();
 guide.update(0,{key:'speed',message:'Measuring'});
 assert.equal(guide.update(2,{key:'speed',message:'15 processed frames/sec'}).message,'15 processed frames/sec');
 assert.match(setupProcessingMessage(null),/Measuring/);
});
