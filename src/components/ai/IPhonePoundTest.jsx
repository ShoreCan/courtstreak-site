import {repairConfiguration,repairObservationPolicy,repairCounterPose,repairPoseNeeded} from '../../lib/ai/repairPolicy.mjs';
import {safariConfiguration,safariObservationPolicy,overlayFreshness,nextOverlayExpiry} from '../../lib/ai/safariPolicy.mjs';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadDetector } from '../../lib/ai/iphoneDetector.mjs';
import { BALL_TRACKER_REVISION, EXPERIMENTAL_COUNTER_REVISION, BALL_IDENTITY_REVISION, geometry } from '../../lib/ai/poundCore.mjs';
import { resetPoundTrackingIdentity } from '../../lib/ai/poundTrackingState.mjs';
import {createSessionTrackingState,resetSessionTrackingCounter,updateSessionCounter,sessionROI,CROSSOVER_DRILL_KEY} from '../../lib/ai/sessionTracking.mjs';
import {CROSSOVER_RULE,CROSSOVER_TEST_REVISION} from '../../lib/ai/crossoverCounter.mjs';
import {sessionObservationPolicy,poseFrameSkew} from '../../lib/ai/sessionObservationPolicy.mjs';
import {floorViewROI,mergeFloorProposals,FLOOR_VIEW_REVISION} from '../../lib/ai/floorViewPolicy.mjs';
import {LiveTrackingBudget,trackingCadence,setupProcessingReadiness,LIVE_BUDGET_REVISION} from '../../lib/ai/liveTrackingBudget.mjs';
import { TRACKER_CHECK_REVISION } from '../../lib/ai/trackerConfiguration.mjs';
import { TRACKER_BUILD_INFO } from '../../lib/ai/trackerBuildInfo.mjs';
import { BALL_PROPOSAL_POLICY_REVISION, ballProposalMinimumScore } from '../../lib/ai/ballProposalPolicy.mjs';
import { CAMERA_REVIEW_REVISION } from '../../lib/ai/cameraReadiness.mjs';
import {CountdownReadinessClock,COUNTDOWN_READINESS_REVISION} from '../../lib/ai/countdownReadiness.mjs';
import { SetupReadinessClock, SETUP_TIMING_REVISION } from '../../lib/ai/setupReadiness.mjs';
import { DrillRecording, recordingExtension } from '../../lib/ai/drillRecording.mjs';
import { RoundEvidence } from '../../lib/ai/roundEvidence.mjs';
import { CONTROL_REVISION, physicalPoseSides } from '../../lib/ai/poseCoordinates.mjs';
import { VIDEO_OVERLAY_REVISION, DisplayedCountTimeline } from '../../lib/ai/videoCountOverlay.mjs';
import { createQualityCountedVideo } from '../../lib/ai/createQualityCountedVideo.mjs';
import { RECORDING_TAIL_REVISION, recordingTailSeconds } from '../../lib/ai/recordingTail.mjs';
import { POSE_EXECUTION_REVISION, poseForFrame } from '../../lib/ai/poseWorkerClient.mjs';
import { POSE_SCHEDULE_REVISION, PoseRefreshClock, poseNeededForPass, SETUP_POSE_SCHEDULE_REVISION } from '../../lib/ai/poseRefreshClock.mjs';
import {evaluateVisibleSetup,VISIBLE_SETUP_REVISION} from '../../lib/ai/visibleSetup.mjs';
import { CAMERA_SETUP_REVISION, CameraPositionGate, evaluateCameraSetup } from '../../lib/ai/cameraSetup.mjs';
import { LIVE_FRAME_REVISION } from '../../lib/ai/detectionPass.mjs';
import { SETUP_GUIDANCE_REVISION, SETUP_HELP_SECONDS, SetupGuidance, FramedCalibration, CALM_SETUP_START, setupInstruction, shiftPreGoTimeline } from '../../lib/ai/setupGuidance.mjs';
import {SetupAttempt,SETUP_ATTEMPT_REVISION,MODEL_LOADING_LIMIT_SECONDS} from '../../lib/ai/setupAttempt.mjs';
import {createCameraPassScheduler} from '../../lib/ai/cameraPassScheduler.mjs';
import StandaloneDrillTimer from './StandaloneDrillTimer.jsx';
import {PhonePlacement,PHONE_PLACEMENT_REVISION} from '../../lib/ai/phonePlacement.mjs';
import {CameraPreview,CAMERA_PREVIEW_REVISION} from '../../lib/ai/cameraPreview.mjs';
import {captureMirroredFrame,hasFreshCameraPixels} from '../../lib/ai/cameraFrameCapture.mjs';
import {finishCompletedReview} from '../../lib/ai/sessionCompletion.mjs';
import {VideoFrameClock,VIDEO_FRAME_CLOCK_REVISION} from '../../lib/ai/videoFrameClock.mjs';
import PoundSessionView,{TRACKER_PRESENTATION_REVISION,SESSION_FLOW_REVISION} from './PoundSessionView.jsx';
const DURATION=20;
const empty={body:false,hand:false,ball:false,floor:false,owned:false};
const emptyClip={status:'idle',url:'',blob:null};
const emptyCountedClip={...emptyClip,progress:0};
const requestFrontCamera=()=>navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{exact:'user'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}}});
function initialMachine(freshFrames=true,drillKey='right-hand-pound',counterRevision,independentCrossoverPose,enhancedTracking=false,streamingPound=false){return {...createSessionTrackingState(freshFrames,drillKey,counterRevision,independentCrossoverPose,{enhancedTracking,streamingPound}),enhancedTracking,streamingPound,budget:enhancedTracking?new LiveTrackingBudget():null,recoveryMeasurement:null,countdownReadiness:new CountdownReadinessClock({handMode:drillKey===CROSSOVER_DRILL_KEY?'either':'right'}),phase:'idle',gate:new CameraPositionGate(),readiness:new SetupReadinessClock({handMode:drillKey===CROSSOVER_DRILL_KEY?'either':'right'}),guidance:new SetupGuidance(1.2,{minimumHold:2,initial:CALM_SETUP_START}),calibration:new FramedCalibration(),evidence:new RoundEvidence(),poseClock:new PoseRefreshClock(),person:null,ball:null,poseAt:-Infinity,times:[],goodSince:null,progress:0,count:0,left:DURATION,countdown:5,fps:0,checks:empty,message:'Set your phone on stable support, angled toward you. Fit your head, feet and some floor in the picture.',lastInference:0,started:null,detected:0,total:0};}
function machine(...args){
 const state=initialMachine(...args);
 if(args[6]){state.safariGpu=true;state.configuration=safariConfiguration(state.configuration,args[1]);resetPoundTrackingIdentity(state);}
 if(args[7]){state.repairTracking=true;state.configuration=repairConfiguration(state.configuration,args[1]);resetPoundTrackingIdentity(state);resetSessionTrackingCounter(state);}
 return state;
}
export default function IPhonePoundTest({freshFrames=true,drillKey='right-hand-pound',standalone=false,counterRevision,independentCrossoverPose=false,enhancedTracking=false,streamingPound=false,safariGpu=false,repairTracking=false}){
 const crossover=drillKey===CROSSOVER_DRILL_KEY,drillName=crossover?'Crossovers':'Right-Hand Pound',fileKey=crossover?'crossovers':'right-hand-pound',setupOptions={handMode:crossover?'either':'right'},cameraOptions={handMode:crossover?'both':'right'};
 const testRevision=repairTracking?'CAMERA TEST 23':safariGpu?'CAMERA TEST 22':streamingPound?'CAMERA TEST 21':enhancedTracking?'CAMERA TEST 20':crossover?(independentCrossoverPose?'CROSSOVER TEST 13':counterRevision==='CROSS 06'?'CROSSOVER TEST 14':counterRevision==='CROSS 05'?'CROSSOVER TEST 12':CROSSOVER_TEST_REVISION):TRACKER_CHECK_REVISION;
 const observationPolicy=repairTracking?repairObservationPolicy(drillKey):safariGpu?safariObservationPolicy(drillKey):sessionObservationPolicy(drillKey,freshFrames,independentCrossoverPose,enhancedTracking,streamingPound);
 const evaluateSetup=enhancedTracking?evaluateVisibleSetup:evaluateCameraSetup;
 const {state:locationState}=useLocation();
 const pairedFallbackNotice=counterRevision==='CROSS 05'&&!independentCrossoverPose&&locationState?.slowCrossoverWorker;
 const navigate=useNavigate(),video=useRef(null),overlay=useRef(null),frame=useRef(null),m=useRef(null),detector=useRef(null),stream=useRef(null),scheduler=useRef(null),mounted=useRef(true),token=useRef(0),wake=useRef(null),audio=useRef(null);
 const cameraPreview=useRef(null),resumePreview=useRef(false);
 if(!cameraPreview.current)cameraPreview.current=new CameraPreview(requestFrontCamera);
 if(!m.current)m.current=machine(freshFrames,drillKey,counterRevision,independentCrossoverPose,enhancedTracking,streamingPound,safariGpu,repairTracking);
 if(!scheduler.current)scheduler.current=createCameraPassScheduler();
 const [ui,setUI]=useState({...m.current}),[ratio,setRatio]=useState(16/9),[manual,setManual]=useState(false);
 const recorder=useRef(null),recordTimer=useRef(null),recordURL=useRef(''),recordVersion=useRef(0),resultPanel=useRef(null),evidenceURL=useRef(''),videoClock=useRef(null);
 if(!videoClock.current)videoClock.current=new VideoFrameClock();
 const setupHistory=useRef([]);
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
     finishRound();publish();
    }else if(enhancedTracking)recordTimer.current=setTimeout(stopRecording,2000);
    else stopRecording();
   },Math.max(0,(started+DURATION)*1000-performance.now()));
  }
 };
 const overlayExpiry=useRef(null);
 const stopCamera=()=>{clearTimeout(overlayExpiry.current);stopRecording();videoClock.current.stop();stream.current=null;cameraPreview.current.release();m.current.cameraReady=false;wake.current?.release().catch(()=>{});wake.current=null;};
 const finishRound=()=>{stopRecording();wake.current?.release().catch(()=>{});wake.current=null;};
 const fail=(message)=>{const s=m.current;if(finishCompletedReview(s,performance.now()/1000,DURATION,message)){finishRound();stopCamera();publish(true);return;}s.phase='error';s.message=message;stopCamera();publish();};
 const toSetup=(message=crossover?'Fit your head, both wrists, feet and a little floor in the picture. Hold the ball in either hand.':'Fit your head, feet and a little floor in the picture. Hold the ball beside your right hip.')=>{
  const previous=m.current;if(['active','review'].includes(previous.phase))discardRecording();detector.current?.poseWorker?.reset();m.current={...machine(freshFrames,drillKey,counterRevision,independentCrossoverPose,enhancedTracking,streamingPound,safariGpu,repairTracking),phase:'setup',cameraReady:true,setupStartedAt:performance.now()/1000,lastInference:previous.lastInference,sized:previous.sized,placement:previous.placement,placementState:previous.placementState,modelsReady:previous.modelsReady,videoFrameClockMode:previous.videoFrameClockMode,setupAttempt:new SetupAttempt(performance.now()/1000),cameraSettingsAtStart:previous.cameraSettingsAtStart,message};publish();
 };
 const advancePlacement=(now=performance.now()/1000)=>{
  const s=m.current;if(!s.placement||!['placing','loading'].includes(s.phase))return false;
  const placement=s.placement.snapshot(now,!!s.modelsReady);s.placementState=placement;
  if(placement.canCheck){toSetup('Hold the ball comfortably while we check your view.');scheduleLoop();return true;}
  s.phase=placement.stage;
  s.message=placement.stage==='placing'?'Set your phone down and check the preview. Press Start when you’re ready.':'Getting your tracker ready. Position checks begin as soon as it’s prepared.';
  publish();return false;
 };
 const startSession=()=>{const s=m.current;if(s.phase!=='placing'||!s.placement)return;
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audio.current??=new Audio();void audio.current.resume().catch(()=>{});}}catch{}
  s.placement.start(performance.now()/1000);advancePlacement();publish(true);
 };
 const interrupt=(message,{preserveVideo=false}={})=>{
  const s=m.current;
  if(finishCompletedReview(s,performance.now()/1000,DURATION,message)){finishRound();publish(true);return;}
  if(['active','review','recording-only'].includes(s.phase)){
   s.incomplete=true;s.interruptionReason=message;s.countingStoppedAt??=performance.now()/1000-s.started;
   const remaining=preserveVideo?recordingTailSeconds({phase:s.phase,started:s.started,now:performance.now()/1000,duration:DURATION,recorderState:recorder.current?.recorder?.state}):0;
   if(remaining>0){
    s.phase='recording-only';s.message='Counting paused because tracking became unreliable. Keep training: your camera video continues until Time.';
    s.ball=null;s.person=null;s.recoveryMeasurement=null;draw();publish();return;
   }
   s.phase='interrupted';s.message=message;stopCamera();publish();
  }else if(['setup','countdown'].includes(s.phase)){s.gate.reset();s.readiness.reset();s.progress=0;s.rechecking=false;s.phase='setup';s.message=message;publish();}
 };
 const draw=()=>{
  clearTimeout(overlayExpiry.current);
  const overlayNow=performance.now()/1000,fresh=overlayFreshness(m.current.ballCapturedAt,m.current.poseAt,overlayNow);
  const canvas=overlay.current,s=m.current;if(!canvas)return;const c=canvas.getContext('2d'),[w,h]=s.frameSize??[canvas.width,canvas.height];c.clearRect(0,0,canvas.width,canvas.height);c.save();c.scale(canvas.width/w,canvas.height/h);
  // Keep the player's picture clear. A flickering body box is not useful
  // guidance; readiness is explained by the single instruction beside it.
  const drawnPerson=safariGpu?(fresh.poseVisible?s.overlayPerson:null):streamingPound?s.overlayPerson:s.person;
  if(enhancedTracking&&drawnPerson){
   const p=drawnPerson;c.strokeStyle='#68c8e8';c.lineWidth=w/640;
   for(const [a,b]of [[5,6],[5,7],[7,9],[6,8],[8,10],[5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]])if(p.confidence[a]>=.5&&p.confidence[b]>=.5){c.beginPath();c.moveTo(...p.xy[a]);c.lineTo(...p.xy[b]);c.stroke();}
   for(const i of [9,10])if(p.confidence[i]>=.5){c.beginPath();c.arc(...p.xy[i],w/180,0,Math.PI*2);c.stroke();}
  }
  if(enhancedTracking&&s.recoveryMeasurement&&(!safariGpu||fresh.ballVisible)){const [x,y,d]=s.recoveryMeasurement;c.strokeStyle='#ffc857';c.lineWidth=w/360;c.beginPath();c.arc(x,y,d*.55,0,Math.PI*2);c.stroke();}
  if(s.ball&&(!safariGpu||fresh.ballVisible)){const g=geometry(s.ball),uncertain=(streamingPound&&s.ball.score<.008)||(safariGpu&&fresh.ballUncertain);c.setLineDash(uncertain?[w/120,w/160]:[]);c.strokeStyle=!uncertain&&s.tracker.ready()?'#5ee1aa':'#ffb26f';c.lineWidth=w/280;c.beginPath();c.arc(...g.center,g.diameter*.62,0,Math.PI*2);c.stroke();}
  c.restore();
  if(safariGpu&&['setup','countdown','active','review'].includes(s.phase)){
   const expiry=nextOverlayExpiry(s.ballCapturedAt,s.poseAt,overlayNow);
   if(expiry!==null)overlayExpiry.current=setTimeout(draw,Math.max(1,(expiry-overlayNow)*1000));
  }
 };
 const scheduleLoop=(paired=!!observationPolicy.nativeCapture)=>{
  const id=token.current,v=video.current;
  scheduler.current.schedule(()=>{if(id===token.current&&mounted.current)void loop();},{paired,freshVideo:!!v&&!v.paused&&v.readyState>=2&&(observationPolicy.nativeCapture?videoClock.current.hasNew(m.current.videoFrameSerial):v.currentTime!==m.current.videoTime),waitForVideoFrame:paired?ready=>videoClock.current.waitForNext(m.current.videoFrameSerial,ready):undefined});
 };
 const pauseSetup=(reason)=>{
  const s=m.current;token.current++;scheduler.current.cancel();s.setupFailure={...reason,lastInstruction:s.setupGuide?.screenText??null,positionMessage:s.checks?.message??null};s.phase='error';
  const detail=reason.key==='framing'&&s.checks?.message?s.checks.message:reason.message;
  s.message=`${reason.title} ${detail} The camera check stopped before Go. You can save its details, retry, or use the timer.`;
  if(enhancedTracking&&cameraPreview.current.available){s.cameraReady=true;s.ball=null;s.person=null;s.recoveryMeasurement=null;videoClock.current.stop();draw();}
  else stopCamera();publish(true);
 };
 const loop=async()=>{
  const currentToken=token.current,s=m.current,v=video.current,d=detector.current;
  if(!mounted.current||!d||!v||!stream.current||!['setup','countdown','active','review'].includes(s.phase))return;
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
  let frozenFrame=captureMirroredFrame(v,f,{width:w,height:h,nativeCapture:!!observationPolicy.nativeCapture});
  s.frameSize=[w,h];s.captureFrameSize=[captureW,captureH];
  try{
   const inputPhase=s.phase,bodyWorker=d.poseWorker,poseInputVideoTime=s.videoTime;
   let poseUpdated=false;
   const acceptBody=()=>{
    const body=bodyWorker?.latest;
    if(body&&body.id!==s.poseResultId){s.poseResultId=body.id;s.person=physicalPoseSides(body.person,true);s.poseAt=body.capturedAt;s.poseVideoTime=body.sourceVideoTime;s.poseMs=body.ms;s.poseTimings=body.timings??null;s.poseClock.completed(body.completedAt);poseUpdated=true;}
   };
   acceptBody();
   if(bodyWorker?.error){interrupt(bodyWorker.error.message,{preserveVideo:true});if(s.phase==='setup')fail(bodyWorker.error.message);return;}
   const withPose=!bodyWorker&&poseNeededForPass({policy:observationPolicy,phase:s.phase,enhancedTracking,clock:s.poseClock,capturedAt:now,hasPerson:Number.isFinite(s.poseAt),countdown:s.countdown});
   let roi=['active','review'].includes(s.phase)?sessionROI(s,s.person,w,h):[0,0,w,h];
   // Even a "no person" result gets the normal resting interval; looking for
   // someone outside the camera must not turn into continuous body inference.
   const activeCrossoverWorker=independentCrossoverPose&&['active','review'].includes(s.phase);
   if(bodyWorker&&!bodyWorker.busy&&(repairTracking?repairPoseNeeded({person:s.person,poseAt:s.poseAt,lastRequestedAt:s.poseRequestedAt,now,ball:s.ball,phase:s.phase}):safariGpu?now-(s.poseRequestedAt??-Infinity)>=observationPolicy.poseRequestIntervalSeconds:(observationPolicy.continuousPose||activeCrossoverWorker||s.poseClock.shouldRun(now,!!bodyWorker.latest)))){
    s.poseRequestedAt=now;
    bodyWorker.request(f,{capturedAt:now,sourceVideoTime:s.videoTime,coordinateSize:observationPolicy.nativeCapture?{width:w,height:h}:undefined});
   }
   const result=await d.detect(frozenFrame,roi,withPose,freshFrames?{minimumBallScore:ballProposalMinimumScore({phase:s.phase,calibrated:s.tracker.ready(),weakContinuity:s.tracker.weakContinuity}),refreshBallFrame:observationPolicy.refreshBallFrame?()=>{
    if(!mounted.current||currentToken!==token.current||s!==m.current||!stream.current||['error','interrupted','finished','recording-only'].includes(s.phase))return null;
    if(v.readyState<2||v.paused)return null;
    if(v.videoWidth/v.videoHeight!==rawRatio){toSetup('Camera orientation changed. Stay in view while we check your new framing.');return null;}
    // Do not assign a newer timestamp to unchanged video pixels.
    const refreshedSource=observationPolicy.nativeCapture?videoClock.current.read():null;
    if(!hasFreshCameraPixels({nativeCapture:!!observationPolicy.nativeCapture,previousSerial:s.videoFrameSerial,sourceFrame:refreshedSource,previousTime:s.videoTime,currentTime:v.currentTime}))return undefined;
    const capturedAt=performance.now()/1000,sourceVideoTime=v.currentTime;
    const nextFrame=captureMirroredFrame(v,f,{width:w,height:h,nativeCapture:!!observationPolicy.nativeCapture});frozenFrame=nextFrame;
    if(refreshedSource)s.videoFrameSerial=refreshedSource.serial;
    if(repairTracking){acceptBody();roi=['active','review'].includes(s.phase)?sessionROI(s,s.person,w,h):[0,0,w,h];}
    return {frame:nextFrame,capturedAt,sourceVideoTime:refreshedSource?.sourceVideoTime??sourceVideoTime,...(repairTracking?{roi}:{})};
   }:undefined}:undefined);
   if(!mounted.current||currentToken!==token.current)return;
   if(s!==m.current){scheduleLoop();return;}
   if(['error','interrupted','finished','recording-only'].includes(s.phase))return;
   if(result.cancelled){scheduleLoop();return;}
   if(result.ballFrameRefreshed){now=result.capturedAt;s.videoTime=result.sourceVideoTime;}if(result.actualROI)roi=result.actualROI;
   let completed=performance.now()/1000;s.lastInference=completed;
   s.times.push(completed);s.times=s.times.filter(t=>completed-t<3);
   s.fps=s.times.length>1?(s.times.length-1)/(completed-s.times[0]):0;
   if(withPose){s.person=physicalPoseSides(result.person,true);s.poseAt=passStartedAt;s.poseVideoTime=poseInputVideoTime;const pt=result.timings?.pose;s.poseMs=pt?pt.preprocessMs+pt.inferenceMs+pt.decodeMs:null;s.poseClock.completed(completed);poseUpdated=true;}
   acceptBody();
   if(independentCrossoverPose&&!safariGpu&&['setup','countdown'].includes(inputPhase)&&poseUpdated){
    const body=bodyWorker.latest;
    const tooLate=body.completedAt-body.capturedAt>observationPolicy.maxActivePoseSkew;
    s.latePoseResults=tooLate?(s.latePoseResults??0)+1:0;
    if(s.latePoseResults>=3){
     stopCamera();
     navigate('/tracker-tests/crossovers-test12',{replace:true,state:{slowCrossoverWorker:true}});
     return;
    }
   }
   let framePerson=poseForFrame(s.person,s.poseAt,now,completed,observationPolicy.maxPoseAge,(safariGpu||activeCrossoverWorker||streamingPound&&['active','review'].includes(s.phase))?observationPolicy.maxActivePoseSkew:undefined);
   if(repairTracking&&['active','review'].includes(s.phase))framePerson=repairCounterPose(framePerson,s.poseAt,now,completed);
   s.overlayPerson=framePerson;
   const phase=['active','review'].includes(s.phase)?'drill':s.phase;
   if(s.phase==='setup'){
    const framing=evaluateSetup(framePerson,null,w,h,cameraOptions);
    if(s.calibration.update(now,framing.body&&framing.hand&&framing.floor,!framePerson&&!!s.person))resetPoundTrackingIdentity(s);
   }
   s.ball=s.tracker.select(result.balls,framePerson,phase,w,h,now);s.ballCapturedAt=now;
   let recoveryBalls=result.balls,floorView=null;
   if(enhancedTracking){
    s.budget.observeBase(result.timings?.ball);
    const g=s.ball?geometry(s.ball):null,secondaryROI=observationPolicy.floorView?floorViewROI({person:framePerson,measurement:g?[...g.center,g.diameter]:null,diameter:s.tracker.typical(),lane:s.tracker.lane(),phase:s.phase,width:w,height:h,calibrated:s.tracker.ready()}):null;
    const decision=s.budget.secondaryDecision((performance.now()/1000-passStartedAt)*1000,{needed:!!secondaryROI});
    floorView={...decision,roi:secondaryROI,balls:[]};
    if(decision.allowed){
     const extra=await d.detect(frozenFrame,secondaryROI,false,{minimumBallScore:.0001});
     if(!mounted.current||currentToken!==token.current||s!==m.current||!stream.current)return;
     floorView.balls=extra.balls;floorView.timings=extra.timings.ball;recoveryBalls=mergeFloorProposals(result.balls,extra.balls);
    }
    completed=performance.now()/1000;s.lastInference=completed;s.times[s.times.length-1]=completed;s.times=s.times.filter(t=>completed-t<3);s.fps=s.times.length>1?(s.times.length-1)/(completed-s.times[0]):0;
    s.budget.captured(now);s.liveBudget=s.budget.snapshot();
   }
   const checks=evaluateSetup(framePerson,s.ball,w,h,cameraOptions);
   if(!framePerson&&s.person){checks.refreshingBody=true;checks.message='Refreshing body and wrist tracking. Keep your position while we wait for a fresh check.';}
   s.checks=checks;
   const cadence=s.budget?.cadence();
   s.setupProcessing=setupProcessingReadiness(s.times,completed,passStartedAt,{visibilityFirst:enhancedTracking});
   const speedReady=s.setupProcessing.ready;
   if(['setup','countdown'].includes(s.phase))s.setupAttemptState=s.setupAttempt.update(completed,checks,speedReady,s.tracker.ready());
   let frameProposals=[],frameConfirmed=[],setupReadiness;
   const recordEvidence=()=>s.evidence.record({capturedAt:now,decisionCompletedAt:completed,...(enhancedTracking?{floorView,liveBudget:s.budget.snapshot(),recoveryMeasurement:s.recoveryMeasurement}:{}),sourceVideoTime:s.videoTime,sourceVideoFrameNumber:s.videoFrameSerial,inputPhase,phase:s.phase,roi,balls:result.balls,person:framePerson,selected:s.ball,selectionDecisions:s.tracker.decisions,ballProposalMinimumScore:result.ballProposalMinimumScore,ms:result.ms,timings:result.timings,fps:s.fps,poseUpdated,poseAge:completed-s.poseAt,poseCapturedAt:s.poseAt,poseSourceVideoTime:s.poseVideoTime,poseFrameSkewSeconds:poseFrameSkew(now,s.poseAt),poseInferenceMs:s.poseMs??null,...(repairTracking?{poseTimings:s.poseTimings??null}:{}),passStartedAt,ballFrameRefreshed:!!result.ballFrameRefreshed,positionChecks:checks,setupReadiness,counterFrame:s.counter.points.at(-1)?.frame??null,proposedCount:s.counter.count,count:s.count,proposals:frameProposals,confirmed:frameConfirmed,...(crossover?{handoffState:s.counter.snapshot()}:{} )});
   if(['setup','countdown'].includes(s.phase)&&s.setupAttemptState?.expired){recordEvidence();pauseSetup(s.setupAttemptState);return;}
   if(s.phase==='setup'){
    const readiness=s.readiness.update(now,checks,speedReady,s.tracker.ready()),condition=readiness.condition;
    setupReadiness={processing:{...s.setupProcessing},...(cadence?{cadence}:{}),speedReady,ballLockReady:s.tracker.ready(),conditionValid:condition.valid,refreshBridged:readiness.refreshBridged,elapsed:readiness.elapsed,reset:readiness.reset};
    if(readiness.reset){s.gate.reset();s.progress=0;}
    if(readiness.ready)s.progress=s.gate.update(readiness.elapsed,checks,s.ball,s.tracker,speedReady);
    s.setupGuide=s.guidance.update(now,setupInstruction(checks,speedReady,s.tracker.ready(),condition,setupOptions));
    s.message=s.setupGuide.message;
    s.setupSlow=completed-s.setupStartedAt>=SETUP_HELP_SECONDS;
    s.setupBlocker=condition.valid?null:condition.message;
    if(s.progress>=1&&readiness.ready){s.phase='countdown';s.countdownReadiness.reset(now);s.tracker.freezeCalibration();resetSessionTrackingCounter(s);s.countdownAt=now;s.countdown=5;s.message='Your view is checked. Get comfortable; wait for Go.';s.lastCue=5;cue();}
   }else if(s.phase==='countdown'){
    const readiness=s.countdownReadiness.update(now,checks,speedReady,s.tracker.ready()),condition=readiness.condition;
    setupReadiness={processing:{...s.setupProcessing},...(cadence?{cadence}:{}),speedReady,ballLockReady:s.tracker.ready(),conditionValid:condition.valid,refreshBridged:readiness.refreshBridged,elapsed:readiness.elapsed,reset:readiness.reset};
    s.setupBlocker=condition.valid?null:condition.message;
    s.rechecking=!readiness.ticking;
    if(readiness.reset){
     s.phase='setup';s.gate.reset();s.readiness.reset(now);s.progress=0;s.rechecking=false;s.message=`Position check restarted. ${condition.message}`;
    }else{
     // Move the expected Go time when paused, retaining actual pre-Go sample spacing.
     const revisedStart=now-readiness.countdownElapsed,pause=Math.max(0,revisedStart-s.countdownAt);
     shiftPreGoTimeline(s,pause);
     s.countdownAt=revisedStart;s.countdown=Math.max(0,Math.ceil(5-readiness.countdownElapsed));
     s.message=readiness.ticking?(crossover?'Hold the ball in either hand. Wait for Go.':'Keep the ball in your right hand. Wait for Go.'):`Quick check. Your countdown keeps its place. ${condition.message}`;
     if(s.countdown!==s.lastCue){s.lastCue=s.countdown;cue(s.countdown?650:1000);}
     if(s.countdown===0&&readiness.ready){s.phase='active';s.started=completed;const shift=completed-(s.countdownAt+5);shiftPreGoTimeline(s,shift);s.count=0;s.message=crossover?'Go. Bounce from one hand into the other, under control.':'Go. Complete clean right-hand pounds.';startRecording(completed);}
    }
   }
   if(s.phase==='countdown'){const g=s.ball?geometry(s.ball):null,t=now-(s.countdownAt+5);const result=updateSessionCounter(s,t,g?[...g.center,g.diameter]:null,framePerson,h,DURATION,recoveryBalls);frameProposals=result.proposals;}
   if(['active','review'].includes(s.phase)){
    const elapsed=now-s.started;s.go=elapsed<.8;
    if(completed-passStartedAt>.5){recordEvidence();interrupt('Tracking stalled during this attempt.',{preserveVideo:true});return;}
    if(elapsed>=DURATION&&s.phase==='active'){if(!enhancedTracking)stopRecording();s.phase='review';s.message='Time. Hold the ball while we confirm the last return.';cue(400);}
    const measurement=s.ball?(()=>{const g=geometry(s.ball);return [...g.center,g.diameter];})():null;
    if(elapsed>=0&&elapsed<DURATION){s.total++;if(measurement)s.detected++;}
    const {proposals,confirmed,count,recoveryMeasurement}=updateSessionCounter(s,elapsed,measurement,framePerson,h,DURATION,recoveryBalls);s.count=count;s.recoveryMeasurement=recoveryMeasurement??null;s.left=Math.max(0,Math.min(DURATION,Math.ceil(DURATION-elapsed)));
    frameProposals=proposals;frameConfirmed=confirmed;
    if(enhancedTracking&&elapsed>.9){
     const activeCadence=trackingCadence(s.budget.captures,{windowSeconds:1.2,minimumSpan:.9,minimumSamples:12,minimumHz:16,p90Limit:.12,maxLimit:.25});
     s.trackingQuality={...activeCadence,limited:!activeCadence.ready};s.trackingLimited||=!activeCadence.ready;
    }
    if(framePerson)s.poseLostAt=null;else s.poseLostAt??=completed;
    if(s.ball)s.lostAt=null;else s.lostAt??=completed;
    s.message=s.phase==='review'?'Time. Confirming the last controlled return…':s.lostAt&&completed-s.lostAt>.35?'Ball lost — counting waits for the same ball.': 'Tracking your basketball';
    if(s.lostAt&&completed-s.lostAt>2){recordEvidence();interrupt('The ball was lost for more than two seconds.',{preserveVideo:true});return;}
    if(s.poseLostAt&&completed-s.poseLostAt>2){recordEvidence();interrupt('Body and wrist tracking could not stay fresh enough to verify reps.',{preserveVideo:true});return;}
    if(!enhancedTracking&&s.times.length>12&&s.fps<8){recordEvidence();interrupt('Tracking became too slow to count reliably.',{preserveVideo:true});return;}
    if(elapsed>=DURATION+2){s.phase='finished';s.message='Test complete. Compare this count with the dribbles you performed.';finishRound();}
   }
   recordEvidence();
   draw();publish();
  }catch(error){if(currentToken===token.current&&mounted.current)fail(`Tracking stopped: ${error.message}`);return;}
  if(mounted.current&&!['finished','error','interrupted','recording-only'].includes(m.current.phase))scheduleLoop(!!observationPolicy.nativeCapture);
 };
 async function open({restart=false}={}){
  if(['loading','active','review','recording-only'].includes(m.current.phase)||(!restart&&['placing','setup','countdown'].includes(m.current.phase)))return;
  const previous=m.current;if(previous.started===null&&previous.setupAttemptState)setupHistory.current=[...setupHistory.current,{phase:previous.phase,attempt:{...previous.setupAttemptState},failure:previous.setupFailure??null,checks:{...previous.checks}}].slice(-5);
  const retained=cameraPreview.current.available,previousCamera=stream.current;
  const id=++token.current;scheduler.current.cancel();videoClock.current.stop();if(retained)stopRecording();else stopCamera();discardRecording();m.current=machine(freshFrames,drillKey,counterRevision,independentCrossoverPose,enhancedTracking,streamingPound,safariGpu,repairTracking);m.current.phase='loading';m.current.cameraReady=retained;m.current.loadingStartedAt=performance.now()/1000;m.current.message=retained?'Your camera is ready.':'Opening your front camera…';publish();
  try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Open CourtStreak in Safari using its HTTPS website to allow camera access.');
   // Safari owns permission. Reuse this page's live preview between rounds.
   const camera=await cameraPreview.current.acquire();
   if(id!==token.current||!mounted.current)return;stream.current=camera;
   const settings=camera.getVideoTracks()[0].getSettings?.()??{};
   m.current.cameraSettingsAtStart=Object.fromEntries(['width','height','frameRate','facingMode','aspectRatio'].filter(key=>settings[key]!==undefined).map(key=>[key,settings[key]]));
   if(camera!==previousCamera)camera.getVideoTracks()[0].addEventListener('ended',()=>{if(stream.current===camera){if(['finished','interrupted'].includes(m.current.phase)){stopCamera();publish(true);}else fail('The camera stopped. Open it again when ready.');}},{once:true});
   // Commit the visible preview before starting playback. The camera remains
   // mounted throughout model loading, setup, countdown and the round.
   m.current.cameraReady=true;flushSync(()=>publish(true));
   video.current.srcObject=camera;await video.current.play();
   if(id!==token.current||!mounted.current)return;
   if(observationPolicy.nativeCapture){videoClock.current.start(video.current);m.current.videoFrameClockMode=videoClock.current.mode;}
   m.current.cameraReady=true;setRatio(video.current.videoWidth/video.current.videoHeight||16/9);
   m.current.placement=new PhonePlacement(performance.now()/1000);m.current.phase='placing';m.current.modelsReady=false;m.current.loadingStartedAt=performance.now()/1000;
   if(overlay.current)overlay.current.getContext('2d').clearRect(0,0,overlay.current.width,overlay.current.height);
   advancePlacement();publish(true);
   if(detector.current?.poseWorker?.error){await detector.current.close();detector.current=null;}
   if(!detector.current){const loaded=await loadDetector(import.meta.env.BASE_URL,()=>{if(id===token.current){m.current.preparingTracker=true;publish();}},{asyncPose:observationPolicy.asyncPose,executionMode:repairTracking?'gpu-repair':safariGpu?'gpu-stream':'standard'});if(id!==token.current||!mounted.current){await loaded.close();return;}if(independentCrossoverPose&&!loaded.poseWorker){await loaded.close();throw new Error('This browser could not start the independent body tracker. Use Camera Test 12 for the paired tracker.');}detector.current=loaded;}
   if(id!==token.current||!mounted.current)return;
   await detector.current.idle();
   if(id!==token.current||!mounted.current)return;
   if(navigator.wakeLock)navigator.wakeLock.request('screen').then(lock=>{if(id!==token.current||!mounted.current){void lock.release();return;}wake.current=lock;}).catch(()=>{});
   m.current.modelsReady=true;m.current.preparingTracker=false;advancePlacement();publish(true);
  }catch(error){if(id!==token.current||!mounted.current)return;m.current.permissionRequired=error.name==='NotAllowedError';const messages={NotAllowedError:'Camera access needs your permission. Tap Allow camera, or check the camera setting for CourtStreak in Safari.',NotFoundError:'The front camera is unavailable on this device.',OverconstrainedError:'Safari could not select the front camera. Check camera access and try again.'};fail(messages[error.name]||error.message);}
 }
 useEffect(()=>{
  mounted.current=true;
  // Defer the initial request so React's development effect replay cancels it.
  const initialPreview=setTimeout(()=>{if(!document.hidden)void open();},0);
  const hidden=()=>{if(document.hidden){
   const s=m.current;resumePreview.current=['loading','placing','setup','countdown'].includes(s.phase);
   interrupt('CourtStreak went into the background. Your count is partial.');
   token.current++;scheduler.current.cancel();stopCamera();
   if(resumePreview.current){s.phase='idle';s.message='Camera paused while you were away.';}publish(true);
  }else if(resumePreview.current){resumePreview.current=false;void open();}};
  const rotate=()=>{if(m.current.phase==='recording-only'){interrupt('Phone rotated while preserving the partial attempt.');return;}if(['setup','countdown','active','review'].includes(m.current.phase))toSetup('Phone rotated. Hold the ball comfortably while we check your new framing.');};
  window.addEventListener('orientationchange',rotate);screen.orientation?.addEventListener('change',rotate);
  const watchdog=setInterval(()=>{const s=m.current,now=performance.now()/1000;if(s.phase==='recording-only'){s.left=Math.max(0,Math.ceil(DURATION-(now-s.started)));publish();return;}if(['loading','placing'].includes(s.phase)&&!s.modelsReady&&now-s.loadingStartedAt>=MODEL_LOADING_LIMIT_SECONDS){pauseSetup({key:'loading',title:'Tracker loading took too long.',message:'The camera models did not finish preparing. Retry when ready, or use the timer.',elapsed:now-s.loadingStartedAt,limitSeconds:MODEL_LOADING_LIMIT_SECONDS});return;}
   if(['placing','loading'].includes(s.phase)&&s.placement){advancePlacement(now);return;}
   if(['setup','countdown'].includes(s.phase)){
    if(!s.lastInference||now-s.lastInference>.8)s.setupAttemptState=s.setupAttempt.update(now,{...s.checks,refreshingBody:true},false,false);
    else s.setupAttemptState=s.setupAttempt.snapshot(now);
    if(s.setupAttemptState.expired){pauseSetup(s.setupAttemptState);return;}
    s.setupSlow=now-s.setupStartedAt>=SETUP_HELP_SECONDS;
    if(s.setupSlow)publish();
   }if(s.lastInference&&now-s.lastInference>.8&&['countdown','active','review'].includes(s.phase)){interrupt('Camera tracking paused. We need fresh frames before continuing.',{preserveVideo:true});}},200);
  document.addEventListener('visibilitychange',hidden);
  return()=>{mounted.current=false;token.current++;clearTimeout(initialPreview);clearInterval(watchdog);window.removeEventListener('orientationchange',rotate);screen.orientation?.removeEventListener('change',rotate);document.removeEventListener('visibilitychange',hidden);scheduler.current.cancel();discardRecording();stopCamera();void detector.current?.close();detector.current=null;void audio.current?.close();audio.current=null;};
 },[]);
 useEffect(()=>{
  if(['finished','interrupted'].includes(ui.phase)){resultPanel.current?.focus({preventScroll:true});resultPanel.current?.scrollIntoView({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
 },[ui.phase]);
 const p=ui.phase,live=['placing','setup','countdown','active','review','recording-only'].includes(p),ended=['finished','interrupted'].includes(p);
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
   useOriginalVideo();
  }
 },[ended,clip.status,countedClip.status,crossover]);
 function useOriginalVideo(){videoExport.current?.abort();videoExport.current=null;setCountedClip({...emptyCountedClip,status:'original'});}
 function saveEvidence(){
  const s=m.current;
  const data=s.evidence.export({startedAt:s.started,baseSourceCommit:TRACKER_BUILD_INFO.sourceCommit,buildInfo:TRACKER_BUILD_INFO,trackerCheckRevision:testRevision,trackerConfiguration:s.configuration,trackerRevision:s.configuration.counterRevision,...(s.configuration.identityRevision?{ballIdentityRevision:s.configuration.identityRevision}:{}),cameraRevision:CAMERA_SETUP_REVISION,readinessRevision:CAMERA_REVIEW_REVISION,detectorInputMode:detector.current?.liveInputMode??'legacy',controlRevision:CONTROL_REVISION,poseScheduleRevision:POSE_SCHEDULE_REVISION,poseExecutionRevision:detector.current?.poseWorker?.revision??'sequential',executionRevision:detector.current?.inputRevision??null,poseMode:detector.current?.poseMode??'sequential',liveFrameRevision:freshFrames?LIVE_FRAME_REVISION:'FRAME 00',poseSideConvention:'Original physical person; detector image is mirrored',
   drillKey,...(enhancedTracking?{setupFramingRevision:VISIBLE_SETUP_REVISION,setupPoseScheduleRevision:SETUP_POSE_SCHEDULE_REVISION,streamingPound,trackingLimited:!!s.trackingLimited,setupProcessing:s.setupProcessing??null,trackingQuality:s.trackingQuality??null,liveBudget:s.budget.snapshot(),floorViewRevision:FLOOR_VIEW_REVISION,recoveryRevision:s.configuration.recoveryRevision??null,calibratedBallDiameter:s.tracker.typical(),recordingReviewSeconds:2}:{}),...(crossover?{repDefinition:CROSSOVER_RULE,videoFrameClockRevision:VIDEO_FRAME_CLOCK_REVISION,videoFrameClockMode:s.videoFrameClockMode}:{}),observationPolicy,poseProvider:detector.current?.poseWorker?.provider??(detector.current?.poseWorker?'wasm':detector.current?.provider),timerSeconds:DURATION,phase:s.phase,message:s.message,displayedCount:s.count,presentationRevision:TRACKER_PRESENTATION_REVISION,sessionFlowRevision:SESSION_FLOW_REVISION,setupGuidanceRevision:SETUP_GUIDANCE_REVISION,setupTimingRevision:SETUP_TIMING_REVISION,countdownReadinessRevision:COUNTDOWN_READINESS_REVISION,priorSetupAttempts:setupHistory.current,cameraPreviewRevision:CAMERA_PREVIEW_REVISION,phonePlacementRevision:PHONE_PLACEMENT_REVISION,phonePlacement:s.placementState??null,setupAttemptRevision:SETUP_ATTEMPT_REVISION,setupAttempt:s.setupAttemptState??null,setupFailure:s.setupFailure??null,setupStartedAt:s.setupStartedAt??null,setupBlocker:s.setupBlocker??null,latestPositionChecks:s.checks,
   framesWithSelectedBall:s.detected,trainingFrames:s.total,ballCoverage:s.total?s.detected/s.total:null,
   provider:detector.current?.provider,detectorInputRevision:detector.current?.inputRevision,ballProposalPolicyRevision:BALL_PROPOSAL_POLICY_REVISION,detectorResources:detector.current?.resourceSummary,modelManifest:detector.current?.modelManifest,runtime:{userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency??null},cameraSettingsAtStart:s.cameraSettingsAtStart,frameSize:s.frameSize??[frame.current?.width,frame.current?.height],captureFrameSize:s.captureFrameSize??null,
   recordingAvailable:!!clip.blob,videoRevision:VIDEO_OVERLAY_REVISION,recordingRevision:RECORDING_TAIL_REVISION,countingStoppedAt:s.countingStoppedAt??null,recordedUntil:s.recordedUntil??null,interruptionReason:s.interruptionReason??null,reviewInterruptionReason:s.reviewInterruptionReason??null,videoExport:countedClip.exportInfo??null,countDisplayStartedAt:countTimeline.current.startedAt,
   displayedCountTimeline:countTimeline.current.snapshot(),savedVideoStyle:countedClip.status==='ready'?'count-overlay':'original',
   countOverlayTiming:'Display changes at live acceptance time; final card includes the post-round review. No bounce-time backdating.',
   rejectedEvents:s.recovery?[...s.validator.rejected,...s.recovery.counter.rejected]:s.validator.rejected,pendingEvents:s.validator.pending});
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
 return <PoundSessionView pairedFallbackNotice={pairedFallbackNotice} drillKey={drillKey} ui={ui} ratio={ratio} live={live} ended={ended} ballLocked={!!ui.ball&&m.current.tracker.ready()}
  videoRef={video} overlayRef={overlay} resultPanelRef={resultPanel}
  clip={clip} countedClip={countedClip} replayChanges={replayChanges} preparing={preparing}
  canSave={canSave} savedClip={savedClip} sharing={sharing} shareMessage={shareMessage}
  filename={filename} originalFilename={originalFilename}
  versions={{counter:m.current.configuration.counterRevision,camera:enhancedTracking?VISIBLE_SETUP_REVISION:CAMERA_SETUP_REVISION,setup:SETUP_GUIDANCE_REVISION,frame:LIVE_FRAME_REVISION,identity:m.current.configuration.identityRevision??BALL_IDENTITY_REVISION,check:testRevision,poundPath:repairTracking?'/tracker-tests/right-hand-pound-test23':safariGpu?'/tracker-tests/right-hand-pound-test22':streamingPound?'/tracker-tests/right-hand-pound-test21':'/tracker-tests/right-hand-pound-test20',crossPath:repairTracking?'/tracker-tests/crossovers-test23':safariGpu?'/tracker-tests/crossovers-test22':'/tracker-tests/crossovers-test20',recovery:m.current.configuration.recoveryRevision}}
  onBack={()=>navigate(standalone?'/':`/lab/drill/${drillKey}`)} onOpen={open}
  onStart={startSession} onCloseCamera={()=>{token.current++;scheduler.current.cancel();stopCamera();if(['placing','setup','countdown','loading','error'].includes(m.current.phase)){m.current.phase='idle';m.current.message='Open the camera when you’re ready.';}publish(true);}} onRetrySetup={()=>open({restart:true})} onManual={()=>{if(!standalone){navigate(`/lab/drill/${drillKey}/session`);return;}token.current++;scheduler.current.cancel();stopCamera();m.current.phase='error';m.current.message='Camera check paused. Retry when ready.';publish(true);setManual(true);}}
  onStop={()=>{const s=m.current,preGo=['idle','loading','placing','setup','countdown','error'].includes(s.phase);token.current++;scheduler.current.cancel();s.phase=preGo?'idle':'interrupted';s.message=preGo?'Open the camera when you’re ready.':'Attempt stopped. Your count is partial.';stopCamera();publish(true);}}
  onSaveEvidence={saveEvidence} onPrepareVideo={prepareCountedVideo}
  onUseOriginal={useOriginalVideo} onShareVideo={shareVideo}/>;
}

