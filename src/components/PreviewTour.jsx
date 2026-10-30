import React,{useEffect,useRef,useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,ArrowRight,Compass,X} from 'lucide-react';
import '../preview-tour.css';

const playerSteps=[
 {title:'Your dashboard, at a glance.',copy:'Weekly momentum shows how often you’re training. Your next workout and recent progress live right here.',path:'/preview/player',target:'.cs-dash-v3-week'},
 {title:'Choose how you want to work.',copy:'Follow a complete workout, or open The Lab to focus on one skill. Each path starts with a clear next step.',path:'/preview/train',target:'.cs-training-premium-grid'},
 {title:'See the work add up.',copy:'Compare like-for-like results, revisit sessions, and see your personal bests over time.',path:'/preview/progress',target:'.cs-progress-page'},
 {title:'Find your extra push.',copy:'Private Circles bring friends and teammates together through shared goals and friendly challenges.',path:'/preview/circles',target:'.cs-circles-page'},
];
function stepsFor(role){
 if(role==='player')return playerSteps;
 const parent=role==='parent',base='/preview/hub';
 return [
  {title:parent?'Their effort. Your clear view.':'Your team, in one view.',copy:parent?'See your child’s weekly activity and remaining work. Select a child to explore their progress.':'See who has trained and who has work remaining. Player cards open individual progress.',path:base+'?view='+role,target:'#hub-page-title'},
  {title:'Understand the progress.',copy:'Look at practice activity, completed sessions, and scores without asking players to send screenshots.',path:base+'/progress?view='+role,target:'#hub-page-title'},
  {title:'Give the next session a purpose.',copy:'Assigned work keeps the next step clear. This preview lets you explore the tools without sending anything.',path:base+'/assignments?view='+role,target:'#hub-page-title'},
 ];
}
const key=role=>'courtstreak-preview-guide-v1:'+role;
function hasSeen(role){try{return sessionStorage.getItem(key(role))==='seen';}catch{return false;}}
function remember(role){try{sessionStorage.setItem(key(role),'seen');}catch{/* Browsing still works with storage blocked. */}}
export default function PreviewTour(){
 const location=useLocation(),navigate=useNavigate();
 const [open,setOpen]=useState(false),[role,setRole]=useState('player'),[step,setStep]=useState(-1);
 const consumed=useRef(null),card=useRef(null);
 const visible=location.pathname.startsWith('/preview/')&&location.pathname.replace(/\/$/,'')!=='/preview/phone'&&!location.pathname.includes('/ai-training')&&!location.pathname.includes('/session')&&!location.pathname.startsWith('/preview/workout')&&!location.pathname.startsWith('/preview/lab/drill');
 const requestedRole=new URLSearchParams(location.search).get('view');
 const currentRole=location.pathname.startsWith('/preview/hub')?['player','parent'].includes(requestedRole)?requestedRole:'coach':'player';
 useEffect(()=>{
  const requested=location.state?.previewTour;
  if(!['player','parent','coach'].includes(requested)||consumed.current===location.key||hasSeen(requested))return;
  consumed.current=location.key;setRole(requested);setStep(-1);setOpen(true);
 },[location.key,location.state]);
 useEffect(()=>{if(!visible)setOpen(false);},[visible]);
 const steps=stepsFor(role),current=steps[Math.max(0,step)];
 useEffect(()=>{
  if(!open||step<0||!visible)return;
  let highlighted=null;
  const find=()=>{
   const el=document.querySelector(current.target);
   if(!el)return false;
   highlighted=el;el.classList.add('cs-preview-guide-target');el.scrollIntoView({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return true;
  };
  const observer=new MutationObserver(()=>{if(find())observer.disconnect();});
  if(!find())observer.observe(document.getElementById('root'),{childList:true,subtree:true});
  const timeout=setTimeout(()=>observer.disconnect(),8000);
  return()=>{highlighted?.classList.remove('cs-preview-guide-target');observer.disconnect();clearTimeout(timeout);};
 },[open,step,visible,current.target,location.pathname]);
 function go(index){setStep(index);navigate(steps[index].path);}
 function close(){remember(role);setOpen(false);}
 if(!visible)return null;
 return <>{!open?<button type="button" className="cs-preview-guide-launcher" onClick={()=>{setRole(currentRole);setStep(-1);setOpen(true);}}><Compass size={16}/>Quick tour</button>:<aside className="cs-preview-guide" aria-label="CourtStreak preview guide" ref={card} onKeyDown={event=>{if(event.key==='Escape')close();}}><div className="cs-preview-guide-top"><span><Compass size={15}/>{step<0?'A QUICK LOOK AROUND':`STEP ${step+1} OF ${steps.length}`}</span><button type="button" aria-label="Close preview guide" onClick={close}><X size={17}/></button></div><h2>{step<0?'Make yourself at home.':current.title}</h2><p>{step<0?'Take a short tour, or explore at your own pace. These are sample players and results.':current.copy}</p><div className="cs-preview-guide-actions">{step<0?<><button type="button" className="secondary" onClick={close}>Explore on my own</button><button type="button" onClick={()=>go(0)}>Show me<ArrowRight size={14}/></button></>:<><button type="button" className="secondary" onClick={()=>step===0?setStep(-1):go(step-1)}><ArrowLeft size={14}/>Back</button><button type="button" onClick={()=>step===steps.length-1?close():go(step+1)}>{step===steps.length-1?'Ready to explore':'Next'}<ArrowRight size={14}/></button></>}</div></aside>}</>;
}
