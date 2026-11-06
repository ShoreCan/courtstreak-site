import {loadDetector} from '../../src/lib/ai/iphoneDetector.mjs';
import {compareProfileOutputs} from '../../src/lib/ai/recordedProfile.mjs';
const $=id=>document.getElementById(id),video=$('video');
let url,result;
$('clip').onchange=()=>{
 if(url)URL.revokeObjectURL(url);result=null;$('save').style.display='none';$('results').textContent='';
 const file=$('clip').files[0];if(!file){$('run').disabled=true;return;}
 url=URL.createObjectURL(file);video.src=url;$('status').textContent='Reading the video…';
};
video.onloadedmetadata=()=>{$('run').disabled=!(Number.isFinite(video.duration)&&video.duration>0);$('status').textContent='Ready. This comparison needs GPU acceleration.';};
const seek=time=>new Promise((resolve,reject)=>{
 if(Math.abs(video.currentTime-time)<.001&&video.readyState>=2){resolve();return;}
 const timer=setTimeout(()=>finish(new Error('The video could not seek to the requested frame.')),12000);
 const finish=error=>{clearTimeout(timer);video.removeEventListener('seeked',done);video.removeEventListener('error',failed);error?reject(error):resolve();};
 const done=()=>finish(),failed=()=>finish(new Error('The video could not be decoded.'));
 video.addEventListener('seeked',done,{once:true});video.addEventListener('error',failed,{once:true});video.currentTime=time;
});
const distribution=values=>{const s=[...values].sort((a,b)=>a-b);return {medianMs:s[Math.floor(s.length/2)],p95Ms:s[Math.ceil(s.length*.95)-1]};};
$('run').onclick=async()=>{
 $('run').disabled=true;$('clip').disabled=true;$('save').style.display='none';result=null;
 const detectors={};
 try{
  if(!navigator.gpu||!await navigator.gpu.requestAdapter())throw new Error('GPU acceleration is unavailable in this browser. The standard camera is still available.');
  video.pause();
  detectors.standard=await loadDetector(import.meta.env.BASE_URL,message=>{$('status').textContent=message;},{inputMode:'legacy',asyncPose:false});
  if(detectors.standard.provider!=='webgpu')throw new Error('The standard detector could not use the GPU. A paired GPU comparison is unavailable.');
  detectors.candidate=await loadDetector(import.meta.env.BASE_URL,message=>{$('status').textContent=message;},{executionMode:'gpu-stream',asyncPose:false});
  const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  const c=canvas.getContext('2d'),width=1280,height=Math.round(width*canvas.height/canvas.width),source={image:canvas,width,height};
  const rows=[];
  for(let round=0;round<2;round++)for(let i=0;i<8;i++){
   const time=video.duration*(i+1)/9;
   $('status').textContent=`Comparing frame ${rows.length+1} of 16…`;await seek(time);
   c.setTransform(-1,0,0,1,canvas.width,0);c.drawImage(video,0,0,canvas.width,canvas.height);c.setTransform(1,0,0,1,0,0);
   const order=(round+i)%2?['candidate','standard']:['standard','candidate'],outputs={};
   for(const name of order)outputs[name]=await detectors[name].detect(source,[0,0,width,height],true);
   rows.push({time,round,order,standardMs:outputs.standard.ms,candidateMs:outputs.candidate.ms,
    comparison:compareProfileOutputs(outputs.standard,outputs.candidate),standard:outputs.standard,candidate:outputs.candidate});
  }
  result={revision:'SAFARI GPU 01',videoName:$('clip').files[0].name,frameSize:[width,height],
   liveSafariFPSMeasured:false,liveAccuracyMeasured:false,protocol:'16 identical saved-frame pairs, alternating execution order. Both existing pinned models; no live camera or recording load.',
   allDecodedOutputsMatch:rows.every(r=>r.comparison.matches),standard:distribution(rows.map(r=>r.standardMs)),candidate:distribution(rows.map(r=>r.candidateMs)),rows};
  $('status').textContent=result.allDecodedOutputsMatch?'Comparison complete. All paired decoded outputs match within the existing comparison tolerances.':'Comparison complete. Some outputs differed; save details before using this candidate for a live trial.';
  $('results').textContent=JSON.stringify({allDecodedOutputsMatch:result.allDecodedOutputsMatch,standard:result.standard,candidate:result.candidate,liveSafariFPSMeasured:false,liveAccuracyMeasured:false},null,2);
  $('save').style.display='inline-block';
 }catch(error){$('status').textContent=error.message;}
 finally{for(const detector of Object.values(detectors))await detector.close().catch(()=>{});$('run').disabled=false;$('clip').disabled=false;}
};
$('save').onclick=()=>{
 if(!result)return;const href=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=href;a.download='CourtStreak-Safari-GPU-Comparison.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
};
