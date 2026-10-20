import { compareProfileOutputs } from './recordedProfile.mjs';
import { DrillRecording } from './drillRecording.mjs';

export const RECORDING_CHECK_REVISION='RECORDING CHECK 01';
export const RECORDING_INPUT_IDS=[279,287,294,302,310,317,325,333,340,348,356,363];
export const RECORDING_BLOCKS=[false,true,true,false]; // OFF/ON then ON/OFF.
export const RECORDING_EFFECT_THRESHOLD=15;
const cancelled=()=>new DOMException('Recording check cancelled.','AbortError');
const guard=(signal,isActive)=>{if(signal?.aborted||!isActive())throw cancelled();};

export function validateRecordingInputs(pack){
  if(pack?.schema!=='courtstreak-recording-inputs-v1'||pack.samples?.length!==12||JSON.stringify(pack.frameSize)!=='[1280,2276]'||pack.sourceVideoSha256!=='da12257452a24ba7965ee28fdf133bd7c00733c589726cf881af162c336d8fa6')throw new Error('Choose CourtStreak-recording-check-inputs.json for RECORDING CHECK 01.');
  if(!Array.isArray(pack.sourceRect)||pack.sourceRect.length!==4||!pack.sourceRect.every(Number.isFinite))throw new Error('Invalid camera-image rectangle.');
  for(let i=0;i<12;i++){
    const s=pack.samples[i];
    if(s.frameId!==RECORDING_INPUT_IDS[i]||typeof s.withPose!=='boolean'||s.withPose!==[2,3,4,11].includes(i)||!Number.isFinite(s.decodedPts)||!Array.isArray(s.roi)||JSON.stringify(s.roi)!=='[403,318,1119,2276]'||typeof s.pngBase64!=='string'||s.pngBase64.length>4e6)throw new Error('The fixed sample schedule or recorded crop changed.');
  }
  return pack.samples;
}
export function settleRecordingLoad(ms,signal){
  return new Promise((resolve,reject)=>{
    const cleanup=()=>signal?.removeEventListener('abort',stop);
    const stop=()=>{clearTimeout(timer);cleanup();reject(cancelled());};
    const timer=setTimeout(()=>{cleanup();resolve();},ms);
    if(signal?.aborted)stop();else signal?.addEventListener('abort',stop,{once:true});
  });
}
export function createRecordingLoad(stream,{Recorder=globalThis.MediaRecorder,onError=()=>{},getVideoSize=()=>({}),clock=()=>performance.now()}={}){
  const track=stream.getVideoTracks()[0];let recorder=null,recording=false,metadata=null,error=null,endPromise=null,finish=null,timer,began;
  const unavailable=()=>{error=new Error('The native camera recording failed.');finish?.reject(error);onError(error);};
  return {async begin(enabled){
    if(recording||recorder)throw new Error('The previous recording block is still active.');
    recording=enabled;metadata=error=endPromise=finish=null;
    if(enabled){
      began=clock();recorder=new DrillRecording({Recorder,onUnavailable:unavailable,onReady:blob=>{metadata={bytes:blob.size,mimeType:blob.type,recorderMimeType:recorder?.recorder?.mimeType??null,durationMs:clock()-began};finish?.resolve(metadata);}});
      if(!recorder.start(stream)){recorder=null;recording=false;throw error||new Error('Camera recording is unavailable.');}
    }
  },snapshot(){
    if(error)throw error;
    const s=track?.getSettings?.()??{},fallback=getVideoSize();
    return {cameraLive:track?.readyState==='live'&&track.enabled!==false&&track.muted!==true,width:s.width||fallback.width,height:s.height||fallback.height,frameRate:s.frameRate??null,facingMode:s.facingMode??null,recording:!!recorder&&recorder.recorder?.state==='recording',recordingMime:recorder?.recorder?.mimeType??null};
  },end(){
    if(endPromise)return endPromise;
    if(!recorder){recording=false;return Promise.resolve(null);}
    recording=false;
    endPromise=(async()=>{
      try{
        if(error)throw error;if(metadata)return metadata;
        return await new Promise((resolve,reject)=>{finish={resolve,reject};timer=setTimeout(()=>reject(new Error('Camera recording did not finish.')),6000);recorder.stop();});
      }finally{clearTimeout(timer);recorder?.cancel();recorder=null;finish=null;}
    })();return endPromise;
  }};
}
function checkState(state,recording){
  if(state?.cameraLive!==true||state.recording!==recording)throw new Error('The camera or recorder is not in the required comparison state.');
  if(!(state.width>0&&state.height>0))throw new Error('Camera dimensions are unavailable.');
}
const stats=xs=>{const a=[...xs].sort((x,y)=>x-y);return {n:a.length,total:xs.reduce((a,b)=>a+b,0),mean:a.reduce((a,b)=>a+b,0)/a.length,median:a[Math.round((a.length-1)*.5)],p95:a[Math.round((a.length-1)*.95)]};};
export function summarizeRecordingBlocks(blocks){
  if(blocks.length!==4||blocks.some((b,i)=>b.recording!==RECORDING_BLOCKS[i]||b.rows.length!==12))throw new Error('A partial recording comparison cannot produce a completed result.');
  const comparisons=[];
  for(const [off,on] of [[blocks[0],blocks[1]],[blocks[3],blocks[2]]]){
    for(const a of off.rows){const b=on.rows.find(x=>x.frameId===a.frameId);if(!b||a.withPose!==b.withPose||JSON.stringify(a.roi)!==JSON.stringify(b.roi)||a.pixelSha256!==b.pixelSha256)throw new Error('A comparison changed its source input or pose schedule.');comparisons.push({pair:comparisons.length<12?0:1,frameId:a.frameId,...compareProfileOutputs(a,b)});}
  }
  const summary={};
  for(const recording of [false,true]){
    const rows=blocks.filter(b=>b.recording===recording).flatMap(b=>b.rows);
    summary[recording?'on':'off']={all:stats(rows.map(r=>r.processingMs)),ballOnly:stats(rows.filter(r=>!r.withPose).map(r=>r.processingMs)),poseInclusive:stats(rows.filter(r=>r.withPose).map(r=>r.processingMs))};
  }
  const changes=(off,on)=>Object.fromEntries(['all','ballOnly','poseInclusive'].map(kind=>[kind,100*(on[kind].total-off[kind].total)/off[kind].total]));
  const overall=changes(summary.off,summary.on);
  const pairs=[[0,1],[3,2]].map(([a,b])=>{
    const group=block=>Object.fromEntries(['all','ballOnly','poseInclusive'].map(kind=>[kind,stats(block.rows.filter(r=>kind==='all'||(kind==='poseInclusive')===r.withPose).map(r=>r.processingMs))]));
    return changes(group(blocks[a]),group(blocks[b]));
  });
  const allOutputsMatch=comparisons.every(x=>x.matches);
  const dimensions=blocks.map(b=>`${b.before.width}x${b.before.height}`),sameCameraDimensions=new Set(dimensions).size===1&&blocks.every(b=>b.before.width===b.after.width&&b.before.height===b.after.height);
  const formats=blocks.filter(b=>b.recording).map(b=>JSON.stringify([b.recordingResult.mimeType,b.recordingResult.recorderMimeType??null])),sameRecordingFormat=new Set(formats).size===1;
  const comparisonUsable=allOutputsMatch&&sameCameraDimensions&&sameRecordingFormat;
  const recordingCostSignal=comparisonUsable&&[overall,...pairs].every(x=>x.all>=RECORDING_EFFECT_THRESHOLD);
  return {variants:summary,overallTimeIncreasePercent:overall,pairTimeIncreasePercent:pairs,comparisons,allOutputsMatch,sameCameraDimensions,sameRecordingFormat,comparisonUsable,recordingCostSignal,thresholdPercent:RECORDING_EFFECT_THRESHOLD,liveFpsMeasured:false,liveCountingAccuracyMeasured:false};
}

