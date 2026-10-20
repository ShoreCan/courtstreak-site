import { GapAwareBounceCounter, PoundControlValidator, BALL_TRACKER_REVISION, geometry, percentile } from './poundCore.mjs';
import { shareVideoLayout, RESULT_CARD_SECONDS } from './videoCountOverlay.mjs';

export const RECORDED_PROFILE_REVISION='PROFILE 01';
export const PROFILE_PAIR_COUNT=24;
export const PROFILE_TOLERANCES={coordinates:.1,scores:1e-5};
const aborted=()=>new DOMException('Recorded-video check cancelled.','AbortError');
const assertActive=(signal,isActive)=>{if(signal?.aborted||!isActive())throw aborted();};

export function validateProfileEvidence(data) {
  if(data?.schema!=='courtstreak-round-evidence-v1'||data.drillKey!=='right-hand-pound')throw new Error('Choose CourtStreak test details for this right-hand pound video.');
  const size=data.frameSize;
  if(!Array.isArray(size)||size.length!==2||size[0]!==1280||!size.every(x=>Number.isFinite(x)&&x>0&&x<=4096))throw new Error('The recorded frame dimensions are unsupported.');
  if(!Array.isArray(data.frames)||!data.frames.length||data.frames.length>2400)throw new Error('The test details have no usable frame evidence.');
  const active=data.frames.filter(f=>f.inputPhase==='active'&&Number.isFinite(f.elapsed)&&f.elapsed>=0&&f.elapsed<20);
  if(active.length<2)throw new Error('This file has too few active tracking frames to profile.');
  for(const f of active){const r=f.roi;if(!Array.isArray(r)||r.length!==4||!r.every(Number.isFinite)||r[0]<0||r[1]<0||r[2]<=r[0]||r[3]<=r[1]||r[2]>size[0]||r[3]>size[1]||typeof f.poseUpdated!=='boolean')throw new Error('The test details contain invalid crop or pose scheduling evidence.');}
  return active;
}

export function profileVideoGeometry(evidence,{width,height,duration,counted}) {
  const active=validateProfileEvidence(evidence),[w,h]=evidence.frameSize;
  if(![width,height,duration].every(x=>Number.isFinite(x)&&x>0))throw new Error('Wait for the saved video to load.');
  const layout=shareVideoLayout(w,h),expectedRatio=counted?layout.width/layout.height:w/h;
  if(counted&&evidence.videoRevision!=='VIDEO 01')throw new Error('This counted-video format is unsupported. Use the original saved video.');
  if(Math.abs(width/height-expectedRatio)>.015)throw new Error('The video format does not match these test details. Check original versus counted video.');
  const contentDuration=duration-(counted?RESULT_CARD_SECONDS:0);
  const lastDisplay=evidence.displayedCountTimeline?.at(-1)?.time??0;
  const expectedDuration=evidence.phase==='finished'?20:Math.max(active.at(-1).elapsed,lastDisplay);
  if(contentDuration<=.2||Math.abs(contentDuration-expectedDuration)>2)throw new Error('Choose the video and test details from the same attempt. Their durations differ.');
  const p=layout.picture;
  return {frameWidth:w,frameHeight:h,contentDuration,sourceRect:counted?
    [p.x*width/layout.width,p.y*height/layout.height,p.width*width/layout.width,p.height*height/layout.height]:[0,0,width,height]};
}

export function profileSamples(evidence,contentDuration,pairs=PROFILE_PAIR_COUNT) {
  const active=validateProfileEvidence(evidence),n=Math.min(pairs,active.length);
  if(!Number.isInteger(n)||n<2||n>48)throw new Error('Invalid diagnostic sample count.');
  return Array.from({length:n},(_,i)=>{const f=active[Math.round(i*(active.length-1)/(n-1))];return {frameId:f.frameId,time:Math.min(f.elapsed,Math.max(0,contentDuration-.12)),recordedElapsed:f.elapsed,roi:[...f.roi],withPose:f.poseUpdated};});
}

