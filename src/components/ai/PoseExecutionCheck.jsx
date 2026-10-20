import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { POSE_CHECK_REVISION, POSE_MODES, POSE_MODEL_SHA, createPoseExecutor, readPoseInputs, runPoseCheck, sha256 } from '../../lib/ai/poseExecution.mjs';
import './iphone-pound-test.css';
import './recorded-tracker-profile.css';

const labels={current:'Current processing',gpuIo:'Fixed GPU buffers',capture:'Fixed buffers + execution reuse'};
const inputSha='99646aa3fc4f544e6b8468de20512aa161e0388eaf6e8552084f80a5b08f4f5c';
export default function PoseExecutionCheck(){
  const navigate=useNavigate(),control=useRef(null),mounted=useRef(true);
  const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('Choose the prepared input file. It contains eight saved images from your existing attempt.'),[progress,setProgress]=useState(null),[report,setReport]=useState(null);
  useEffect(()=>{mounted.current=true;const hidden=()=>{if(document.hidden)control.current?.abort();};document.addEventListener('visibilitychange',hidden);return()=>{mounted.current=false;control.current?.abort();document.removeEventListener('visibilitychange',hidden);};},[]);
  async function start(){
    if(!file||control.current)return;
    const job=new AbortController();control.current=job;setBusy(true);setReport(null);setProgress(null);
    const usable=()=>mounted.current&&!job.signal.aborted&&!document.hidden;
    const guard=()=>{if(!usable())throw new DOMException('Check cancelled.','AbortError');};
    const executors={},initialization=[],startedAt=new Date().toISOString();let stage='input verification',device,gpuError,removeError;
    const deviceInfo={userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency??null,viewport:[innerWidth,innerHeight],devicePixelRatio,thermalStateKnown:false};
    try{
      guard();setMessage('Verifying the saved images…');
      if(!navigator.gpu)throw new Error('This browser does not expose WebGPU. Run this check in Safari on the iPhone used for the timing reports.');
      if(file.size>14*1024*1024)throw new Error('Choose CourtStreak-pose-check-inputs.json.');
      const bytes=await file.arrayBuffer();guard();
      if(await sha256(bytes)!==inputSha)throw new Error('This is not the prepared input file. Choose CourtStreak-pose-check-inputs.json.');
      const samples=await readPoseInputs(JSON.parse(new TextDecoder().decode(bytes)));guard();
      stage='model verification';setMessage('Loading the existing body model…');
      const base=import.meta.env.BASE_URL,response=await fetch(`${base}ai/models/courtstreak-pose.onnx`);
      if(!response.ok)throw new Error('The published body model could not be loaded.');
      const model=new Uint8Array(await response.arrayBuffer());guard();
      if(await sha256(model)!==POSE_MODEL_SHA)throw new Error('The published body model differs from the frozen experiment.');
      const ort=await import('onnxruntime-web/webgpu');guard();
      ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths=new URL(`${base}ai/runtime/`,location.href).href;
      for(const mode of POSE_MODES){
        stage=`initializing ${mode}`;setMessage(`Preparing ${labels[mode].toLowerCase()}…`);guard();
        const began=performance.now();executors[mode]=await createPoseExecutor({ort,model,mode});initialization.push({mode,ms:performance.now()-began});guard();
        if(!device){
          device=ort.env.webgpu.device;
          if(!device)throw new Error('ONNX Runtime did not expose its WebGPU device.');
          const error=e=>{gpuError=e.error?.message||'WebGPU validation failed.';job.abort();};device.addEventListener('uncapturederror',error);removeError=()=>device.removeEventListener('uncapturederror',error);
          device.lost.then(info=>{if(control.current===job){gpuError=`GPU device lost: ${info.message||info.reason}`;job.abort();}});
        }
      }
      stage='comparison';setMessage('Warming the three processing paths…');
      const result=await runPoseCheck({executors,samples,signal:job.signal,isActive:usable,onProgress:p=>{if(usable()){setProgress(p);setMessage(p.stage==='warmup'?`Warming ${labels[p.mode].toLowerCase()}…`:`Comparing saved images: ${p.completed} of ${p.total}.`);}}});
      guard();if(gpuError)throw new Error(gpuError);
      // Completion is reported only after all sessions have released successfully.
      stage='cleanup';for(const mode of [...POSE_MODES].reverse())await executors[mode].close();guard();
      result.initialization=initialization;result.sourceInputs={name:file.name,bytes:file.size,sha256:inputSha};result.device=deviceInfo;result.startedAt=startedAt;result.completedAt=new Date().toISOString();result.diagnosticModule=import.meta.url;
      if(mounted.current){setReport(result);setMessage('Check complete. Save the processing details and send that file for review. The live tracker has not changed.');}
    }catch(error){
      if(mounted.current){
        const reason=gpuError||(error.name==='AbortError'?'Cancelled or moved off screen.':error.message);
        setReport({schema:'courtstreak-pose-execution-stopped-v1',revision:POSE_CHECK_REVISION,completed:false,stage,error:reason,initialization,device:deviceInfo,startedAt,stoppedAt:new Date().toISOString(),liveTrackerChanged:false});
        setMessage(`Check stopped: ${reason} Save the stopped-check details; this is not a completed speed comparison.`);
      }
    }finally{
      for(const mode of [...POSE_MODES].reverse())try{await executors[mode]?.close();}catch{}
      removeError?.();if(control.current===job)control.current=null;if(mounted.current)setBusy(false);
    }
  }
  function save(){
    if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=report.completed?'CourtStreak-pose-execution-01.json':'CourtStreak-pose-execution-stopped.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <main className="cs-iphone-tracker"><div className="cs-iphone-shell cs-profile-shell">
    <header className="cs-iphone-header"><button type="button" aria-label="Back to camera" onClick={()=>navigate('/lab/drill/right-hand-pound/session?mode=iphone-vision-test')}>←</button><div><span>COURTSTREAK / PROCESSING CHECK</span><h1>Check processing speed</h1><p>Use the prepared file. No camera or new attempt.</p></div><span className="cs-iphone-version">{POSE_CHECK_REVISION}</span></header>
    <section className="cs-profile-card"><p>This check compares three ways to run the same body model on eight identical saved images. Keep this page open until it finishes.</p>
      <label htmlFor="pose-input">CourtStreak-pose-check-inputs.json</label><input id="pose-input" type="file" accept=".json,application/json" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]??null);setReport(null);}}/>
      <p role="status" aria-live="polite">{message}</p>{busy&&progress&&<progress value={progress.completed} max={progress.total} aria-label="Saved-image comparisons"/>}
      <button type="button" className="cs-iphone-primary" disabled={!file||busy} onClick={start}>{busy?'Checking processing…':'Run processing check'}</button>
      {busy&&<button type="button" className="cs-iphone-secondary" onClick={()=>{control.current?.abort();setMessage('Cancelling after the current model call finishes…');}}>Cancel check</button>}
    </section>
    {report&&<section className="cs-profile-card"><h2>{report.completed?'Check complete':'Check stopped'}</h2>
      {report.completed&&<><div className="cs-profile-table"><table><caption>Median time to return a body result</caption><thead><tr><th>Processing</th><th>Time</th><th>Outputs match</th></tr></thead><tbody>{POSE_MODES.map(mode=><tr key={mode}><th>{labels[mode]}</th><td>{report.summary.variants[mode].median.toFixed(1)} ms</td><td>{mode==='current'?'Reference':report.summary.comparisons[mode].allOutputsMatch?'Yes':'No'}</td></tr>)}</tbody></table></div><p>This saved-image check does not measure live frame rate or rep-count accuracy. Results need review before changing the tracker.</p></>}
      <button type="button" className="cs-iphone-primary" onClick={save}>{report.completed?'Save processing details':'Save stopped-check details'}</button>
    </section>}
    <footer>The prepared images stay on this device. This check does not upload them or post training scores.</footer>
  </div></main>;
}
