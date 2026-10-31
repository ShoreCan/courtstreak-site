import React,{useEffect,useRef,useState} from 'react';
import {createRoundClock} from '../../lib/roundClock.mjs';
import './iphone-pound-test.css';

// The public camera test needs a usable fallback without an account gate.
// This timer never fabricates camera counts or posts a training result.
export default function StandaloneDrillTimer({drillName,onBack}){
 const clock=useRef(null),[phase,setPhase]=useState('ready'),[left,setLeft]=useState(5),[message,setMessage]=useState('A 5-second countdown, then 20 seconds to train.');
 if(!clock.current)clock.current=createRoundClock();
 useEffect(()=>{
  const hidden=()=>{if(document.hidden){clock.current.reset();setPhase('ready');setMessage('Timer stopped while the page was in the background. Start again when ready.');}};
  document.addEventListener('visibilitychange',hidden);
  const tick=setInterval(()=>{
   if(!['countdown','active'].includes(phase))return;
   const seconds=clock.current.seconds();setLeft(seconds);
   if(seconds===0){if(phase==='countdown'){clock.current.start(20);setLeft(20);setPhase('active');}else setPhase('finished');}
  },100);
  return()=>{clearInterval(tick);document.removeEventListener('visibilitychange',hidden);};
 },[phase]);
 function start(){clock.current.start(5);setLeft(5);setPhase('countdown');}
 return <main className="cs-iphone-tracker"><section className="cs-standalone-timer">
  <button type="button" className="cs-studio-text-button" onClick={onBack}>← Back to camera check</button>
  <p className="cs-studio-eyebrow">TIMER ONLY</p><h1>{drillName}</h1>
  <p>No camera or automatic rep count. No score is posted.</p>
  <div className="cs-timer-display" role="timer" aria-label={phase==='countdown'?'Countdown':phase==='active'?'Seconds remaining':'Timer'}><span>{phase==='countdown'?'GET READY':phase==='active'?(left===20?'GO':'KEEP GOING'):phase==='finished'?'TIME':'YOUR ROUND'}</span><strong>{['countdown','active'].includes(phase)?left:phase==='finished'?'DONE':'20s'}</strong></div>
  <p role="status">{phase==='finished'?'Round complete. Take a breath.':phase==='countdown'?'Wait for Go.':phase==='active'?'One hand → bounce → opposite hand under control.':message}</p>
  {!['countdown','active'].includes(phase)?<button type="button" className="cs-iphone-primary" onClick={start}>{phase==='finished'?'Train again':'Start 20-second round'}</button>:<button type="button" className="cs-iphone-secondary" onClick={()=>{clock.current.reset();setPhase('ready');}}>Stop timer</button>}
 </section></main>;
}
