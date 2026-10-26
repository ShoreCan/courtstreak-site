import test from 'node:test';
import assert from 'node:assert/strict';
import { ReadinessClock, SETUP_GRACE_SECONDS } from '../src/lib/ai/cameraReadiness.mjs';
import { PositionGate } from '../src/lib/ai/poundCore.mjs';

test('one missed inference pauses the clock and resumes without a new lock', () => {
  const clock = new ReadinessClock();
  clock.reset(0);
  for (let i=1;i<=20;i++) clock.update(i/10,true);
  const missing=clock.update(2.1,false);
  assert.equal(missing.ready,false);
  assert.equal(missing.reset,false);
  assert.equal(missing.elapsed,2);
  const recovered=clock.update(2.2,true);
  assert.equal(recovered.reset,false);
  assert.equal(recovered.elapsed,2);
  assert.ok(Math.abs(clock.update(2.3,true).elapsed-2.1)<1e-9);
});

test('sustained loss requires a fresh setup instead of retaining the old countdown', () => {
  const clock=new ReadinessClock();clock.reset(0);
  for(let i=1;i<=20;i++)clock.update(i/10,true);
  for(let i=21;i<27;i++)assert.equal(clock.update(i/10,false).reset,false);
  const lost=clock.update(2.7,false);
  assert.equal(lost.reset,true);
  assert.equal(lost.elapsed,0);
});

test('no observations for the grace interval invalidates a countdown', () => {
  const clock=new ReadinessClock();clock.reset(1);
  const result=clock.update(1+SETUP_GRACE_SECONDS+.01,true);
  assert.equal(result.reset,true);
  assert.equal(result.elapsed,0);
});

test('missing ball/person/speed checks at the Go boundary cannot start the drill', () => {
  for(const reason of ['ball','person','speed']) {
    const clock=new ReadinessClock();clock.reset(0);
    for(let i=1;i<=49;i++)clock.update(i/10,true);
    const held=clock.update(5,false);
    assert.equal(held.ready,false,reason);
    assert.ok(held.elapsed<5,reason);
    assert.equal(clock.update(5.1,true).elapsed,held.elapsed,reason);
    assert.ok(clock.update(5.3,true).elapsed>=5,reason);
  }
});

test('brief flicker retains accumulated positioning progress', () => {
  const clock=new ReadinessClock(),gate=new PositionGate(),ball={box:[700,300,760,360]},tracker={ready:()=>true};
  let progress=0;
  for(let i=0;i<=50;i++) {
    const valid=i!==17,state=clock.update(i/20,valid);
    if(state.reset){gate.reset();progress=0;}
    if(state.ready)progress=gate.update(state.elapsed,{valid:true},ball,tracker,true);
    if(i===17)assert.ok(progress>0);
  }
  assert.equal(progress,1);
});

test('warm-up points retain real spacing and stay before the revised Go time', () => {
  const clock=new ReadinessClock();clock.reset(0);
  let countdownAt=0;const points=[];
  for(let i=1;i<=60;i++) {
    const now=i/10,state=clock.update(now,i!==24);
    assert.equal(state.reset,false);
    const revisedStart=now-state.elapsed,pause=Math.max(0,revisedStart-countdownAt);
    points.forEach(point=>point.timestamp-=pause);
    countdownAt=revisedStart;
    points.push({captured:now,timestamp:now-(countdownAt+5)});
    for(const point of points)assert.ok(Math.abs(point.timestamp-(point.captured-(countdownAt+5)))<1e-8);
    if(state.elapsed<5)assert.ok(points.at(-1).timestamp<0);
  }
});

test('visible-body ball lock interruptions pause for up to 1.5 seconds without losing progress', async () => {
  const { cameraReadiness } = await import('../src/lib/ai/cameraReadiness.mjs');
  const checks={body:true,hand:true,floor:true,ball:true,valid:true,message:'Good position'};
  for(const kind of ['ball','calibration']) {
    const clock=new ReadinessClock();clock.reset(0);
    for(let i=1;i<=30;i++)clock.update(i/10,true);
    for(let i=31;i<=40;i++) {
      const c=cameraReadiness({...checks,ball:kind!=='ball',valid:kind!=='ball'},true,false);
      const r=clock.update(i/10,c.valid,c);
      assert.equal(r.reset,false,kind);assert.equal(r.ready,false);assert.equal(r.elapsed,3);
    }
    const c=cameraReadiness(checks,true,true),recovered=clock.update(4.1,c.valid,c);
    assert.equal(recovered.reset,false);assert.equal(recovered.elapsed,3);
    assert.ok(clock.update(4.2,true).elapsed>3);
  }
});

test('long loss, loss of framing and no new observations still invalidate the countdown', async () => {
  const { cameraReadiness }=await import('../src/lib/ai/cameraReadiness.mjs');
  const checks={body:true,hand:true,floor:true,ball:false,valid:false,message:'Rechecking ball'};
  const condition=cameraReadiness(checks,true,false);
  const clock=new ReadinessClock();clock.reset(0);clock.update(.1,true);
  for(let i=2;i<=15;i++)assert.equal(clock.update(i/10,false,condition).reset,false);
  assert.equal(clock.update(1.7,false,condition).reset,true);
  clock.reset(0);clock.update(.1,false,condition);
  const framing=cameraReadiness({...checks,body:false},true,false);
  assert.equal(clock.update(.5,false,framing).reset,false);
  assert.equal(clock.update(.7,false,framing).reset,true);
  clock.reset(0);assert.equal(clock.update(.8,false,condition).reset,true);
});

test('ball detection problems do not ask the player to move closer, back, left or right', async () => {
  const {cameraReadiness}=await import('../src/lib/ai/cameraReadiness.mjs');
  const checks={body:true,hand:true,floor:true,ball:true,valid:true,message:'Good position'};
  assert.match(cameraReadiness(checks,true,false).message,/Body framing is good/);
  assert.doesNotMatch(cameraReadiness(checks,true,false).message,/closer|step back|left|right/i);
  assert.match(cameraReadiness(checks,false,true).message,/tracking speed/);
});
