// Uses actual saved selections and causal body inputs. No inference, synthetic
// frames or latency simulation. Reconstruct pre-Go clocks before auditing rules.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createSessionTrackingState,resetSessionTrackingCounter,updateSessionCounter} from '../../src/lib/ai/sessionTracking.mjs';
import {geometry} from '../../src/lib/ai/poundCore.mjs';
import {CountdownReadinessClock} from '../../src/lib/ai/countdownReadiness.mjs';
import {shiftPreGoTimeline} from '../../src/lib/ai/setupGuidance.mjs';
import {RoundEvidence} from '../../src/lib/ai/roundEvidence.mjs';

export function replaySavedCounter(data,{configure=()=>{},onFrame=()=>{}}={}){
 if(data.droppedFrameRecords||!Array.isArray(data.frames)||!data.frames.length)throw new Error('Complete saved counter inputs are required.');
 if(data.trackerCheckRevision!=='CAMERA TEST 22')throw new Error('This audit reconstructs the deployed Test22 flow only.');
 const cross=data.drillKey==='stationary-crossover';
 const state=createSessionTrackingState(true,data.drillKey,data.trackerRevision,false,{enhancedTracking:true});
 state.configuration=data.trackerConfiguration;
 const timer=data.timerSeconds,clock=new CountdownReadinessClock({handMode:cross?'either':'right'}),evidence=new RoundEvidence(),rows=[];
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
   const readiness=clock.update(now,frame.positionChecks,frame.setupReadiness.speedReady,frame.setupReadiness.ballLockReady);
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
   result=updateSessionCounter(state,time,g?[...g.center,g.diameter]:null,frame.person,data.frameSize[1],timer,candidates);
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
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2),data=JSON.parse(fs.readFileSync(input)),result=replaySavedCounter(data);
 const {state,...report}=result;
 if(output)fs.writeFileSync(output,JSON.stringify(report));
 console.log(JSON.stringify({input,count:result.count,recorded:result.recordedCount,timeline:result.countTimelineMatches,records:result.acceptedRecordsMatch,mismatches:result.timelineMismatches.slice(0,3)}));
 if(!result.countTimelineMatches||!result.acceptedRecordsMatch)process.exitCode=1;
}
