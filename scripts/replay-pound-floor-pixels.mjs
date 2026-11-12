// Compare the same saved detector and pose inputs with and without the pixel
// path. Provide the original (not counted-overlay) recording and its alignment.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {PoundFloorPixels} from '../src/lib/ai/poundFloorPixels.mjs';
import {createPoundRecoverySession} from '../src/lib/ai/poundRecoverySession.mjs';
import {replaySavedCounter} from '../src/lib/ai/savedCounterReplay.mjs';

const [log,video,offsetText]=process.argv.slice(2);
const offset=Number(offsetText);
if(!log||!video||!Number.isFinite(offset)){
 throw new Error('Usage: node scripts/replay-pound-floor-pixels.mjs round.json original.mov video-minus-elapsed-seconds');
}
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
const pixels=new PoundFloorPixels();
for(const frame of data.frames){
 if(!['active','review'].includes(frame.inputPhase))continue;
 const index=Math.max(0,Math.round((frame.elapsed+offset)*30));
 if((index+1)*stride>raw.length)continue;
 frame.floorPixelEvidence=pixels.update({width,height,data:raw.subarray(index*stride,(index+1)*stride)},
  {time:frame.elapsed,selected:frame.selected,person:frame.person,frameWidth,frameHeight,serial:index});
}
const compared=replaySavedCounter(data,{configure(state){
 state.recovery=createPoundRecoverySession({...state.configuration.recoveryOptions,pixelFloorEvidence:true});
}});
const floorTime=event=>event.floorTime??event.time;
const candidateTimes=new Set(compared.countedReps.map(floorTime));
console.log(JSON.stringify({
 original:original.count,candidate:compared.count,
 retainedOriginalEvents:original.countedReps.filter(event=>candidateTimes.has(floorTime(event))).length,
 recoveredVideoTimes:compared.countedReps.filter(event=>event.floorEvidence==='observed_floor_pixels')
  .map(event=>+(floorTime(event)+offset).toFixed(3)),
},null,2));
