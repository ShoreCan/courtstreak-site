import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {BallIdentityTracker,GapAwareBounceCounter,PoundControlValidator,geometry} from '../src/lib/ai/poundCore.mjs';

export function replayBallLock(data,{handContinuity=false,objectBackgroundRadius=false,timedContinuity=false,directionalPeaks=false,timeWindows=false}={}){
 if(data.droppedFrameRecords)throw new Error('Early inputs were discarded; an exact identity replay is unavailable.');
 if(!Array.isArray(data.frames)||!Array.isArray(data.frameSize))throw new Error('Expected a CourtStreak round-evidence JSON.');
 const tracker=new BallIdentityTracker({handContinuity,objectBackgroundRadius,timedContinuity});
 let counter=new GapAwareBounceCounter({directionalPeaks,timeWindows}),validator=new PoundControlValidator(),previous=0;
 const changedFrames=[],restoredFrames=[],lostFrames=[],events=[];
 let selectionMatches=0,selectedFrames=0,roiMismatches=0;
 for(const f of data.frames){
  const active=['active','review'].includes(f.inputPhase),phase=active?'drill':f.inputPhase;
  const roi=active?tracker.roi(...data.frameSize):[0,0,...data.frameSize];
  if(f.roi&&JSON.stringify(roi)!==JSON.stringify(f.roi))roiMismatches++;
  const ball=tracker.select(f.balls,f.person,phase,...data.frameSize,f.elapsed??f.capturedAt);
  const same=JSON.stringify(ball)===JSON.stringify(f.selected);
  if(same)selectionMatches++;else changedFrames.push(f.frameId);
  if(ball)selectedFrames++;
  if(ball&&!f.selected)restoredFrames.push(f.frameId);
  if(!ball&&f.selected)lostFrames.push(f.frameId);
  const cf=f.counterFrame;
  if(cf==null||cf===previous)continue;
  if(cf<previous){counter=new GapAwareBounceCounter({directionalPeaks,timeWindows});validator=new PoundControlValidator();previous=0;}
  if(cf!==previous+1)throw new Error(`Missing counter input at frame ${f.frameId}.`);
  const g=ball?geometry(ball):null,measurement=g?[...g.center,g.diameter]:null;
  const proposals=counter.update(f.elapsed,measurement?measurement.slice(1):null,data.frameSize[1]);
  validator.update(proposals,measurement,f.person,f.elapsed,data.timerSeconds??20).forEach(e=>counter.rememberControlledFloor(e));
  previous=cf;
 }
 for(const e of validator.confirmed)events.push({time:e.event_timestamp_exact??e.event_time_seconds,path:e.validation_path});
 return {handContinuity,objectBackgroundRadius,timedContinuity,directionalPeaks,frames:data.frames.length,selectionMatches,selectedFrames,changedFrames,restoredFrames,lostFrames,roiMismatches,proposed:counter.count,accepted:validator.count,events,
  limit:'Cached detections and poses only; no new model execution, live FPS, automatic labels, or device accuracy measurement.'};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length<3){console.error('Usage: node scripts/replay-ball-lock.mjs /path/to/test-details.json [...]');process.exitCode=1;}
 for(const path of process.argv.slice(2)){
  const data=JSON.parse(fs.readFileSync(path,'utf8'));
  console.log(JSON.stringify({file:path,savedDisplay:data.displayedCount,recordedEvents:data.countedReps?.length,
   baseline:replayBallLock(data,{handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,directionalPeaks:true}),candidate:replayBallLock(data,{handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,directionalPeaks:true,timeWindows:true})},null,2));
 }
}
