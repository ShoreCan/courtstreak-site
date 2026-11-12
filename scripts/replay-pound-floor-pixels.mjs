// Compare the same saved detector and pose inputs with and without the pixel
// path. Provide the original (not counted-overlay) recording and its alignment.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {LivePoundFloorPixels} from '../src/lib/ai/poundFloorPixels.mjs';
import {createPoundRecoverySession} from '../src/lib/ai/poundRecoverySession.mjs';
import {replaySavedCounter} from '../src/lib/ai/savedCounterReplay.mjs';

const [log,video,offsetText,mode]=process.argv.slice(2);
const offset=Number(offsetText);
if(!log||!video||!Number.isFinite(offset)||(mode!==undefined&&mode!=='--bridge')){
 throw new Error('Usage: node scripts/replay-pound-floor-pixels.mjs round.json original.mov video-minus-elapsed-seconds [--bridge]');
}
const bridge=mode==='--bridge';
const data=JSON.parse(readFileSync(log,'utf8'));
if(data.drillKey!=='right-hand-pound'||!data.trackerConfiguration?.recoveryRevision){
 throw new Error('Use right-hand-pound evidence from Camera Test 22 or 23.');
}
const original=replaySavedCounter(data);
const [frameWidth,frameHeight]=data.frameSize, scale=320/Math.max(frameWidth,frameHeight);
const width=Math.round(frameWidth*scale), height=Math.round(frameHeight*scale), stride=width*height*4;
const raw=execFileSync('ffmpeg',['-nostdin','-v','error','-threads','2','-i',video,
 '-vf',`fps=30,scale=${width}:${height},hflip`,'-t','23','-threads','1','-f','rawvideo','-pix_fmt','rgba','-'],
 {maxBuffer:260*1024*1024});
if(raw.length<stride)throw new Error('No camera frames were decoded.');
// Decode and buffer recorded images through the same sampling code. Use a
// constant profiling clock because this tool does not measure live cost.
const pixels=new LivePoundFloorPixels({bridge,now:()=>0});
pixels.readImage=image=>image;
const imageAt=index=>({width,height,data:raw.subarray(index*stride,(index+1)*stride)});
let previous=null;
for(const frame of data.frames){
 if(!['active','review'].includes(frame.inputPhase))continue;
 const index=Math.max(0,Math.round((frame.elapsed+offset)*30));
 if((index+1)*stride>raw.length)continue;
 if(bridge&&previous){
  for(let serial=previous.serial+1;serial<index;serial++){
   const time=serial/30-offset;
   if(time>previous.time&&time<frame.elapsed)pixels.capturePresented(imageAt(serial),{time,serial,frameWidth,frameHeight});
  }
 }
 const sample=pixels.sample(imageAt(index),
  {time:frame.elapsed,selected:frame.selected,person:frame.person,frameWidth,frameHeight,serial:index});
 frame.floorPixelEvidence=sample.evidence;
 frame.floorPixelBridge=sample.bridge;
 previous={serial:index,time:frame.elapsed};
}
const compared=replaySavedCounter(data,{configure(state){
 state.recovery=createPoundRecoverySession({...state.configuration.recoveryOptions,pixelFloorEvidence:true,
  ...(bridge?{cameraFloorBridge:true,adaptiveRecoveryScale:true}:{})});
}});
const floorTime=event=>event.floorTime??event.time;
const candidateTimes=new Set(compared.countedReps.map(floorTime));
console.log(JSON.stringify({
 original:original.count,candidate:compared.count,
 retainedOriginalEvents:original.countedReps.filter(event=>candidateTimes.has(floorTime(event))).length,
 recoveredVideoTimes:compared.countedReps.filter(event=>event.floorEvidence==='observed_floor_pixels')
  .map(event=>+(floorTime(event)+offset).toFixed(3)),
 ...(bridge?{additionalEvidence:compared.countedReps.filter(event=>event.betweenPasses||event.ballScalePixels)
  .map(event=>({videoTime:+(floorTime(event)+offset).toFixed(3),sources:event.evidenceSources}))}:{}),
},null,2));