export async function runRecordingLoadCheck({detector,samples,capture,load,signal,isActive=()=>true,onProgress=()=>{},settle=settleRecordingLoad,yieldFrame=async()=>{},clock=()=>performance.now()}){
  const check=()=>guard(signal,isActive),blocks=[];let loadActive=false;
  if(detector.provider!=='webgpu'||detector.liveInputMode!=='legacy')throw new Error('This comparison requires the unchanged WebGPU detector and legacy preprocessing.');
  if(samples.length!==12||samples.some((s,i)=>s.frameId!==RECORDING_INPUT_IDS[i]))throw new Error('The fixed recording sample schedule changed.');
  check();onProgress({stage:'warmup',completed:0,total:48});
  // Existing models execute together, with the camera already running.
  for(const i of [2,0,11]){const picture=await capture(samples[i]);check();await detector.detect(picture.frame,samples[i].roi,samples[i].withPose);check();}
  try{
    for(let i=0;i<4;i++){
      check();const recording=RECORDING_BLOCKS[i],rows=[];
      await load.begin(recording);loadActive=true;check();
      onProgress({stage:'settle',block:i,recording,completed:i*12,total:48});
      await settle(1000,signal);check();
      const before=load.snapshot();checkState(before,recording);
      const sequence=i<2?samples:[...samples].reverse();let previousStart=null;
      for(const sample of sequence){
        await yieldFrame(signal);check();checkState(load.snapshot(),recording);
        const began=clock(),picture=await capture(sample);check();
        const result=await detector.detect(picture.frame,sample.roi,sample.withPose),ended=clock();check();checkState(load.snapshot(),recording);
        if(!Number.isFinite(ended-began)||!(ended>began)||!Number.isFinite(result.ms)||result.ms<0)throw new Error('Invalid detector timing.');
        if(!/^[a-f0-9]{64}$/.test(picture.pixelSha256))throw new Error('Missing frozen-pixel verification.');
        for(const kind of sample.withPose?['ball','pose']:['ball'])for(const key of ['preprocessMs','inferenceMs','decodeMs'])if(!Number.isFinite(result.timings?.[kind]?.[key])||result.timings[kind][key]<0)throw new Error('Incomplete detector-stage timings.');
        rows.push({frameId:sample.frameId,decodedPts:sample.decodedPts,decodedFrameIndex:sample.decodedFrameIndex,withPose:sample.withPose,roi:[...sample.roi],pngSha256:sample.pngSha256,pixelSha256:picture.pixelSha256,processingMs:ended-began,sourceRestoreMs:picture.ms,detectorMs:result.ms,sampleIntervalMs:previousStart===null?null:began-previousStart,timings:result.timings,balls:result.balls,person:result.person??null});previousStart=began;
        onProgress({stage:'measuring',block:i,recording,completed:i*12+rows.length,total:48});
      }
      const after=load.snapshot();checkState(after,recording);
      const recordingResult=await load.end();loadActive=false;check();
      if(recording&&(!(recordingResult?.bytes>0)||!recordingResult.mimeType))throw new Error('The recording load did not produce valid video bytes.');
      blocks.push({block:i,recording,before,after,recordingResult,rows});
    }
  }finally{if(loadActive)try{await load.end();}catch{}}
  check();return {schema:'courtstreak-recording-load-v1',revision:RECORDING_CHECK_REVISION,completed:true,provider:detector.provider,liveInputMode:detector.liveInputMode,modelManifest:detector.modelManifest,protocol:{blocks:RECORDING_BLOCKS,settleMs:1000,samplesPerBlock:12,warmupCalls:3,sourceInputs:'Fixed decoded saved images; recorded crop and pose flag retained. Same restored pixels for ON/OFF.',ordinaryCameraStreamRecording:true,trackerRulesChanged:false},blocks,summary:summarizeRecordingBlocks(blocks),limitations:['A diagnostic full-detector call is not a live tracking frame. No setup, countdown, ball-selection state, rep counter, React tracker overlay or watchdog ran. Live FPS and real-dribble accuracy were not measured.','Native front-camera preview runs in all measured blocks. The original native camera stream is recorded only in ON blocks, using the unchanged live recorder settings. Temporary recording blobs are discarded.','The camera sees the current scene, not the saved dribble motion. Recording cost depends on scene motion/complexity; a small effect cannot rule out a larger effect during moving dribbles.','Recorded PNGs come from a compressed count-overlay export. Count bands are removed, the camera region restored and mirrored once. These are not original live detector pixels.','Two model sessions and normal preprocessing/decoding run together. Camera/video contention and device state can still differ between sessions or devices; thermal cause is not established.','OFF/ON then ON/OFF blocks balance condition order. Source restoration and detector calls are timed; requestAnimationFrame pacing and recorder start/stop/settle are excluded from processing latency.']};
}
