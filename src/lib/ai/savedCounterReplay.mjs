// Shared saved-counter replay for offline diagnostics. No model execution or live latency simulation.
import {createSessionTrackingState,resetSessionTrackingCounter,updateSessionCounter} from './sessionTracking.mjs';
import {geometry} from './poundCore.mjs';
import {CountdownReadinessClock,BALL_BRIDGE_COUNTDOWN_REVISION,TRACKING_CHECK_COUNTDOWN_REVISION} from './countdownReadiness.mjs';
import {shiftPreGoTimeline} from './setupGuidance.mjs';
import {RoundEvidence} from './roundEvidence.mjs';
import {configurationForEvidence} from './trackerConfiguration.mjs';

export function replaySavedCounter(data,{configure=()=>{},personForFrame=frame=>frame.person,onFrame=()=>{}}={}){
 if(data.droppedFrameRecords||!Array.isArray(data.frames)||!data.frames.length)throw new Error('Complete saved counter inputs are required.');
 if(!['CAMERA TEST 22','CAMERA TEST 23'].includes(data.trackerCheckRevision))throw new Error('This audit reconstructs the versioned Test22/Test23 session flow only.');
 if(data.trackerConfiguration?.counterRevision!==data.trackerRevision)throw new Error('The saved counter configuration conflicts with its revision label.');
 const cross=data.drillKey==='stationary-crossover';
 if(!cross)configurationForEvidence(data);
 const state=createSessionTrackingState(true,data.drillKey,data.trackerRevision,false,{enhancedTracking:true});
 state.configuration=data.trackerConfiguration;
 const trackingCheck=data.countdownReadinessRevision===TRACKING_CHECK_COUNTDOWN_REVISION;
 const timer=data.timerSeconds,clock=new CountdownReadinessClock({handMode:cross?'either':'right',bridgeBallDropouts:trackingCheck||data.countdownReadinessRevision===BALL_BRIDGE_COUNTDOWN_REVISION,trackingCheck}),evidence=new RoundEvidence(),rows=[];
 let countdownAt=null,started=null;
 const newCounters=()=>{resetSessionTrackingCounter(state);configure(state);};
 newCounters();
 state.tracker.diameters=Array(12).fill(data.calibratedBallDiameter);
 for(const frame of data.frames){
  const now=frame.capturedAt,completed=frame.decisionCompletedAt;
  if(!Number.isFinite(now)||!Number.isFinite(completed)||completed<now)throw new Error('Missing or invalid original observation clocks.');
  if(frame.inputPhase==='setup'&&frame.phase==='countdown'){
   newCounters();clock.reset(now);countdownAt=now;
  }
  if(frame.inputPhase==='countdown'){
   if(countdownAt===null)throw new Error('Missing original countdown start.');
   if(!frame.setupReadiness||typeof frame.setupReadiness.speedReady!=='boolean'||typeof frame.setupReadiness.ballLockReady!=='boolean')throw new Error('Missing original countdown readiness inputs.');
   if(trackingCheck&&typeof frame.setupReadiness.drillStart?.ready!=='boolean')throw new Error('Missing original drill start readiness.');
   const readiness=clock.update(now,frame.positionChecks,frame.setupReadiness.speedReady,frame.setupReadiness.ballLockReady,
    !trackingCheck||frame.setupReadiness.drillStart.ready);
   const revised=now-readiness.countdownElapsed,pause=Math.max(0,revised-countdownAt);
   shiftPreGoTimeline(state,pause);countdownAt=revised;
   if(frame.phase==='active'){
    started=completed;shiftPreGoTimeline(state,completed-(countdownAt+5));
   }
  }
  let result={proposals:[],confirmed:[],count:0};
  if(['countdown','active','review','finished'].includes(frame.phase)){
   const time=started!==null?now-started:now-(countdownAt+5);
   const g=frame.selected?geometry(frame.selected):null;
   const candidates=[...frame.balls,...(frame.floorView?.balls??[])];
   result=updateSessionCounter(state,time,g?[...g.center,g.diameter]:null,personForFrame(frame,time),data.frameSize[1],timer,candidates,{balls:frame.balls,decisions:frame.selectionDecisions??[],floorPixelEvidence:frame.floorPixelEvidence,floorPixelBridge:frame.floorPixelBridge});
   onFrame({state,frame,time,result});
   rows.push({frameId:frame.frameId,time,count:result.count,recordedCount:frame.count,counterFrame:state.counter.points.at(-1)?.frame??null,
    confirmed:result.confirmed,...(cross?{snapshot:state.counter.snapshot()}:{} )});
  }
  evidence.nextFrame=frame.frameId;
  evidence.record({...frame,ms:frame.inferenceMs,timings:frame.detectorTimings,fps:frame.trackingFps,
   proposals:result.proposals,confirmed:result.confirmed});
 }
 if(started===null)throw new Error('Missing original Go frame.');
 const exported=evidence.export({startedAt:started});
 const mismatches=rows.filter(row=>row.count!==row.recordedCount);
 return {count:state.recovery?.ledger.count??state.counter.count,recordedCount:data.displayedCount,
  countTimelineMatches:mismatches.length===0,timelineMismatches:mismatches,
  acceptedRecordsMatch:JSON.stringify(exported.countedReps)===JSON.stringify(data.countedReps),
  countedReps:exported.countedReps,primaryRejected:state.validator.rejected,
  recoveryRejected:state.recovery?.counter.rejected??[],state,rows};
}
