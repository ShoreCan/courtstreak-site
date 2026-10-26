import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDetector } from '../../lib/ai/iphoneDetector.mjs';
import { TRACKER_BUILD_INFO } from '../../lib/ai/trackerBuildInfo.mjs';
import { sha256 } from '../../lib/ai/poseExecution.mjs';
import { RECORDING_CHECK_REVISION, createRecordingLoad, runRecordingLoadCheck, validateRecordingInputs } from '../../lib/ai/recordingLoadCheck.mjs';
import './iphone-pound-test.css';
import './recorded-tracker-profile.css';

const inputSha='d9f3cdd2658bc04a05b6cb613d73428a22629f5ea09f065ac84123ed2c8790fc';
const modelHashes={ball:'6d6490cbaa8fc24cbd05f6db88274f7db6b4a180100dbedb5876e7bed7d80820',pose:'f0fe983de02d0dfb734c52ca21c539bffdcc9c76a86dc5457e16c262d84e6022'};
const cancelled=()=>new DOMException('Check cancelled.','AbortError');
const nextFrame=signal=>new Promise((resolve,reject)=>{const stop=()=>{cancelAnimationFrame(id);reject(cancelled());};const id=requestAnimationFrame(()=>{signal?.removeEventListener('abort',stop);resolve();});if(signal?.aborted)stop();else signal?.addEventListener('abort',stop,{once:true});});
function loadImage(bytes,signal){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'})),img=new Image();
    const cleanup=()=>{URL.revokeObjectURL(url);signal?.removeEventListener('abort',stop);img.onload=img.onerror=null;};
    const stop=()=>{cleanup();img.src='';reject(cancelled());};
    img.onload=()=>{cleanup();resolve(img);};img.onerror=()=>{cleanup();reject(new Error('A saved image could not be decoded.'));};
    if(signal?.aborted){stop();return;}signal?.addEventListener('abort',stop,{once:true});img.src=url;
  });
}
function restore(ctx,img,rect){ctx.save();ctx.translate(1280,0);ctx.scale(-1,1);ctx.drawImage(img,...rect,0,0,1280,2276);ctx.restore();}

