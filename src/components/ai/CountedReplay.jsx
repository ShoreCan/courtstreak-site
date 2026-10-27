import React,{useEffect,useRef,useState} from 'react';
import {observeReplayCounter} from '../../lib/ai/replayCounter.mjs';
import {replayStart} from '../../lib/ai/roundEvidence.mjs';

export default function CountedReplay({src,changes,events,finalCount,completed}){
 const player=useRef(null),region=useRef(null);
 const [count,setCount]=useState(0),[selected,setSelected]=useState(null),[atEnd,setAtEnd]=useState(false),[message,setMessage]=useState(''),[speed,setSpeed]=useState(1);
 useEffect(()=>{
  setSelected(null);setAtEnd(false);setMessage('');
  return observeReplayCounter(player.current,changes,setCount);
 },[src,changes]);
 useEffect(()=>{setSpeed(1);if(player.current)player.current.playbackRate=1;},[src]);
 function changeSpeed(value){if(player.current){player.current.playbackRate=value;setSpeed(value);}}
 function jump(event){
  const video=player.current;if(!video)return;
  setSelected(event.rep);setAtEnd(false);setMessage('');
  try{
   video.currentTime=replayStart(event.time,video.duration);
   void video.play().catch(()=>setMessage('Tap Play to review the selected rep.'));
   region.current?.scrollIntoView({block:'start',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }catch{setMessage('Play the replay once, then tap a rep to review it.');}
 }
 return <>
  <div className="cs-iphone-replay-player" ref={region}>
   <div className="cs-iphone-instant-count" aria-label="Replay counter">
    <div><span>{atEnd?(completed?'FINAL COUNT':'FINAL PARTIAL COUNT'):(completed?'COUNTED REPS':'PARTIAL COUNT')}</span><div className="cs-iphone-replay-total"><strong>{atEnd?finalCount:count}</strong><small> / {finalCount}</small></div></div>
    <span className="cs-iphone-selected-rep">{selected?`Reviewing rep ${selected}`:'Live replay count'}</span>
   </div>
   <video ref={player} src={src} controls playsInline preload="metadata" aria-label="Instant camera replay with synchronized rep counter" onEnded={()=>setAtEnd(true)} onSeeking={()=>setAtEnd(false)} onPlay={()=>setAtEnd(false)} onRateChange={()=>setSpeed(player.current?.playbackRate??1)}/>
  </div>
  {message&&<p role="status">{message}</p>}
  {events.length>0&&<div className="cs-iphone-rep-review"><div className="cs-replay-toolbar"><p>Tap a rep to replay it</p><div role="group" aria-label="Replay speed">{[[.5,'½×'],[1,'1×']].map(([value,label])=><button key={value} type="button" aria-label={`Replay at ${value===.5?'half':'normal'} speed`} aria-pressed={speed===value} onClick={()=>changeSpeed(value)}>{label}</button>)}</div></div><div className="cs-iphone-rep-markers" role="group" aria-label="Counted rep replay markers">{events.map(event=><button type="button" key={event.rep} onClick={()=>jump(event)} aria-pressed={selected===event.rep} aria-current={!atEnd&&count===event.rep?'step':undefined} aria-label={`Replay counted rep ${event.rep}`}>{event.rep}</button>)}</div></div>}
 </>;
}
