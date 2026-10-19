import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDetector } from '../../lib/ai/iphoneDetector.mjs';
import { BALL_TRACKER_REVISION, BallIdentityTracker, GapAwareBounceCounter, PoundControlValidator, PositionGate, evaluatePosition, geometry } from '../../lib/ai/poundCore.mjs';
import './iphone-pound-test.css';
const DURATION=20;
const empty={body:false,hand:false,ball:false,floor:false,owned:false};
function machine(){return {phase:'idle',tracker:new BallIdentityTracker(),gate:new PositionGate(),counter:new GapAwareBounceCounter(),validator:new PoundControlValidator(),person:null,ball:null,poseAt:-Infinity,times:[],goodSince:null,progress:0,count:0,left:DURATION,countdown:5,fps:0,checks:empty,message:'Place your phone on a stable support. Landscape gives you more room; portrait works too.',lastInference:0,started:null,detected:0,total:0};}
export default function IPhonePoundTest(){
 const navigate=useNavigate(),video=useRef(null),overlay=useRef(null),frame=useRef(null),m=useRef(machine()),detector=useRef(null),stream=useRef(null),raf=useRef(0),mounted=useRef(true),token=useRef(0),wake=useRef(null),audio=useRef(null);
 const [ui,setUI]=useState({...m.current}),[ratio,setRatio]=useState(16/9);
 const publish=()=>{if(mounted.current)setUI({...m.current});};
 const cue=(frequency=650)=>{try{const ctx=audio.current;if(!ctx||ctx.state!=='running')return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=frequency;gain.gain.setValueAtTime(.10,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.15);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.16);}catch{}};
 const stopCamera=()=>{stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;wake.current?.release().catch(()=>{});wake.current=null;};
 const fail=(message)=>{const s=m.current;s.phase='error';s.message=message;stopCamera();publish();};
 const toSetup=(message='Hold the ball beside your right hand. We will check your position automatically.')=>{
  const previous=m.current;m.current={...machine(),phase:'setup',lastInference:previous.lastInference,sized:previous.sized,message};publish();
 };
 const interrupt=(message)=>{const s=m.current;if(['active','review'].includes(s.phase)){s.phase='interrupted';s.message=message;s.incomplete=true;stopCamera();publish();}else if(['setup','countdown'].includes(s.phase)){s.gate.reset();s.progress=0;s.phase='setup';s.message=message;publish();}};
 const draw=()=>{
  const canvas=overlay.current,s=m.current;if(!canvas)return;const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);
  if(s.person){c.strokeStyle='rgba(255,255,255,.45)';c.lineWidth=w/450;const [x,y,x2,y2]=s.person.box;c.strokeRect(x,y,x2-x,y2-y);}
  if(s.ball){const g=geometry(s.ball);c.strokeStyle=s.tracker.ready()?'#5ee1aa':'#ffb26f';c.lineWidth=w/280;c.beginPath();c.arc(...g.center,g.diameter*.62,0,Math.PI*2);c.stroke();}
 };
 const loop=async()=>{
  const currentToken=token.current,s=m.current,v=video.current,d=detector.current;
  if(!mounted.current||!d||!v||!stream.current||['finished','error','interrupted'].includes(s.phase))return;
  if(v.readyState<2||v.paused){raf.current=requestAnimationFrame(loop);return;}
  if(v.currentTime===s.videoTime){raf.current=requestAnimationFrame(loop);return;}
  s.videoTime=v.currentTime;
  const rawRatio=v.videoWidth/v.videoHeight,w=1280,h=Math.round(w/rawRatio),now=performance.now()/1000;
  if(!frame.current)frame.current=document.createElement('canvas');const f=frame.current;
  if(f.width!==w||f.height!==h){
   const changed=!!f.width&&s.sized;f.width=w;f.height=h;overlay.current.width=w;overlay.current.height=h;setRatio(rawRatio);
   if(changed){toSetup('Camera orientation changed. Hold still while we check your new framing.');raf.current=requestAnimationFrame(loop);return;}
   s.sized=true;
  }
  const c=f.getContext('2d');c.save();c.translate(w,0);c.scale(-1,1);c.drawImage(v,0,0,w,h);c.restore();
  try{
   const withPose=now-s.poseAt>=.18||!s.person,roi=['active','review'].includes(s.phase)?s.tracker.roi(w,h):[0,0,w,h];
   const result=await d.detect(f,roi,withPose);
   if(!mounted.current||currentToken!==token.current)return;
   if(s!==m.current){raf.current=requestAnimationFrame(loop);return;}
   if(['error','interrupted','finished'].includes(s.phase))return;
   const completed=performance.now()/1000;s.lastInference=completed;
   s.times.push(completed);s.times=s.times.filter(t=>completed-t<3);
   s.fps=s.times.length>1?(s.times.length-1)/(completed-s.times[0]):0;
   if(withPose){s.person=result.person;s.poseAt=now;}
   const phase=['active','review'].includes(s.phase)?'drill':s.phase;
   s.ball=s.tracker.select(result.balls,s.person,phase,w,h);
   const checks=evaluatePosition(completed-s.poseAt<.75?s.person:null,s.ball,w,h);s.checks=checks;
   const speedReady=s.times.length>=16&&completed-s.times[0]>=1.5&&s.fps>=10&&completed-now<.35;
   if(s.phase==='setup'){
    s.progress=s.gate.update(now,checks,s.ball,s.tracker,speedReady);
    s.message=!checks.valid?checks.message:!speedReady?'Checking tracking speed on this phone…':!s.tracker.ready()?'Basketball found. Confirming ball lock…':s.progress<1?'Good position. Hold the ball still…':'Position locked';
    if(s.times.length>8&&completed-s.times[0]>2&&s.fps<10)s.message='Tracking is too slow to count reliably on this phone. Close other tabs and retry. The drill will wait.';
    if(s.progress>=1){s.phase='countdown';s.counter=new GapAwareBounceCounter();s.validator=new PoundControlValidator();s.countdownAt=now;s.countdown=5;s.message='Position locked. Keep the ball still until Go.';s.lastCue=5;cue();}
   }else if(s.phase==='countdown'){
    if(!checks.valid||!speedReady||!s.tracker.ready()){
     s.phase='setup';s.gate.reset();s.progress=0;s.message=!checks.valid?checks.message:'Rechecking ball lock and tracking speed…';
    }else{
     s.countdown=Math.max(0,5-Math.floor(now-s.countdownAt));
     if(s.countdown!==s.lastCue){s.lastCue=s.countdown;cue(s.countdown?650:1000);}
     if(s.countdown===0){s.phase='active';s.started=completed;const shift=completed-(s.countdownAt+5);s.counter.points.forEach(p=>p.timestamp-=shift);s.count=0;s.message='Go. Complete clean right-hand pounds.';}
    }
   }
   if(s.phase==='countdown'){const g=s.ball?geometry(s.ball):null,t=now-(s.countdownAt+5);const proposals=s.counter.update(t,g?[g.center[1],g.diameter]:null,h);s.validator.update(proposals,g?[...g.center,g.diameter]:null,s.person,t,DURATION);}
   if(['active','review'].includes(s.phase)){
    const elapsed=now-s.started;s.go=elapsed<.8;
    if(completed-now>.5){interrupt('Tracking stalled during this attempt. Recheck positioning and try again.');return;}
    if(elapsed>=DURATION&&s.phase==='active'){s.phase='review';s.message='Time. Hold the ball while we confirm the last return.';cue(400);}
    const measurement=s.ball?(()=>{const g=geometry(s.ball);return [...g.center,g.diameter];})():null;
    if(elapsed>=0&&elapsed<DURATION){s.total++;if(measurement)s.detected++;}
    const proposals=s.counter.update(elapsed,measurement?[measurement[1],measurement[2]]:null,h);
    const confirmed=s.validator.update(proposals,measurement,s.person,elapsed,DURATION);confirmed.forEach(e=>s.counter.rememberControlledFloor(e));s.count=s.validator.count;s.left=Math.max(0,Math.min(DURATION,Math.ceil(DURATION-elapsed)));
    if(s.ball)s.lostAt=null;else s.lostAt??=completed;
    s.message=s.phase==='review'?'Time. Confirming the last controlled return…':s.lostAt&&completed-s.lostAt>.35?'Ball lost — counting waits for the same ball.': 'Tracking your basketball';
    if(s.lostAt&&completed-s.lostAt>2){interrupt('The ball was lost for more than two seconds. This attempt is incomplete. Reposition and try again.');return;}
    if(s.times.length>12&&s.fps<8){interrupt('Tracking became too slow to count reliably. This attempt is incomplete.');return;}
    if(elapsed>=DURATION+2){s.phase='finished';s.message='Test complete. Compare this count with the dribbles you performed.';stopCamera();}
   }
   draw();publish();
  }catch(error){if(currentToken===token.current&&mounted.current)fail(`Tracking stopped: ${error.message}`);return;}
  if(mounted.current&&!['finished','error','interrupted'].includes(m.current.phase))raf.current=requestAnimationFrame(loop);
 };
 async function open(){
  if(['loading','setup','countdown','active','review'].includes(m.current.phase))return;
  const id=++token.current;stopCamera();m.current=machine();m.current.phase='loading';m.current.message='Requesting your front camera…';publish();
  try{
   const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audio.current??=new Audio();void audio.current.resume();}
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Open CourtStreak in Safari using its HTTPS website to allow camera access.');
   // Request permission directly from the tap; never silently choose the rear camera.
   const camera=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{exact:'user'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}}});
   if(id!==token.current||!mounted.current){camera.getTracks().forEach(t=>t.stop());return;}stream.current=camera;
   camera.getVideoTracks()[0].addEventListener('ended',()=>{if(stream.current===camera)fail('The camera stopped. Enable it again to check your position.');},{once:true});
   video.current.srcObject=camera;await video.current.play();
   if(id!==token.current||!mounted.current)return;
   if(!detector.current){m.current.message='Loading the ball detector…';publish();const loaded=await loadDetector(import.meta.env.BASE_URL,message=>{if(id===token.current){m.current.message=message;publish();}});if(id!==token.current||!mounted.current){await loaded.close();return;}detector.current=loaded;}
   if(id!==token.current||!mounted.current)return;
   if(navigator.wakeLock)navigator.wakeLock.request('screen').then(lock=>{if(id!==token.current||!mounted.current){void lock.release();return;}wake.current=lock;}).catch(()=>{});
   toSetup();raf.current=requestAnimationFrame(loop);
  }catch(error){if(id!==token.current||!mounted.current)return;const messages={NotAllowedError:'Camera permission was denied. Allow CourtStreak camera access in Safari, then try again.',NotFoundError:'The front camera is unavailable on this device.',OverconstrainedError:'Safari could not select the front camera. Check camera access and try again.'};fail(messages[error.name]||error.message);}
 }
 useEffect(()=>{
  mounted.current=true;
  const hidden=()=>{if(document.hidden){interrupt('CourtStreak went into the background. Return and enable the camera for a fresh setup check.');if(['loading','setup','countdown'].includes(m.current.phase)){token.current++;m.current.phase='interrupted';m.current.message='Return to CourtStreak and enable the camera again.';stopCamera();publish();}}};
  const rotate=()=>{if(['setup','countdown','active','review'].includes(m.current.phase))toSetup('Phone rotated. Hold the ball still while we check your new framing.');};
  window.addEventListener('orientationchange',rotate);screen.orientation?.addEventListener('change',rotate);
  const watchdog=setInterval(()=>{const s=m.current;if(s.lastInference&&performance.now()/1000-s.lastInference>.8&&['countdown','active','review'].includes(s.phase)){interrupt('Camera tracking paused. We need fresh frames before continuing.');}},200);
  document.addEventListener('visibilitychange',hidden);
  return()=>{mounted.current=false;token.current++;clearInterval(watchdog);window.removeEventListener('orientationchange',rotate);screen.orientation?.removeEventListener('change',rotate);document.removeEventListener('visibilitychange',hidden);cancelAnimationFrame(raf.current);stopCamera();void detector.current?.close();detector.current=null;void audio.current?.close();audio.current=null;};
 },[]);
 const p=ui.phase,live=['setup','countdown','active','review'].includes(p),ended=['finished','interrupted'].includes(p),labels=[['body','Body in frame'],['hand','Right wrist visible'],['ball','Basketball detected'],['floor','Feet + floor space']];
 const step=['active','review'].includes(p)?2:p==='countdown'?1:ended?3:0;
 return <main className="cs-iphone-tracker">
  <div className="cs-iphone-shell">
   <header className="cs-iphone-header"><button type="button" onClick={()=>navigate('/lab/drill/right-hand-pound')} aria-label="Back to drill">←</button><div><span>COURTSTREAK / CAMERA LAB</span><h1>Right-Hand Pound</h1><p>20-second test · Front camera</p></div><span className="cs-iphone-version">{BALL_TRACKER_REVISION}</span></header>
   <ol className="cs-iphone-steps" aria-label="Session progress">{['Position','Countdown','Train','Review'].map((label,i)=><li key={label} className={i===step?'current':i<step?'complete':''}><b>{i<step?'✓':i+1}</b>{label}</li>)}</ol>
   <section className="cs-iphone-stage" style={{aspectRatio:ratio}} aria-label="Live camera and detected basketball">
    <video ref={video} muted autoPlay playsInline aria-label="Mirrored front camera"/><canvas ref={overlay} aria-hidden="true"/>
    {!live&&p!=='loading'&&<div className="cs-iphone-placeholder"><div className="cs-iphone-ball">◉</div><strong>{ended?'Your attempt':'Find your frame'}</strong><p>Landscape recommended. Portrait supported.<br/>Show your body, ball, feet, and floor space.</p></div>}
    {live&&<span className={`cs-iphone-lock ${ui.ball?'found':''}`}>{ui.ball?(m.current.tracker.ready()?'● Ball locked':'● Ball detected'):'○ Finding basketball'}</span>}
    {p==='countdown'&&<div className="cs-iphone-countdown"><strong>{ui.countdown}</strong><span>Hold position · Wait for Go</span></div>}
    {p==='active'&&ui.go&&<div className="cs-iphone-countdown cs-iphone-go"><strong>GO</strong><span>Start dribbling</span></div>}
    {['active','review'].includes(p)&&<div className="cs-iphone-live"><div><span>COUNTED REPS</span><strong>{ui.count}</strong></div><div><span>{p==='review'?'REVIEWING':'SECONDS LEFT'}</span><strong>{ui.left}</strong></div></div>}
   </section>
   <section className="cs-iphone-controls">
    <p className="cs-iphone-status" role="status" aria-live="polite">{ui.message}</p>
    {['idle','error','finished','interrupted'].includes(p)&&<button type="button" className="cs-iphone-primary" onClick={open}>{p==='idle'?'Enable camera & check position':'Check position & try again'}</button>}
    {p==='loading'&&<div className="cs-iphone-loading">Preparing your camera and detectors…</div>}
    {['setup','countdown'].includes(p)&&<><div className="cs-iphone-checks">{labels.map(([key,label])=><span key={key} className={ui.checks[key]?'pass':''}><b>{ui.checks[key]?'✓':'○'}</b>{label}</span>)}</div><div className="cs-iphone-progress"><span style={{width:`${ui.progress*100}%`}}/></div><small>Countdown starts automatically after a stable ball lock and position check.</small></>}
    {live&&<button type="button" className="cs-iphone-secondary" onClick={()=>{token.current++;cancelAnimationFrame(raf.current);m.current.phase='interrupted';m.current.message='Attempt stopped. Recheck your position when ready.';stopCamera();publish();}}>Stop test</button>}
    {ended&&<div className="cs-iphone-result"><span>{p==='finished'?'Detected reps':'Partial count · Incomplete attempt'}</span><strong>{ui.count}</strong><p>{ui.total?`${Math.round(ui.detected/ui.total*100)}% ball tracking coverage`:'No training frames counted'}</p><small>Compare with your actual count. Test results are not saved to XP or Circle standings.</small></div>}
   </section>
   <details className="cs-iphone-help"><summary>Camera setup tips</summary><p>Use either orientation on a stable tripod or support. Landscape usually gives more space for your arm and the ball. Keep your full body, both feet, and space below your feet visible. Hold the basketball still beside your right hand. A ring follows the detected ball; counting begins only after the five-second countdown.</p><p>If you rotate the phone, CourtStreak checks the new framing before starting again. Keep the phone still while training.</p></details>
   <footer>On-device detector test · {ui.fps>0?`${ui.fps.toFixed(1)} tracking frames/sec`:'Waiting for camera'}<br/>Camera frames are processed on this device. Accuracy still needs iPhone testing.</footer>
  </div>
 </main>;
}
