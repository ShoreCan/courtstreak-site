import React from 'react';
import {Link} from 'react-router-dom';
import {useAppearance} from '../AppearanceControl.jsx';
import {CourtStreakMark} from './PoundSessionView.jsx';
import './iphone-pound-test.css';

export default function CameraTest20(){
 const appearance=useAppearance();
 return <main className="cs-iphone-tracker" data-appearance={appearance} data-phase="idle">
  <div className="cs-studio-shell">
   <header className="cs-studio-topbar"><Link className="cs-studio-back" to="/">CourtStreak</Link><div className="cs-studio-wordmark"><CourtStreakMark/><span>COURT<span>STREAK</span></span></div><span className="cs-studio-private">Test 20</span></header>
   <div className="cs-studio-heading"><div><p className="cs-studio-eyebrow">CAMERA TEST 20 <span/> BALL HANDLING</p><h1>Choose your drill<span>.</span></h1></div><span className="cs-studio-duration">20 seconds</span></div>
   <section className="cs-studio-coach" aria-label="Camera Test 20">
    <p className="cs-studio-eyebrow">READY WHEN YOU ARE</p><h2>Two drills. One camera test.</h2>
    <p>Choose a drill, set your phone down, then press Start when you’re ready. Wait for the five-second countdown before dribbling.</p>
    <div className="cs-test20-launchers"><Link className="cs-iphone-primary" to="/tracker-tests/right-hand-pound-test20">Right-hand pound</Link><Link className="cs-iphone-secondary" to="/tracker-tests/crossovers-test20">Crossovers</Link></div>
    <p>This is an experimental tracker. Review the count and save the matching video and test details after your round.</p>
    <p>Your camera stays off until you choose a drill. Video stays on your device.</p>
   </section>
  </div>
 </main>;
}
