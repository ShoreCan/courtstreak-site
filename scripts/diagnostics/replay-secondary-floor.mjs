// A diagnostic second detector view on the same frozen source image. This
// costs extra inference and is not enabled in the live camera tracker.
import fs from 'node:fs';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createSessionTrackingState} from '../../src/lib/ai/sessionTracking.mjs';
const [input,video,output]=process.argv.slice(2),trial=JSON.parse(fs.readFileSync(input)),state=createSessionTrackingState(true,'right-hand-pound');
for(const row of trial.rows.filter(r=>r.time<trial.warmupSeconds))state.tracker.select(row.balls,row.person,'setup',1280,720,row.time);
const d=state.tracker.typical(),lane=state.tracker.lane();
const worker=spawn('python3',['-u',fileURLToPath(new URL('./crossover-video-worker.py',import.meta.url))],{stdio:['pipe','pipe','inherit']});
const replies=readline.createInterface({input:worker.stdout})[Symbol.asyncIterator](),rows=[];
let calls=0,totalMs=0;
const iou=(a,b)=>{const overlap=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));return overlap/Math.max(1,(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-overlap);};
try{
 for(const row of trial.rows){
  const p=row.person,visible=[10,15,16].every(i=>p?.confidence?.[i]>=.5&&p.xy[i].every(v=>Number.isFinite(v)&&v>0));
  const feet=visible?Math.max(p.xy[15][1],p.xy[16][1]):null;
  const trigger=visible&&row.elapsed>=0&&(!row.measurement||row.measurement[2]<d*.8||row.measurement[1]+row.measurement[2]*.5>=feet-d*3);
  if(!trigger){rows.push(row);continue;}
  const roi=[Math.max(0,Math.floor(Math.min(lane,p.xy[10][0])-d*2.2)),Math.max(0,Math.floor(feet-d*4.5)),Math.min(1280,Math.ceil(Math.max(lane,p.xy[10][0])+d*2.2)),Math.min(720,Math.ceil(feet+d*.9))];
  worker.stdin.write(JSON.stringify({path:video,frameIndex:row.frame,roi,minimumBallScore:.0001,cachedPerson:p})+'\n');
  const reply=await replies.next();if(reply.done)throw new Error('Secondary detector stopped');
  const result=JSON.parse(reply.value),combined=[];
  for(const c of [...row.balls,...result.balls].sort((a,b)=>b.score-a.score))if(combined.every(k=>iou(k.box,c.box)<.7))combined.push(c);
  calls++;totalMs+=Object.values(result.timings.ball).reduce((a,b)=>a+b,0);
  const decisions=combined.map((c,index)=>{const original=row.balls.indexOf(c);return original>=0?{...row.selectionDecisions[original],candidateIndex:index}:{candidateIndex:index,status:'not_selected',reason:'secondary_floor_proposal'};});
  rows.push({...row,primaryBalls:row.balls,primarySelectionDecisions:row.selectionDecisions,selectedEvidenceSource:'primary_detector',balls:combined,selectionDecisions:decisions,secondaryBalls:result.balls,secondaryROI:roi,secondaryTimings:result.timings.ball});
  if(calls%100===0)console.log(JSON.stringify({calls,time:row.time}));
 }
 fs.writeFileSync(output,JSON.stringify({...trial,configuration:{...trial.configuration,secondaryDetectorRevision:'SAME FRAME FLOOR VIEW 01'},secondaryDetector:{calls,totalMs,meanMs:totalMs/calls,baselineIdentityAndCropUnchanged:true},rows}));
 console.log(JSON.stringify({done:output,calls,meanMs:totalMs/calls}));
}finally{worker.stdin.end();if(worker.exitCode===null)await new Promise(resolve=>worker.once('exit',resolve));}
