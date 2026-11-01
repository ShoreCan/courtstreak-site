import test from 'node:test';
import assert from 'node:assert/strict';
import {PhonePlacement} from '../src/lib/ai/phonePlacement.mjs';
import {SetupGuidance,CALM_SETUP_START} from '../src/lib/ai/setupGuidance.mjs';

test('opening the camera never starts judging the player before they set the phone',()=>{
 const p=new PhonePlacement(10);
 for(const now of [10,20,60,200]){const r=p.snapshot(now,true);assert.equal(r.stage,'placing');assert.equal(r.canCheck,false);}
 p.start(200);assert.equal(p.snapshot(200,true).canCheck,true);
});
test('Start waits only for model preparation, without a placement timer',()=>{
 const p=new PhonePlacement(0);p.start(5);
 assert.equal(p.snapshot(5,false).stage,'loading');assert.equal(p.snapshot(5,false).canCheck,false);
 assert.equal(p.snapshot(5,true).stage,'ready');p.start(25);assert.equal(p.startRequestedAt,5);
});
test('calm guidance begins neutrally and only changes a persistent instruction',()=>{
 const g=new SetupGuidance(1.2,{minimumHold:2,initial:CALM_SETUP_START});
 const wrists={key:'both-wrists',screenText:'Both wrists in view'};
 assert.equal(g.update(0,wrists).key,'checking');assert.equal(g.update(1,wrists).key,'checking');
 assert.equal(g.update(2.01,wrists).key,'both-wrists');
 const feet={key:'show-feet',screenText:'Both feet in view'};
 assert.equal(g.update(2.1,feet).key,'both-wrists');assert.equal(g.update(2.3,wrists).key,'both-wrists');
 const ready={key:'ready',screenText:'Hold comfortably'};
 g.update(2.4,ready);assert.equal(g.update(2.9,ready).key,'ready');
});