export default function RecordingLoadCheck(){
  const navigate=useNavigate(),camera=useRef(null),controller=useRef(null),mounted=useRef(true);
  const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('Choose CourtStreak-recording-check-inputs.json. Use the same iPhone and keep its position steady.'),[progress,setProgress]=useState(null),[report,setReport]=useState(null);
  useEffect(()=>{mounted.current=true;const hidden=()=>{if(document.hidden)controller.current?.abort();};document.addEventListener('visibilitychange',hidden);return()=>{mounted.current=false;controller.current?.abort();document.removeEventListener('visibilitychange',hidden);};},[]);
  async function start(){
    if(!file||controller.current)return;
    const job=new AbortController();controller.current=job;setBusy(true);setReport(null);setProgress(null);
    const usable=()=>mounted.current&&!job.signal.aborted&&!document.hidden,check=()=>{if(!usable())throw cancelled();};
    let stream,detector,load,stage='camera',failure,wake,removeGpuError;
    const startedAt=new Date().toISOString(),device={userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency??null,viewport:[innerWidth,innerHeight],devicePixelRatio,thermalStateKnown:false};
    try{
      check();setMessage('Opening the front camera. No dribbling or setup check is needed…');
      if(!navigator.gpu)throw new Error('WebGPU is unavailable. Use Safari on the iPhone used for the earlier checks.');
      // Same native stream constraints and recorder as the live tracker.
      stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{exact:'user'},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}}});check();
      const track=stream.getVideoTracks()[0];track.addEventListener('ended',()=>{failure='The camera stopped.';job.abort();},{once:true});
      camera.current.srcObject=stream;await camera.current.play();check();
      try{wake=await navigator.wakeLock?.request('screen');}catch{}check();
      stage='input verification';setMessage('Verifying and preparing the saved images…');
      if(file.size>10*1024*1024)throw new Error('Choose the prepared recording-check input file.');
      const bytes=await file.arrayBuffer();check();if(await sha256(bytes)!==inputSha)throw new Error('Choose CourtStreak-recording-check-inputs.json; the pose/profile files belong to earlier checks.');
      const pack=JSON.parse(new TextDecoder().decode(bytes)),samples=validateRecordingInputs(pack),images=new Map(),pixelHashes=new Map();
      // Hash on a separate canvas outside the timed blocks, preserving the measured canvas's normal backing behavior.
      const hashing=document.createElement('canvas');hashing.width=1280;hashing.height=2276;const hashCtx=hashing.getContext('2d',{willReadFrequently:true});
      for(const s of samples){
        check();const data=Uint8Array.from(atob(s.pngBase64),c=>c.charCodeAt(0));if(await sha256(data)!==s.pngSha256)throw new Error(`Saved image ${s.frameId} failed verification.`);
        const img=await loadImage(data,job.signal);check();if(img.naturalWidth!==464||img.naturalHeight!==960)throw new Error('Unexpected saved-image dimensions.');images.set(s.frameId,img);
        restore(hashCtx,img,pack.sourceRect);pixelHashes.set(s.frameId,await sha256(hashCtx.getImageData(0,0,1280,2276).data));
      }
      hashing.width=hashing.height=1;
      const frame=document.createElement('canvas');frame.width=1280;frame.height=2276;const ctx=frame.getContext('2d');
      const capture=s=>{const began=performance.now();restore(ctx,images.get(s.frameId),pack.sourceRect);return {frame,ms:performance.now()-began,pixelSha256:pixelHashes.get(s.frameId)};};
      stage='model loading';detector=await loadDetector(import.meta.env.BASE_URL,text=>{if(usable())setMessage(text);},{inputMode:'legacy'});check();
      if(detector.provider!=='webgpu'||Object.entries(modelHashes).some(([kind,hash])=>detector.modelManifest?.[kind]?.sha256!==hash))throw new Error('The provider or model manifest differs from the frozen comparison.');
      const ort=await import('onnxruntime-web/webgpu'),gpu=ort.env.webgpu.device;check();
      if(!gpu)throw new Error('The WebGPU device is unavailable.');
      const gpuError=e=>{failure=e.error?.message||'WebGPU validation failed.';job.abort();};gpu.addEventListener('uncapturederror',gpuError);removeGpuError=()=>gpu.removeEventListener('uncapturederror',gpuError);
      gpu.lost.then(info=>{if(controller.current===job){failure=`GPU device lost: ${info.message||info.reason}`;job.abort();}});
      load=createRecordingLoad(stream,{getVideoSize:()=>({width:camera.current?.videoWidth,height:camera.current?.videoHeight}),onError:error=>{failure=error.message;job.abort();}});
      stage='comparison';
      const result=await runRecordingLoadCheck({detector,samples,capture,load,signal:job.signal,isActive:usable,yieldFrame:nextFrame,onProgress:p=>{if(usable()){setProgress(p);setMessage(p.stage==='warmup'?'Warming the unchanged ball and body models…':p.stage==='settle'?`Preparing block ${p.block+1} of 4: recording ${p.recording?'ON':'OFF'}…`:`Saved-frame check ${p.completed} of ${p.total}: recording ${p.recording?'ON':'OFF'}. Keep the phone steady.`);}}});
      check();stage='cleanup';await load.end();await detector.close();detector=null;stream.getTracks().forEach(t=>t.stop());stream=null;if(camera.current)camera.current.srcObject=null;check();
      result.baselineCommit=TRACKER_BUILD_INFO.sourceCommit;result.buildInfo=TRACKER_BUILD_INFO;result.sourceInputs={name:file.name,bytes:file.size,sha256:inputSha,pixelHashesComputedBeforeMeasurement:true};result.device=device;result.startedAt=startedAt;result.completedAt=new Date().toISOString();result.diagnosticModule=import.meta.url;
      if(mounted.current){setReport(result);setMessage('Check complete. Save processing details and send that file for review.');}
    }catch(error){if(mounted.current){const reason=failure||(error.name==='AbortError'?'Cancelled or moved off screen.':error.message);setReport({schema:'courtstreak-recording-load-stopped-v1',revision:RECORDING_CHECK_REVISION,completed:false,stage,error:reason,startedAt,stoppedAt:new Date().toISOString(),device,liveTrackerChanged:false});setMessage(`Check stopped: ${reason} Save stopped-check details for review.`);}}
    finally{
      try{await load?.end();}catch{}stream?.getTracks().forEach(t=>t.stop());if(camera.current)camera.current.srcObject=null;try{await detector?.close();}catch{}try{await wake?.release();}catch{}
      removeGpuError?.();if(controller.current===job)controller.current=null;if(mounted.current)setBusy(false);
    }
  }
  function save(){if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=report.completed?'CourtStreak-recording-load-01.json':'CourtStreak-recording-load-stopped.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const summary=report?.summary;
  return <main className="cs-iphone-tracker"><div className="cs-iphone-shell cs-profile-shell">
    <header className="cs-iphone-header"><button type="button" aria-label="Back to camera test" onClick={()=>navigate('/lab/drill/right-hand-pound/session?mode=iphone-vision-test')}>←</button><div><span>COURTSTREAK / RECORDING LOAD</span><h1>Check recording load</h1><p>Saved detector inputs · No dribbling needed</p></div><span className="cs-iphone-version">{RECORDING_CHECK_REVISION}</span></header>
    <section className="cs-profile-card"><p>The front camera stays open while the same saved frames run through both models. Recording switches off and on to measure its processing cost. Keep the phone steady and this page open.</p>
      <label htmlFor="recording-input">CourtStreak-recording-check-inputs.json</label><input id="recording-input" type="file" accept=".json,application/json" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]??null);setReport(null);}}/>
      <video ref={camera} muted playsInline autoPlay style={{display:busy?'block':'none'}} aria-label="Front-camera recording load preview"/>
      <p role="status" aria-live="polite">{message}</p>{busy&&progress&&<progress value={progress.completed} max={48} aria-label="Saved detector calls"/>}
      <button type="button" className="cs-iphone-primary" disabled={!file||busy} onClick={start}>{busy?'Checking recording load…':'Open camera & run check'}</button>
      {busy&&<button type="button" className="cs-iphone-secondary" onClick={()=>{controller.current?.abort();setMessage('Cancelling after the current call finishes…');}}>Cancel check</button>}
    </section>
    {report&&<section className="cs-profile-card"><h2>{report.completed?'Check complete':'Check stopped'}</h2>{report.completed&&<><div className="cs-profile-table"><table><caption>Average processing time per saved detector call</caption><thead><tr><th>Call type</th><th>Recording off</th><th>Recording on</th></tr></thead><tbody>{[['Ball only','ballOnly'],['Ball + body','poseInclusive']].map(([label,key])=><tr key={key}><th>{label}</th><td>{summary.variants.off[key].mean.toFixed(1)} ms</td><td>{summary.variants.on[key].mean.toFixed(1)} ms</td></tr>)}</tbody></table></div><p>Outputs matched: {summary.allOutputsMatch?'Yes':'No'}. This measures detector latency under recording load. It does not establish live frame rate or rep-count accuracy.</p></>}<button type="button" className="cs-iphone-primary" onClick={save}>{report.completed?'Save processing details':'Save stopped-check details'}</button></section>}
    <footer>Camera recordings are temporary and discarded after each block. Saved detector images remain on this device. This check uploads no video and posts no training scores.</footer>
  </div></main>;
}
