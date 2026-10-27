import React, { useState } from 'react';
import { FiPause, FiPlay } from 'react-icons/fi';

// An illustrated demonstration, never a claim about detector output.
export default function PoundDemo({ videoUrl = null }) {
  const [paused, setPaused] = useState(true);
  const [watching, setWatching] = useState(false);
  if (videoUrl && watching) return <div className="cs-pound-demo cs-pound-demo-video"><video src={videoUrl} controls autoPlay playsInline preload="none" aria-label="Right-hand pound player demonstration"/><button type="button" onClick={() => setWatching(false)} className="cs-demo-close">Close demo</button></div>;
  return <div className={`cs-pound-demo ${paused ? 'is-paused' : ''}`}>
    <svg viewBox="0 0 480 430" role="img" aria-label="Illustration of a player performing a right-hand pound dribble">
      <defs><linearGradient id="cs-demo-jersey" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b9cadf"/><stop offset="1" stopColor="#6f8aa9"/></linearGradient></defs>
      <g className="cs-demo-court" fill="none" stroke="#31445e" strokeWidth="1">
        <ellipse cx="240" cy="395" rx="230" ry="72"/><ellipse cx="240" cy="395" rx="145" ry="42"/><path d="M240 337v93M0 395h480"/>
      </g>
      <ellipse cx="246" cy="375" rx="112" ry="13" fill="#020712" opacity=".45"/>
      <g stroke="#ccdaea" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
        <path d="m229 238-17 61-26 63h-23m96-124 24 63 10 61h25" fill="none"/>
        <path d="m217 206-4 43 27 5 8-27 13 28 24-8-16-47" fill="#263e5b"/>
        <path d="m222 113-9 43-12 29-24 13" fill="none"/>
        <path d="m258 115 26 30 27 15" fill="none"/>
        <path d="m222 110 35 1 12 90-53 6z" fill="url(#cs-demo-jersey)"/>
        <path d="m231 101 1 11m14-11 1 11" fill="none"/>
        <ellipse cx="240" cy="81" rx="19" ry="23" fill="#9bb0c8"/>
      </g>
      <path d="M222 70c2-27 36-25 37 1-15-1-26-3-37-1" fill="#25364d"/>
      <path d="m231 132 6 40h12l-6-40" stroke="#edf4fc" strokeWidth="2" fill="none" opacity=".6"/>
      <g className="cs-demo-ball" transform="translate(310 189)">
        <circle r="24" fill="#ff8139" stroke="#d65b20" strokeWidth="2"/>
        <path d="M-24 0h48M0-24v48M-17-17c25 6 28 13 34 34M17-17c-25 6-28 13-34 34" fill="none" stroke="#78351e" strokeWidth="1.5"/>
      </g>
      <g className="cs-demo-ball-shadow"><ellipse cx="310" cy="376" rx="24" ry="5" fill="#ff8747" opacity=".18"/></g>
      <path d="M137 61V43h19m169 0h19v18M137 355v23h19m169 0h19v-23" fill="none" stroke="#ff8747" strokeWidth="1.5" opacity=".65"/>
    </svg>
    <span className="cs-demo-label">{videoUrl ? 'WATCH THE MOVE' : 'ILLUSTRATED PREVIEW'}</span>
    <button type="button" className="cs-demo-pause" onClick={() => videoUrl ? setWatching(true) : setPaused(value => !value)} aria-label={videoUrl ? 'Watch player demonstration' : paused ? 'Play illustrated drill preview' : 'Pause illustrated drill preview'}>{paused ? <FiPlay /> : <FiPause />}</button>
    <span className="cs-demo-floor-label">HAND → FLOOR → HAND</span>
  </div>;
}
