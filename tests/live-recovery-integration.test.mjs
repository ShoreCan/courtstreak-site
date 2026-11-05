import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionTrackingState,resetSessionTrackingCounter,updateSessionCounter} from '../src/lib/ai/sessionTracking.mjs';
import {floorViewROI,mergeFloorProposals} from '../src/lib/ai/floorViewPolicy.mjs';
import {LiveTrackingBudget,trackingCadence} from '../src/lib/ai/liveTrackingBudget.mjs';
import {RoundEvidence} from '../src/lib/ai/roundEvidence.mjs';
import {replayProfileCounter} from '../src/lib/ai/recordedProfile.mjs';
import {configurationForEvidence} from '../src/lib/ai/trackerConfiguration.mjs';
import {person,ball,trial} from './helpers/crossover-scenarios.mjs';

function calibrated(enhanced){
 const s=createSessionTrackingState(true,'right-hand-pound',undefined,false,{enhancedTracking:enhanced});
 for(let i=0;i<30;i++)s.tracker.select([ball(840,350)],person(),'setup',1280,720,-4+i/30);
 s.tracker.freezeCalibration();return s;
}
test('live recovery preserves the original counter state and resets its own ledger',()=>{
 const baseline=calibrated(false),enhanced=calibrated(true);
 for(const f of trial({sameHand:true,reps:6,fps:30}).frames){
  const balls=f.measurement?[ball(...f.measurement)]:[];
  updateSessionCounter(baseline,f.time,f.measurement,f.person,720,20,balls);
  updateSessionCounter(enhanced,f.time,f.measurement,f.person,720,20,balls);
 }
 assert.deepEqual(enhanced.validator.confirmed,baseline.validator.confirmed);
 assert.deepEqual(enhanced.counter.floorSamples,baseline.counter.floorSamples);
 assert.equal(enhanced.recovery.ledger.count,6);
 resetSessionTrackingCounter(enhanced);assert.equal(enhanced.recovery.ledger.count,0);assert.equal(enhanced.validator.count,0);
});
test('enhanced pounds pair fresh body and ball inputs; legacy scheduling stays available',()=>{
 const a=calibrated(true),b=calibrated(false);
 assert.equal(a.configuration.observationPolicy.poseEveryPass,true);
 assert.equal(a.configuration.observationPolicy.refreshBallFrame,false);
 assert.equal(a.configuration.observationPolicy.asyncPose,false);
 assert.equal(b.recovery,undefined);
 const evidence={trackerRevision:a.configuration.counterRevision,ballIdentityRevision:a.configuration.identityRevision,liveFrameRevision:a.configuration.liveFrameRevision,trackerConfiguration:JSON.parse(JSON.stringify(a.configuration))};
 assert.deepEqual(configurationForEvidence(evidence),a.configuration);
 evidence.trackerConfiguration.observationPolicy.refreshBallFrame=true;assert.throws(()=>configurationForEvidence(evidence),/conflicts/);
 assert.throws(()=>createSessionTrackingState(true,'behind-the-back',undefined,false,{enhancedTracking:true}),/currently supports/);
});
test('live evidence replays the same recovered score and retains actual confirmation timing',()=>{
 const s=calibrated(true),evidence=new RoundEvidence();
 for(const f of trial({sameHand:true,reps:4,fps:30}).frames){
  const balls=f.measurement?[ball(...f.measurement)]:[],result=updateSessionCounter(s,f.time,f.measurement,f.person,720,20,balls);
  evidence.record({capturedAt:100+f.time,decisionCompletedAt:100+f.time+.02,inputPhase:f.time<0?'countdown':'active',phase:f.time<0?'countdown':'active',roi:[0,0,1280,720],balls,selected:balls[0]??null,person:f.person,counterFrame:s.counter.points.at(-1).frame,confirmed:result.confirmed});
 }
 const data=evidence.export({startedAt:100,trackerRevision:s.configuration.counterRevision,recoveryRevision:s.configuration.recoveryRevision,calibratedBallDiameter:s.tracker.typical(),frameSize:[1280,720],timerSeconds:20,displayedCount:s.recovery.ledger.count});
 const replay=replayProfileCounter(data);assert.equal(replay.available,true);assert.equal(replay.accepted,4);assert.equal(replay.matchesRecordedAcceptedEvents,true);
 assert.ok(data.countedReps.every(e=>Math.abs(e.confirmedElapsed-(data.frames.find(f=>f.frameId===e.confirmedOnFrame).elapsed+.02))<1e-8));
});
test('floor view is limited to visible calibrated floor geometry and uncertain/lower ball positions',()=>{
 const p=person(),args={person:p,diameter:60,lane:840,phase:'active',width:1280,height:720};
 assert.deepEqual(floorViewROI(args),[708,390,972,714]);
 assert.equal(floorViewROI({...args,measurement:[840,350,60]}),null);
 assert.equal(floorViewROI({...args,phase:'setup'}),null);
 assert.equal(floorViewROI({...args,calibrated:false}),null);
 assert.equal(floorViewROI({...args,diameter:Infinity}),null);
 assert.equal(floorViewROI({...args,measurement:[1,2,NaN]}),null);
 p.confidence[15]=0;assert.equal(floorViewROI(args),null);
});
test('secondary duplicate proposals do not mutate primary observations',()=>{
 const a=ball(840,600),b={...ball(840,600),score:.99},c=ball(600,500),primary=[a],secondary=[b,c];
 assert.deepEqual(mergeFloorProposals(primary,secondary),[b,c]);assert.deepEqual(primary,[a]);assert.equal(a.score,.95);
});
test('additional model inference is declined when cost or history cannot support the frame budget',()=>{
 const budget=new LiveTrackingBudget();assert.equal(budget.secondaryDecision(10).allowed,false);
 for(let i=0;i<12;i++)budget.observeBase({preprocessMs:1,inferenceMs:8,decodeMs:1});
 assert.equal(budget.secondaryDecision(20).allowed,true);
 assert.equal(budget.secondaryDecision(40).allowed,false);
 assert.equal(budget.secondaryDecision(0,{needed:false}).allowed,false);
 assert.equal(budget.snapshot().secondaryCalls,1);
});
test('cadence cannot pass with slow observations, repeated captures, or a long gap',()=>{
 const fast=Array.from({length:61},(_,i)=>i/30),slow=Array.from({length:21},(_,i)=>i/10);
 assert.equal(trackingCadence(fast).ready,true);assert.equal(trackingCadence(slow).ready,false);
 assert.equal(trackingCadence([...fast,2]).ready,false);
 assert.equal(trackingCadence([...fast,2.3]).ready,false);
 const budget=new LiveTrackingBudget();for(const t of fast){budget.captured(t);budget.captured(t);}
 assert.equal(budget.captures.length,fast.length);assert.equal(budget.cadence().ready,true);
});
test('secondary evidence keeps primary indexing and measured geometry independently inspectable',()=>{
 const e=new RoundEvidence(),proposal=ball(840,600),budget={secondarySkips:{frame_budget:1},cadence:{hz:22}};
 const floor={allowed:true,roi:[1,2,3,4],balls:[proposal],timings:{inferenceMs:10}};
 e.record({capturedAt:1,decisionCompletedAt:1.04,roi:[0,0,1280,720],balls:[],selected:null,floorView:floor,liveBudget:budget,recoveryMeasurement:[840,600,60],confirmed:[]});
 proposal.box[0]=0;floor.roi[0]=99;budget.cadence.hz=0;
 assert.equal(e.frames[0].balls.length,0);assert.equal(e.frames[0].floorView.balls[0].box[0],810);assert.equal(e.frames[0].floorView.roi[0],1);assert.equal(e.frames[0].liveBudget.cadence.hz,22);
});
