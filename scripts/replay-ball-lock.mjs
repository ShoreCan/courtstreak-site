import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {BallIdentityTracker,GapAwareBounceCounter,PoundControlValidator,geometry,percentile} from '../src/lib/ai/poundCore.mjs';
import {CURRENT_POUND_CONFIGURATION,configurationForEvidence,replayOptionsForConfiguration} from '../src/lib/ai/trackerConfiguration.mjs';

export function replayBallLock(data,{handContinuity=false,objectBackgroundRadius=false,timedContinuity=false,directionalPeaks=false,timeWindows=false,strongContinuity=false,earlyConfirmation=false,corroboratedContinuity=false,floorContinuity=false,turnContinuity=false,weakContinuity=false,regularFloorContinuity=false,lowControlledPounds=false,earlySampling=false,symmetricReturns=false,diagnostics=false}={}){
 if(data.droppedFrameRecords)throw new Error('Early inputs were discarded; an exact identity replay is unavailable.');
 if(!Array.isArray(data.frames)||!Array.isArray(data.frameSize))throw new Error('Expected a CourtStreak round-evidence JSON.');
 const tracker=new BallIdentityTracker({handContinuity,objectBackgroundRadius,timedContinuity,strongContinuity,corroboratedContinuity,floorContinuity,turnContinuity,weakContinuity,regularFloorContinuity,diagnostics});
 let counter=new GapAwareBounceCounter({directionalPeaks,timeWindows,earlyConfirmation,lowControlledPounds,earlySampling,symmetricReturns}),validator=new PoundControlValidator({lowControlledPounds}),previous=0;
 const changedFrames=[],restoredFrames=[],lostFrames=[],events=[],confirmationDelays=[],frameDecisions=[];
 let selectionMatches=0,selectedFrames=0,roiMismatches=0;
 for(const f of data.frames){
  const active=['active','review'].includes(f.inputPhase),phase=active?'drill':f.inputPhase;
  const roi=active?tracker.roi(...data.frameSize):[0,0,...data.frameSize];
  if(f.roi&&JSON.stringify(roi)!==JSON.stringify(f.roi))roiMismatches++;
  const ball=tracker.select(f.balls,f.person,phase,...data.frameSize,f.elapsed??f.capturedAt);
  if(diagnostics&&f.inputPhase==='active'&&Number.isFinite(f.elapsed)&&f.elapsed>=0&&f.elapsed<(data.timerSeconds??20))frameDecisions.push({frameId:f.frameId,elapsed:f.elapsed,selected:!!ball,decisions:tracker.decisions.map(d=>({...d}))});
  const same=JSON.stringify(ball)===JSON.stringify(f.selected);
  if(same)selectionMatches++;else changedFrames.push(f.frameId);
  if(ball)selectedFrames++;
  if(ball&&!f.selected)restoredFrames.push(f.frameId);
  if(!ball&&f.selected)lostFrames.push(f.frameId);
  const cf=f.counterFrame;
  if(cf==null||cf===previous)continue;
  if(cf<previous){counter=new GapAwareBounceCounter({directionalPeaks,timeWindows,earlyConfirmation,lowControlledPounds,earlySampling,symmetricReturns});validator=new PoundControlValidator({lowControlledPounds});previous=0;}
  if(cf!==previous+1)throw new Error(`Missing counter input at frame ${f.frameId}.`);
  const g=ball?geometry(ball):null,measurement=g?[...g.center,g.diameter]:null;
  const proposals=counter.update(f.elapsed,measurement?measurement.slice(1):null,data.frameSize[1]);
  validator.update(proposals,measurement,f.person,f.elapsed,data.timerSeconds??20).forEach(e=>{counter.rememberControlledFloor(e);confirmationDelays.push((f.elapsed-(e.event_timestamp_exact??e.event_time_seconds))*1000);});
  previous=cf;
 }
 for(const e of validator.confirmed)events.push({time:e.event_timestamp_exact??e.event_time_seconds,path:e.validation_path});
 return {handContinuity,objectBackgroundRadius,timedContinuity,directionalPeaks,frames:data.frames.length,selectionMatches,selectedFrames,changedFrames,restoredFrames,lostFrames,roiMismatches,proposed:counter.count,accepted:validator.count,events,confirmationDelayMs:confirmationDelays.length?{samples:confirmationDelays.length,median:percentile(confirmationDelays,.5),p95:percentile(confirmationDelays,.95)}:null,
  ...(diagnostics?{frameDecisions}:{}),limit:'Cached detections and poses only; no new model execution, live FPS, automatic labels, or device accuracy measurement.'};
}

export function replayConfiguredRound(data,configuration=configurationForEvidence(data),{diagnostics=false}={}){
 const resolvedOptions=replayOptionsForConfiguration(configuration);
 const result=replayBallLock(data,{...resolvedOptions,diagnostics});
 return {available:true,configuration,resolvedOptions,...result,cropCompatible:result.roiMismatches===0,
  matchesSavedAcceptedEvents:Array.isArray(data.countedReps)?result.events.length===data.countedReps.length&&result.events.every((e,i)=>Math.abs(e.time-data.countedReps[i].time)<1e-8):null,
  comparisonLimit:result.roiMismatches?'Changed requested crops require fresh model inference; these cached counts are not a full-pipeline result.':result.limit};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const files=process.argv.slice(2);
 if(!files.length){console.error('Usage: node scripts/replay-ball-lock.mjs /path/to/test-details.json [...]');process.exitCode=1;}
 for(const file of files){
  try{
   const data=JSON.parse(fs.readFileSync(file,'utf8'));
   let recorded;
   try{recorded=replayConfiguredRound(data);}catch(error){recorded={available:false,reason:error.message};}
   const current=replayConfiguredRound(data,CURRENT_POUND_CONFIGURATION);
   console.log(JSON.stringify({file,savedDisplay:data.displayedCount,recordedEvents:data.countedReps?.length,recorded,current},null,2));
   if(!recorded.available||!recorded.cropCompatible||recorded.selectionMatches!==recorded.frames||recorded.matchesSavedAcceptedEvents===false||!current.cropCompatible)process.exitCode=1;
  }catch(error){console.error(`${file}: ${error.message}`);process.exitCode=1;}
 }
}

