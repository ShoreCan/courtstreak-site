// A diagnostic second detector view on the same frozen source image. This
// costs extra inference and is not enabled in the live camera tracker.
import fs from 'node:fs';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createSessionTrackingState} from '../../src/lib/ai/sessionTracking.mjs';
import {floorViewROI,mergeFloorProposals,FLOOR_VIEW_REVISION} from '../../src/lib/ai/floorViewPolicy.mjs';
const [input,video,output]=process.argv.slice(2),trial=JSON.parse(fs.readFileSync(input)),state=createSessionTrackingState(true,'right-hand-pound');
for(const row of trial.rows.filter(r=>r.time<trial.warmupSeconds))state.tracker.select(row.balls,row.person,'setup',1280,720,row.time);
const d=state.tracker.typical(),lane=state.tracker.lane();
const worker=spawn('python3',['-u',fileURLToPath(new URL('./crossover-video-worker.py',import.meta.url))],{stdio:['pipe','pipe','inherit']});
const replies=readline.createInterface({input:worker.stdout})[Symbol.asyncIterator](),rows=[];
let calls=0,totalMs=0;
try{
 for(const row of trial.rows){
  const p=row.person,roi=floorViewROI({person:p,measurement:row.measurement,diameter:d,lane,phase:row.elapsed>=0?'drill':'setup',width:1280,height:720});
  if(!roi){rows.push(row);continue;}
  worker.stdin.write(JSON.stringify({path:video,frameIndex:row.frame,roi,minimumBallScore:.0001,cachedPerson:p})+'\n');
  const reply=await replies.next();if(reply.done)throw new Error('Secondary detector stopped');
  const result=JSON.parse(reply.value),combined=mergeFloorProposals(row.balls,result.balls);
  calls++;totalMs+=Object.values(result.timings.ball).reduce((a,b)=>a+b,0);
  const decisions=combined.map((c,index)=>{const original=row.balls.indexOf(c);return original>=0?{...row.selectionDecisions[original],candidateIndex:index}:{candidateIndex:index,status:'not_selected',reason:'secondary_floor_proposal'};});
  rows.push({...row,primaryBalls:row.balls,primarySelectionDecisions:row.selectionDecisions,selectedEvidenceSource:'primary_detector',balls:combined,selectionDecisions:decisions,secondaryBalls:result.balls,secondaryROI:roi,secondaryTimings:result.timings.ball});
  if(calls%100===0)console.log(JSON.stringify({calls,time:row.time}));
 }
 fs.writeFileSync(output,JSON.stringify({...trial,configuration:{...trial.configuration,secondaryDetectorRevision:FLOOR_VIEW_REVISION},secondaryDetector:{calls,totalMs,meanMs:totalMs/calls,baselineIdentityAndCropUnchanged:true},rows}));
 console.log(JSON.stringify({done:output,calls,meanMs:totalMs/calls}));
}finally{worker.stdin.end();if(worker.exitCode===null)await new Promise(resolve=>worker.once('exit',resolve));}
