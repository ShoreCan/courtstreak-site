import React, {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {FiArrowLeft, FiArrowRight, FiCheck, FiPlay, FiRefreshCw} from 'react-icons/fi';
import PoundDemo from '../components/ai/PoundDemo.jsx';
import {createRoundClock} from '../lib/roundClock.mjs';
import '../training-preview.css';

// A public walkthrough, isolated from the camera, training RPCs and rewards.
export default function TrainingPreview() {
  const [phase,setPhase]=useState('ready');
  const [seconds,setSeconds]=useState(5);
  const [reps,setReps]=useState(0);
  const clock=useRef(null);
  const demo=useRef(null),panel=useRef(null);
  if(!clock.current)clock.current=createRoundClock();
  useEffect(()=>{
    if(!['countdown','active'].includes(phase))return;
    clock.current.start(phase==='countdown'?5:20);
    const tick=()=>{
      const left=clock.current.seconds();setSeconds(left);
      if(phase==='active')setReps(Math.min(24,Math.floor((20-left)*1.2)));
      if(left===0)setPhase(phase==='countdown'?'active':'finished');
    };
    tick();const timer=setInterval(tick,100);
    const hidden=()=>{if(document.hidden){setPhase('ready');setReps(0);}};
    document.addEventListener('visibilitychange',hidden);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hidden);};
  },[phase]);
  useEffect(()=>{if(phase==='finished'){panel.current?.focus({preventScroll:true});panel.current?.scrollIntoView({block:'nearest',behavior:'instant'});}},[phase]);
  const start=()=>{setReps(0);setSeconds(5);setPhase('countdown');demo.current?.scrollIntoView({block:'start',behavior:'instant'});};
  return <main className="cs-training-preview">
    <header><Link to="/preview/lab/drill/right-hand-pound"><FiArrowLeft/>Drill details</Link><span>INTERACTIVE PREVIEW</span></header>
    <section className="cs-training-preview-shell">
      <div className="cs-training-preview-title"><p>RIGHT-HAND POUND</p><h1>Find your rhythm<span>.</span></h1><p>A sample round. Your camera stays off.</p></div>
      <div className="cs-training-preview-grid">
        <div className="cs-training-preview-demo" ref={demo}><PoundDemo autoPlay={phase==='active'}/>{phase==='countdown'&&<div className="cs-training-preview-countdown"><span>GET READY</span><strong key={seconds}>{seconds}</strong><small>Start after Go</small></div>}</div>
        <div className="cs-training-preview-panel" ref={panel} tabIndex={-1} data-phase={phase}>
          <span className="cs-training-preview-sample">SIMULATED ROUND</span>
          {phase==='finished'?<><div className="cs-training-preview-check" aria-hidden="true"><FiCheck/></div><h2>Work put in.</h2><div className="cs-training-preview-score"><strong>24</strong><span>sample reps · 20 seconds</span></div><p>Your real round ends with a count and replay to review.</p><button type="button" className="cs-training-preview-primary" onClick={start}><FiRefreshCw/>Try again</button><Link className="cs-training-preview-secondary" to="/create-account">Create account<FiArrowRight/></Link></>:<>
            <h2>{phase==='active'?'Stay in your rhythm.':phase==='countdown'?'Hold for Go.':'Ready when you are.'}</h2>
            <p>{phase==='active'?'Watch the sample counter respond.':phase==='countdown'?'Five clear beats. Then it’s your turn.':'Try the countdown, sample rep feedback, and finish.'}</p>
            {phase==='active'?<><div className="cs-training-preview-stats"><div><strong key={reps}>{reps}</strong><span>SAMPLE REPS</span></div><div><strong>{String(seconds).padStart(2,'0')}<small>s</small></strong><span>TIME LEFT</span></div></div><progress value={seconds} max="20" aria-label="Sample round time remaining"/></>:<button type="button" className="cs-training-preview-primary" disabled={phase==='countdown'} onClick={start}><FiPlay/>{phase==='countdown'?'Countdown running…':'Try sample round'}</button>}
            <button type="button" className="cs-training-preview-secondary" onClick={()=>{setReps(24);setPhase('finished');}}>See sample finish<FiArrowRight/></button>
            {phase!=='ready'&&<button type="button" className="cs-training-preview-reset" onClick={()=>{setPhase('ready');setReps(0);}}>Reset preview</button>}
          </>}
          <small className="cs-training-preview-note">Illustrated movement and sample counts. No camera, saved score, XP, or Circle post.</small>
        </div>
      </div>
    </section>
  </main>;
}
