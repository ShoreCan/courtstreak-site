import test from 'node:test';
import assert from 'node:assert/strict';
import {SetupAttempt,setupBlockerKey,setupRecovery,SETUP_LIMIT_SECONDS} from '../src/lib/ai/setupAttempt.mjs';
import {SetupReadinessClock} from '../src/lib/ai/setupReadiness.mjs';

const good={body:true,hand:true,floor:true,ball:true,owned:true,valid:true};
test('a framed but slow phone is identified without asking the player to move',()=>{
 const a=new SetupAttempt(100);
 a.update(101,{...good,body:false,valid:false},false,false);
 let r=a.update(105,good,false,true);
 assert.equal(r.key,'speed');assert.match(r.message,/moving it will not improve processing speed/);
 r=a.update(120,good,false,true);
 assert.equal(r.seconds.speed,15);assert.equal(r.seconds.framing,4);assert.equal(r.expired,false);
 assert.equal(a.snapshot(130).expired,true);
});
test('the budget cannot restart when the countdown loses readiness',()=>{
 const attempt=new SetupAttempt(0),clock=new SetupReadinessClock({handMode:'either'});
 for(let i=0;i<=SETUP_LIMIT_SECONDS*10;i++){
  const now=i/10,valid=i%30<20,checks=valid?good:{...good,hand:false,valid:false};
  const r=attempt.update(now,checks,true,true);
  clock.update(now,checks,true,true);
  assert.equal(r.expired,now>=SETUP_LIMIT_SECONDS);
 }
 assert.equal(attempt.snapshot(108).expired,true);
});
test('the latest blocker is used after the player fixes framing',()=>{
 const a=new SetupAttempt(0);a.update(0,{...good,body:false,valid:false},true,true);a.update(20,good,false,true);
 const r=a.update(30,good,false,true);
 assert.equal(r.key,'speed');assert.equal(r.seconds.framing,20);assert.equal(r.seconds.speed,10);
 assert.equal(setupBlockerKey({...good,refreshingBody:true},false,true),'freshness');
 assert.equal(setupBlockerKey({...good,ball:false},false,true),'ball');
 assert.equal(setupBlockerKey(good,true,true),'ready');
 assert.match(setupRecovery('framing').message,/does not have to be high up/);
});
test('expiry never turns slow or missing observations into readiness',()=>{
 const a=new SetupAttempt(0),clock=new SetupReadinessClock({handMode:'either'});
 for(let i=0;i<400;i++){
  const r=a.update(i/10,good,false,true),readiness=clock.update(i/10,good,false,true);
  assert.equal(readiness.ready,false);if(i>=300)assert.equal(r.expired,true);
 }
});
