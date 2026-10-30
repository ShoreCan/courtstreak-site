import test from 'node:test';
import assert from 'node:assert/strict';
import {CrossoverCounter,crossoverROI} from '../src/lib/ai/crossoverCounter.mjs';
import {createSessionTrackingState,resetSessionTrackingCounter,updateSessionCounter,sessionROI} from '../src/lib/ai/sessionTracking.mjs';
import {evaluateCameraSetup} from '../src/lib/ai/cameraSetup.mjs';
import {setupCondition,setupInstruction,shiftPreGoTimeline} from '../src/lib/ai/setupGuidance.mjs';
import {SetupReadinessClock} from '../src/lib/ai/setupReadiness.mjs';
import {RoundEvidence,replayStart} from '../src/lib/ai/roundEvidence.mjs';
import {replayCrossovers} from '../src/lib/ai/crossoverReplay.mjs';

import {person,ball,trial} from './helpers/crossover-scenarios.mjs';

for(const start of ['right','left'])for(const fps of [15,20,30])test(`${start}-hand start counts each of six controlled transfers at ${fps} fps`,()=>{
 const result=trial({start,fps});assert.equal(result.counter.count,6);
 assert.deepEqual(result.confirmed.map(event=>event.from_hand),Array.from({length:6},(_,i)=>i%2?(start==='right'?'left':'right'):start));
 for(const event of result.confirmed){assert.notEqual(event.from_hand,event.to_hand);assert.ok(event.floor_contact_time_seconds<event.event_timestamp_exact);}
});
test('two back-and-forth switches are two reps, not one pair',()=>assert.equal(trial({reps:2}).counter.count,2));
for(const fps of [10,15,30])for(const period of [.4,.6,.8])test(`continuous ${period}-second transfers count separately at ${fps} fps`,()=>assert.equal(trial({fps,period,hold:0,reps:12}).counter.count,12));
for(const fps of [10,15,30])for(const period of [.4,.6,.8])test(`ball identity and counter retain twelve ${period}-second transfers at ${fps} fps`,()=>{
 const {frames}=trial({fps,period,hold:0,reps:12}),state=createSessionTrackingState(true,'stationary-crossover');
 for(let i=0;i<30;i++)state.tracker.select([ball(840,350)],person(),'setup',1280,720,-4+i*.1);
 assert.equal(state.tracker.ready(),true);
 for(const row of frames){const b=row.measurement?ball(...row.measurement):null,selected=state.tracker.select(b?[b]:[],row.person,row.time<0?'countdown':'drill',1280,720,row.time);updateSessionCounter(state,row.time,selected?row.measurement:null,row.person,720,20);}
 assert.equal(state.validator.count,12);
});
test('a hand-to-hand pass without a floor bounce is not a rep',()=>assert.equal(trial({noBounce:true}).counter.count,0));
test('one-handed pounds never count as crossovers',()=>assert.equal(trial({sameHand:true}).counter.count,0));
test('controlled low crossovers do not require a knee-height apex',()=>assert.equal(trial({handY:560,bottom:630}).counter.count,6));
test('holding or moving a stationary ball between wrists does not create a bounce',()=>{
 const c=new CrossoverCounter(),p=person();for(let i=0;i<120;i++)c.update([],[840-i*400/120,350,60],p,i/30,20);assert.equal(c.count,0);
});
test('a missing receiving wrist cannot confirm the opposite hand',()=>{
 const p=person();p.confidence[9]=0;assert.equal(trial({reps:1,pose:p}).counter.count,0);
});
test('unobserved floor evidence is not invented when the feet disappear',()=>{
 const p=person();p.confidence[15]=p.confidence[16]=0;assert.equal(trial({pose:p}).counter.count,0);
});
test('a sustained ball gap rejects the uncertain flight',()=>{
 const result=trial({reps:1,period:1,missing:({phase})=>phase>.2&&phase<.65});assert.equal(result.counter.count,0);assert.ok(result.counter.rejected.some(event=>event.control_status==='rejected_tracking_gap'));
});
test('a loose double bounce before the other hand receives the ball is a mishandle',()=>{
 const c=new CrossoverCounter(),p=person(),push=(t,x,y)=>c.update([],[x,y,60],p,t,20);
 push(-.1,840,350);push(0,840,350);
 // Two floor contacts, with no wrist receipt in between.
 for(const [i,x,y] of [[1,800,450],[2,740,560],[3,680,630],[4,650,570],[5,620,490],[6,590,540],[7,560,630],[8,500,500],[9,440,350],[10,440,350]])push(i*.1,x,y);
 assert.equal(c.count,0);assert.ok(c.rejected.some(e=>e.control_status==='rejected_second_bounce_without_receipt'));
});
test('an unowned fly-by after a bounce is not a controlled receipt',()=>{
 const c=new CrossoverCounter(),p=person();
 for(const [time,x,y] of [[-.1,840,350],[0,840,350],[.1,780,450],[.2,710,580],[.3,650,630],[.4,580,550],[.5,500,450],[.6,440,395],[.7,350,320],[.8,300,270],[.9,250,250],[1,220,250]])c.update([],[x,y,60],p,time,20);
 assert.equal(c.count,0);
});
test('a ball gap requires new hand acquisition before another flight can count',()=>{
 const c=new CrossoverCounter(),p=person();c.update([],[840,350,60],p,0,20);c.update([],[740,500,60],p,.1,20);c.update([],null,p,.4,20);
 assert.equal(c.held,null);assert.equal(c.flight,null);
});
test('pre-Go movement and a receiving hand after Time do not count',()=>{
 const p=person(),c=new CrossoverCounter();
 for(let i=0;i<90;i++){const phase=(i%30)/30;c.update([],[840-400*phase,350+280*Math.sin(Math.PI*phase),60],p,-3+i/30,20);}assert.equal(c.count,0);
 assert.equal(trial({reps:1,deadline:.3}).counter.count,0);
});
test('duplicate input times do not duplicate a rep',()=>{
 const source=trial({reps:1}),c=new CrossoverCounter();for(const row of source.frames)for(let i=0;i<2;i++)c.update([],row.measurement,row.person,row.time,20);assert.equal(c.count,1);
});
test('both wrists must be seen before crossovers; either starting hand can pass setup',()=>{
 const p=person();for(const x of [440,840]){
  const checks=evaluateCameraSetup(p,ball(x,350),1280,720,{handMode:'both'});
  assert.equal(checks.valid,true);assert.equal(setupCondition(checks,true,true,{handMode:'either'}).valid,true);
  assert.match(setupInstruction(checks,true,true,setupCondition(checks,true,true,{handMode:'either'}),{handMode:'either'}).message,/either hand/);
 }
 for(const index of [9,10]){const hidden=structuredClone(p);hidden.confidence[index]=0;assert.equal(evaluateCameraSetup(hidden,ball(840,350),1280,720,{handMode:'both'}).valid,false);}
});
test('the crossover setup cannot Go on a stale body or an unlocked ball',()=>{
 const c=new SetupReadinessClock({handMode:'either'}),good={valid:true,body:true,hand:true,floor:true,ball:true,owned:true,rightHand:false};
 for(let i=0;i<30;i++)assert.equal(c.update(i/20,good,true,false).ready,false);
 c.reset(0);for(let i=1;i<99;i++)c.update(i/20,good,true,true);
 const pending=c.update(5,{...good,refreshingBody:true},true,true);assert.equal(pending.ready,false);assert.ok(pending.countdownElapsed<5);
});
test('the crossover ball search covers both hands and stays in the image',()=>{
 const state=createSessionTrackingState(true,'stationary-crossover'),p=person();state.tracker.last=[840,350];
 const roi=sessionROI(state,p,1280,720);assert.ok(roi[0]<440&&roi[2]>840);assert.ok(roi[0]>=0&&roi[2]<=1280);assert.deepEqual(crossoverROI(null,state.tracker,1280,720),[0,0,1280,720]);
 assert.equal(state.tracker.twoHandedMotion,true);assert.equal(createSessionTrackingState(true,'right-hand-pound').tracker.twoHandedMotion,false);
});
test('reset and countdown rebasing retain the crossover counter and its hand context',()=>{
 const state=createSessionTrackingState(true,'stationary-crossover'),p=person();state.counter.update([],[840,350,60],p,-.2,20);shiftPreGoTimeline(state,.3);
 assert.equal(state.counter.points[0].timestamp,-.5);assert.equal(state.validator.context[0].time,-.5);assert.equal(state.counter.held.time,-.5);
 resetSessionTrackingCounter(state);assert.equal(state.counter,state.validator);assert.equal(state.counter.count,0);assert.equal(state.configuration.counterRevision,'CROSS 01');
});
test('saved test details reproduce the count and retain both hand and full-flight replay evidence',()=>{
 const {frames}=trial({hold:0,reps:12,fps:15}),c=new CrossoverCounter(),evidence=new RoundEvidence();
 for(const row of frames){
  const confirmed=c.update([],row.measurement,row.person,row.time,20),selected=row.measurement?ball(...row.measurement):null;
  evidence.record({capturedAt:100+row.time,sourceVideoTime:20+row.time,inputPhase:row.time<0?'countdown':'active',phase:row.time<0?'countdown':'active',roi:[0,0,1280,720],balls:selected?[selected]:[],selected,person:row.person,positionChecks:{},counterFrame:c.frame,count:c.count,proposedCount:c.count,confirmed,handoffState:c.snapshot()});
 }
 const data=evidence.export({startedAt:100,drillKey:'stationary-crossover',trackerRevision:'CROSS 01',timerSeconds:20,displayedCount:c.count}),replay=replayCrossovers(data);
 assert.equal(replay.count,12);assert.deepEqual(replay.countedReps.map(e=>[e.from_hand,e.to_hand]),c.confirmed.map(e=>[e.from_hand,e.to_hand]));
 assert.ok(data.frames.every(f=>f.handoffState));
 for(const rep of data.countedReps){assert.ok(rep.reviewFrom<=rep.floorTime&&rep.floorTime<rep.time);assert.equal(replayStart(rep.time,20,rep.reviewFrom),rep.reviewFrom);}
});
