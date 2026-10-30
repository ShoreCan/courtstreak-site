import React,{useId,useState} from 'react';
import {ArrowUpRight,Camera,Check,Clock,Download,Flame,RotateCcw,Timer,Users} from 'lucide-react';
import {Link} from 'react-router-dom';
import '../product-pages.css';
import './ai-product-preview.css';

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
 const [method,setMethod]=useState('ai'),id=useId();
 return <div className="cs-ai-product-preview" aria-label="Drill setup interface preview; camera off">
  <div className="cs-ai-product-top"><span><span className="cs-ai-product-monogram">CS</span>THE LAB</span><small>INTERFACE PREVIEW</small></div>
  <div className="cs-ai-drill-setup">
   <div className="cs-ai-drill-heading"><div><p>BALL HANDLING / CONTROL</p><h3>Right-Hand Pound</h3><span><Clock size={12}/>20 seconds<span aria-hidden="true">·</span>Right hand</span></div><BallMark/></div>
   <p className="cs-ai-method-label" id={`${id}-method`}>HOW DO YOU WANT TO TRAIN?</p>
   <div className="cs-ai-methods" role="group" aria-labelledby={`${id}-method`}>
    <button type="button" aria-pressed={method==='ai'} onClick={()=>setMethod('ai')}><Camera size={20}/><strong>AI Camera</strong><span>Live count + replay</span>{method==='ai'&&<Check size={13} className="cs-ai-method-check"/>}</button>
    <button type="button" aria-pressed={method==='timer'} onClick={()=>setMethod('timer')}><Timer size={20}/><strong>Timer</strong><span>Enter your own reps</span>{method==='timer'&&<Check size={13} className="cs-ai-method-check"/>}</button>
   </div>
   <div className="cs-ai-method-description" aria-live="polite"><span>{method==='ai'?'Let the camera count.':'Train with a guided timer.'}</span><p>{method==='ai'?'Live rep counting and a replay to review after your round.':'Follow the timer, then enter your own rep count.'}</p></div>
   <Link className="cs-ai-open-method" to={method==='ai'?'/preview/lab/drill/right-hand-pound':'/preview/lab/drill/right-hand-pound/session'}>{method==='ai'?<Camera size={15}/>:<Timer size={15}/>}<span>{method==='ai'?'Explore AI drill setup':'Explore timer setup'}</span><ArrowUpRight size={16}/></Link>
   <small>Interface preview · Your camera stays off</small>
  </div>
  <div className="cs-ai-round-flow">
   <p className="cs-ai-flow-label">WITH AI CAMERA · FROM FIRST REP TO FINISH</p>
   <ol>
    <li><span className="cs-ai-flow-icon"><Camera size={16}/></span><div><strong>Train with a live count.</strong><span>Stay focused on the drill.</span></div><b>01</b></li>
    <li><span className="cs-ai-flow-icon"><RotateCcw size={16}/></span><div><strong>Review your round.</strong><span>Go back through your counted reps.</span></div><b>02</b></li>
    <li><span className="cs-ai-flow-icon"><Download size={16}/></span><div><strong>Save to your camera roll.</strong><span>Rewatch on your phone, whenever you want.</span></div><b>03</b></li>
   </ol>
  </div>
 </div>;
}
