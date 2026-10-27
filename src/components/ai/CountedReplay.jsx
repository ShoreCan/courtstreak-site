import React,{useEffect,useRef,useState} from 'react';
import {observeReplayCounter} from '../../lib/ai/replayCounter.mjs';
import {replayStart} from '../../lib/ai/roundEvidence.mjs';

export default function CountedReplay({src,changes,events,finalCount,completed}){
 const player=useRef(null),region=useRef(null);
 const [count,setCount]=useState(0),[selected,setSelected]=useState(null),[atEnd,setAtEnd]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  setSelected(null);setAtEnd(false);setMessage('');
  return observeReplayCounter(player.current,changes,setCount);
 },[src,changes]);
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
    <span className="cs-iphone-selected-rep">{selected?`Rep ${selected} selected`:'Synchronized with playback'}</span>
   </div>
   <video ref={player} src={src} controls playsInline preload="metadata" aria-label="Instant camera replay with synchronized rep counter" onEnded={()=>setAtEnd(true)} onSeeking={()=>setAtEnd(false)} onPlay={()=>setAtEnd(false)}/>
  </div>
  {message&&<p role="status">{message}</p>}
  {events.length>0&&<div className="cs-iphone-rep-review"><p>Counted reps · Tap one to replay that moment</p><div className="cs-iphone-rep-markers" role="group" aria-label="Counted rep replay markers">{events.map(event=><button type="button" key={event.rep} onClick={()=>jump(event)} aria-pressed={selected===event.rep} aria-current={!atEnd&&count===event.rep?'step':undefined} aria-label={`Replay counted rep ${event.rep}`}>{event.rep}</button>)}</div><small>Each marker starts just before the bounce. The replay count advances when the tracker accepted the controlled return; the final count appears when playback ends.</small></div>}
 </>;
}
