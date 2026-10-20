import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadDetector } from '../../lib/ai/iphoneDetector.mjs';
import { RECORDED_PROFILE_REVISION, profileVideoGeometry, runRecordedProfile, seekProfileFrame, validateProfileEvidence } from '../../lib/ai/recordedProfile.mjs';
import './iphone-pound-test.css';
import './recorded-tracker-profile.css';

async function fingerprint(file) {
  const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
const ms=value=>value==null?'—':`${value.toFixed(1)} ms`;

export default function RecordedTrackerProfile() {
  const navigate=useNavigate(),video=useRef(null),canvas=useRef(null),controller=useRef(null),mounted=useRef(true),evidenceVersion=useRef(0);
  const [videoFile,setVideoFile]=useState(null),[videoURL,setVideoURL]=useState(''),[evidenceFile,setEvidenceFile]=useState(null),[evidence,setEvidence]=useState(null);
  const [counted,setCounted]=useState(true),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('Choose the saved video and test details from the same attempt.'),[progress,setProgress]=useState(null),[report,setReport]=useState(null);
  useEffect(()=>{mounted.current=true;const hidden=()=>{if(document.hidden)controller.current?.abort();};document.addEventListener('visibilitychange',hidden);return()=>{mounted.current=false;controller.current?.abort();document.removeEventListener('visibilitychange',hidden);};},[]);
  useEffect(()=>()=>{if(videoURL)URL.revokeObjectURL(videoURL);},[videoURL]);
  useEffect(()=>{
    const v=video.current;if(!ready||!evidence||!v)return;
    for(const kind of [true,false])try{profileVideoGeometry(evidence,{width:v.videoWidth,height:v.videoHeight,duration:v.duration,counted:kind});setCounted(kind);break;}catch{}
  },[ready,evidence,videoURL]);
  function chooseVideo(event) {
    const file=event.target.files?.[0];setReady(false);setReport(null);setVideoFile(file??null);setVideoURL(file?URL.createObjectURL(file):'');
    if(file)setCounted(!file.name.includes('-original.'));
  }
  async function chooseEvidence(event) {
    const version=++evidenceVersion.current,file=event.target.files?.[0];setEvidence(null);setReport(null);setEvidenceFile(file??null);
    if(!file)return;
    try{if(file.size>10*1024*1024)throw new Error('Choose the saved CourtStreak test-details JSON.');const data=JSON.parse(await file.text());validateProfileEvidence(data);if(mounted.current&&version===evidenceVersion.current){setEvidence(data);setMessage('Files ready. This check uses the saved video; no dribbling or camera access is needed.');}}
    catch(error){if(mounted.current&&version===evidenceVersion.current)setMessage(error.message);}
  }
  async function start() {
    if(controller.current||busy||!ready||!videoFile||!evidenceFile||!evidence)return;
    const current=new AbortController();controller.current=current;setBusy(true);setReport(null);setProgress(null);setMessage('Preparing the saved-video check…');
    let detector;
    const usable=()=>mounted.current&&!current.signal.aborted&&!document.hidden;
    try{
      if(!usable())throw new DOMException('Check cancelled.','AbortError');
      const v=video.current,shape=profileVideoGeometry(evidence,{width:v.videoWidth,height:v.videoHeight,duration:v.duration,counted});
      const [videoHash,evidenceHash]=await Promise.all([fingerprint(videoFile),fingerprint(evidenceFile)]);
      if(!usable())throw new DOMException('Check cancelled.','AbortError');
      detector=await loadDetector(import.meta.env.BASE_URL,text=>{if(usable())setMessage(text);});
      if(!usable())throw new DOMException('Check cancelled.','AbortError');
      const frame=canvas.current;frame.width=shape.frameWidth;frame.height=shape.frameHeight;const ctx=frame.getContext('2d');
      const capture=async(sample,signal)=>{
        const began=performance.now();await seekProfileFrame(v,sample.time,signal);
        if(!usable())throw new DOMException('Check cancelled.','AbortError');
        ctx.save();ctx.translate(frame.width,0);ctx.scale(-1,1);ctx.drawImage(v,...shape.sourceRect,0,0,frame.width,frame.height);ctx.restore();
        return {frame,actualTime:v.currentTime,preparationMs:performance.now()-began};
      };
      const startedAt=new Date().toISOString();
      const result=await runRecordedProfile({detector,evidence,geometry:shape,capture,signal:current.signal,isActive:usable,onProgress:p=>{if(usable()){setProgress(p);setMessage(p.stage==='warmup'?'Warming both processing paths…':`Comparing saved frame ${p.completed} of ${p.total}…`);}}});
      result.sourceVideo={name:videoFile.name,bytes:videoFile.size,sha256:videoHash,countedExport:counted};
      result.sourceEvidence={name:evidenceFile.name,sha256:evidenceHash,trackerRevision:evidence.trackerRevision,poseScheduleRevision:evidence.poseScheduleRevision,phase:evidence.phase};
      result.device={userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency??null,viewport:[innerWidth,innerHeight],devicePixelRatio,thermalStateKnown:false};
      result.startedAt=startedAt;result.completedAt=new Date().toISOString();result.diagnosticModule=import.meta.url;
      await detector.close();detector=null;
      if(!usable())throw new DOMException('Check cancelled.','AbortError');
      setReport(result);setMessage(result.summary.allOutputsMatch?'Check complete. Save processing details and send that file for review.':'Check complete, but some model outputs differed. Save the details before accepting a speed comparison.');
    }catch(error){if(mounted.current){setReport(null);setMessage(error.name==='AbortError'?'Check cancelled. Keep this page open to run it again; no partial success report was saved.':`Check stopped: ${error.message}`);}}
    finally{if(detector)try{await detector.close();}catch{}if(controller.current===current)controller.current=null;if(mounted.current)setBusy(false);}
  }
  function saveReport() {
    if(!report?.completed)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='CourtStreak-recorded-profile-01.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const summary=report?.summary,stages=[['Ball image preparation','ball','preprocessMs'],['Ball model run','ball','inferenceMs'],['Body image preparation','pose','preprocessMs'],['Body model run','pose','inferenceMs']];
  return <main className="cs-iphone-tracker"><div className="cs-iphone-shell cs-profile-shell">
    <header className="cs-iphone-header"><button type="button" onClick={()=>navigate('/lab/drill/right-hand-pound/session?mode=iphone-vision-test')} aria-label="Back to camera test">←</button><div><span>COURTSTREAK / TRACKER CHECK</span><h1>Check a saved attempt</h1><p>Use today’s video. No new dribbling needed.</p></div><span className="cs-iphone-version">{RECORDED_PROFILE_REVISION}</span></header>
    <section className="cs-profile-card">
      <p>Choose the video and test-details JSON from the same attempt. The check compares current processing with the memory-saving candidate on identical saved frames.</p>
      <label htmlFor="profile-video">Saved video</label><input id="profile-video" type="file" accept="video/*,.mov" disabled={busy} onChange={chooseVideo}/>
      <label htmlFor="profile-kind">Video format · detected automatically</label><select id="profile-kind" value={counted?'counted':'original'} disabled={busy} onChange={e=>{setCounted(e.target.value==='counted');setReport(null);}}><option value="counted">Saved video with CourtStreak rep counter</option><option value="original">Original video without the counter</option></select>
      <label htmlFor="profile-evidence">Matching test details (.json)</label><input id="profile-evidence" type="file" accept="application/json,.json" disabled={busy} onChange={chooseEvidence}/>
      {videoURL&&<video ref={video} src={videoURL} muted playsInline preload="auto" controls={!busy} onLoadedData={()=>setReady(true)} onError={()=>{setReady(false);setMessage('This browser could not load the saved video. Try it on the iPhone that recorded it.');}}/>}
      <canvas ref={canvas} hidden/>
      <p role="status" aria-live="polite">{message}</p>
      {busy&&progress&&<progress value={progress.completed} max={progress.total} aria-label="Saved frames compared"/>}
      <button type="button" className="cs-iphone-primary" disabled={busy||!ready||!evidence} onClick={start}>{busy?'Checking saved video…':'Run saved-video check'}</button>
      {busy&&<button type="button" className="cs-iphone-secondary" onClick={()=>controller.current?.abort()}>Cancel check</button>}
    </section>
    {report&&<section className="cs-profile-card" aria-label="Saved-video processing results">
      <h2>Processing check complete</h2><p>Model outputs matched on {summary.matchingOutputPairs} of {summary.pairs} paired frames.</p>
      <div className="cs-profile-table"><table><caption>Median measured time per sampled call</caption><thead><tr><th>Stage</th><th>Current</th><th>Candidate</th></tr></thead><tbody>{stages.map(([label,kind,key])=><tr key={label}><th>{label}</th><td>{ms(summary.variants.legacy.stages[kind][key]?.median)}</td><td>{ms(summary.variants.reuse.stages[kind][key]?.median)}</td></tr>)}</tbody></table></div>
      <p>This measures processing on a saved clip. Live frame rate, camera/recording contention and real-dribble accuracy still need separate verification.</p>
      <button type="button" className="cs-iphone-primary" onClick={saveReport}>Save processing details</button>
    </section>}
    <footer>The video and test details are processed on this device. This check does not request the camera, upload your video, or post training scores. Keep CourtStreak open until it finishes.</footer>
  </div></main>;
}
