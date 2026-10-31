import test from 'node:test';
import assert from 'node:assert/strict';
import {SetupGuidance,FramedCalibration,setupCondition,setupInstruction,shiftPreGoTimeline} from '../src/lib/ai/setupGuidance.mjs';
import {CameraPositionGate,POSITION_CONFIRM_SECONDS,evaluateCameraSetup} from '../src/lib/ai/cameraSetup.mjs';
import {ReadinessClock} from '../src/lib/ai/cameraReadiness.mjs';
import {createPoundTrackingState,resetPoundTrackingIdentity} from '../src/lib/ai/poundTrackingState.mjs';
import {trial} from './helpers/low-pound-scenario.mjs';

const good={body:true,hand:true,ball:true,floor:true,owned:true,rightHand:true,valid:true};
test('all fresh checks advance a short confirmation; no slow, unowned or left-hand setup can start',()=>{
  for(const variant of ['good','speed','lock','ball','body','hand','floor','rightHand']){
    const gate=new CameraPositionGate(),clock=new ReadinessClock();let progress=0;
    for(let i=0;i<=30;i++){
      const checks={...good};if(!['good','speed','lock','rightHand'].includes(variant)){checks[variant]=false;checks.valid=false;}
      if(variant==='rightHand')checks.rightHand=false;
      const speed=variant!=='speed',lock=variant!=='lock',condition=setupCondition(checks,speed,lock),r=clock.update(i/20,condition.valid,condition);
      if(r.reset)gate.reset();if(r.ready)progress=gate.update(r.elapsed,checks,{}, {ready:()=>lock},speed);
    }
    assert.equal(progress,variant==='good'?1:0,variant);
  }
  assert.ok(POSITION_CONFIRM_SECONDS>=.8&&POSITION_CONFIRM_SECONDS<=1);
});
test('left hand can acquire the ball; the right-hand setup is confirmed separately',()=>{
  const p={box:[300,40,1000,680],xy:Array.from({length:17},()=>[650,300]),confidence:Array(17).fill(.95)};
  p.xy[0]=[650,80];p.xy[9]=[380,320];p.xy[10]=[900,320];p.xy[15]=[500,620];p.xy[16]=[800,620];
  const ball=x=>({box:[x-40,280,x+40,360],score:.9});
  const left=evaluateCameraSetup(p,ball(380),1280,720),right=evaluateCameraSetup(p,ball(900),1280,720);
  assert.equal(left.valid,true);assert.equal(left.rightHand,false);assert.equal(setupCondition(left,true,true).valid,false);
  assert.equal(right.rightHand,true);assert.equal(setupCondition(right,true,true).valid,true);
});
test('a landmark flicker does not change the instruction; a persistent framing problem does',()=>{
  const g=new SetupGuidance(),ready=setupInstruction(good,true,true,setupCondition(good,true,true));
  const cropped={...good,body:false,valid:false,message:'Your feet are outside the picture.'};
  const cue=setupInstruction(cropped,true,true,setupCondition(cropped,true,true));
  assert.equal(g.update(0,ready).key,'ready');assert.equal(g.update(.1,cue).key,'ready');assert.equal(g.update(.2,ready).key,'ready');
  assert.equal(g.update(.3,cue).key,'ready');assert.equal(g.update(.8,cue).message,cropped.message);
  // Display smoothing never changes the underlying safety condition.
  assert.equal(setupCondition(cropped,true,true).valid,false);
});
test('queued body work and missing balls never generate a move-closer instruction',()=>{
  for(const checks of [{...good,refreshingBody:true,valid:false},{...good,ball:false,valid:false},{...good}]){
    const c=setupCondition(checks,true,false),cue=setupInstruction(checks,true,false,c);
    assert.doesNotMatch(cue.message,/closer|step back|move left|move right/i);
  }
});
test('large setup cues choose a single geometric action and hold position for processing delays',()=>{
 const base={box:[190,100,1090,2090],xy:Array.from({length:17},()=>[640,500]),confidence:Array(17).fill(.95)};
 Object.assign(base.xy,{0:[640,230],5:[450,600],6:[830,600],9:[350,1000],10:[900,1000],11:[490,1150],12:[790,1150],15:[460,1950],16:[820,1950]});
 const ball={box:[820,920,980,1080],score:.9};
 const variants=[
  [p=>{p.box=[500,300,600,700];},'MOVE CLOSER'],
  [p=>{p.box[1]=-100;},'STEP BACK'],
  [p=>{p.xy[15][1]=2200;},'TILT PHONE DOWN'],
  [p=>{p.xy[15][1]=600;p.xy[16][1]=600;},'TILT PHONE UP'],
  [p=>{p.confidence[9]=0;},'SHOW BOTH WRISTS'],
 ];
 for(const [change,text]of variants){const p=structuredClone(base);change(p);const checks=evaluateCameraSetup(p,ball,1280,2276,{handMode:'both'});
  const cue=setupInstruction(checks,true,true,setupCondition(checks,true,true,{handMode:'either'}),{handMode:'either'});assert.equal(cue.screenText,text);
 }
 const checks=evaluateCameraSetup(base,ball,1280,2276,{handMode:'both'});
 assert.equal(setupInstruction(checks,false,true,setupCondition(checks,false,true),{handMode:'either'}).screenText,'HOLD POSITION');
});
test('a ball at the picture edge keeps the specific ball-framing instruction',()=>{
  const checks={...good,valid:false,owned:false,rightHand:false,issue:'ball-edge',message:'The basketball is near the side edge. Bring it toward the center of the preview.'};
  const cue=setupInstruction(checks,true,true,setupCondition(checks,true,true));
  assert.equal(cue.stage,'ball');assert.equal(cue.message,checks.message);
});
test('calibration begins in the final framing and survives brief pose flicker',()=>{
  const calibration=new FramedCalibration(),state=createPoundTrackingState();
  assert.equal(calibration.update(0,false),false);assert.equal(calibration.update(1,false),false);
  state.tracker.diameters=[28,32,35];const approaching=state.tracker;
  if(calibration.update(2,true))resetPoundTrackingIdentity(state);
  assert.notEqual(state.tracker,approaching);assert.deepEqual(state.tracker.diameters,[]);
  for(const [key,value]of Object.entries(state.configuration.identityOptions))assert.equal(state.tracker[key],value);
  assert.equal(calibration.update(2.1,false),false);assert.equal(calibration.update(2.5,true),false);
  assert.equal(calibration.update(3,false),false);assert.equal(calibration.update(4,true,true),false);assert.equal(calibration.update(4.6,false),false);
  assert.equal(calibration.update(4.7,true),true);assert.equal(calibration.update(4.8,true),false);
});
test('pauses and late Go completion rebase counter and hand-control samples together',()=>{
  const state=createPoundTrackingState();
  for(let i=0;i<30;i++){
    const t=-1+i/30,m=[760,300,80];state.counter.update(t,m.slice(1),720);state.validator.update([],m,null,t,20);
  }
  const original=state.counter.points.map(p=>p.timestamp);
  for(const pause of [.04,.3,.08,.12])shiftPreGoTimeline(state,pause);
  state.counter.points.forEach((p,i)=>{
    assert.ok(Math.abs(p.timestamp-(original[i]-.54))<1e-10);
    assert.ok(Math.abs(p.timestamp-state.validator.context[i].time)<1e-10);
  });
});
test('a full countdown with a queued-body interruption keeps its digits and cannot Go on stale data',()=>{
  const clock=new ReadinessClock();clock.reset(0);const digits=[];let go=null;
  for(let i=1;i<150;i++){
    const now=i/20,refreshing=now>=2&&now<2.45,checks={...good,refreshingBody:refreshing};
    const condition=setupCondition(checks,true,true),r=clock.update(now,condition.valid,condition);
    assert.equal(r.reset,false);
    const digit=Math.max(0,Math.ceil(5-r.elapsed));if(digits.at(-1)!==digit)digits.push(digit);
    if(refreshing)assert.equal(r.ready,false);
    if(digit===0&&r.ready){go=now;break;}
  }
  assert.deepEqual(digits,[5,4,3,2,1,0]);assert.ok(go>=5.45&&go<5.7);
});
test('the unchanged COUNT 08 engine still verifies first and final controlled reps after a paused warmup',()=>{
  const source=trial({revision:'COUNT 08',period:.4}),state=createPoundTrackingState(),accepted=[];
  const warmup=source.frames.filter(f=>f.elapsed<0),active=source.frames.filter(f=>f.elapsed>=0);
  for(const f of warmup){const m=f.selected?[760,(f.selected.box[1]+f.selected.box[3])/2,80]:null;
    state.counter.update(f.elapsed+.7,m?.slice(1),720);state.validator.update([],m,f.person,f.elapsed+.7,20);
  }
  shiftPreGoTimeline(state,.7);
  for(const f of active){const m=f.selected?[760,(f.selected.box[1]+f.selected.box[3])/2,80]:null;
    const proposals=state.counter.update(f.elapsed,m?.slice(1),720);
    const events=state.validator.update(proposals,m,f.person,f.elapsed,20);events.forEach(e=>state.counter.rememberControlledFloor(e));accepted.push(...events);
  }
  assert.equal(state.validator.count,8);assert.deepEqual(accepted.map(e=>e.event_timestamp_exact),source.events.map(e=>e.event_timestamp_exact));
  assert.ok(accepted[0].event_timestamp_exact<.3);assert.ok(accepted.at(-1).event_timestamp_exact>2.9);
});
