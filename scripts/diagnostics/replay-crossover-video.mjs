import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createSessionTrackingState,sessionROI,updateSessionCounter} from '../../src/lib/ai/sessionTracking.mjs';
import {createCrossoverCounter} from '../../src/lib/ai/crossoverCounter.mjs';
import {physicalPoseSides} from '../../src/lib/ai/poseCoordinates.mjs';
import {geometry} from '../../src/lib/ai/poundCore.mjs';
import {ballProposalMinimumScore} from '../../src/lib/ai/ballProposalPolicy.mjs';

const [videoArg,timestampsArg,outputArg,mode='all',referenceArg]=process.argv.slice(2);
if(!videoArg||!timestampsArg||!outputArg)throw new Error('Usage: node replay-crossover-video.mjs VIDEO TIMESTAMPS.json OUTPUT.json [all|10fps|realtime] [reference-run.json]');
if(!['all','10fps','realtime'].includes(mode))throw new Error('Unknown cadence.');
const video=path.resolve(videoArg),times=JSON.parse(fs.readFileSync(timestampsArg)),warmup=2;
const state=createSessionTrackingState(true,'stationary-crossover'),standard20=createCrossoverCounter('CROSS 02');
state.counter=createCrossoverCounter('CROSS 02');state.validator=state.counter;
const {sizeOutlierRecovery,...publishedCounterOptions}=state.configuration.counterOptions;
state.configuration={...state.configuration,id:state.configuration.id.replace(/^CROSS\d+\//,'CROSS02/'),counterRevision:'CROSS 02',counterOptions:publishedCounterOptions};
const reference=referenceArg?JSON.parse(fs.readFileSync(referenceArg)).calibration:null;
state.tracker.diagnostics=true;
const observed=[];let calibration=null,go=false,nextSample=0,firstHand=null;
const python=spawn('python',['-u',fileURLToPath(new URL('./crossover-video-worker.py',import.meta.url))],{stdio:['pipe','pipe','inherit']});
const replies=readline.createInterface({input:python.stdout})[Symbol.asyncIterator]();
const rows=[],started=performance.now();let playedAt=null;
function handReference(person,g){
 if(!person||!g)return null;
 const hands=[['left',9],['right',10]].filter(([,i])=>person.confidence[i]>=.22).map(([hand,i])=>({hand,distance:Math.hypot(g.center[0]-person.xy[i][0],g.center[1]-person.xy[i][1])/g.diameter})).sort((a,b)=>a.distance-b.distance);
 return hands[0]?.distance<=1.15&&(hands.length===1||hands[1].distance-hands[0].distance>=.2)?hands[0]:null;
}
function calibrate(){
 const samples=reference?.samples??observed.filter(s=>s.hand===firstHand);
 // This is a declared diagnostic reference built from distinct real pre-roll
 // observations. It is not evidence that an in-motion clip passed live setup.
 if(samples.length>=12){state.tracker.diameters=samples.map(s=>s.diameter);state.tracker.lanes=samples.map(s=>s.x);}
 calibration={method:'Observed first-hand reference within the first two seconds; not live setup',samples,ready:state.tracker.ready(),borrowedPreRollReference:!!reference};
}
try{
 for(let i=0;i<times.length;i++){
  const time=times[i];
  if(mode==='10fps'){if(time+1e-6<nextSample)continue;nextSample=time+.099;}
  if(mode==='realtime'&&playedAt!==null){
   const latest=(performance.now()-playedAt)/1000;
   if(i+1<times.length&&times[i+1]<=latest)continue;
   if(time>latest)await new Promise(r=>setTimeout(r,Math.max(0,(time-latest)*1000)));
  }
  const active=time>=warmup;
  if(active&&!go){calibrate();go=true;}
  const phase=active?'drill':'setup',roi=active?sessionROI(state,state.person,1280,720):[0,0,1280,720];
  const minimumBallScore=ballProposalMinimumScore({phase:active?'active':'setup',calibrated:state.tracker.ready(),weakContinuity:state.tracker.weakContinuity});
  const began=performance.now();
  python.stdin.write(JSON.stringify({path:video,frameIndex:i,roi,minimumBallScore})+'\n');
  const reply=await replies.next();if(reply.done)throw new Error('Inference worker exited before returning an observation.');
  const result=JSON.parse(reply.value),person=physicalPoseSides(result.person,true);state.person=person;
  const selected=state.tracker.select(result.balls,person,phase,1280,720,time),g=selected?geometry(selected):null;
  const hand=handReference(person,g);
  if(!active&&selected?.score>=.008&&hand){firstHand??=hand.hand;observed.push({frame:i,time,hand:hand.hand,diameter:g.diameter,x:g.center[0]});}
  const measurement=g?[...g.center,g.diameter]:null;
  const {confirmed,proposals}=updateSessionCounter(state,time-warmup,measurement,person,720,times.at(-1)-warmup);
  standard20.update([],measurement,person,time-warmup,20);
  rows.push({frame:i,time,elapsed:time-warmup,phase,roi,minimumBallScore,person,balls:result.balls,selected,selectionDecisions:state.tracker.decisions,measurement,events:confirmed,proposals,state:state.counter.snapshot(),count:state.counter.count,standard20Count:standard20.count,timings:result.timings,processingMs:performance.now()-began});
  // Loading, session initialization and the first decode are preparation, not
  // an artificial hole in the paced recording's first second.
  playedAt??=performance.now()-time*1000;
  if(rows.length%100===0)console.log(JSON.stringify({video:path.basename(video),mode,frames:rows.length,sourceTime:+time.toFixed(2),count:state.counter.count,wallSeconds:+((performance.now()-started)/1000).toFixed(1)}));
 }
 if(!calibration)calibrate();
 const report={schema:'courtstreak-recorded-crossover-trial-v1',sourceVideo:{name:path.basename(video),sha256:crypto.createHash('sha256').update(fs.readFileSync(video)).digest('hex')},
  modelManifest:JSON.parse(fs.readFileSync(new URL('../../public/ai/models/manifest.json',import.meta.url))),
  sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(new URL('../..',import.meta.url)),encoding:'utf8'}).trim(),mode,frameSize:[1280,720],mirroredInput:true,warmupSeconds:warmup,calibration,configuration:state.configuration,
  limitations:['Recorded pixels, not a physical live-camera test.','Same pinned ONNX models; native CPU inference and Pillow bilinear rasterization differ from Safari WebGPU/Canvas.','Body and ball share each frozen source image. Active ball crops follow the production ROI feedback.','Clips start with dribbling: the declared two-second hand-reference calibration does not validate onboarding.','10fps is a controlled source cadence, not an iPhone throughput measurement.','realtime follows a wall clock on this desktop; it does not reproduce camera/recording contention on iPhone.'],
  processedFrames:rows.length,sourceFrames:times.length,wallSeconds:(performance.now()-started)/1000,count:state.counter.count,standard20Count:standard20.count,confirmed:state.counter.confirmed,rejected:state.counter.rejected,pending:state.counter.pending,standard20Confirmed:standard20.confirmed,rows};
 fs.writeFileSync(outputArg,JSON.stringify(report));
 console.log(JSON.stringify({done:path.basename(video),mode,count:report.count,standard20Count:report.standard20Count,frames:report.processedFrames,calibrationReady:calibration.ready,referenceSamples:calibration.samples.length,wallSeconds:+report.wallSeconds.toFixed(1)}));
}finally{python.stdin.end();python.kill();}
