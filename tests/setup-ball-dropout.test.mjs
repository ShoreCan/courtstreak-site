import test from 'node:test';
import assert from 'node:assert/strict';
import {CountdownReadinessClock} from '../src/lib/ai/countdownReadiness.mjs';
import {SetupReadinessClock} from '../src/lib/ai/setupReadiness.mjs';
const good={body:true,hand:true,floor:true,ball:true,owned:true,rightHand:true,valid:true};
const missing={...good,ball:false,owned:false,rightHand:false,valid:false};

for(const handMode of ['right','either'])for(const fps of [15,20,30])test(`${handMode} countdown tolerates isolated ball dropouts at ${fps}Hz`,()=>{
 const measure=bridgeBallDropouts=>{
  const c=new CountdownReadinessClock({handMode,bridgeBallDropouts});let go;
  for(let i=0;i<fps*12;i++){
   const checks=i>0&&i%5===0?missing:good,r=c.update(i/fps,checks,true,true);
   if(!checks.ball)assert.equal(r.ready,false);
   if(r.countdownElapsed===5){go=i/fps;break;}
  }return go;
 };
 assert.ok(measure(false)>8);const go=measure(true);assert.ok(go>=5&&go<5.3,`Go at ${go}`);
});
test('ball bridging cannot create an initial verified position or continue sustained loss',()=>{
 const c=new SetupReadinessClock({bridgeBallDropouts:true});
 for(let i=0;i<30;i++){const r=c.update(i/20,missing,true,true);assert.equal(r.ticking,false);assert.equal(r.ready,false);}
 c.reset();c.update(0,good,true,true);
 assert.equal(c.update(.1,missing,true,true).ballBridged,true);
 assert.equal(c.update(.25,missing,true,true).ballBridged,false);
 for(let i=6;i<50;i++)assert.equal(c.update(i/20,missing,true,true).ticking,false);
});
test('framing, visible rejected balls, speed and lock losses invalidate the bridge',()=>{
 for(const [checks,speed,lock] of [
  [{...missing,body:false},true,true],[{...missing,hand:false},true,true],
  [{...missing,floor:false},true,true],[{...good,owned:false,valid:false},true,true],
  [{...good,rightHand:false},true,true],[good,false,true],[good,true,false],
 ]){
  const c=new SetupReadinessClock({bridgeBallDropouts:true,handMode:'right'});c.update(0,good,true,true);
  const r=c.update(.05,checks,speed,lock);assert.equal(r.ticking,false);assert.equal(r.ready,false);
  assert.equal(c.update(.1,missing,true,true).ballBridged,false);
 }
});
test('Go waits for fresh ball proof even when the countdown finishes during flicker',()=>{
 const c=new CountdownReadinessClock({bridgeBallDropouts:true});
 for(let i=0;i<=99;i++)c.update(i/20,good,true,true);
 const r=c.update(5.05,missing,true,true);assert.equal(r.elapsed,5);assert.equal(r.ready,false);assert.ok(r.countdownElapsed<5);
 const fresh=c.update(5.1,good,true,true);assert.equal(fresh.ready,true);assert.equal(fresh.countdownElapsed,5);
});
test('a camera gap never adds unobserved time and a new attempt clears bridge history',()=>{
 const c=new CountdownReadinessClock({bridgeBallDropouts:true});c.update(0,good,true,true);c.update(.1,good,true,true);
 const before=c.elapsed;assert.equal(c.update(.8,missing,true,true).elapsed,before);
 c.reset(1);assert.equal(c.update(1.05,missing,true,true).ticking,false);assert.equal(c.elapsed,0);
 assert.equal(c.revision,'COUNTDOWN 02');assert.equal(new CountdownReadinessClock().revision,'COUNTDOWN 01');
});
