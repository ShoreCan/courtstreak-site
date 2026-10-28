import React, { useState } from 'react';
import { FiPlay } from 'react-icons/fi';

// The labelled right hand is on the viewer’s left in this front-facing diagram.
function RepPicture({floor=false}) {
  return <svg viewBox="0 0 160 235" aria-hidden="true">
    <path d="M12 218h136" stroke="#657d9c" strokeWidth="2"/>
    <ellipse cx="82" cy="219" rx="55" ry="5" fill="#020712" opacity=".35"/>
    <g stroke="#c5d4e7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <circle cx="86" cy="30" r="15" fill="#9fb4ce"/>
      <path d="m75 47-13 56 47 1-12-57z" fill="#567190"/>
      <path d="m73 52-22 25-15 32m62-57 19 30 11 25M66 105l-6 43-14 61H33m69-104 8 43 13 61h13"/>
      <path d="m63 105 23 9 21-9-3 27-18-5-25 6z" fill="#243e5d"/>
    </g>
    <g transform={`translate(34 ${floor ? 202 : 126})`}>
      <circle r="15" fill="#ff8747" stroke="#c65f2b" strokeWidth="1.5"/>
      <path d="M-15 0h30M0-15v30M-11-11c15 4 18 8 22 22M11-11c-15 4-18 8-22 22" fill="none" stroke="#713a25" strokeWidth="1.2"/>
    </g>
    {floor && <path d="M34 149v29m-6-6 6 6 6-6" stroke="#ffb58a" strokeWidth="2" fill="none" strokeLinecap="round"/>}
  </svg>;
}

// A static sequence teaches the contact, floor bounce and controlled return.
export default function PoundDemo({videoUrl=null}) {
  const [watching,setWatching]=useState(false),[failed,setFailed]=useState(false);
  if(videoUrl&&watching&&!failed)return <div className="cs-pound-demo cs-pound-demo-video"><video src={videoUrl} controls autoPlay playsInline preload="metadata" onError={()=>setFailed(true)} aria-label="Right-hand pound player demonstration"/><button type="button" onClick={()=>setWatching(false)} className="cs-demo-close">Close demo</button></div>;
  return <div className="cs-pound-demo cs-rep-sequence">
    <span className="cs-demo-label">ONE RIGHT-HAND REP</span>
    <ol aria-label="Right-hand pound sequence">
      <li><RepPicture/><span><b>1</b>Right hand</span></li>
      <li><RepPicture floor/><span><b>2</b>Floor bounce</span></li>
      <li><RepPicture/><span><b>3</b>Right hand</span></li>
    </ol>
    <p>Push down. Let it bounce. Regain control in the same hand.</p>
    {videoUrl&&!failed&&<button type="button" className="cs-rep-watch" onClick={()=>setWatching(true)}><FiPlay/>Watch player demo</button>}
    {failed&&<p role="status">The video could not load. Follow the sequence above.</p>}
  </div>;
}
