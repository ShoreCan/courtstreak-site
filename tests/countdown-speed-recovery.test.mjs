import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SetupReadinessClock} from '../src/lib/ai/setupReadiness.mjs';

test('the recorded near-finished countdown survives a short processing dip and requires fresh speed to Go',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/crossover-countdown-speed-dip.json',import.meta.url)));
 const c=new SetupReadinessClock({handMode:'either'});c.reset(0,{retainPosition:true});let go=null,paused=false;
 for(const row of fixture.rows){
  const r=c.update(row.time,row.checks,row.speedReady,row.lockReady);
  assert.equal(r.reset,false);
  if(!row.speedReady){paused=true;assert.equal(r.ready,false);assert.ok(r.countdownElapsed<5);}
  if(r.ready&&r.countdownElapsed>=5){go=row.time;assert.equal(row.speedReady,true);break;}
 }
 assert.equal(paused,true);assert.ok(go>5.8&&go<6.1);
});
test('sustained poor processing still resets readiness and never authorizes Go',()=>{
 const c=new SetupReadinessClock({handMode:'either'}),checks={valid:true,body:true,hand:true,floor:true,ball:true,owned:true};
 for(let i=0;i<50;i++)c.update(i/10,checks,true,true);
 let reset=false;for(let i=50;i<70;i++){const r=c.update(i/10,checks,false,true);assert.equal(r.ready,false);reset||=r.reset;}
 assert.equal(reset,true);
});