export function seekProfileFrame(video,time,signal,timeoutMs=6000) {
  return new Promise((resolve,reject)=>{
    let timer;
    const cleanup=()=>{clearTimeout(timer);for(const name of ['seeked','loadeddata','canplay'])video.removeEventListener(name,ready);video.removeEventListener('error',failed);signal?.removeEventListener('abort',cancel);};
    const finish=(error)=>{cleanup();error?reject(error):resolve(video.currentTime);};
    const ready=()=>{if(video.readyState>=2&&!video.seeking)finish();};
    const failed=()=>finish(new Error('The saved video could not be decoded.'));
    const cancel=()=>finish(aborted());
    if(signal?.aborted){cancel();return;}
    video.pause();
    if(Math.abs(video.currentTime-time)<.001&&video.readyState>=2&&!video.seeking){resolve(video.currentTime);return;}
    for(const name of ['seeked','loadeddata','canplay'])video.addEventListener(name,ready);video.addEventListener('error',failed);signal?.addEventListener('abort',cancel,{once:true});
    timer=setTimeout(()=>finish(new Error('Seeking the saved video took too long.')),timeoutMs);
    try{video.currentTime=time;}catch(error){finish(error);}
  });
}

export function compareProfileOutputs(a,b) {
  let maxCoordinateDifference=0,maxScoreDifference=0,sameStructure=true;
  const compare=(x,y)=>{
    if(!x||!y){if(!!x!==!!y)sameStructure=false;return;}
    if(!Array.isArray(x.box)||!Array.isArray(y.box)||x.box.length!==4||y.box.length!==4){sameStructure=false;return;}
    const coords=[...x.box,...(x.xy?.flat()??[])],other=[...y.box,...(y.xy?.flat()??[])];
    const scores=[x.score,...(x.confidence??[])],otherScores=[y.score,...(y.confidence??[])];
    if(coords.length!==other.length||scores.length!==otherScores.length){sameStructure=false;return;}
    for(let i=0;i<coords.length;i++)maxCoordinateDifference=Math.max(maxCoordinateDifference,Math.abs(coords[i]-other[i]));
    for(let i=0;i<scores.length;i++)maxScoreDifference=Math.max(maxScoreDifference,Math.abs(scores[i]-otherScores[i]));
  };
  if(!Array.isArray(a.balls)||!Array.isArray(b.balls)||a.balls.length!==b.balls.length)sameStructure=false;
  else a.balls.forEach((x,i)=>compare(x,b.balls[i]));
  compare(a.person,b.person);
  return {matches:sameStructure&&Number.isFinite(maxCoordinateDifference)&&Number.isFinite(maxScoreDifference)&&maxCoordinateDifference<=PROFILE_TOLERANCES.coordinates&&maxScoreDifference<=PROFILE_TOLERANCES.scores,sameStructure,maxCoordinateDifference,maxScoreDifference};
}

export function replayProfileCounter(data) {
  if(data.droppedFrameRecords)return {available:false,reason:'The old log discarded early counter inputs.'};
  try{
    let counter=new GapAwareBounceCounter(),validator=new PoundControlValidator(),previous=0,updates=0;
    for(const f of data.frames){const cf=f.counterFrame;if(cf==null||cf===previous)continue;if(cf<previous){counter=new GapAwareBounceCounter();validator=new PoundControlValidator();previous=0;}
      if(cf!==previous+1)throw new Error('The saved counter inputs are incomplete.');
      const g=f.selected?geometry(f.selected):null,m=g?[...g.center,g.diameter]:null;
      const events=counter.update(f.elapsed,m?[m[1],m[2]]:null,data.frameSize[1]);
      validator.update(events,m,f.person,f.elapsed,20).forEach(e=>counter.rememberControlledFloor(e));previous=cf;updates++;
    }
    const logged=data.countedReps??[],times=validator.confirmed.map(e=>e.event_timestamp_exact);
    return {available:true,replayRevision:BALL_TRACKER_REVISION,sourceTrackerRevision:data.trackerRevision,updates,accepted:validator.count,proposals:counter.count,rejected:validator.rejected.length,matchesRecordedAcceptedEvents:times.length===logged.length&&times.every((t,i)=>Math.abs(t-logged[i].time)<1e-8),savedDisplayCount:data.displayedCount,recordedAcceptedEvents:logged.length,unrecordedDisplayedEvents:Math.max(0,data.displayedCount-logged.length),limit:'Cached-input counter check only. This does not count the newly decoded video or establish real-dribble accuracy.'};
  }catch(error){return {available:false,reason:error.message};}
}

