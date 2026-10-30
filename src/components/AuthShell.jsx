import React,{useId,useState} from 'react';
import {Link} from 'react-router-dom';
import {FiEye,FiEyeOff} from 'react-icons/fi';
import {Sun,Moon,ArrowUpRight,Target,TrendingUp,Users} from 'lucide-react';
import {useAppearance} from './AppearanceControl.jsx';
import {setAppearance} from '../lib/appearance.mjs';
import {BallMark,CourtArtwork,MomentumVisual,CircleVisual} from './ProductVisuals.jsx';
import './auth-simple.css';
import './auth-premium.css';

export default function AuthShell({title,children,variant='basic',accountRole='player'}){
 const [feature,setFeature]=useState('train'),appearance=useAppearance();
 const premium=variant!=='basic';
 if(!premium)return <main className="cs-auth-simple"><div className="cs-auth-simple-wrap"><Link to="/" className="cs-auth-simple-brand"><span aria-hidden="true">CS</span>CourtStreak</Link><section className="cs-auth-simple-card"><h1>{title}</h1>{children}</section><Link className="cs-auth-simple-help" to="/contact">Need help?</Link></div></main>;
 return <main className={`cs-auth-simple cs-auth-premium is-${variant}`}><div className="cs-auth-premium-shell"><header className="cs-auth-premium-top"><Link to="/" className="cs-auth-simple-brand"><span aria-hidden="true">CS</span>CourtStreak</Link><button type="button" className="cs-auth-theme-switch" aria-label={`Switch to ${appearance==='dark'?'light':'dark'} appearance`} onClick={()=>setAppearance(appearance==='dark'?'light':'dark')}>{appearance==='dark'?<Sun size={18}/>:<Moon size={18}/>}</button></header><div className="cs-auth-premium-grid"><aside className="cs-auth-membership"><div className="cs-auth-access-pass"><BallMark/><div><span>YOUR COURTSTREAK</span><strong>{accountRole==='player'?'Your game starts here.':accountRole==='parent'?'In their corner.':'Build something together.'}</strong></div><ArrowUpRight size={20}/></div><div className="cs-auth-membership-content"><p className="cs-product-eyebrow">{variant==='login'?'STEP BACK INTO YOUR RHYTHM':'A SPACE FOR THE WORK YOU PUT IN'}</p><h2>{variant==='login'?<>Your next rep.<br/><span>Your next chapter.</span></>:<>You belong<br/><span>on this court.</span></>}</h2><p>Train with purpose. See your progress. Bring your people.</p><div className="cs-auth-feature-choices" role="group" aria-label="Explore CourtStreak features">{[['train','Train',Target],['track','Progress',TrendingUp],['connect','Circles',Users]].map(([key,label,Icon])=><button type="button" key={key} aria-pressed={feature===key} onClick={()=>setFeature(key)}><Icon size={14}/>{label}</button>)}</div><div className="cs-auth-feature-visual">{feature==='track'?<MomentumVisual/>:feature==='connect'?<CircleVisual/>:<div className="cs-product-hero-art"><span>YOUR NEXT SESSION</span><strong>Make the time yours.</strong><CourtArtwork/><div><span>Full workouts</span><span>Focused skills</span></div></div>}</div><small>Feature preview · Illustrative sample data</small></div></aside><div className="cs-auth-form-column"><section className="cs-auth-simple-card"><p className="cs-auth-form-kicker">{variant==='login'?'YOUR SPACE IS WAITING':'MAKE IT YOURS'}</p><h1>{title}</h1>{children}</section><Link className="cs-auth-simple-help" to="/contact">Need a hand?</Link></div></div></div></main>;
}
export function PasswordField({label='Password',...props}){
 const [visible,setVisible]=useState(false),generated=useId(),id=props.id||generated;
 return <div className="cs-auth-simple-field"><label htmlFor={id}>{label}</label><div className="cs-password-field"><input {...props} id={id} type={visible?'text':'password'}/><button type="button" aria-label={(visible?'Hide ':'Show ')+label.toLowerCase()} aria-pressed={visible} onClick={()=>setVisible(value=>!value)}>{visible?<FiEyeOff/>:<FiEye/>}</button></div></div>;
}
