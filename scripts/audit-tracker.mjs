// Uses saved detections only; does not execute the detector on video pixels.
import fs from 'node:fs';
import {basename} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {percentile} from '../src/lib/ai/poundCore.mjs';
import {replayProfileCounter} from '../src/lib/ai/recordedProfile.mjs';
import {replayBallLock} from './replay-ball-lock.mjs';

function milliseconds(values){
 const a=values.filter(Number.isFinite).filter(x=>x>=0).map(x=>x*1000);
 const round=n=>Math.round(n*10)/10;
 return a.length?{samples:a.length,median:round(percentile(a,.5)),p95:round(percentile(a,.95)),max:round(Math.max(...a))}:null;
}
export function auditTracker(data){
 if(data.schema!=='courtstreak-round-evidence-v1'||(data.drillKey!=null&&data.drillKey!=='right-hand-pound'))throw new Error('Expected right-hand-pound test-details JSON, not a video or a profile report.');
 const active=data.frames.filter(f=>f.inputPhase==='active'&&Number.isFinite(f.elapsed));
 const captureGaps=active.slice(1).map((f,i)=>f.elapsed-active[i].elapsed);
 const delays=(data.countedReps??[]).map(e=>e.confirmedElapsed-e.time);
 const counterReplay=replayProfileCounter(data);
 const currentSettings={handContinuity:true,objectBackgroundRadius:true,timedContinuity:true,strongContinuity:true,directionalPeaks:true,timeWindows:true};
 const lock05=replayBallLock(data,currentSettings),count06=replayBallLock(data,{...currentSettings,earlyConfirmation:true});
 return {sourceCounter:data.trackerRevision,sourceBallLock:data.ballIdentityRevision??null,savedDisplay:data.displayedCount,
  exactCounterReplay:counterReplay,currentCount05Lock05:{accepted:lock05.accepted,proposed:lock05.proposed,changedSelections:lock05.changedFrames.length,roiMismatches:lock05.roiMismatches,confirmationDelayMs:lock05.confirmationDelayMs},
  candidateCount06Lock05:{accepted:count06.accepted,proposed:count06.proposed,confirmationDelayMs:count06.confirmationDelayMs,sameAcceptedEvents:JSON.stringify(count06.events)===JSON.stringify(lock05.events)},
  activeCaptureGapsMs:milliseconds(captureGaps),savedConfirmationDelayMs:milliseconds(delays),
  gapsOver100ms:captureGaps.filter(x=>x>.1).length,
  limitations:['Saved detections and poses only; this does not rerun the detector or measure a new phone session.','Saved confirmation times use the captured-frame clock, not the moment the updated count appears on screen.','Neither a filename nor an accepted total establishes the true video bounce count.','Historical logs may omit terminal confirmations; inspect recordedAcceptedEvents and unrecordedDisplayedEvents.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 const files=args.length?args:['19-reps','20-reps','21-reps','5-reps','oct22-count05-fast25','oct22-lock03-slow15','oct22-medium20','oct22-slow17'].map(n=>fileURLToPath(new URL(`../tests/fixtures/ball-lock/${n}.json`,import.meta.url)));
 for(const path of files){try{console.log(JSON.stringify({file:basename(path),...auditTracker(JSON.parse(fs.readFileSync(path,'utf8')))},null,2));}catch(e){console.error(`${basename(path)}: ${e.message}`);process.exitCode=1;}}
}
