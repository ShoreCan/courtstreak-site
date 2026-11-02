import test from 'node:test';
import assert from 'node:assert/strict';
import {CountdownReadinessClock} from '../src/lib/ai/countdownReadiness.mjs';
import {BallIdentityTracker} from '../src/lib/ai/poundCore.mjs';
import {person,ball} from './helpers/crossover-scenarios.mjs';

const good={body:true,hand:true,floor:true,ball:true,owned:true,rightHand:true,valid:true};
const hiddenWrist={...good,hand:false,valid:false,message:'Wrist temporarily unavailable.'};

test('normal detection dips pause one countdown without returning to five',()=>{
 const c=new CountdownReadinessClock();c.reset(0);const digits=[];let beforePause,afterPause,go;
 for(let i=1;i<=90;i++){
  const now=i/10,checks=now>=2&&now<3?hiddenWrist:good,r=c.update(now,checks,true,true);
  const digit=Math.ceil(5-r.countdownElapsed);if(digit!==digits.at(-1))digits.push(digit);
  assert.equal(r.reset,false);
  if(now===1.9)beforePause=r.elapsed;
  if(now===2.9){afterPause=r.elapsed;assert.equal(r.ready,false);}
  if(digit===0&&r.ready){go=now;break;}
 }
 assert.equal(afterPause,beforePause);assert.deepEqual(digits,[5,4,3,2,1,0]);assert.ok(go>=6&&go<7);
});
test('unobserved camera time cannot advance a countdown or erase prior progress',()=>{
 const c=new CountdownReadinessClock();c.reset(0);for(let i=1;i<=20;i++)c.update(i/10,good,true,true);
 const before=c.elapsed,r=c.update(3,good,true,true);assert.equal(r.elapsed,before);assert.equal(r.reset,false);assert.equal(r.verificationReset,true);
 assert.equal(c.update(2,good,true,true).clockError,true);assert.equal(c.elapsed,before);
});
test('a missing ball, wrong holding hand, poor framing or slow processing never authorizes Go',()=>{
 for(const [checks,speed,lock]of [[{...good,ball:false,valid:false},true,true],[{...good,rightHand:false},true,true],[{...good,body:false,valid:false},true,true],[good,false,true],[good,true,false]]){
  const c=new CountdownReadinessClock();for(let i=0;i<48;i++)c.update(i/10,good,true,true);
  const before=c.elapsed;for(let i=48;i<100;i++){const r=c.update(i/10,checks,speed,lock);assert.equal(r.ready,false);assert.ok(r.countdownElapsed<5);assert.equal(r.elapsed,before);}
 }
});
test('an explicit new attempt clears retained countdown progress',()=>{
 const c=new CountdownReadinessClock();c.update(0,good,true,true);c.update(.1,good,true,true);assert.ok(c.elapsed>0);c.reset(1);assert.equal(c.elapsed,0);assert.equal(c.update(1.1,hiddenWrist,true,true).ready,false);
});
test('ball adjustments during countdown do not replace the already verified calibration',()=>{
 const tracker=new BallIdentityTracker();for(let i=0;i<30;i++)tracker.select([ball(840,350)],person(),'setup',1280,720,i/20);
 assert.equal(tracker.ready(),true);const diameters=[...tracker.diameters],lanes=[...tracker.lanes];tracker.freezeCalibration();
 for(let i=0;i<30;i++)tracker.select([ball(840-i*3,350,60+i%3)],person(),'countdown',1280,720,2+i/20);
 assert.deepEqual(tracker.diameters,diameters);assert.deepEqual(tracker.lanes,lanes);assert.equal(tracker.ready(),true);
});
