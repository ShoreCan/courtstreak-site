import React from 'react';
import {Camera,Check,Flame,Play,Users} from 'lucide-react';
import {Link} from 'react-router-dom';
import {PoundRepPicture} from './ai/PoundDemo.jsx';
import '../product-pages.css';

export function BallMark({className=''}){
 return <svg className={className} viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43" fill="#ff9454" stroke="#14233d" strokeWidth="3"/><path d="M7 50h86M50 7v86M22 16q57 34 0 68M78 16q-57 34 0 68" fill="none" stroke="#14233d" strokeWidth="3"/></svg>;
}
export function CourtArtwork({variant='control',className=''}){
 const complete=variant==='game-ready',cross=variant==='move-skills';
 return <svg className={`cs-court-artwork ${className}`} viewBox="0 0 420 220" fill="none" aria-hidden="true">
  <path d="M25 200V24h370v176M25 180h370M157 24v60h106V24M157 84a53 53 0 0 0 106 0M118 24v60a92 92 0 0 0 184 0V24" stroke="currentColor" strokeWidth="1.5" opacity=".22"/>
  <circle cx="210" cy="50" r="7" stroke="currentColor" opacity=".3"/>
  <path d={complete?'M68 164Q136 164 150 132T220 136T304 85L350 59':cross?'M76 158Q150 70 210 145T344 80':'M78 158h82q30 0 45-25l30-45q16-25 47-25h60'} stroke="var(--cs-theme-secondary,#72a7ff)" strokeWidth="3" strokeDasharray="5 8" strokeLinecap="round"/>
  <circle cx="78" cy="158" r="8" fill="var(--cs-theme-teal,#57cec6)"/><circle cx="344" cy="64" r="7" stroke="var(--cs-theme-teal,#57cec6)" strokeWidth="3"/>
  <g transform={cross?'translate(193 117)':'translate(202 106)'}><circle cx="18" cy="18" r="19" fill="#ff9454" stroke="#14233d" strokeWidth="2"/><path d="M-1 18h38M18-1v38M6 3q27 15 0 30M30 3Q3 18 30 33" stroke="#14233d" strokeWidth="1.5"/></g>
 </svg>;
}
export function MomentumVisual(){
 return <div className="cs-product-momentum" aria-label="Illustrative weekly progress"><div><span>WEEKLY MOMENTUM</span><Flame size={19}/></div><strong>Keep it going<span>.</span></strong><div className="cs-product-week">{['M','T','W','T','F','S','S'].map((day,i)=><span key={i} className={i<4?'done':''}>{i<4?<Check size={15}/>:day}</span>)}</div><div className="cs-product-momentum-bottom"><span>Small sessions. Strong habits.</span><small>SAMPLE</small></div></div>;
}
export function CircleVisual(){
 return <div className="cs-product-circle" aria-label="Illustrative Training Circle"><div className="cs-product-circle-title"><Users size={18}/><span>YOUR TRAINING CREW</span><small>SAMPLE</small></div><h3>Better together.</h3>{[['Jordan',82],['Maya',92],['Eli',65]].map(([name,width],i)=><div className="cs-product-circle-row" key={name}><span>{i+1}</span><div><strong>{name}</strong><i><b style={{width:width+'%'}}/></i></div><Check size={15}/></div>)}</div>;
}
export function CameraTrainingVisual(){
 return <div className="cs-product-camera" aria-label="Illustration of AI dribble counting; sample result">
  <div className="cs-product-camera-bar"><span><Camera size={15}/>AI TRAINING</span><small>ILLUSTRATION</small></div>
  <div className="cs-product-camera-scene"><div className="cs-product-camera-grid"/><PoundRepPicture/><div className="cs-product-camera-brackets"><i/><i/><i/><i/></div><span className="cs-product-camera-tag">RIGHT-HAND POUND</span><div className="cs-product-camera-score"><small>SAMPLE COUNT</small><strong>24</strong><span>reps · 20 seconds</span></div></div>
  <div className="cs-product-camera-bottom"><span>Hand → floor → hand</span><Link to="/preview/ai-training"><Play size={14}/>Try the experience</Link></div>
 </div>;
}
