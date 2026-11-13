import React from 'react';
import {FiArrowRight,FiCheck,FiChevronDown,FiDownload,FiPlay,FiRefreshCw} from 'react-icons/fi';

// One instruction and one primary action. Technical evidence belongs in help,
// rather than covering the player or duplicating the same warning on screen.
export default function CameraSetupPanel({ui,drillKey,onOpen,onStart,onRetry,onCancel,onSaveDetails,onManual,versions}){
 const phase=ui.phase,crossover=drillKey==='stationary-crossover',holding=crossover?'either hand':'your right hand';
 const settingUp=['setup','countdown'].includes(phase),failed=phase==='error';
 const title=phase==='placing'?'Ready when you are.':phase==='loading'?'Preparing your tracker.':phase==='countdown'?ui.rechecking?'Checking your view.':'Get ready.':phase==='setup'?ui.setupGuide?.screenText||'Finding your position':failed?'Let’s get you started.':'Your next 20 seconds.';
 const message=phase==='placing'?'Set your phone down, then press Start.':phase==='loading'?'You can position your phone while the tracker loads.':phase==='countdown'?ui.rechecking?ui.message||'Keep your position. Your countdown will continue.':'Start dribbling when you hear Go.':phase==='setup'?ui.setupGuide?.message||`Keep yourself, the ball and some floor in view. Hold the ball in ${holding}.`:failed?ui.message:`Open the camera, then hold the ball naturally in ${holding}.`;
 const refreshing=phase==='setup'&&['refresh','speed'].includes(ui.setupGuide?.key);
 const rows=[['body','You'],['hand','Hand'],['ball','Ball'],['floor','Floor']];
 return <section className="cs-camera-setup-panel" aria-label="Camera setup">
  <div className="cs-camera-instruction" role="status" aria-live="polite"><h2>{refreshing?'Checking your camera.':title}</h2><p>{refreshing?'Keep your position while the camera check finishes.':message}</p></div>
  {phase==='loading'&&<div className="cs-studio-loading-track" role="progressbar" aria-label="Preparing tracker"><span/></div>}
  {settingUp&&<ul className="cs-camera-checks" aria-label="Camera visibility">{rows.map(([key,label])=><li key={key} className={ui.checks?.[key]?'ready':''}><span aria-hidden="true">{ui.checks?.[key]?<FiCheck/>:<i/>}</span>{label}<span className="cs-sr-only">{ui.checks?.[key]?' visible':' checking'}</span></li>)}</ul>}
  {phase==='placing'&&<button type="button" className="cs-iphone-primary" onClick={onStart}><FiPlay/><span>Start</span><FiArrowRight/></button>}
  {['idle','error'].includes(phase)&&<button type="button" className="cs-iphone-primary" onClick={failed?onRetry:onOpen}><span>{ui.permissionRequired?'Allow camera':failed?'Try again':'Open camera'}</span><FiArrowRight/></button>}
  <div className="cs-camera-secondary-actions">
   <details className="cs-camera-help"><summary>Camera help<FiChevronDown/></summary><div>
    <p>Portrait or landscape works. Keep yourself, your basketball and some floor visible. A natural stance is fine.</p>
    {ui.cameraReady&&<p>Hold the ball in {holding} until Go. Leave the phone on stable support.</p>}
    {settingUp&&<button type="button" className="cs-studio-text-button" onClick={onRetry}><FiRefreshCw/>Restart camera check</button>}
    <button type="button" className="cs-studio-text-button" onClick={onSaveDetails}><FiDownload/>Save setup details</button>
    {failed&&<button type="button" className="cs-studio-text-button" onClick={onManual}>Use timer</button>}
    <small>{versions?.check} · {versions?.setup}</small>
    {ui.fps>0&&<small>Processing: {ui.fps.toFixed(1)} frames/sec. This is a speed measurement, not a count accuracy score.</small>}
   </div></details>
   {!['idle','error'].includes(phase)&&<button type="button" className="cs-camera-cancel" onClick={onCancel}>Cancel</button>}
  </div>
 </section>;
}