const distribution=values=>values.length?{n:values.length,median:percentile(values,.5),p95:percentile(values,.95),total:values.reduce((a,b)=>a+b,0)}:null;
export function summarizeProfilePairs(pairs) {
  const variants={};
  for(const mode of ['legacy','reuse']){
    const rows=pairs.map(p=>p[mode]);
    variants[mode]={totalMs:distribution(rows.map(x=>x.ms)),ballOnlyMs:distribution(rows.filter((x,i)=>!pairs[i].withPose).map(x=>x.ms)),poseInclusiveMs:distribution(rows.filter((x,i)=>pairs[i].withPose).map(x=>x.ms)),stages:{}};
    for(const kind of ['ball','pose']){const timings=rows.map(x=>x.timings?.[kind]).filter(Boolean);variants[mode].stages[kind]=Object.fromEntries(['preprocessMs','inferenceMs','decodeMs'].map(key=>[key,distribution(timings.map(x=>x[key]))]));}
  }
  const parity=pairs.every(p=>p.outputComparison.matches),oldTotal=variants.legacy.totalMs.total,newTotal=variants.reuse.totalMs.total;
  return {pairs:pairs.length,posePairs:pairs.filter(p=>p.withPose).length,matchingOutputPairs:pairs.filter(p=>p.outputComparison.matches).length,allOutputsMatch:parity,variants,candidateTotalTimeChangePercent:oldTotal?100*(newTotal-oldTotal)/oldTotal:null,performanceComparisonUsable:parity,liveFpsMeasured:false,liveCountingAccuracyMeasured:false};
}

export async function runRecordedProfile({detector,evidence,geometry:videoGeometry,capture,signal,isActive=()=>true,onProgress=()=>{}}) {
  const samples=profileSamples(evidence,videoGeometry.contentDuration),pairs=[];
  const guard=()=>assertActive(signal,isActive);
  guard();onProgress({stage:'warmup',completed:0,total:samples.length});
  const warm=await capture(samples[0],signal);guard();
  // Initialize both input paths and warm model execution before measuring.
  for(const inputMode of ['legacy','reuse']){await detector.detect(warm.frame,samples[0].roi,true,{inputMode});guard();}
  for(let i=0;i<samples.length;i++){
    guard();const sample=samples[i],picture=await capture(sample,signal);guard();
    const variants={};
    for(const inputMode of i%2?['reuse','legacy']:['legacy','reuse']){
      guard();const result=await detector.detect(picture.frame,sample.roi,sample.withPose,{inputMode});guard();
      if(!Number.isFinite(result.ms)||result.ms<0)throw new Error('The detector did not return valid timing measurements.');
      for(const kind of sample.withPose?['ball','pose']:['ball'])for(const key of ['preprocessMs','inferenceMs','decodeMs'])if(!Number.isFinite(result.timings?.[kind]?.[key])||result.timings[kind][key]<0)throw new Error('The detector timing breakdown is incomplete.');
      variants[inputMode]={ms:result.ms,timings:result.timings,balls:result.balls,person:result.person??null};
    }
    pairs.push({...sample,mediaElementTime:picture.actualTime,seekDecodeAndSnapshotMs:picture.preparationMs,order:i%2?['reuse','legacy']:['legacy','reuse'],...variants,outputComparison:compareProfileOutputs(variants.legacy,variants.reuse)});
    onProgress({stage:'measuring',completed:i+1,total:samples.length});
  }
  guard();
  return {schema:'courtstreak-recorded-profile-v1',revision:RECORDED_PROFILE_REVISION,completed:true,baselineSourceRevision:'850e140a57bde88b7c031bef47142e42e03f08e6',liveDefaultInputMode:detector.liveInputMode,provider:detector.provider,modelManifest:detector.modelManifest,protocol:{sampling:'Uniform active-log frame indices',pairCount:PROFILE_PAIR_COUNT,warmupPairs:1,alternatingOrder:true,sameFrozenFramePerPair:true,sameCropAndPosePerPair:true,tolerances:PROFILE_TOLERANCES},videoGeometry,summary:summarizeProfilePairs(pairs),counterReplay:replayProfileCounter(evidence),pairs,limitations:['Saved-video decoding, seeking and snapshot preparation are measured separately from detector execution.','The media-element time is the seek position; the exact decoded frame presentation timestamp is not available from this check. Each comparison uses one frozen canvas.','Compressed/count-overlay exports have fewer and different pixels than original live camera inputs. This is not a replay of original detector predictions.','No live camera, recording encoder, countdown or live timing watchdog ran. Live FPS, full-round completion and real-dribble accuracy were not measured.','Model-run timing includes tensor creation, execution-provider submission/wait and output transfer; it is not GPU-kernel time alone.','A paired microbenchmark can isolate processing costs but does not reproduce live camera/encoder contention or establish thermal cause.']};
}
