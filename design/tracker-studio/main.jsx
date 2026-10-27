import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/styles.css';
import '../../src/player-app-ui.css';
import '../../src/quality-polish.css';
import '../../src/iphone-polish.css';
import '../../src/ui-polish.css';
import PoundSessionView from '../../src/components/ai/PoundSessionView.jsx';
import PoundTrainingEntry from '../../src/components/ai/PoundTrainingEntry.jsx';
import sampleVideo from './sample-video.js';
import './preview.css';
import { AppearanceSettings, useAppearance } from '../../src/components/AppearanceControl.jsx';
import { FiSettings } from 'react-icons/fi';
import '../../src/theme.css';
import { setAppearance } from '../../src/lib/appearance.mjs';

if(document.documentElement.dataset.studioAppearance) setAppearance(document.documentElement.dataset.studioAppearance);

const phases=['Start','Set up','Frame','Countdown','Train','Replay','Partial'];
const names={Start:'entry','Set up':'idle',Frame:'setup',Countdown:'countdown',Train:'active',Replay:'finished',Partial:'interrupted',Settings:'settings'};
const changes=[{time:0,count:0},...Array.from({length:30},(_,i)=>({time:(i+1)*2/3-.02,count:i+1}))];
const events=Array.from({length:30},(_,i)=>({rep:i+1,time:(i+.5)*2/3}));
const versions={check:'CHECK 09',counter:'COUNT 08',camera:'CAMERA 04',frame:'FRAME 02',identity:'LOCK 10'};
const bundledTemplate=document.getElementById('studio-embedded')?.textContent;
const embeddedDocument=bundledTemplate?new TextDecoder().decode(Uint8Array.from(atob(bundledTemplate),c=>c.charCodeAt(0))):null;

