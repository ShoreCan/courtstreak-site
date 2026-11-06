import {loadDetector} from '../../src/lib/ai/iphoneDetector.mjs';
import {repairBallROI} from '../../src/lib/ai/repairPolicy.mjs';
const $=id=>document.getElementById(id);
const schedule={indoor18:[.9,3.2,5,8.7,8.83,9.4,13.7,14.8],outdoor33:[.74,3,7.4,9.58,13.27,14.34,14.85,16],cross27:[.97,4.2,6.42,7.3,9.15,12.12,14.35,15.91]};
let blocked=false;
document.addEventListener('securitypolicyviolation',()=>{blocked=true;$('status').textContent='Stopped: a resource was blocked by the local-only security policy.';});
function draw(canvas,source,balls){
 canvas.width=source.image.width;canvas.height=source.image.height;const c=canvas.getContext('2d');c.drawImage(source.image,0,0);
 c.scale(canvas.width/source.width,canvas.height/source.height);c.strokeStyle='#ff9950';c.lineWidth=5;
 for(const b of balls.slice(0,3)){c.strokeRect(b.box[0],b.box[1],b.box[2]-b.box[0],b.box[3]-b.box[1]);}
}
$('run').onclick=async()=>{
 if(!import.meta.env.DEV){$('status').textContent='Local development fixtures are not included in the published app.';return;}
 $('run').disabled=true;const rows=[];let detector;
 try{
  detector=await loadDetector(import.meta.env.BASE_URL,message=>{$('status').textContent=message;},{asyncPose:false,providerOverride:'wasm'});
  if(blocked)throw new Error('Local resource policy was violated.');
  for(const [key,times] of Object.entries(schedule)){
   $('clip').value=key;
   const data=await fetch('./local-data/'+key+'.json').then(r=>{if(!r.ok)throw new Error('Missing private local fixture');return r.json();});
   const pictures=await fetch('./local-data/'+key+'-frames.json').then(r=>r.json());
   const picture=new Image();picture.src='./local-data/'+pictures[0].file;await picture.decode();
   const image=document.createElement('canvas');image.width=picture.naturalWidth;image.height=picture.naturalHeight;
   const c=image.getContext('2d'),[width,height]=data.frameSize,source={image,width,height};
   for(const time of times){
    if(blocked)throw new Error('Local resource policy was violated.');
    $('status').textContent=`${key}: comparing saved frame ${time.toFixed(2)}s (${rows.length+1}/24)`;
    const pictureMetadata=pictures[times.indexOf(time)];picture.src='./local-data/'+pictureMetadata.file;await picture.decode();c.setTransform(-1,0,0,1,image.width,0);c.drawImage(picture,0,0,image.width,image.height);c.setTransform(1,0,0,1,0,0);
    const frames=data.frames.filter(f=>f.elapsed<=time&&f.inputPhase==='active'),frame=frames.at(-1);
    if(!frame)throw new Error('Missing causal saved frame');
    const selected=frames.findLast(f=>f.selected),poseAt=time-frame.poseFrameSkewSeconds-(time-frame.elapsed);
    const candidateROI=repairBallROI({person:frame.person,ball:selected?.selected,diameter:data.calibratedBallDiameter,width,height,now:time,poseAt,lastBallAt:selected?.elapsed,drillKey:data.drillKey});
    const rois={baseline:frame.roi,candidate:candidateROI},outputs={};
    for(const variant of rows.length%2?['candidate','baseline']:['baseline','candidate'])outputs[variant]=await detector.detect(source,rois[variant],false,{minimumBallScore:.0001});
    draw($('baseline'),source,outputs.baseline.balls);draw($('candidate'),source,outputs.candidate.balls);
    rows.push({clip:key,time,decodedFrameTime:pictureMetadata.decodedFrameTime,baselineROI:rois.baseline,candidateROI,
     baseline:{ms:outputs.baseline.ms,balls:outputs.baseline.balls.slice(0,5)},candidate:{ms:outputs.candidate.ms,balls:outputs.candidate.balls.slice(0,5)}});
   }
  }
  const result={schema:'courtstreak-local-crop-check-v1',provider:detector.provider,
   scope:'24 paired lossless RGB frames decoded locally from the original HEVC recordings; same ball model, baseline versus tighter crop; causal original saved poses used only to choose ROI. Approximate recording/log alignment. No counting or live FPS benchmark.',liveFPSMeasured:false,liveAccuracyMeasured:false,rows};
  $('results').textContent=JSON.stringify(result);
  const saved=await fetch('/__tracker_repair_result',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(result)}).then(r=>r.json());
  $('summary').textContent=JSON.stringify({pairedFrames:rows.length,provider:detector.provider,saved:saved.saved,liveFPSMeasured:false,liveAccuracyMeasured:false},null,2);
  $('status').textContent='Saved-frame comparison completed. Review the boxes; this is not a counted-rep accuracy result.';
 }catch(error){$('status').textContent='Check failed: '+(error.message??String(error));}
 finally{await detector?.close().catch(()=>{});$('run').disabled=false;}
};
