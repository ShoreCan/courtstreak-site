// Forensics only: the long setup prefix was dropped from this evidence file.
// Verify retained-input baseline parity; do not claim an exact identity-state replay.
import {BallIdentityTracker,createPoundCounter,PoundControlValidator,geometry} from '../../src/lib/ai/poundCore.mjs';
export function replayRetainedRound(data,corroboratedContinuity=false){
 const tracker=new BallIdentityTracker({handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,strongContinuity:true,corroboratedContinuity});
 let counter=createPoundCounter(data.trackerRevision),validator=new PoundControlValidator(),previous=0;
 const changes=[];let activeFrames=0,activeMatches=0;
 for(const f of data.frames){
  const active=['active','review'].includes(f.inputPhase),ball=tracker.select(f.balls,f.person,active?'drill':f.inputPhase,...data.frameSize,f.elapsed??f.capturedAt);
  if(JSON.stringify(ball)!==JSON.stringify(f.selected))changes.push(f.frameId);
  if(active){activeFrames++;if(JSON.stringify(ball)===JSON.stringify(f.selected))activeMatches++;}
  const cf=f.counterFrame;if(cf==null||cf===previous)continue;
  if(cf<previous){counter=createPoundCounter(data.trackerRevision);validator=new PoundControlValidator();previous=0;}
  if(cf!==previous+1)throw new Error(`Missing counter input at ${f.frameId}`);
  const g=ball?geometry(ball):null,m=g?[...g.center,g.diameter]:null;
  const proposals=counter.update(f.elapsed,m?m.slice(1):null,data.frameSize[1]);
  validator.update(proposals,m,f.person,f.elapsed,data.timerSeconds).forEach(e=>counter.rememberControlledFloor(e));previous=cf;
 }
 return {accepted:validator.count,proposed:counter.count,events:validator.confirmed,changes,activeFrames,activeMatches,
  exactIdentityReplay:false,droppedSetupFrames:data.droppedFrameRecords};
}