function SampleSession({initial}){
 const appearance=useAppearance();
 useEffect(()=>{const receive=event=>{if(event.source===window.parent&&event.data?.type==='courtstreak:preview-appearance'&&['dark','light'].includes(event.data.value))setAppearance(event.data.value);};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
 useEffect(()=>{if(window.parent!==window)window.parent.postMessage({type:'courtstreak:preview-appearance',value:appearance},'*');},[appearance]);
 const [phase,setPhase]=useState(initial),[countdown,setCountdown]=useState(5),[elapsed,setElapsed]=useState(0),[running,setRunning]=useState(initial==='countdown'),[exportReady,setExportReady]=useState(initial==='interrupted'),[original,setOriginal]=useState(false),[message,setMessage]=useState(''),[paused,setPaused]=useState(false),[stoppedCount,setStoppedCount]=useState(30);
 const video=useRef(null),overlay=useRef(null),resultPanel=useRef(null);
 const live=['setup','countdown','active','review','recording-only'].includes(phase),ended=['finished','interrupted'].includes(phase);
 useEffect(()=>{
  if(live&&video.current){video.current.src=sampleVideo;video.current.loop=true;void video.current.play().catch(()=>{});}
 },[live]);
 useEffect(()=>{
  if(!running)return;
  if(phase==='setup'){const t=setTimeout(()=>setPhase('countdown'),1200);return()=>clearTimeout(t);}
  if(phase==='countdown'){
   if(paused)return;
   const t=setTimeout(()=>{if(countdown===1){setPhase('active');setElapsed(0);}else setCountdown(n=>n-1);},1000);return()=>clearTimeout(t);
  }
  if(phase==='active'){
   if(elapsed>=20){setPhase('finished');setRunning(false);return;}
   const t=setTimeout(()=>setElapsed(n=>n+1),1000);return()=>clearTimeout(t);
  }
 },[phase,running,countdown,elapsed,paused]);
 const count=ended?(phase==='interrupted'?stoppedCount:30):phase==='active'?(running?Math.min(30,Math.floor(elapsed*1.5)):17):0;
 const previewChanges=useMemo(()=>ended?changes.filter(c=>c.count<=count):changes,[ended,count]);
 const ui={phase,count,countdown,left:running?20-elapsed:9,go:phase==='active'&&running&&elapsed<1,rechecking:paused,progress:phase==='setup'?.65:1,ball:live,checks:{body:live,hand:live,ball:live,floor:live},detected:285,total:300,fps:14.8,evidence:{repEvents:ended?events.slice(0,count):events},message:phase==='interrupted'?'Tracking became unreliable. The remaining camera recording was preserved; this count is partial.':phase==='countdown'?'Position locked. Stay in view until Go.':phase==='setup'?'Good position. Confirming your frame…':'Tracking your basketball.'};
 const clip={status:'ready',url:sampleVideo,blob:new Blob([],{type:'video/mp4'})};
 const countedClip={...clip,status:original?'original':exportReady?'ready':'preparing',progress:.62,width:480,height:854};
 function open(){setPhase('setup');setCountdown(5);setElapsed(0);setRunning(true);setExportReady(false);setOriginal(false);setMessage('');setPaused(false);}
 if(phase==='settings')return <div className="studio-settings-preview"><header><span>COURTSTREAK / SETTINGS</span></header><h1>Make it yours.</h1><AppearanceSettings/><button type="button" onClick={()=>setPhase('idle')}>← Back to training</button></div>;
 if(phase==='entry')return <><div className="studio-sample-notice">DESIGN PREVIEW · No camera or login needed.</div><div className="studio-entry-preview"><header><span>THE LAB / BALL HANDLING</span></header><h1>Right-hand pound.</h1><PoundTrainingEntry onCamera={()=>setPhase('idle')} onManual={()=>setMessage('The real app opens the existing manual timer. No sample score is saved.')}/>{message&&<p role="status">{message}</p>}</div></>;
 return <div className="studio-sample">
  <div className="studio-sample-notice"><span>DESIGN PREVIEW · Sample session. Camera never opens.</span>{phase==='countdown'&&<button type="button" onClick={()=>setPaused(n=>!n)}>{paused?'Resume countdown':'Pause countdown'}</button>}{ended&&<button type="button" onClick={()=>setExportReady(n=>!n)}>{exportReady?'Preview export progress':'Mark MP4 ready'}</button>}</div>
  <PoundSessionView ui={ui} ratio={phase==='idle'?16/9:9/16} live={live} ended={ended} ballLocked={live} videoRef={video} overlayRef={overlay} resultPanelRef={resultPanel}
   clip={clip} countedClip={countedClip} replayChanges={previewChanges} preparing={!exportReady&&!original} canSave={exportReady||original} savedClip={clip} sharing={false} shareMessage={message}
   filename="CourtStreak-sample-session.mp4" originalFilename="CourtStreak-sample-original.mp4" versions={versions}
   onBack={()=>{setPhase('idle');setRunning(false);}} onOpen={open} onStop={()=>{setStoppedCount(count);setRunning(false);setPhase('interrupted');}}
   onSaveEvidence={()=>setMessage('Design preview: no real session data is collected.')} onPrepareVideo={()=>{setOriginal(false);setExportReady(false);}} onUseOriginal={()=>setOriginal(true)}
   onShareVideo={save=>setMessage(save?'Design preview: the real tracker saves your camera recording.':'Design preview: the real tracker opens your device’s share options.')}/>
 </div>;
}
function DesignReview(){
 const [view,setView]=useState('Set up'),[device,setDevice]=useState('Phone'),[previewRun,setPreviewRun]=useState(0);
 const showView=value=>{setView(value);setPreviewRun(n=>n+1);};
 const appearance=useAppearance(),iframe=useRef(null);
 useEffect(()=>{const receive=event=>{if(event.source===iframe.current?.contentWindow&&event.data?.type==='courtstreak:preview-appearance'&&['dark','light'].includes(event.data.value))setAppearance(event.data.value);};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
 useEffect(()=>{iframe.current?.contentWindow?.postMessage({type:'courtstreak:preview-appearance',value:appearance},'*');},[appearance]);
 const embeddedPhase=document.documentElement.dataset.studioPhase;
 const embedded=!!embeddedPhase||new URL(location.href).searchParams.get('embedded')==='1',initial=embeddedPhase??new URL(location.href).searchParams.get('phase')??'idle';
 const frameDocument=useMemo(()=>embeddedDocument?embeddedDocument.replace('__STUDIO_PHASE__',names[view]).replace('__STUDIO_APPEARANCE__',appearance):undefined,[view,previewRun]);
 if(embedded)return <SampleSession initial={initial}/>;
 return <div className="studio-preview-root" data-appearance={appearance}><header><div><span>COURTSTREAK / STUDIO 03</span><h1>Built for your game.</h1><p>A focused training experience. Explore with sample data.</p></div><button type="button" className="studio-settings-shortcut" title="CourtStreak settings" aria-label="Open CourtStreak settings" onClick={()=>showView('Settings')}><FiSettings/></button></header>
  <nav className="studio-preview-toolbar" aria-label="Design preview controls"><div role="group" aria-label="Session state">{phases.map(p=><button type="button" key={p} aria-pressed={view===p} onClick={()=>showView(p)}>{p}</button>)}</div><div role="group" aria-label="Preview device">{['Desktop','Tablet','Phone','Landscape'].map(d=><button type="button" key={d} aria-pressed={device===d} onClick={()=>setDevice(d)}>{d}</button>)}</div></nav>
  <div className={`studio-preview-device device-${device.toLowerCase()}`}><iframe ref={iframe} key={`${view}-${previewRun}`} title="CourtStreak tracker interface preview" src={embeddedDocument?undefined:`?embedded=1&phase=${names[view]}`} srcDoc={frameDocument}/></div>
  <p className="studio-preview-footnote">Sample session · Camera stays off · CHECK 09 tracking unchanged</p>
 </div>;
}
createRoot(document.getElementById('root')).render(<DesignReview/>);
