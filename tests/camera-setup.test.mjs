import test from 'node:test';
import assert from 'node:assert/strict';
import { CameraPositionGate, evaluateCameraSetup } from '../src/lib/ai/cameraSetup.mjs';
import { PositionGate, evaluatePosition } from '../src/lib/ai/poundCore.mjs';
import { ReadinessClock } from '../src/lib/ai/cameraReadiness.mjs';

const W=1280,H=2276;
function person() {
  const xy=Array.from({length:17},()=>[640,500]);
  Object.assign(xy,{0:[640,230],5:[450,600],6:[830,600],9:[350,1000],10:[900,1000],11:[490,1150],12:[790,1150],15:[460,1950],16:[820,1950]});
  return {box:[190,100,1090,2090],xy,confidence:Array(17).fill(.95)};
}
const ball=(x=900,y=1000)=>({box:[x-80,y-80,x+80,y+80],score:.9});
const ready={ready:()=>true};

test('a fully visible wider stance does not require moving closer or farther',()=>{
  const p=person();
  assert.equal(evaluatePosition(p,ball(),W,H).body,false);
  assert.equal(evaluateCameraSetup(p,ball(),W,H).valid,true);
});
test('holding the ball naturally in either hand permits setup when the right wrist is visible',()=>{
  assert.equal(evaluateCameraSetup(person(),ball(350),W,H).valid,true);
  assert.equal(evaluateCameraSetup(person(),ball(900),W,H).valid,true);
});
test('a ball away from both hands cannot arm setup',()=>{
  assert.equal(evaluateCameraSetup(person(),ball(640,1700),W,H).valid,false);
});
test('missing person, ball, right wrist or either foot blocks setup',()=>{
  assert.equal(evaluateCameraSetup(null,ball(),W,H).valid,false);
  assert.equal(evaluateCameraSetup(person(),null,W,H).valid,false);
  for (const i of [10,15,16]) { const p=person();p.confidence[i]=0;assert.equal(evaluateCameraSetup(p,ball(),W,H).valid,false,`landmark ${i}`); }
});
test('cropped head, clipped body and inadequate floor clearance remain blocked',()=>{
  const cropped=person();cropped.xy[0][1]=-5;
  assert.equal(evaluateCameraSetup(cropped,ball(),W,H).valid,false);
  const outside=person();outside.box[2]=W*1.2;
  assert.equal(evaluateCameraSetup(outside,ball(),W,H).valid,false);
  const feet=person();feet.xy[15][1]=H*.97;
  assert.equal(evaluateCameraSetup(feet,ball(),W,H).valid,false);
});
test('a distant person and an edge-clipped ball remain blocked',()=>{
  const distant=person();distant.box=[500,300,600,700];
  assert.equal(evaluateCameraSetup(distant,ball(),W,H).valid,false);
  assert.equal(evaluateCameraSetup(person(),ball(50),W,H).valid,false);
});
test('a normal held-ball and body adjustment retains positioning progress',()=>{
  const legacy=new PositionGate(),candidate=new CameraPositionGate();let oldMax=0,newProgress=0;
  for(let i=0;i<=60;i++) {
    const t=i/20,p=person(),dx=i*2.2,dy=i*.9;
    p.box=p.box.map((v,k)=>v+(k%2===0?dx:dy));p.xy=p.xy.map(([x,y])=>[x+dx,y+dy]);
    const b=ball(900+dx,1000+dy),checks=evaluateCameraSetup(p,b,W,H);
    assert.equal(checks.valid,true);
    oldMax=Math.max(oldMax,legacy.update(t,checks,b,ready,true));
    newProgress=candidate.update(t,checks,b,ready,true);
  }
  assert.ok(oldMax<1);assert.equal(newProgress,1);
});
test('poor tracking speed or an unconfirmed ball lock cannot advance positioning',()=>{
  for(const [tracker,speed] of [[ready,false],[{ready:()=>false},true]]) {
    const gate=new CameraPositionGate();
    for(let i=0;i<100;i++)assert.equal(gate.update(i/20,{valid:true},ball(),tracker,speed),0);
  }
});
test('brief lost visibility pauses progress and sustained loss still requires a new lock',()=>{
  const clock=new ReadinessClock(),gate=new CameraPositionGate();let progress=0;
  for(let i=0;i<=60;i++) {
    const valid=i!==24,r=clock.update(i/20,valid);
    if(r.reset)gate.reset();
    if(r.ready)progress=gate.update(r.elapsed,{valid:true},ball(),ready,true);
    if(i===25)assert.ok(progress>0);
  }
  assert.equal(progress,1);
  const lost=clock.update(4,true);assert.equal(lost.reset,true);
  gate.reset();assert.equal(gate.update(lost.elapsed,{valid:true},ball(),ready,true),0);
});
