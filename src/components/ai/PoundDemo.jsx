import React, { useEffect, useRef, useState } from 'react';
import { FiPause, FiPlay } from 'react-icons/fi';
import './pound-demo.css';

const stages = ['Right hand', 'Floor bounce', 'Back in control'];

// The labelled right hand is on the viewer’s left in this front-facing diagram.
export function PoundRepPicture({floor=false}) {
  return <svg viewBox="-15 0 205 235" aria-hidden="true">
    <path d="M12 218h136" stroke="#657d9c" strokeWidth="2"/>
    <ellipse cx="82" cy="219" rx="55" ry="5" fill="#020712" opacity=".35"/>
    <g stroke="var(--cs-demo-outline, #c5d4e7)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx="86" cy="30" r="15" fill="#9fb4ce"/>
      <path d="m75 47-13 56 47 1-12-57z" fill="#567190"/>
      <path d="m73 52-22 25-15 32m62-57 19 30 11 25M66 105l-6 43-14 61H33m69-104 8 43 13 61h13"/>
      <path d="m63 105 23 9 21-9-3 27-18-5-25 6z" fill="#243e5d"/>
    </g>
    <g transform="translate(34 126)"><g className="cs-demo-moving-ball" style={{transform: `translateY(${floor ? 76 : 0}px)`}}>
      <circle r="15" fill="#ff8747" stroke="#c65f2b" strokeWidth="1.5"/>
      <path d="M-15 0h30M0-15v30M-11-11c15 4 18 8 22 22M11-11c-15 4-18 8-22 22" fill="none" stroke="#713a25" strokeWidth="1.2"/>
    </g></g>
  </svg>;
}

export default function PoundDemo({videoUrl=null,autoPlay=false}) {
  const [watching,setWatching]=useState(false),[failed,setFailed]=useState(false);
  const [playing,setPlaying]=useState(false),[stage,setStage]=useState(0);
  const [reduced,setReduced]=useState(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false);
  const root=useRef(null);
  useEffect(()=>{setPlaying(autoPlay&&!reduced);},[autoPlay,reduced]);
  useEffect(()=>{
    const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change=()=>{setReduced(preference.matches);setPlaying(false);};
    preference?.addEventListener('change',change);
    const hidden=()=>{if(document.hidden)setPlaying(false);};
    document.addEventListener('visibilitychange',hidden);
    const observer=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting)setPlaying(false);});
    if(root.current)observer.observe(root.current);
    return()=>{preference?.removeEventListener('change',change);document.removeEventListener('visibilitychange',hidden);observer.disconnect();};
  },[]);
  useEffect(()=>{
    if(!playing||reduced||watching)return;
    const timer=setInterval(()=>setStage(value=>(value+1)%stages.length),650);
    return()=>clearInterval(timer);
  },[playing,reduced,watching]);
  return <div ref={root} className="cs-pound-demo cs-motion-demo">
    {videoUrl&&watching&&!failed?<>
      <video src={videoUrl} controls autoPlay playsInline preload="metadata" onError={()=>{setFailed(true);setWatching(false);}} aria-label="Right-hand pound player demonstration"/>
      <button type="button" onClick={()=>setWatching(false)} className="cs-demo-close">Close demo</button>
    </>:<>
      <div className="cs-motion-demo-top"><span>ONE CLEAN REP</span><button type="button" aria-pressed={playing} onClick={()=>reduced?setStage(value=>(value+1)%stages.length):setPlaying(value=>!value)}>{playing?<FiPause/>:<FiPlay/>}{reduced?'Next step':playing?'Pause demo':'Play demo'}</button></div>
      <div className="cs-motion-demo-body"><PoundRepPicture floor={stage===1}/><ol aria-label="One right-hand pound rep">{stages.map((label,index)=><li key={label}><button type="button" aria-pressed={stage===index} onClick={()=>{setPlaying(false);setStage(index);}}><b>{index+1}</b><span>{label}</span></button></li>)}</ol></div>
      <p>Hand → floor → same hand. Stay in control.</p>
      {videoUrl&&!failed&&<button type="button" className="cs-motion-watch" onClick={()=>{setPlaying(false);setWatching(true);}}><FiPlay/>Watch player demo</button>}
      {failed&&<p role="status">Video unavailable. Use the illustrated demo.</p>}
    </>}
  </div>;
}
