import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cameraReadiness,ReadinessClock} from '../src/lib/ai/cameraReadiness.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/camera-setup/oct26-floor-countdown.json',import.meta.url)));
function firstReset(window,candidate){
 const clock=new ReadinessClock();clock.reset(0);
 for(const f of window.frames){
  const c=cameraReadiness(f.checks,f.speed,f.lock),r=clock.update(f.at,c.valid,candidate?c:{});
  if(r.reset)return f.at;
  if(r.ready&&r.elapsed>=5)return null;
 }
 return null;
}
test('three short ball-lock interruptions retain progress in the recorded floor-supported setup',()=>{
 for(const index of [1,3,4]){
  assert.notEqual(firstReset(fixture.windows[index],false),null,`baseline ${index+1}`);
  assert.equal(firstReset(fixture.windows[index],true),null,`candidate ${index+1}`);
 }
});
test('persistent calibration loss and lost body framing still restart the recorded setup',()=>{
 for(const index of [0,2])assert.notEqual(firstReset(fixture.windows[index],true),null);
});
