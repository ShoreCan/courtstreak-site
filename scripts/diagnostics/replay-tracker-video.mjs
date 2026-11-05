// Offline diagnostics use production selection/counter code. Native CPU timings
// are not Safari timings. JSON configuration names the source and every option.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createSessionTrackingState,sessionROI,updateSessionCounter} from '../../src/lib/ai/sessionTracking.mjs';
import {physicalPoseSides} from '../../src/lib/ai/poseCoordinates.mjs';
import {geometry} from '../../src/lib/ai/poundCore.mjs';
import {ballProposalMinimumScore} from '../../src/lib/ai/ballProposalPolicy.mjs';

const config=JSON.parse(fs.readFileSync(process.argv[2]));
const cached=config.observations?JSON.parse(fs.readFileSync(config.observations)):null;
const cachedRows=cached?.observations??cached?.rows;
const drillKey=config.drillKey??'stationary-crossover';
const state=createSessionTrackingState(true,drillKey,config.revision??'CROSS 11');
if(config.identityOptions){Object.assign(state.tracker,config.identityOptions);state.configuration={...state.configuration,identityOptions:{...state.configuration.identityOptions,...config.identityOptions}};}
const video=config.video&&path.resolve(config.video);
const source=video?{name:path.basename(video),sha256:crypto.createHash('sha256').update(fs.readFileSync(video)).digest('hex')}:cached.sourceVideo;
const times=cachedRows?.map(r=>r.time)??JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','frame=best_effort_timestamp_time','-of','json',video],{maxBuffer:20*1024*1024})).frames.map(f=>Number(f.best_effort_timestamp_time));
const crossover=drillKey==='stationary-crossover';
let warmup=config.warmupSeconds??(crossover?2:null),calibration=null,go=false,person=null,nextSample=0;
const reference=config.reference?JSON.parse(fs.readFileSync(config.reference)).calibration:cached?.calibration;
const observed=[],rows=[],started=performance.now();
const native=!cached||config.rerunBall;
const worker=native?spawn('python3',['-u',fileURLToPath(new URL('./crossover-video-worker.py',import.meta.url))],{stdio:['pipe','pipe','inherit']}):null;
const replies=worker&&readline.createInterface({input:worker.stdout})[Symbol.asyncIterator]();
function handReference(p,g){
 if(!p||!g)return null;
 const hands=[['left',9],['right',10]].filter(([,i])=>p.confidence[i]>=.22).map(([hand,i])=>({hand,distance:Math.hypot(g.center[0]-p.xy[i][0],g.center[1]-p.xy[i][1])/g.diameter})).sort((a,b)=>a.distance-b.distance);
 return hands[0]?.distance<=1.15&&(!hands[1]||hands[1].distance-hands[0].distance>=.2)?hands[0]:null;
}
function lock(time){
 if(crossover){
  const samples=reference?.samples??observed.filter(s=>s.hand===observed[0]?.hand);
  if(samples.length>=12){state.tracker.diameters=samples.map(s=>s.diameter);state.tracker.lanes=samples.map(s=>s.x);}
  calibration={method:'Declared recorded pre-roll hand reference; does not validate live setup',samples,borrowedPreRollReference:!!config.reference||!!reference?.borrowedPreRollReference};
 }else calibration={method:'Observed right-hand reference after 450ms, frozen before scoring; not a live setup test',samples:observed,lockedSourceTime:time};
 calibration.ready=state.tracker.ready();state.tracker.freezeCalibration();go=true;
}
try{
 for(let i=0;i<times.length;i++){
  const time=times[i];
  if(config.cadenceHz&&time+1e-6<nextSample)continue;
  if(config.cadenceHz)nextSample=time+1/config.cadenceHz-.001;
  if(config.sourceEndSeconds&&time>config.sourceEndSeconds)break;
  // Freeze the already-observed reference before the next detector pass.
  // Letting that next release box alter setup first can move Go mid-drill.
  if(!crossover&&warmup===null&&time>=.45&&state.tracker.ready()&&state.tracker.last&&person?.confidence?.[10]>=.22&&Math.hypot(state.tracker.last[0]-person.xy[10][0],state.tracker.last[1]-person.xy[10][1])<=Math.max(110,(state.tracker.typical()??0)*2.3))warmup=time;
  if(warmup!==null&&time>=warmup&&!go)lock(time);
  const phase=go?'drill':'setup',roi=go?sessionROI(state,person,1280,720):[0,0,1280,720];
  const minimumBallScore=ballProposalMinimumScore({phase:go?'active':'setup',calibrated:state.tracker.ready(),weakContinuity:state.tracker.weakContinuity});
  let balls,timings=null;
  if(native){
   const request={path:video,frameIndex:cachedRows?.[i]?.frame??i,roi,minimumBallScore,...(config.rerunBall?{cachedPerson:cachedRows[i].person}:{})};
   worker.stdin.write(JSON.stringify(request)+'\n');
   const reply=await replies.next();if(reply.done)throw new Error('Inference worker stopped before its reply');
   const result=JSON.parse(reply.value);person=config.rerunBall?result.person:physicalPoseSides(result.person,true);balls=result.balls;timings=result.timings;
  }else{person=cachedRows[i].person;balls=cachedRows[i].balls;}
  const selected=state.tracker.select(balls,person,phase,1280,720,time),g=selected?geometry(selected):null,hand=handReference(person,g);
  if(!go&&selected?.score>=.008&&hand)observed.push({frame:i,time,hand:hand.hand,diameter:g.diameter,x:g.center[0]});
  const elapsed=time-(warmup??time+1),measurement=g?[...g.center,g.diameter]:null;
  const {confirmed,proposals}=updateSessionCounter(state,elapsed,measurement,person,720,config.deadlineSeconds??Infinity);
  rows.push({frame:cachedRows?.[i]?.frame??i,time,elapsed,phase,roi,minimumBallScore,person,balls,selected,selectionDecisions:state.tracker.decisions,measurement,events:confirmed,proposals,count:state.validator.count,counterUsable:crossover?state.counter.points.at(-1).observed:!!measurement,timings});
  if(native&&rows.length%150===0){
   console.log(JSON.stringify({source:source.name,frames:rows.length,time:+time.toFixed(2),count:state.validator.count,warmup,calibrationReady:calibration?.ready}));
   fs.writeFileSync(config.output+'.partial',JSON.stringify({sourceVideo:source,calibration,warmupSeconds:warmup,rows}));
  }
 }
 const report={schema:'courtstreak-recorded-tracker-trial-v2',sourceVideo:source,configuration:state.configuration,warmupSeconds:warmup,calibration,frameSize:[1280,720],mirroredInput:true,nativeInference:native,poseReusedFromSameFrame:!!config.rerunBall,sourceFrames:times.length,processedFrames:rows.length,wallSeconds:(performance.now()-started)/1000,count:state.validator.count,confirmed:state.validator.confirmed,rejected:state.validator.rejected,pending:state.validator.pending,rows,
  limitations:['Recorded video diagnostics; physical iPhone/Safari performance remains unverified.','Native ONNX CPU and Pillow preprocessing differ from browser Canvas/WebGPU.','Replay of cached proposals does not validate changing detector crop feedback.','Reference-assisted calibration, when declared, is not proof of unassisted live setup.']};
 fs.mkdirSync(path.dirname(config.output),{recursive:true});fs.writeFileSync(config.output,JSON.stringify(report));
 console.log(JSON.stringify({done:source.name,revision:state.configuration.counterRevision,count:report.count,calibrationReady:calibration?.ready,frames:rows.length,seconds:+report.wallSeconds.toFixed(1),output:config.output}));
}finally{worker?.stdin.end();worker?.kill();}
