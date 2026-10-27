import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDetector } from '../../lib/ai/iphoneDetector.mjs';
import { BALL_TRACKER_REVISION, EXPERIMENTAL_COUNTER_REVISION, BALL_IDENTITY_REVISION, geometry } from '../../lib/ai/poundCore.mjs';
import { createPoundTrackingState, resetPoundTrackingCounter } from '../../lib/ai/poundTrackingState.mjs';
import { TRACKER_CHECK_REVISION } from '../../lib/ai/trackerConfiguration.mjs';
import { TRACKER_BUILD_INFO } from '../../lib/ai/trackerBuildInfo.mjs';
import { BALL_PROPOSAL_POLICY_REVISION, ballProposalMinimumScore } from '../../lib/ai/ballProposalPolicy.mjs';
import { CAMERA_REVIEW_REVISION, ReadinessClock, cameraReadiness } from '../../lib/ai/cameraReadiness.mjs';
import { DrillRecording, recordingExtension } from '../../lib/ai/drillRecording.mjs';
import { RoundEvidence } from '../../lib/ai/roundEvidence.mjs';
import { CONTROL_REVISION, physicalPoseSides } from '../../lib/ai/poseCoordinates.mjs';
import { VIDEO_OVERLAY_REVISION, DisplayedCountTimeline } from '../../lib/ai/videoCountOverlay.mjs';
import { createQualityCountedVideo } from '../../lib/ai/createQualityCountedVideo.mjs';
import { RECORDING_TAIL_REVISION, recordingTailSeconds } from '../../lib/ai/recordingTail.mjs';
import { POSE_EXECUTION_REVISION, poseForFrame } from '../../lib/ai/poseWorkerClient.mjs';
import { POSE_SCHEDULE_REVISION, PoseRefreshClock } from '../../lib/ai/poseRefreshClock.mjs';
import { CAMERA_SETUP_REVISION, CameraPositionGate, evaluateCameraSetup } from '../../lib/ai/cameraSetup.mjs';
import { LIVE_FRAME_REVISION } from '../../lib/ai/detectionPass.mjs';
import ShareTraining from '../ShareTraining.jsx';
import CountedReplay from './CountedReplay.jsx';
import { FiDownload, FiShare2, FiPlay } from 'react-icons/fi';
import './iphone-pound-test.css';
const DURATION=20;
const empty={body:false,hand:false,ball:false,floor:false,owned:false};
const emptyClip={status:'idle',url:'',blob:null};
const emptyCountedClip={...emptyClip,progress:0};
function machine(freshFrames=true){return {...createPoundTrackingState(freshFrames),phase:'idle',gate:new CameraPositionGate(),readiness:new ReadinessClock(),evidence:new RoundEvidence(),poseClock:new PoseRefreshClock(),person:null,ball:null,poseAt:-Infinity,times:[],goodSince:null,progress:0,count:0,left:DURATION,countdown:5,fps:0,checks:empty,message:'Place your phone on a stable support. Landscape gives you more room; portrait works too.',lastInference:0,started:null,detected:0,total:0};}
export default function IPhonePoundTest({freshFrames=true}){
 const navigate=useNavigate(),video=useRef(null),overlay=useRef(null),frame=useRef(null),m=useRef(machine(freshFrames)),detector=useRef(null),stream=useRef(null),raf=useRef(0),mounted=useRef(true),token=useRef(0),wake=useRef(null),audio=useRef(null);
 const [ui,setUI]=useState({...m.current}),[ratio,setRatio]=useState(16/9);
 const recorder=useRef(null),recordTimer=useRef(null),recordURL=useRef(''),recordVersion=useRef(0),resultPanel=useRef(null),evidenceURL=useRef('');
 const countTimeline=useRef(new DisplayedCountTimeline()),countedURL=useRef(''),videoExport=useRef(null);
 const [clip,setClip]=useState(emptyClip),[shareMessage,setShareMessage]=useState(''),[sharing,setSharing]=useState(false);
 const [countedClip,setCountedClip]=useState(emptyCountedClip);
 const publish=()=>{if(mounted.current){countTimeline.current.record(m.current.count,performance.now()/1000);setUI({...m.current});}};
 const cue=(frequency=650)=>{try{const ctx=audio.current;if(!ctx||ctx.state!=='running')return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=frequency;gain.gain.setValueAtTime(.10,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.15);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.16);}catch{}};
 const stopRecording=()=>{
  clearTimeout(recordTimer.current);recordTimer.current=null;
  if(recorder.current?.recorder?.state==='recording'){
   if(mounted.current)setClip(previous=>previous.status==='recording'?{...previous,status:'finishing'}:previous);
   recorder.current.stop();
  }
 };
 const discardRecording=()=>{
  recordVersion.current++;clearTimeout(recordTimer.current);recordTimer.current=null;recorder.current?.cancel();recorder.current=null;
  videoExport.current?.abort();videoExport.current=null;countTimeline.current=new DisplayedCountTimeline();
  if(countedURL.current)URL.revokeObjectURL(countedURL.current);countedURL.current='';
  if(recordURL.current)URL.revokeObjectURL(recordURL.current);recordURL.current='';
  if(evidenceURL.current)URL.revokeObjectURL(evidenceURL.current);evidenceURL.current='';
  if(mounted.current){setClip(emptyClip);setCountedClip(emptyCountedClip);setShareMessage('');}
 };
 const startRecording=(started)=>{
  const version=++recordVersion.current;
  const current=()=>mounted.current&&version===recordVersion.current;
  recorder.current=new DrillRecording({
   onReady:blob=>{if(!current())return;if(recordURL.current)URL.revokeObjectURL(recordURL.current);recordURL.current=URL.createObjectURL(blob);setClip({status:'ready',blob,url:recordURL.current});},
   onUnavailable:()=>{if(current())setClip({...emptyClip,status:'unavailable'});}
  });
  const recordingBegan=performance.now()/1000;
  if(recorder.current.start(stream.current)){
   countTimeline.current.start(recordingBegan);
   setClip({...emptyClip,status:'recording'});
   recordTimer.current=setTimeout(()=>{
    const s=m.current;
    if(s.phase==='recording-only'){
     s.phase='interrupted';s.left=0;s.recordedUntil=performance.now()/1000-s.started;
     s.message=`${s.interruptionReason} The remaining camera video was preserved; the count is partial.`;
     stopCamera();publish();
    }else stopRecording();
   },Math.max(0,(started+DURATION)*1000-performance.now()));
  }
 };
 const stopCamera=()=>{stopRecording();stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;wake.current?.release().catch(()=>{});wake.current=null;};
 const fail=(message)=>{const s=m.current;s.phase='error';s.message=message;stopCamera();publish();};
 const toSetup=(message='Hold the ball comfortably in either hand. Keep your body and feet in view.')=>{
  const previous=m.current;if(['active','review'].includes(previous.phase))discardRecording();detector.current?.poseWorker?.reset();m.current={...machine(freshFrames),phase:'setup',lastInference:previous.lastInference,sized:previous.sized,cameraSettingsAtStart:previous.cameraSettingsAtStart,message};publish();
 };
 const interrupt=(message,{preserveVideo=false}={})=>{
  const s=m.current;
  if(['active','review','recording-only'].includes(s.phase)){
   s.incomplete=true;s.interruptionReason=message;s.countingStoppedAt??=performance.now()/1000-s.started;
   const remaining=preserveVideo?recordingTailSeconds({phase:s.phase,started:s.started,now:performance.now()/1000,duration:DURATION,recorderState:recorder.current?.recorder?.state}):0;
   if(remaining>0){
    s.phase='recording-only';s.message='Counting paused because tracking became unreliable. Keep training: your camera video continues until Time.';
    s.ball=null;s.person=null;draw();publish();return;
   }
   s.phase='interrupted';s.message=message;stopCamera();publish();
  }else if(['setup','countdown'].includes(s.phase)){s.gate.reset();s.progress=0;s.phase='setup';s.message=message;publish();}
 };
 const draw=()=>{
  const canvas=overlay.current,s=m.current;if(!canvas)return;const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);
  if(s.person){c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=w/450;const [x,y,x2,y2]=s.person.box;c.strokeRect(x,y,x2-x,y2-y);}
  if(s.ball){const g=geometry(s.ball);c.strokeStyle=s.tracker.ready()?'#5ee1aa':'#ffb26f';c.lineWidth=w/280;c.beginPath();c.arc(...g.center,g.diameter*.62,0,Math.PI*2);c.stroke();}
 };
 const loop=async()=>{
  const currentToken=token.current,s=m.current,v=video.current,d=detector.current;
  if(!mounted.current||!d||!v||!stream.current||['finished','error','interrupted','recording-only'].includes(s.phase))return;
  if(v.readyState<2||v.paused){raf.current=requestAnimationFrame(loop);return;}
  if(v.currentTime===s.videoTime){raf.current=requestAnimationFrame(loop);return;}
  s.videoTime=v.currentTime;
  const rawRatio=v.videoWidth/v.videoHeight,w=1280,h=Math.round(w/rawRatio),passStartedAt=performance.now()/1000;
  let now=passStartedAt;
  if(!frame.current)frame.current=document.createElement('canvas');const f=frame.current;
  if(f.width!==w||f.height!==h){
   const changed=!!f.width&&s.sized;f.width=w;f.height=h;overlay.current.width=w;overlay.current.height=h;setRatio(rawRatio);
   if(changed){toSetup('Camera orientation changed. Stay in view while we check your new framing.');raf.current=requestAnimationFrame(loop);return;}
   s.sized=true;
  }
  const c=f.getContext('2d');c.save();c.translate(w,0);c.scale(-1,1);c.drawImage(v,0,0,w,h);c.restore();
  try{
   const inputPhase=s.phase,bodyWorker=d.poseWorker;
   let poseUpdated=false;
   const acceptBody=()=>{
    const body=bodyWorker?.latest;
    if(body&&body.id!==s.poseResultId){s.poseResultId=body.id;s.person=physicalPoseSides(body.person,true);s.poseAt=body.capturedAt;s.poseMs=body.ms;s.poseClock.completed(body.completedAt);poseUpdated=true;}
   };
   acceptBody();
   if(bodyWorker?.error){interrupt(bodyWorker.error.message,{preserveVideo:true});if(s.phase==='setup')fail(bodyWorker.error.message);return;}
   const withPose=!bodyWorker&&s.poseClock.shouldRun(now,Number.isFinite(s.poseAt)),roi=['active','review'].includes(s.phase)?s.tracker.roi(w,h):[0,0,w,h];
   // Even a "no person" result gets the normal resting interval; looking for
   // someone outside the camera must not turn into continuous body inference.
   if(bodyWorker&&s.poseClock.shouldRun(now,!!bodyWorker.latest))bodyWorker.request(f,{capturedAt:now,sourceVideoTime:s.videoTime});
   const result=await d.detect(f,roi,withPose,freshFrames?{minimumBallScore:ballProposalMinimumScore({phase:s.phase,calibrated:s.tracker.ready(),weakContinuity:s.tracker.weakContinuity}),refreshBallFrame:()=>{
    if(!mounted.current||currentToken!==token.current||s!==m.current||!stream.current||['error','interrupted','finished','recording-only'].includes(s.phase))return null;
    if(v.readyState<2||v.paused)return null;
    if(v.videoWidth/v.videoHeight!==rawRatio){toSetup('Camera orientation changed. Stay in view while we check your new framing.');return null;}
    // Do not assign a newer timestamp to unchanged video pixels.
    if(v.currentTime===s.videoTime)return undefined;
    const capturedAt=performance.now()/1000,sourceVideoTime=v.currentTime;
    c.save();c.translate(w,0);c.scale(-1,1);c.drawImage(v,0,0,w,h);c.restore();
    return {frame:f,capturedAt,sourceVideoTime};
   }}:undefined);
   if(!mounted.current||currentToken!==token.current)return;
   if(s!==m.current){raf.current=requestAnimationFrame(loop);return;}
   if(['error','interrupted','finished','recording-only'].includes(s.phase))return;
   if(result.cancelled){raf.current=requestAnimationFrame(loop);return;}
   if(result.ballFrameRefreshed){now=result.capturedAt;s.videoTime=result.sourceVideoTime;}
   const completed=performance.now()/1000;s.lastInference=completed;
   s.times.push(completed);s.times=s.times.filter(t=>completed-t<3);
   s.fps=s.times.length>1?(s.times.length-1)/(completed-s.times[0]):0;
   if(withPose){s.person=physicalPoseSides(result.person,true);s.poseAt=passStartedAt;s.poseClock.completed(completed);poseUpdated=true;}
   acceptBody();
   const framePerson=poseForFrame(s.person,s.poseAt,now,completed);
   const phase=['active','review'].includes(s.phase)?'drill':s.phase;
   s.ball=s.tracker.select(result.balls,framePerson,phase,w,h,now);
   const checks=evaluateCameraSetup(framePerson,s.ball,w,h);
   if(!framePerson&&s.person){checks.refreshingBody=true;checks.message='Refreshing body and wrist tracking. Keep your position while we wait for a fresh check.';}
   s.checks=checks;
   const speedReady=s.times.length>=16&&completed-s.times[0]>=1.5&&s.fps>=10&&completed-passStartedAt<.35;
   let frameProposals=[],frameConfirmed=[];
   const recordEvidence=()=>s.evidence.record({capturedAt:now,sourceVideoTime:s.videoTime,inputPhase,phase:s.phase,roi,balls:result.balls,person:framePerson,selected:s.ball,selectionDecisions:s.tracker.decisions,ballProposalMinimumScore:result.ballProposalMinimumScore,ms:result.ms,timings:result.timings,fps:s.fps,poseUpdated,poseAge:completed-s.poseAt,poseCapturedAt:s.poseAt,poseInferenceMs:s.poseMs??null,passStartedAt,ballFrameRefreshed:!!result.ballFrameRefreshed,positionChecks:checks,counterFrame:s.counter.points.at(-1)?.frame??null,proposedCount:s.counter.count,count:s.count,proposals:frameProposals,confirmed:frameConfirmed});
   if(s.phase==='setup'){
    const condition=cameraReadiness(checks,speedReady,s.tracker.ready());
    const readiness=s.readiness.update(now,condition.valid,condition);
    if(readiness.reset){s.gate.reset();s.progress=0;}
    if(readiness.ready)s.progress=s.gate.update(readiness.elapsed,checks,s.ball,s.tracker,speedReady);
    s.message=!condition.valid?condition.message:s.progress<1?'Good position. Confirming your frame…':'Position locked';
    if(s.times.length>8&&completed-s.times[0]>2&&s.fps<10)s.message='Tracking is too slow to count reliably on this phone. Close other tabs and retry. The drill will wait.';
    if(s.progress>=1&&readiness.ready){s.phase='countdown';s.readiness.reset(now);resetPoundTrackingCounter(s);s.countdownAt=now;s.countdown=5;s.message='Position locked. Stay in view until Go.';s.lastCue=5;cue();}
   }else if(s.phase==='countdown'){
    const condition=cameraReadiness(checks,speedReady,s.tracker.ready());
    const readiness=s.readiness.update(now,condition.valid,condition);s.rechecking=!readiness.ready;
    if(readiness.reset){
     s.phase='setup';s.gate.reset();s.readiness.reset(now);s.progress=0;s.rechecking=false;s.message=`Position check restarted. ${condition.message}`;
    }else{
     // Move the expected Go time when paused, retaining actual pre-Go sample spacing.
     const revisedStart=now-readiness.elapsed,pause=Math.max(0,revisedStart-s.countdownAt);
     if(pause>0)s.counter.points.forEach(p=>p.timestamp-=pause);
     s.countdownAt=revisedStart;s.countdown=Math.max(0,Math.ceil(5-readiness.elapsed));
     s.message=readiness.ready?condition.message:`Countdown paused. ${condition.message}`;
     if(s.countdown!==s.lastCue){s.lastCue=s.countdown;cue(s.countdown?650:1000);}
     if(s.countdown===0&&readiness.ready){s.phase='active';s.started=completed;const shift=completed-(s.countdownAt+5);s.counter.points.forEach(p=>p.timestamp-=shift);s.count=0;s.message='Go. Complete clean right-hand pounds.';startRecording(completed);}
    }
   }
   if(s.phase==='countdown'){const g=s.ball?geometry(s.ball):null,t=now-(s.countdownAt+5);const proposals=s.counter.update(t,g?[g.center[1],g.diameter]:null,h);s.validator.update(proposals,g?[...g.center,g.diameter]:null,framePerson,t,DURATION);frameProposals=proposals;}
   if(['active','review'].includes(s.phase)){
    const elapsed=now-s.started;s.go=elapsed<.8;
    if(completed-passStartedAt>.5){recordEvidence();interrupt('Tracking stalled during this attempt.',{preserveVideo:true});return;}
    if(elapsed>=DURATION&&s.phase==='active'){stopRecording();s.phase='review';s.message='Time. Hold the ball while we confirm the last return.';cue(400);}
    const measurement=s.ball?(()=>{const g=geometry(s.ball);return [...g.center,g.diameter];})():null;
    if(elapsed>=0&&elapsed<DURATION){s.total++;if(measurement)s.detected++;}
    const proposals=s.counter.update(elapsed,measurement?[measurement[1],measurement[2]]:null,h);
    const confirmed=s.validator.update(proposals,measurement,framePerson,elapsed,DURATION);confirmed.forEach(e=>s.counter.rememberControlledFloor(e));s.count=s.validator.count;s.left=Math.max(0,Math.min(DURATION,Math.ceil(DURATION-elapsed)));
    frameProposals=proposals;frameConfirmed=confirmed;
    if(framePerson)s.poseLostAt=null;else s.poseLostAt??=completed;
    if(s.ball)s.lostAt=null;else s.lostAt??=completed;
    s.message=s.phase==='review'?'Time. Confirming the last controlled return…':s.lostAt&&completed-s.lostAt>.35?'Ball lost — counting waits for the same ball.': 'Tracking your basketball';
    if(s.lostAt&&completed-s.lostAt>2){recordEvidence();interrupt('The ball was lost for more than two seconds.',{preserveVideo:true});return;}
    if(s.poseLostAt&&completed-s.poseLostAt>2){recordEvidence();interrupt('Body and wrist tracking could not stay fresh enough to verify reps.',{preserveVideo:true});return;}
    if(s.times.length>12&&s.fps<8){recordEvidence();interrupt('Tracking became too slow to count reliably.',{preserveVideo:true});return;}
    if(elapsed>=DURATION+2){s.phase='finished';s.message='Test complete. Compare this count with the dribbles you performed.';stopCamera();}
   }
   recordEvidence();
   draw();publish();
  }catch(error){if(currentToken===token.current&&mounted.current)fail(`Tracking stopped: ${error.message}`);return;}
  if(mounted.current&&!['finished','error','interrupted','recording-only'].includes(m.current.phase))raf.current=requestAnimationFrame(loop);
 };
 async function open(){
  if(['loading','setup','countdown','active','review','recording-only'].includes(m.current.phase))return;
  const id=++token.current;stopCamera();discardRecording();m.current=machine(freshFrames);m.current.phase='loading';m.current.message='Requesting your front camera…';publish();
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audio.current??=new Audio();void audio.current.resume();}
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Open CourtStreak in Safari using its HTTPS website to allow camera access.');
   // Request permission directly from the tap; never silently choose the rear camera.
   const camera=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{exact:'user'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}}});
   if(id!==token.current||!mounted.current){camera.getTracks().forEach(t=>t.stop());return;}stream.current=camera;
   const settings=camera.getVideoTracks()[0].getSettings?.()??{};
   m.current.cameraSettingsAtStart=Object.fromEntries(['width','height','frameRate','facingMode','aspectRatio'].filter(key=>settings[key]!==undefined).map(key=>[key,settings[key]]));
   camera.getVideoTracks()[0].addEventListener('ended',()=>{if(stream.current===camera)fail('The camera stopped. Enable it again to check your position.');},{once:true});
   video.current.srcObject=camera;await video.current.play();
   if(id!==token.current||!mounted.current)return;
   if(detector.current?.poseWorker?.error){await detector.current.close();detector.current=null;}
   if(!detector.current){m.current.message='Loading the ball detector…';publish();const loaded=await loadDetector(import.meta.env.BASE_URL,message=>{if(id===token.current){m.current.message=message;publish();}},{asyncPose:freshFrames});if(id!==token.current||!mounted.current){await loaded.close();return;}detector.current=loaded;}
   if(id!==token.current||!mounted.current)return;
   await detector.current.idle();
   if(id!==token.current||!mounted.current)return;
   if(navigator.wakeLock)navigator.wakeLock.request('screen').then(lock=>{if(id!==token.current||!mounted.current){void lock.release();return;}wake.current=lock;}).catch(()=>{});
   toSetup();raf.current=requestAnimationFrame(loop);
  }catch(error){if(id!==token.current||!mounted.current)return;const messages={NotAllowedError:'Camera permission was denied. Allow CourtStreak camera access in Safari, then try again.',NotFoundError:'The front camera is unavailable on this device.',OverconstrainedError:'Safari could not select the front camera. Check camera access and try again.'};fail(messages[error.name]||error.message);}
 }
 useEffect(()=>{
  mounted.current=true;
  const hidden=()=>{if(document.hidden){interrupt('CourtStreak went into the background. Return and enable the camera for a fresh setup check.');if(['loading','setup','countdown'].includes(m.current.phase)){token.current++;m.current.phase='interrupted';m.current.message='Return to CourtStreak and enable the camera again.';stopCamera();publish();}}};
  const rotate=()=>{if(m.current.phase==='recording-only'){interrupt('Phone rotated while preserving the partial attempt.');return;}if(['setup','countdown','active','review'].includes(m.current.phase))toSetup('Phone rotated. Hold the ball comfortably while we check your new framing.');};
  window.addEventListener('orientationchange',rotate);screen.orientation?.addEventListener('change',rotate);
  const watchdog=setInterval(()=>{const s=m.current;if(s.phase==='recording-only'){s.left=Math.max(0,Math.ceil(DURATION-(performance.now()/1000-s.started)));publish();return;}if(s.lastInference&&performance.now()/1000-s.lastInference>.8&&['countdown','active','review'].includes(s.phase)){interrupt('Camera tracking paused. We need fresh frames before continuing.',{preserveVideo:true});}},200);
  document.addEventListener('visibilitychange',hidden);
  return()=>{mounted.current=false;token.current++;clearInterval(watchdog);window.removeEventListener('orientationchange',rotate);screen.orientation?.removeEventListener('change',rotate);document.removeEventListener('visibilitychange',hidden);cancelAnimationFrame(raf.current);discardRecording();stopCamera();void detector.current?.close();detector.current=null;void audio.current?.close();audio.current=null;};
 },[]);
 useEffect(()=>{
  if(['finished','interrupted'].includes(ui.phase)){resultPanel.current?.focus({preventScroll:true});resultPanel.current?.scrollIntoView({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 },[ui.phase]);
 const p=ui.phase,live=['setup','countdown','active','review','recording-only'].includes(p),ended=['finished','interrupted'].includes(p),labels=[['body','Body in frame'],['hand','Right wrist visible'],['ball','Basketball detected'],['floor','Feet + floor space']];
 const replayChanges=useMemo(()=>ended?countTimeline.current.snapshot():[],[ended,clip.url,clip.status,ui.count]);
 const preparing=countedClip.status==='preparing',canSave=['ready','original'].includes(countedClip.status),savedClip=countedClip.status==='ready'?countedClip:clip;
 const step=['active','review','recording-only'].includes(p)?2:p==='countdown'?1:ended?3:0;
 const summary=`CourtStreak · Right-Hand Pound · ${ui.count} detected reps · ${p==='finished'?'20-second round':'Incomplete attempt'}. Camera test result.`;
 const fileStem=`CourtStreak-right-hand-pound-${ui.count}-reps${p==='finished'?'':'-partial'}`;
 const filename=`${fileStem}${countedClip.status==='ready'?'-counted':'-original'}.${recordingExtension(savedClip.blob?.type)}`;
 const originalFilename=`${fileStem}-original.${recordingExtension(clip.blob?.type)}`;
 async function prepareCountedVideo(){
  if(!clip.blob||videoExport.current)return;
  const version=recordVersion.current,controller=new AbortController();videoExport.current=controller;
  const current=()=>mounted.current&&version===recordVersion.current&&!controller.signal.aborted;
  setCountedClip({...emptyCountedClip,status:'preparing'});
  try{
   await detector.current?.idle();
   let lastPercent=-1;
   const result=await createQualityCountedVideo({blob:clip.blob,
    changes:countTimeline.current.snapshot(),finalCount:m.current.count,completed:m.current.phase==='finished',signal:controller.signal,
    onProgress:progress=>{const percent=Math.floor(progress*100);if(current()&&percent!==lastPercent){lastPercent=percent;setCountedClip(previous=>({...previous,progress}));}}
   });
   if(!current())return;
   if(countedURL.current)URL.revokeObjectURL(countedURL.current);countedURL.current=URL.createObjectURL(result.blob);
   setCountedClip({status:'ready',url:countedURL.current,blob:result.blob,progress:1,width:result.width,height:result.height,exportInfo:result.exportInfo});
  }catch(error){if(current())setCountedClip({...emptyCountedClip,status:'unavailable',message:error.message});}
  finally{if(videoExport.current===controller)videoExport.current=null;}
 }
 useEffect(()=>{
  if(ended&&clip.status==='ready'&&countedClip.status==='idle')void prepareCountedVideo();
 },[ended,clip.status,countedClip.status]);
 function useOriginalVideo(){videoExport.current?.abort();videoExport.current=null;setCountedClip({...emptyCountedClip,status:'original'});}
 function saveEvidence(){
  const s=m.current;
  const data=s.evidence.export({startedAt:s.started,baseSourceCommit:TRACKER_BUILD_INFO.sourceCommit,buildInfo:TRACKER_BUILD_INFO,trackerCheckRevision:TRACKER_CHECK_REVISION,trackerConfiguration:s.configuration,trackerRevision:s.configuration.counterRevision,...(s.configuration.identityRevision?{ballIdentityRevision:s.configuration.identityRevision}:{}),cameraRevision:CAMERA_SETUP_REVISION,readinessRevision:CAMERA_REVIEW_REVISION,detectorInputMode:detector.current?.liveInputMode??'legacy',controlRevision:CONTROL_REVISION,poseScheduleRevision:POSE_SCHEDULE_REVISION,poseExecutionRevision:detector.current?.poseWorker?POSE_EXECUTION_REVISION:'sequential',poseMode:detector.current?.poseMode??'sequential',liveFrameRevision:freshFrames?LIVE_FRAME_REVISION:'FRAME 00',poseSideConvention:'Original physical person; detector image is mirrored',
   drillKey:'right-hand-pound',timerSeconds:DURATION,phase:s.phase,message:s.message,displayedCount:s.count,
   framesWithSelectedBall:s.detected,trainingFrames:s.total,ballCoverage:s.total?s.detected/s.total:null,
   provider:detector.current?.provider,detectorInputRevision:detector.current?.inputRevision,ballProposalPolicyRevision:BALL_PROPOSAL_POLICY_REVISION,detectorResources:detector.current?.resourceSummary,modelManifest:detector.current?.modelManifest,runtime:{userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency??null},cameraSettingsAtStart:s.cameraSettingsAtStart,frameSize:[frame.current?.width,frame.current?.height],
   recordingAvailable:!!clip.blob,videoRevision:VIDEO_OVERLAY_REVISION,recordingRevision:RECORDING_TAIL_REVISION,countingStoppedAt:s.countingStoppedAt??null,recordedUntil:s.recordedUntil??null,interruptionReason:s.interruptionReason??null,videoExport:countedClip.exportInfo??null,countDisplayStartedAt:countTimeline.current.startedAt,
   displayedCountTimeline:countTimeline.current.snapshot(),savedVideoStyle:countedClip.status==='ready'?'count-overlay':'original',
   countOverlayTiming:'Display changes at live acceptance time; final card includes the post-round review. No bounce-time backdating.',
   rejectedEvents:s.validator.rejected,pendingEvents:s.validator.pending});
  if(evidenceURL.current)URL.revokeObjectURL(evidenceURL.current);
  evidenceURL.current=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
  const link=document.createElement('a');link.href=evidenceURL.current;link.download=`CourtStreak-right-hand-pound-${s.count}-reps-test-details.json`;document.body.append(link);link.click();link.remove();
 }
 async function shareVideo(saveOnly=false){
  if(!savedClip.blob||sharing||preparing||!['ready','original'].includes(countedClip.status))return;
  setShareMessage('');setSharing(true);
  try{
   const file=new File([savedClip.blob],filename,{type:savedClip.blob.type});
   if(navigator.share&&navigator.canShare?.({files:[file]})){
    if(saveOnly)setShareMessage('Choose Save Video or Save to Files from your device’s options.');
    await navigator.share({files:[file],title:'My CourtStreak round',...(saveOnly?{}:{text:summary})});
   }else if(saveOnly){
    const link=document.createElement('a');link.href=savedClip.url;link.download=filename;document.body.append(link);link.click();link.remove();
    setShareMessage('Your browser opened the video download.');
   }else setShareMessage('File sharing is unavailable in this browser. Use Save video to device.');
  }catch(error){if(error.name!=='AbortError')setShareMessage('Sharing could not open. Use Download video file below, then share the saved clip.');}
  finally{if(mounted.current)setSharing(false);}
 }
 return <main className="cs-iphone-tracker">
  <div className={`cs-iphone-shell ${ended?'is-review':''}`}>
   <header className="cs-iphone-header"><button type="button" onClick={()=>navigate('/lab/drill/right-hand-pound')} aria-label="Back to drill">←</button><div><span>COURTSTREAK / CAMERA LAB</span><h1>Right-Hand Pound</h1><p>20-second test · Front camera</p></div><span className="cs-iphone-version">{freshFrames?EXPERIMENTAL_COUNTER_REVISION:BALL_TRACKER_REVISION}<br/>{CAMERA_SETUP_REVISION}{freshFrames&&<><br/>{LIVE_FRAME_REVISION}<br/>{BALL_IDENTITY_REVISION}</>}<br/>{TRACKER_CHECK_REVISION}</span></header>
   <ol className="cs-iphone-steps" aria-label="Session progress">{['Position','Countdown','Train','Review'].map((label,i)=><li key={label} className={i===step?'current':i<step?'complete':''}><b>{i<step?'✓':i+1}</b>{label}</li>)}</ol>
   <section className="cs-iphone-stage" hidden={ended} style={{aspectRatio:ratio}} aria-label="Live camera and detected basketball">
    <video ref={video} muted autoPlay playsInline aria-label="Mirrored front camera"/><canvas ref={overlay} aria-hidden="true"/>
    {!live&&p!=='loading'&&<div className="cs-iphone-placeholder"><div className="cs-iphone-ball">◉</div><strong>{ended?'Your attempt':'Find your frame'}</strong><p>Landscape recommended. Portrait supported.<br/>Show your body, ball, feet, and floor space.</p></div>}
    {live&&<span className={`cs-iphone-lock ${ui.ball?'found':''}`}>{ui.ball?(m.current.tracker.ready()?'● Ball locked':'● Ball detected'):'○ Finding basketball'}</span>}
    {p==='countdown'&&<div className="cs-iphone-countdown"><strong>{ui.countdown}</strong><span>{ui.rechecking?'Rechecking · Countdown paused':'Stay in view · Wait for Go'}</span></div>}
    {p==='active'&&ui.go&&<div className="cs-iphone-countdown cs-iphone-go"><strong>GO</strong><span>Start dribbling</span></div>}
    {['active','review','recording-only'].includes(p)&&<div className="cs-iphone-live"><div><span>{p==='recording-only'?'PARTIAL COUNT · PAUSED':'COUNTED REPS'}</span><strong>{ui.count}</strong></div><div><span>{p==='review'?'REVIEWING':'SECONDS LEFT'}</span><strong>{ui.left}</strong></div></div>}
   </section>
   <section className="cs-iphone-controls">
    <p className="cs-iphone-status" role="status" aria-live="polite">{ui.message}</p>
    {['idle','error'].includes(p)&&<button type="button" className="cs-iphone-primary" onClick={open}>{p==='idle'?'Enable camera & check position':'Check position & try again'}</button>}
    {p==='loading'&&<div className="cs-iphone-loading">Preparing your camera and detectors…</div>}
    {['setup','countdown'].includes(p)&&<><div className="cs-iphone-checks">{labels.map(([key,label])=><span key={key} className={ui.checks[key]?'pass':''}><b>{ui.checks[key]?'✓':'○'}</b>{label}</span>)}</div><div className="cs-iphone-progress"><span style={{width:`${ui.progress*100}%`}}/></div><small>Countdown starts automatically after a stable ball lock and position check.</small></>}
    {live&&<button type="button" className="cs-iphone-secondary" onClick={()=>{token.current++;cancelAnimationFrame(raf.current);m.current.phase='interrupted';m.current.message='Attempt stopped. Recheck your position when ready.';stopCamera();publish();}}>Stop test</button>}
   </section>
   {ended&&<section className="cs-iphone-review" ref={resultPanel} tabIndex={-1} aria-label="Round score and video replay">
    <div className="cs-iphone-score">
     <span className="cs-iphone-score-kicker">COURTSTREAK / YOUR ROUND</span>
     <h2>{p==='finished'?'Round complete':'Attempt stopped'}</h2>
     <div className="cs-iphone-score-number"><strong>{ui.count}</strong><span>{p==='finished'?'detected reps':'partial count'}</span></div>
     <p>Right-Hand Pound · {p==='finished'?'20 seconds':'Incomplete attempt'}</p>
     {p==='interrupted'&&<p><strong>Why it stopped:</strong> {ui.message}</p>}
     <div className="cs-iphone-score-detail"><span>Ball tracking coverage</span><b>{ui.total?`${Math.round(ui.detected/ui.total*100)}%`:'—'}</b></div>
     <small>Coverage measures ball visibility, not counting accuracy.</small>
    </div>
    <div className="cs-iphone-replay">
     <h3><FiPlay aria-hidden="true"/> Replay your round</h3>
     {clip.status==='ready'?<>
      <CountedReplay src={clip.url} changes={replayChanges} events={ui.evidence.repEvents} finalCount={ui.count} completed={p==='finished'}/>
      {preparing?<div className="cs-iphone-export" role="status"><strong>Preparing shareable MP4… {Math.floor(countedClip.progress*100)}%</strong><progress value={countedClip.progress} max="1" aria-label="Preparing video with rep counter"/><p>You can play and review your round now. Keep this page open while the shareable MP4 prepares. Export time varies by device. Your original recording is also available below.</p><button type="button" className="cs-iphone-secondary" onClick={useOriginalVideo}>Use original video (no counter)</button></div>:countedClip.status==='ready'?<p className="cs-iphone-video-ready">✓ Counted MP4 ready · {countedClip.width} × {countedClip.height} · Original frame timing preserved.</p>:<div className="cs-iphone-export"><p role="status">{countedClip.status==='unavailable'?countedClip.message:countedClip.status==='original'?'Original selected: this video has no rep counter.':'Your counted replay prepares automatically. Keep this page open.'}</p><button type="button" className="cs-iphone-secondary" onClick={prepareCountedVideo}>Prepare counted video</button><button type="button" className="cs-iphone-secondary" onClick={useOriginalVideo}>Use original video (no counter)</button></div>}
      <div className="cs-iphone-video-actions">
       <button type="button" className="cs-iphone-primary" onClick={()=>shareVideo(true)} disabled={sharing||!canSave}><FiDownload aria-hidden="true"/> {countedClip.status==='ready'?'Save counted video':countedClip.status==='original'?'Save original video (no counter)':countedClip.status==='unavailable'?'Counted video unavailable':'Preparing counted video…'}</button>
       <button type="button" className="cs-iphone-secondary" onClick={()=>shareVideo()} disabled={sharing||!canSave}><FiShare2 aria-hidden="true"/> {sharing?'Opening…':'Share video'}</button>
      </div>
      {canSave&&<a className="cs-iphone-file-download" href={savedClip.url} download={filename}>Download {countedClip.status==='ready'?'counted':'original'} video file</a>}
      <details><summary>Original camera file (no counter)</summary><a className="cs-iphone-file-download cs-iphone-original-download" href={clip.url} download={originalFilename}>Save original camera video (no counter)</a></details>
      <p>On iPhone, the share sheet may also offer Save Video or Save to Files. Save the clip before leaving or starting another round.</p>
     </>:<p role="status">{clip.status==='finishing'?'Preparing your replay…':clip.status==='unavailable'?'Video recording is unavailable in this browser. Your count is still shown above.':'No drill video was recorded for this attempt.'}</p>}
     {shareMessage&&<p role="status">{shareMessage}</p>}
     <ShareTraining text={summary}/>
     <small>Sharing opens your device’s share options. Videos are not posted to the in-app Circle feed.</small>
    </div>
    <p className="cs-iphone-review-note">Camera test result · Compare with your actual reps. No XP or Circle standings are changed.</p>
    {ui.total>0&&<details className="cs-iphone-evidence"><summary>Help check this count</summary><p>If a count looks wrong, save the video and its matching test details. The details record ball detections, counting decisions, and timing; no video is uploaded automatically.</p><button type="button" className="cs-iphone-secondary" onClick={saveEvidence}>Save test details</button></details>}
    <button type="button" className="cs-iphone-secondary" onClick={open}>Start another round</button>
   </section>}
   <details className="cs-iphone-help"><summary>Camera setup tips</summary><p>A stable floor-level support or tripod works in either orientation. If the phone is on the floor, tilt it up until your head, both feet and the basketball fit, with some floor visible below your shoes. Landscape usually gives more room for your arm and the ball. Hold the basketball comfortably in either visible hand until Go. Small adjustments are okay. A brief ball-lock interruption pauses the countdown and keeps your progress. A longer loss restarts the position check. The status message explains which check needs attention. A ring follows the detected ball; counting begins only after the five-second countdown.</p><p>If you rotate the phone, CourtStreak checks the new framing before starting again. Keep the phone still while training.</p></details>
   <footer>On-device detector test · {ui.fps>0?`${ui.fps.toFixed(1)} tracking frames/sec`:'Waiting for camera'}<br/>Your round records locally from Go until Time for replay. Camera video stays on this device unless you choose to save or share it.</footer>
  </div>
 </main>;
}

