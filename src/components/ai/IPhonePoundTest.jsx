import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { loadDetector } from '../../lib/ai/iphoneDetector.mjs';
import { BALL_TRACKER_REVISION, EXPERIMENTAL_COUNTER_REVISION, BALL_IDENTITY_REVISION, geometry } from '../../lib/ai/poundCore.mjs';
import { resetPoundTrackingIdentity } from '../../lib/ai/poundTrackingState.mjs';
import {createSessionTrackingState,resetSessionTrackingCounter,updateSessionCounter,sessionROI,CROSSOVER_DRILL_KEY} from '../../lib/ai/sessionTracking.mjs';
import {CROSSOVER_RULE,CROSSOVER_TEST_REVISION} from '../../lib/ai/crossoverCounter.mjs';
import {sessionObservationPolicy,poseFrameSkew} from '../../lib/ai/sessionObservationPolicy.mjs';
import { TRACKER_CHECK_REVISION } from '../../lib/ai/trackerConfiguration.mjs';
import { TRACKER_BUILD_INFO } from '../../lib/ai/trackerBuildInfo.mjs';
import { BALL_PROPOSAL_POLICY_REVISION, ballProposalMinimumScore } from '../../lib/ai/ballProposalPolicy.mjs';
import { CAMERA_REVIEW_REVISION } from '../../lib/ai/cameraReadiness.mjs';
import { SetupReadinessClock, SETUP_TIMING_REVISION } from '../../lib/ai/setupReadiness.mjs';
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
import { SETUP_GUIDANCE_REVISION, SETUP_HELP_SECONDS, SetupGuidance, FramedCalibration, setupInstruction, shiftPreGoTimeline } from '../../lib/ai/setupGuidance.mjs';
import {SetupAttempt,SETUP_ATTEMPT_REVISION,MODEL_LOADING_LIMIT_SECONDS} from '../../lib/ai/setupAttempt.mjs';
import {createCameraPassScheduler} from '../../lib/ai/cameraPassScheduler.mjs';
import StandaloneDrillTimer from './StandaloneDrillTimer.jsx';
import {VideoFrameClock,VIDEO_FRAME_CLOCK_REVISION} from '../../lib/ai/videoFrameClock.mjs';
import PoundSessionView,{TRACKER_PRESENTATION_REVISION} from './PoundSessionView.jsx';
const DURATION=20;
const empty={body:false,hand:false,ball:false,floor:false,owned:false};
const emptyClip={status:'idle',url:'',blob:null};
const emptyCountedClip={...emptyClip,progress:0};
const requestFrontCamera=()=>navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{exact:'user'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}}});
function machine(freshFrames=true,drillKey='right-hand-pound'){return {...createSessionTrackingState(freshFrames,drillKey),phase:'idle',gate:new CameraPositionGate(),readiness:new SetupReadinessClock({handMode:drillKey===CROSSOVER_DRILL_KEY?'either':'right'}),guidance:new SetupGuidance(),calibration:new FramedCalibration(),evidence:new RoundEvidence(),poseClock:new PoseRefreshClock(),person:null,ball:null,poseAt:-Infinity,times:[],goodSince:null,progress:0,count:0,left:DURATION,countdown:5,fps:0,checks:empty,message:'Set your phone on stable support, angled toward you. Fit your head, feet and some floor in the picture.',lastInference:0,started:null,detected:0,total:0};}
export default function IPhonePoundTest({freshFrames=true,drillKey='right-hand-pound',standalone=false}){
 const crossover=drillKey===CROSSOVER_DRILL_KEY,drillName=crossover?'Crossovers':'Right-Hand Pound',fileKey=crossover?'crossovers':'right-hand-pound',setupOptions={handMode:crossover?'either':'right'},cameraOptions={handMode:crossover?'both':'right'};
 const observationPolicy=sessionObservationPolicy(drillKey,freshFrames);
 const navigate=useNavigate(),video=useRef(null),overlay=useRef(null),frame=useRef(null),m=useRef(null),detector=useRef(null),stream=useRef(null),scheduler=useRef(null),mounted=useRef(true),token=useRef(0),wake=useRef(null),audio=useRef(null);
 if(!m.current)m.current=machine(freshFrames,drillKey);
 if(!scheduler.current)scheduler.current=createCameraPassScheduler();
 const [ui,setUI]=useState({...m.current}),[ratio,setRatio]=useState(16/9),[manual,setManual]=useState(false);
 const recorder=useRef(null),recordTimer=useRef(null),recordURL=useRef(''),recordVersion=useRef(0),resultPanel=useRef(null),evidenceURL=useRef(''),videoClock=useRef(null);
 if(!videoClock.current)videoClock.current=new VideoFrameClock();
 const countTimeline=useRef(new DisplayedCountTimeline()),countedURL=useRef(''),videoExport=useRef(null);
 const [clip,setClip]=useState(emptyClip),[shareMessage,setShareMessage]=useState(''),[sharing,setSharing]=useState(false);
 const [countedClip,setCountedClip]=useState(emptyCountedClip);
 const lastPublished=useRef({at:-Infinity});
 const publish=(force=false)=>{if(mounted.current){
  const s=m.current,now=performance.now()/1000,previous=lastPublished.current;
  countTimeline.current.record(s.count,now);
  // Counting, countdown digits and phase changes paint immediately. Other
  // camera observations need at most five React updates per second.
  if(!force&&now-previous.at<.2&&previous.phase===s.phase&&previous.count===s.count&&previous.countdown===s.countdown)return;
  lastPublished.current={at:now,phase:s.phase,count:s.count,countdown:s.countdown,rechecking:s.rechecking};setUI({...s});
 }};
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
 const stopCamera=()=>{stopRecording();videoClock.current.stop();stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;wake.current?.release().catch(()=>{});wake.current=null;};
 const fail=(message)=>{const s=m.current;s.phase='error';s.message=message;stopCamera();publish();};
 const toSetup=(message=crossover?'Fit your head, both wrists, feet and a little floor in the picture. Hold the ball in either hand.':'Fit your head, feet and a little floor in the picture. Hold the ball beside your right hip.')=>{
  const previous=m.current;if(['active','review'].includes(previous.phase))discardRecording();detector.current?.poseWorker?.reset();m.current={...machine(freshFrames,drillKey),phase:'setup',cameraReady:true,setupStartedAt:performance.now()/1000,lastInference:previous.lastInference,sized:previous.sized,videoFrameClockMode:previous.videoFrameClockMode,setupAttempt:new SetupAttempt(performance.now()/1000),cameraSettingsAtStart:previous.cameraSettingsAtStart,message};publish();
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
  }else if(['setup','countdown'].includes(s.phase)){s.gate.reset();s.readiness.reset();s.progress=0;s.rechecking=false;s.phase='setup';s.message=message;publish();}
 };
 const draw=()=>{
  const canvas=overlay.current,s=m.current;if(!canvas)return;const c=canvas.getContext('2d'),[w,h]=s.frameSize??[canvas.width,canvas.height];c.clearRect(0,0,canvas.width,canvas.height);c.save();c.scale(canvas.width/w,canvas.height/h);
  // Keep the player's picture clear. A flickering body box is not useful
  // guidance; readiness is explained by the single instruction beside it.
  if(s.ball){const g=geometry(s.ball);c.strokeStyle=s.tracker.ready()?'#5ee1aa':'#ffb26f';c.lineWidth=w/280;c.beginPath();c.arc(...g.center,g.diameter*.62,0,Math.PI*2);c.stroke();}
  c.restore();
 };
 const scheduleLoop=(paired=!!observationPolicy.nativeCapture)=>{
  const id=token.current,v=video.current;
  scheduler.current.schedule(()=>{if(id===token.current&&mounted.current)void loop();},{paired,freshVideo:!!v&&!v.paused&&v.readyState>=2&&(observationPolicy.nativeCapture?videoClock.current.hasNew(m.current.videoFrameSerial):v.currentTime!==m.current.videoTime),waitForVideoFrame:paired?ready=>videoClock.current.waitForNext(m.current.videoFrameSerial,ready):undefined});
 };
 const pauseSetup=(reason)=>{
  const s=m.current;token.current++;scheduler.current.cancel();s.setupFailure={...reason,lastInstruction:s.setupGuide?.screenText??null,positionMessage:s.checks?.message??null};s.phase='error';
  const detail=reason.key==='framing'&&s.checks?.message?s.checks.message:reason.message;
  s.message=`${reason.title} ${detail} The camera check stopped before Go. You can save its details, retry, or use the timer.`;
  stopCamera();publish(true);
 };
 const loop=async()=>{
  const currentToken=token.current,s=m.current,v=video.current,d=detector.current;
  if(!mounted.current||!d||!v||!stream.current||['finished','error','interrupted','recording-only'].includes(s.phase))return;
  if(v.readyState<2||v.paused){scheduleLoop();return;}
  const sourceFrame=observationPolicy.nativeCapture?videoClock.current.read():null;
  if(observationPolicy.nativeCapture?(!sourceFrame||sourceFrame.serial===s.videoFrameSerial):v.currentTime===s.videoTime){scheduleLoop(!!observationPolicy.nativeCapture);return;}
  s.videoTime=sourceFrame?.sourceVideoTime??v.currentTime;s.videoFrameSerial=sourceFrame?.serial??null;
  const rawRatio=v.videoWidth/v.videoHeight,w=1280,h=Math.round(w/rawRatio),captureW=observationPolicy.nativeCapture?v.videoWidth:w,captureH=observationPolicy.nativeCapture?v.videoHeight:h,passStartedAt=performance.now()/1000;
  let now=passStartedAt;
  if(!frame.current)frame.current=document.createElement('canvas');const f=frame.current;
  if(f.width!==captureW||f.height!==captureH){
   const changed=!!f.width&&s.sized;f.width=captureW;f.height=captureH;overlay.current.width=captureW;overlay.current.height=captureH;setRatio(rawRatio);
   if(changed){toSetup('Camera orientation changed. Stay in view while we check your new framing.');scheduleLoop();return;}
  }
  s.sized=true;
  const c=f.getContext('2d');c.save();c.translate(captureW,0);c.scale(-1,1);c.drawImage(v,0,0,captureW,captureH);c.restore();
  const frozenFrame=observationPolicy.nativeCapture?{image:f,width:w,height:h}:f;
  s.frameSize=[w,h];s.captureFrameSize=[captureW,captureH];
  try{
   const inputPhase=s.phase,bodyWorker=d.poseWorker,poseInputVideoTime=s.videoTime;
   let poseUpdated=false;
   const acceptBody=()=>{
    const body=bodyWorker?.latest;
    if(body&&body.id!==s.poseResultId){s.poseResultId=body.id;s.person=physicalPoseSides(body.person,true);s.poseAt=body.capturedAt;s.poseVideoTime=body.sourceVideoTime;s.poseMs=body.ms;s.poseClock.completed(body.completedAt);poseUpdated=true;}
   };
   acceptBody();
   if(bodyWorker?.error){interrupt(bodyWorker.error.message,{preserveVideo:true});if(s.phase==='setup')fail(bodyWorker.error.message);return;}
   const withPose=!bodyWorker&&(observationPolicy.poseEveryPass||s.poseClock.shouldRun(now,Number.isFinite(s.poseAt))),roi=['active','review'].includes(s.phase)?sessionROI(s,s.person,w,h):[0,0,w,h];
   // Even a "no person" result gets the normal resting interval; looking for
   // someone outside the camera must not turn into continuous body inference.
   if(bodyWorker&&s.poseClock.shouldRun(now,!!bodyWorker.latest))bodyWorker.request(f,{capturedAt:now,sourceVideoTime:s.videoTime});
   const result=await d.detect(frozenFrame,roi,withPose,freshFrames?{minimumBallScore:ballProposalMinimumScore({phase:s.phase,calibrated:s.tracker.ready(),weakContinuity:s.tracker.weakContinuity}),refreshBallFrame:observationPolicy.refreshBallFrame?()=>{
    if(!mounted.current||currentToken!==token.current||s!==m.current||!stream.current||['error','interrupted','finished','recording-only'].includes(s.phase))return null;
    if(v.readyState<2||v.paused)return null;
    if(v.videoWidth/v.videoHeight!==rawRatio){toSetup('Camera orientation changed. Stay in view while we check your new framing.');return null;}
    // Do not assign a newer timestamp to unchanged video pixels.
    if(v.currentTime===s.videoTime)return undefined;
    const capturedAt=performance.now()/1000,sourceVideoTime=v.currentTime;
    c.save();c.translate(w,0);c.scale(-1,1);c.drawImage(v,0,0,w,h);c.restore();
    return {frame:f,capturedAt,sourceVideoTime};
   }:undefined}:undefined);
   if(!mounted.current||currentToken!==token.current)return;
   if(s!==m.current){scheduleLoop();return;}
   if(['error','interrupted','finished','recording-only'].includes(s.phase))return;
   if(result.cancelled){scheduleLoop();return;}
   if(result.ballFrameRefreshed){now=result.capturedAt;s.videoTime=result.sourceVideoTime;}
   const completed=performance.now()/1000;s.lastInference=completed;
   s.times.push(completed);s.times=s.times.filter(t=>completed-t<3);
   s.fps=s.times.length>1?(s.times.length-1)/(completed-s.times[0]):0;
   if(withPose){s.person=physicalPoseSides(result.person,true);s.poseAt=passStartedAt;s.poseVideoTime=poseInputVideoTime;const pt=result.timings?.pose;s.poseMs=pt?pt.preprocessMs+pt.inferenceMs+pt.decodeMs:null;s.poseClock.completed(completed);poseUpdated=true;}
   acceptBody();
   const framePerson=poseForFrame(s.person,s.poseAt,now,completed);
   const phase=['active','review'].includes(s.phase)?'drill':s.phase;
   if(s.phase==='setup'){
    const framing=evaluateCameraSetup(framePerson,null,w,h,cameraOptions);
    if(s.calibration.update(now,framing.body&&framing.hand&&framing.floor,!framePerson&&!!s.person))resetPoundTrackingIdentity(s);
   }
   s.ball=s.tracker.select(result.balls,framePerson,phase,w,h,now);
   const checks=evaluateCameraSetup(framePerson,s.ball,w,h,cameraOptions);
   if(!framePerson&&s.person){checks.refreshingBody=true;checks.message='Refreshing body and wrist tracking. Keep your position while we wait for a fresh check.';}
   s.checks=checks;
   const speedReady=s.times.length>=16&&completed-s.times[0]>=1.5&&s.fps>=10&&completed-passStartedAt<.35;
   if(['setup','countdown'].includes(s.phase))s.setupAttemptState=s.setupAttempt.update(completed,checks,speedReady,s.tracker.ready());
   let frameProposals=[],frameConfirmed=[],setupReadiness;
   const recordEvidence=()=>s.evidence.record({capturedAt:now,sourceVideoTime:s.videoTime,sourceVideoFrameNumber:s.videoFrameSerial,inputPhase,phase:s.phase,roi,balls:result.balls,person:framePerson,selected:s.ball,selectionDecisions:s.tracker.decisions,ballProposalMinimumScore:result.ballProposalMinimumScore,ms:result.ms,timings:result.timings,fps:s.fps,poseUpdated,poseAge:completed-s.poseAt,poseCapturedAt:s.poseAt,poseSourceVideoTime:s.poseVideoTime,poseFrameSkewSeconds:poseFrameSkew(now,s.poseAt),poseInferenceMs:s.poseMs??null,passStartedAt,ballFrameRefreshed:!!result.ballFrameRefreshed,positionChecks:checks,setupReadiness,counterFrame:s.counter.points.at(-1)?.frame??null,proposedCount:s.counter.count,count:s.count,proposals:frameProposals,confirmed:frameConfirmed,...(crossover?{handoffState:s.counter.snapshot()}:{} )});
   if(['setup','countdown'].includes(s.phase)&&s.setupAttemptState?.expired){recordEvidence();pauseSetup(s.setupAttemptState);return;}
   if(s.phase==='setup'){
    const readiness=s.readiness.update(now,checks,speedReady,s.tracker.ready()),condition=readiness.condition;
    setupReadiness={speedReady,ballLockReady:s.tracker.ready(),conditionValid:condition.valid,refreshBridged:readiness.refreshBridged,elapsed:readiness.elapsed,reset:readiness.reset};
    if(readiness.reset){s.gate.reset();s.progress=0;}
    if(readiness.ready)s.progress=s.gate.update(readiness.elapsed,checks,s.ball,s.tracker,speedReady);
    s.setupGuide=s.guidance.update(now,setupInstruction(checks,speedReady,s.tracker.ready(),condition,setupOptions));
    s.message=s.setupGuide.message;
    s.setupSlow=completed-s.setupStartedAt>=SETUP_HELP_SECONDS;
    s.setupBlocker=condition.valid?null:condition.message;
    if(s.progress>=1&&readiness.ready){s.phase='countdown';s.readiness.reset(now,{retainPosition:true});resetSessionTrackingCounter(s);s.countdownAt=now;s.countdown=5;s.message='Position locked. Stay in view until Go.';s.lastCue=5;cue();}
   }else if(s.phase==='countdown'){
    const readiness=s.readiness.update(now,checks,speedReady,s.tracker.ready()),condition=readiness.condition;
    setupReadiness={speedReady,ballLockReady:s.tracker.ready(),conditionValid:condition.valid,refreshBridged:readiness.refreshBridged,elapsed:readiness.elapsed,reset:readiness.reset};
    s.setupBlocker=condition.valid?null:condition.message;
    s.rechecking=!readiness.ticking;
    if(readiness.reset){
     s.phase='setup';s.gate.reset();s.readiness.reset(now);s.progress=0;s.rechecking=false;s.message=`Position check restarted. ${condition.message}`;
    }else{
     // Move the expected Go time when paused, retaining actual pre-Go sample spacing.
     const revisedStart=now-readiness.countdownElapsed,pause=Math.max(0,revisedStart-s.countdownAt);
     shiftPreGoTimeline(s,pause);
     s.countdownAt=revisedStart;s.countdown=Math.max(0,Math.ceil(5-readiness.countdownElapsed));
     s.message=readiness.ticking?(crossover?'Hold the ball in either hand. Wait for Go.':'Keep the ball in your right hand. Wait for Go.'):`Hold your position. ${condition.message}`;
     if(s.countdown!==s.lastCue){s.lastCue=s.countdown;cue(s.countdown?650:1000);}
     if(s.countdown===0&&readiness.ready){s.phase='active';s.started=completed;const shift=completed-(s.countdownAt+5);shiftPreGoTimeline(s,shift);s.count=0;s.message=crossover?'Go. Bounce from one hand into the other, under control.':'Go. Complete clean right-hand pounds.';startRecording(completed);}
    }
   }
   if(s.phase==='countdown'){const g=s.ball?geometry(s.ball):null,t=now-(s.countdownAt+5);const result=updateSessionCounter(s,t,g?[...g.center,g.diameter]:null,framePerson,h,DURATION);frameProposals=result.proposals;}
   if(['active','review'].includes(s.phase)){
    const elapsed=now-s.started;s.go=elapsed<.8;
    if(completed-passStartedAt>.5){recordEvidence();interrupt('Tracking stalled during this attempt.',{preserveVideo:true});return;}
    if(elapsed>=DURATION&&s.phase==='active'){stopRecording();s.phase='review';s.message='Time. Hold the ball while we confirm the last return.';cue(400);}
    const measurement=s.ball?(()=>{const g=geometry(s.ball);return [...g.center,g.diameter];})():null;
    if(elapsed>=0&&elapsed<DURATION){s.total++;if(measurement)s.detected++;}
    const {proposals,confirmed}=updateSessionCounter(s,elapsed,measurement,framePerson,h,DURATION);s.count=s.validator.count;s.left=Math.max(0,Math.min(DURATION,Math.ceil(DURATION-elapsed)));
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
  if(mounted.current&&!['finished','error','interrupted','recording-only'].includes(m.current.phase))scheduleLoop(!!observationPolicy.nativeCapture);
 };
 async function open({restart=false}={}){
  if(['loading','active','review','recording-only'].includes(m.current.phase)||(!restart&&['setup','countdown'].includes(m.current.phase)))return;
  const id=++token.current;scheduler.current.cancel();stopCamera();discardRecording();m.current=machine(freshFrames,drillKey);m.current.phase='loading';m.current.loadingStartedAt=performance.now()/1000;m.current.message='Allow your front camera when your phone asks.';publish();
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audio.current??=new Audio();void audio.current.resume();}
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Open CourtStreak in Safari using its HTTPS website to allow camera access.');
   // Request permission directly from the tap; never silently choose the rear camera.
   const camera=await requestFrontCamera();
   if(id!==token.current||!mounted.current){camera.getTracks().forEach(t=>t.stop());return;}stream.current=camera;
   const settings=camera.getVideoTracks()[0].getSettings?.()??{};
   m.current.cameraSettingsAtStart=Object.fromEntries(['width','height','frameRate','facingMode','aspectRatio'].filter(key=>settings[key]!==undefined).map(key=>[key,settings[key]]));
   camera.getVideoTracks()[0].addEventListener('ended',()=>{if(stream.current===camera)fail('The camera stopped. Enable it again to check your position.');},{once:true});
   // Commit the visible preview before starting playback. The camera remains
   // mounted throughout model loading, setup, countdown and the round.
   m.current.cameraReady=true;flushSync(()=>publish(true));
   video.current.srcObject=camera;await video.current.play();
   if(id!==token.current||!mounted.current)return;
   if(observationPolicy.nativeCapture){videoClock.current.start(video.current);m.current.videoFrameClockMode=videoClock.current.mode;}
   m.current.cameraReady=true;setRatio(video.current.videoWidth/video.current.videoHeight||16/9);m.current.message='Your camera is on. Preparing tracking; first use can take a moment.';publish(true);
   if(detector.current?.poseWorker?.error){await detector.current.close();detector.current=null;}
   if(!detector.current){const loaded=await loadDetector(import.meta.env.BASE_URL,()=>{if(id===token.current){m.current.message='Your camera is on. Preparing tracking; first use can take a moment.';publish();}},{asyncPose:observationPolicy.asyncPose});if(id!==token.current||!mounted.current){await loaded.close();return;}detector.current=loaded;}
   if(id!==token.current||!mounted.current)return;
   await detector.current.idle();
   if(id!==token.current||!mounted.current)return;
   if(navigator.wakeLock)navigator.wakeLock.request('screen').then(lock=>{if(id!==token.current||!mounted.current){void lock.release();return;}wake.current=lock;}).catch(()=>{});
   toSetup();scheduleLoop();
  }catch(error){if(id!==token.current||!mounted.current)return;const messages={NotAllowedError:'Camera permission was denied. Allow CourtStreak camera access in Safari, then try again.',NotFoundError:'The front camera is unavailable on this device.',OverconstrainedError:'Safari could not select the front camera. Check camera access and try again.'};fail(messages[error.name]||error.message);}
 }
 useEffect(()=>{
  mounted.current=true;
  const hidden=()=>{if(document.hidden){interrupt('CourtStreak went into the background. Return and enable the camera for a fresh setup check.');if(['loading','setup','countdown'].includes(m.current.phase)){token.current++;m.current.phase='interrupted';m.current.message='Return to CourtStreak and enable the camera again.';stopCamera();publish();}}};
  const rotate=()=>{if(m.current.phase==='recording-only'){interrupt('Phone rotated while preserving the partial attempt.');return;}if(['setup','countdown','active','review'].includes(m.current.phase))toSetup('Phone rotated. Hold the ball comfortably while we check your new framing.');};
  window.addEventListener('orientationchange',rotate);screen.orientation?.addEventListener('change',rotate);
  const watchdog=setInterval(()=>{const s=m.current,now=performance.now()/1000;if(s.phase==='recording-only'){s.left=Math.max(0,Math.ceil(DURATION-(now-s.started)));publish();return;}if(s.phase==='loading'&&now-s.loadingStartedAt>=MODEL_LOADING_LIMIT_SECONDS){pauseSetup({key:'loading',title:'Tracker loading took too long.',message:'The camera models did not finish preparing. Retry when ready, or use the timer.',elapsed:now-s.loadingStartedAt,limitSeconds:MODEL_LOADING_LIMIT_SECONDS});return;}
   if(['setup','countdown'].includes(s.phase)){
    if(!s.lastInference||now-s.lastInference>.8)s.setupAttemptState=s.setupAttempt.update(now,{...s.checks,refreshingBody:true},false,false);
    else s.setupAttemptState=s.setupAttempt.snapshot(now);
    if(s.setupAttemptState.expired){pauseSetup(s.setupAttemptState);return;}
    s.setupSlow=now-s.setupStartedAt>=SETUP_HELP_SECONDS;
    if(s.setupSlow)publish();
   }if(s.lastInference&&now-s.lastInference>.8&&['countdown','active','review'].includes(s.phase)){interrupt('Camera tracking paused. We need fresh frames before continuing.',{preserveVideo:true});}},200);
  document.addEventListener('visibilitychange',hidden);
  return()=>{mounted.current=false;token.current++;clearInterval(watchdog);window.removeEventListener('orientationchange',rotate);screen.orientation?.removeEventListener('change',rotate);document.removeEventListener('visibilitychange',hidden);scheduler.current.cancel();discardRecording();stopCamera();void detector.current?.close();detector.current=null;void audio.current?.close();audio.current=null;};
 },[]);
 useEffect(()=>{
  if(['finished','interrupted'].includes(ui.phase)){resultPanel.current?.focus({preventScroll:true});resultPanel.current?.scrollIntoView({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 },[ui.phase]);
 const p=ui.phase,live=['setup','countdown','active','review','recording-only'].includes(p),ended=['finished','interrupted'].includes(p);
 const replayChanges=useMemo(()=>ended?countTimeline.current.snapshot():[],[ended,clip.url,clip.status,ui.count]);
 const preparing=countedClip.status==='preparing',canSave=['ready','original'].includes(countedClip.status),savedClip=countedClip.status==='ready'?countedClip:clip;
 const summary=`CourtStreak · ${drillName} · ${ui.count} detected reps · ${p==='finished'?'20-second round':'Incomplete attempt'}. Camera test result.`;
 const fileStem=`CourtStreak-${fileKey}-${ui.count}-reps${p==='finished'?'':'-partial'}`;
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
  if(ended&&clip.status==='ready'&&countedClip.status==='idle'){
   if(crossover)useOriginalVideo();else void prepareCountedVideo();
  }
 },[ended,clip.status,countedClip.status,crossover]);
 function useOriginalVideo(){videoExport.current?.abort();videoExport.current=null;setCountedClip({...emptyCountedClip,status:'original'});}
 function saveEvidence(){
  const s=m.current;
  const data=s.evidence.export({startedAt:s.started,baseSourceCommit:TRACKER_BUILD_INFO.sourceCommit,buildInfo:TRACKER_BUILD_INFO,trackerCheckRevision:crossover?CROSSOVER_TEST_REVISION:TRACKER_CHECK_REVISION,trackerConfiguration:s.configuration,trackerRevision:s.configuration.counterRevision,...(s.configuration.identityRevision?{ballIdentityRevision:s.configuration.identityRevision}:{}),cameraRevision:CAMERA_SETUP_REVISION,readinessRevision:CAMERA_REVIEW_REVISION,detectorInputMode:detector.current?.liveInputMode??'legacy',controlRevision:CONTROL_REVISION,poseScheduleRevision:POSE_SCHEDULE_REVISION,poseExecutionRevision:detector.current?.poseWorker?POSE_EXECUTION_REVISION:'sequential',poseMode:detector.current?.poseMode??'sequential',liveFrameRevision:freshFrames?LIVE_FRAME_REVISION:'FRAME 00',poseSideConvention:'Original physical person; detector image is mirrored',
   drillKey,...(crossover?{repDefinition:CROSSOVER_RULE,videoFrameClockRevision:VIDEO_FRAME_CLOCK_REVISION,videoFrameClockMode:s.videoFrameClockMode}:{}),observationPolicy,poseProvider:detector.current?.poseWorker?'wasm':detector.current?.provider,timerSeconds:DURATION,phase:s.phase,message:s.message,displayedCount:s.count,presentationRevision:TRACKER_PRESENTATION_REVISION,setupGuidanceRevision:SETUP_GUIDANCE_REVISION,setupTimingRevision:SETUP_TIMING_REVISION,setupAttemptRevision:SETUP_ATTEMPT_REVISION,setupAttempt:s.setupAttemptState??null,setupFailure:s.setupFailure??null,setupStartedAt:s.setupStartedAt??null,setupBlocker:s.setupBlocker??null,latestPositionChecks:s.checks,
   framesWithSelectedBall:s.detected,trainingFrames:s.total,ballCoverage:s.total?s.detected/s.total:null,
   provider:detector.current?.provider,detectorInputRevision:detector.current?.inputRevision,ballProposalPolicyRevision:BALL_PROPOSAL_POLICY_REVISION,detectorResources:detector.current?.resourceSummary,modelManifest:detector.current?.modelManifest,runtime:{userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency??null},cameraSettingsAtStart:s.cameraSettingsAtStart,frameSize:s.frameSize??[frame.current?.width,frame.current?.height],captureFrameSize:s.captureFrameSize??null,
   recordingAvailable:!!clip.blob,videoRevision:VIDEO_OVERLAY_REVISION,recordingRevision:RECORDING_TAIL_REVISION,countingStoppedAt:s.countingStoppedAt??null,recordedUntil:s.recordedUntil??null,interruptionReason:s.interruptionReason??null,videoExport:countedClip.exportInfo??null,countDisplayStartedAt:countTimeline.current.startedAt,
   displayedCountTimeline:countTimeline.current.snapshot(),savedVideoStyle:countedClip.status==='ready'?'count-overlay':'original',
   countOverlayTiming:'Display changes at live acceptance time; final card includes the post-round review. No bounce-time backdating.',
   rejectedEvents:s.validator.rejected,pendingEvents:s.validator.pending});
  if(evidenceURL.current)URL.revokeObjectURL(evidenceURL.current);
  evidenceURL.current=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));
  const link=document.createElement('a');link.href=evidenceURL.current;link.download=`CourtStreak-${fileKey}-${s.count}-reps-test-details.json`;document.body.append(link);link.click();link.remove();
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
 if(manual)return <StandaloneDrillTimer drillName={drillName} onBack={()=>setManual(false)}/>;
 return <PoundSessionView drillKey={drillKey} ui={ui} ratio={ratio} live={live} ended={ended} ballLocked={!!ui.ball&&m.current.tracker.ready()}
  videoRef={video} overlayRef={overlay} resultPanelRef={resultPanel}
  clip={clip} countedClip={countedClip} replayChanges={replayChanges} preparing={preparing}
  canSave={canSave} savedClip={savedClip} sharing={sharing} shareMessage={shareMessage}
  filename={filename} originalFilename={originalFilename}
  versions={{counter:m.current.configuration.counterRevision,camera:CAMERA_SETUP_REVISION,frame:LIVE_FRAME_REVISION,identity:m.current.configuration.identityRevision??BALL_IDENTITY_REVISION,check:crossover?CROSSOVER_TEST_REVISION:TRACKER_CHECK_REVISION}}
  onBack={()=>navigate(standalone?'/':`/lab/drill/${drillKey}`)} onOpen={open}
  onRetrySetup={()=>open({restart:true})} onManual={()=>{if(!standalone){navigate(`/lab/drill/${drillKey}/session`);return;}token.current++;scheduler.current.cancel();stopCamera();m.current.phase='error';m.current.message='Camera check paused. Retry when ready.';publish(true);setManual(true);}}
  onStop={()=>{token.current++;scheduler.current.cancel();m.current.phase='interrupted';m.current.message='Attempt stopped. Recheck your position when ready.';stopCamera();publish();}}
  onSaveEvidence={saveEvidence} onPrepareVideo={prepareCountedVideo}
  onUseOriginal={useOriginalVideo} onShareVideo={shareVideo}/>;
}

