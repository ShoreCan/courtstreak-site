import React, { useState } from 'react';
import { FiArrowLeft, FiArrowRight, FiCamera, FiCheck, FiCheckCircle, FiChevronDown, FiClock, FiDownload, FiInfo, FiLock, FiMaximize, FiRefreshCw, FiShare2, FiShield, FiSmartphone, FiTarget, FiX } from 'react-icons/fi';
import { useAppearance } from '../AppearanceControl.jsx';
import CountedReplay from './CountedReplay.jsx';
import PoundDemo from './PoundDemo.jsx';
import { getDrillVideo } from '../../data/drillVideos.js';
import './iphone-pound-test.css';

export const TRACKER_PRESENTATION_REVISION = 'STUDIO 03';
export function CourtStreakMark() {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="13"/><path d="M3 16h26M16 3v26M6.5 6.5c10.5 4 15 8.5 19 19M25.5 6.5c-10.5 4-15 8.5-19 19"/></svg>;
}
const checks = [['body', 'Body', FiMaximize], ['hand', 'Wrist', FiTarget], ['ball', 'Ball', CourtStreakMark], ['floor', 'Floor', FiSmartphone]];
const titles = { idle: 'Ready when you are.', loading: 'Warming up the camera.', setup: 'Step into the frame.', countdown: 'Hold for Go.', active: 'Stay in your rhythm.', review: 'Checking the last rep.', 'recording-only': 'Count paused. Video rolling.', error: 'Let’s try again.' };

export default function PoundSessionView({ ui, ratio, live, ended, ballLocked, videoRef, overlayRef, resultPanelRef, clip, countedClip, replayChanges, preparing, canSave, savedClip, sharing, shareMessage, filename, originalFilename, versions, onBack, onOpen, onStop, onSaveEvidence, onPrepareVideo, onUseOriginal, onShareVideo }) {
  const [guide, setGuide] = useState('landscape');
  const appearance = useAppearance();
  const demoVideoUrl = getDrillVideo({ drill_key: 'right-hand-pound' });
  const phase = ui.phase;
  const training = ['active', 'review', 'recording-only'].includes(phase);
  const positioning = ['setup', 'countdown'].includes(phase);
  const step = ended ? 2 : training ? 1 : 0;
  const status = phase === 'idle' ? 'Phone down. Full body and floor in view.' : phase === 'loading' ? ui.message || 'First-time setup can take a moment.' : ui.message;
  return <main data-phase={phase} data-appearance={appearance} className={`cs-iphone-tracker ${training ? 'is-training' : ''} ${ended ? 'is-results' : ''}`}>
    <div className="cs-studio-shell">
      <header className="cs-studio-topbar">
        <button type="button" className="cs-studio-back" onClick={onBack} aria-label="Back to drill"><FiArrowLeft/><span>The Lab</span></button>
        <div className="cs-studio-wordmark"><CourtStreakMark/><span>COURT<span>STREAK</span></span></div>
        <span className="cs-studio-private" title="Camera video stays on your device"><FiShield/><span className="cs-sr-only">Private camera</span></span>
      </header>
      <div className="cs-studio-heading">
        <div><p className="cs-studio-eyebrow">AI TRAINING <span/> BALL HANDLING</p><h1>{ended ? phase === 'finished' ? 'Round complete' : 'Your partial round' : 'Right-hand pound'}<span>.</span></h1></div>
        <span className="cs-studio-duration"><FiClock/>20 seconds</span>
      </div>
      <ol className="cs-iphone-steps" aria-label="Session progress">{['Set up', 'Train', 'Replay'].map((label, index) => <li key={label} className={index === step ? 'current' : index < step ? 'complete' : ''} aria-current={index === step ? 'step' : undefined}><b>{index < step ? <FiCheck/> : index + 1}</b><span>{label}</span>{index < 2 && <i aria-hidden="true"/>}</li>)}</ol>

      <div className="cs-studio-workspace" hidden={ended}>
        <div className="cs-studio-camera-column" hidden={!live}>
          <section className="cs-iphone-stage" style={{ aspectRatio: ratio }} aria-label="Live camera and detected basketball">
            <video ref={videoRef} muted autoPlay playsInline aria-label="Mirrored front camera"/><canvas ref={overlayRef} aria-hidden="true"/>
            {live && <span className={`cs-iphone-lock ${ui.ball ? 'found' : ''}`}><i/>{ui.ball ? ballLocked ? 'Ball locked' : 'Ball detected' : 'Finding ball'}</span>}
            {phase === 'countdown' && <div className={`cs-iphone-countdown ${ui.rechecking ? 'is-paused' : ''}`}><span>{ui.rechecking ? 'HOLD POSITION' : 'GET READY'}</span><div className="cs-studio-countdown-ring" style={{ '--count-progress': `${(5 - ui.countdown) / 5 * 100}%` }}><strong key={ui.countdown}>{ui.countdown}</strong></div><span>{ui.rechecking ? 'Countdown paused · Rechecking' : 'Wait for Go.'}</span></div>}
            {phase === 'active' && ui.go && <div className="cs-iphone-countdown cs-iphone-go"><strong>GO.</strong></div>}
          </section>
          {training && <div className={`cs-iphone-live ${phase === 'recording-only' ? 'is-partial' : ''}`}>
            <div><span>{phase === 'recording-only' ? 'PARTIAL REPS' : 'REPS'}</span><strong>{ui.count}</strong></div>
            <div><span>{phase === 'review' ? 'REVIEWING' : 'TIME LEFT'}</span><strong>{String(ui.left).padStart(2, '0')}<small>s</small></strong></div>
            <div className="cs-studio-time-track" role="progressbar" aria-label="Round time remaining" aria-valuemin={0} aria-valuemax={20} aria-valuenow={ui.left}><span style={{ width: `${ui.left / 20 * 100}%` }}/></div>
          </div>}
        </div>
        <section className={`cs-iphone-controls ${training ? 'is-active' : ''}`} aria-label="Session guidance">
          {!live && <div className="cs-studio-ready-icon" aria-hidden="true"><FiCamera/></div>}
          <p className="cs-studio-eyebrow">{training ? 'IN SESSION' : positioning ? 'CAMERA CHECK' : 'YOUR NEXT 20 SECONDS'}</p>
          <h2>{titles[phase] || 'Get ready.'}</h2>
          <p className={`cs-iphone-status ${phase === 'error' ? 'is-error' : ''}`} role="status" aria-live="polite">{status}</p>
          {['idle', 'error'].includes(phase) && <>
            <button type="button" className="cs-iphone-primary" onClick={onOpen}><FiCamera/><span>{phase === 'error' ? 'Try camera again' : 'Enable camera'}</span><FiArrowRight/></button>
            <span className="cs-studio-under-button">Position check → 5-second countdown → Go</span>
            <details className="cs-studio-visual-help"><summary>Need a visual?<FiChevronDown/></summary><div className="cs-studio-demo-slot"><PoundDemo videoUrl={demoVideoUrl}/></div><p>Right hand. Floor bounce. Back under control.</p></details>
          </>}
          {phase === 'loading' && <div className="cs-studio-loading-track" role="progressbar" aria-label="Loading camera and tracking"><span/></div>}
          {positioning && <>
            <div className="cs-iphone-checks" aria-label="Live position checks">{checks.map(([key, label, Icon]) => <div key={key} className={ui.checks[key] ? 'pass' : ''}><Icon/><span>{label}</span><b>{ui.checks[key] ? <FiCheck/> : '…'}</b><span className="cs-sr-only">{ui.checks[key] ? 'ready' : 'checking'}</span></div>)}</div>
            <div className="cs-iphone-progress" role="progressbar" aria-label="Position confirmation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ui.progress * 100)}><span style={{ width: `${ui.progress * 100}%` }}/></div>
            <small>{ui.rechecking ? 'Your countdown is paused while we recheck.' : 'Hold the ball. We’ll start when you’re ready.'}</small>
          </>}
          {phase === 'recording-only' && <p className="cs-studio-partial-note"><FiInfo/>Your partial count is frozen. Recording continues until Time.</p>}
          {live && <button type="button" className="cs-studio-stop" onClick={onStop}><FiX/> End session</button>}
          {!training && <details className="cs-iphone-help"><summary>Camera tips<FiChevronDown/></summary><div>
            <div className="cs-studio-guide-tabs" role="group" aria-label="Phone orientation guide">{['landscape', 'portrait'].map(value => <button key={value} type="button" aria-pressed={guide === value} onClick={() => setGuide(value)}><FiSmartphone className={value === 'landscape' ? 'is-landscape' : ''}/>{value === 'landscape' ? 'Landscape' : 'Portrait'}</button>)}</div>
            <p>{guide === 'landscape' ? 'Sideways gives your arms and basketball more room.' : 'Stand far enough back to fit your whole body.'} Use stable floor-level support. Keep your head, feet, ball and some floor visible. Hold the ball until Go, then keep the phone still.</p>
          </div></details>}
          {!training && <p className="cs-studio-privacy-note"><FiLock/> Video stays on your device.</p>}
        </section>
      </div>

      {ended && <section className="cs-iphone-review" ref={resultPanelRef} tabIndex={-1} aria-label="Round score and video replay">
        <div className={`cs-iphone-score ${phase === 'interrupted' ? 'is-partial' : ''}`}>
          <div className="cs-studio-score-art" aria-hidden="true"><CourtStreakMark/></div>
          <div className="cs-studio-score-intro"><span className="cs-iphone-score-kicker">{phase === 'finished' ? <FiCheckCircle/> : <FiInfo/>}{phase === 'finished' ? 'ROUND COMPLETE' : 'PARTIAL SESSION'}</span><h2>{phase === 'finished' ? 'Work put in.' : 'Keep what you earned.'}</h2><p>Right-hand pound · {phase === 'finished' ? '20 seconds' : 'Incomplete round'}</p></div>
          <div className="cs-iphone-score-number"><strong>{ui.count}</strong><span>{phase === 'finished' ? 'detected reps' : 'partial reps'}</span></div>
          {phase === 'interrupted' && <div className="cs-studio-interruption"><FiInfo/><p>{ui.message}</p></div>}
        </div>
        <div className="cs-studio-result-grid">
          <div className="cs-iphone-replay">
            <div className="cs-studio-section-heading"><h3>Your replay</h3><span>Every counted rep. One tap away.</span></div>
            {clip.status === 'ready' ? <CountedReplay src={clip.url} changes={replayChanges} events={ui.evidence.repEvents} finalCount={ui.count} completed={phase === 'finished'}/> : <div className="cs-studio-no-replay" role="status"><FiCamera/><h3>{clip.status === 'finishing' ? 'Finishing your replay…' : 'Your count is saved here.'}</h3><p>{clip.status === 'finishing' ? 'The camera recording is finishing.' : 'No video is available for this round.'}</p></div>}
          </div>
          <aside className="cs-studio-share-panel" aria-label="Save and share your round">
            <h3>Keep the work.</h3>
            {clip.status === 'ready' && <>
              {preparing ? <div className="cs-iphone-export" role="status"><div><span>Preparing counted video</span><strong>{Math.floor(countedClip.progress * 100)}%</strong></div><progress value={countedClip.progress} max="1" aria-label="Preparing video with rep counter"/><p>Watch your replay while we finish.</p></div> : countedClip.status === 'ready' ? <div className="cs-iphone-video-ready"><FiCheckCircle/><span>Counted video ready</span></div> : <div className="cs-iphone-export"><p role="status">{countedClip.status === 'unavailable' ? countedClip.message : countedClip.status === 'original' ? 'Original selected · No added counter' : 'Preparing your video…'}</p>{countedClip.status !== 'idle' && <button type="button" className="cs-studio-text-button" onClick={onPrepareVideo}><FiRefreshCw/> Retry counted video</button>}</div>}
              <div className="cs-iphone-video-actions"><button type="button" className="cs-iphone-primary" onClick={() => onShareVideo(true)} disabled={sharing || !canSave}><FiDownload/><span>{countedClip.status === 'ready' ? 'Save video' : countedClip.status === 'original' ? 'Save original' : 'Preparing video…'}</span></button><button type="button" className="cs-iphone-secondary" onClick={() => onShareVideo()} disabled={sharing || !canSave}><FiShare2/>{sharing ? 'Opening share options…' : 'Share round'}</button></div>
              {shareMessage && <p className="cs-studio-share-message" role="status">{shareMessage}</p>}
              <details className="cs-studio-original"><summary>More save options<FiChevronDown/></summary><div>{canSave && <a className="cs-iphone-file-download" href={savedClip.url} download={filename}><FiDownload/> Download {countedClip.status === 'ready' ? 'counted' : 'original'} file</a>}<a className="cs-iphone-file-download" href={clip.url} download={originalFilename}><FiDownload/> Original camera video</a>{!['ready', 'original'].includes(countedClip.status) && <button type="button" className="cs-studio-text-button" onClick={onUseOriginal}>Use original instead</button>}<p>The original has no added counter. On iPhone, choose Save Video or Save to Files.</p></div></details>
              <p className="cs-studio-save-note">Save before leaving or starting again.</p>
            </>}
            <button type="button" className="cs-studio-again" onClick={onOpen}><FiRefreshCw/> Train again<FiArrowRight/></button>
          </aside>
        </div>
        <div className="cs-studio-review-bottom"><p><FiInfo/> AI preview · Review your count. No XP or Circle score is posted.</p>{ui.total > 0 && <details className="cs-iphone-evidence"><summary>Session details<FiChevronDown/></summary><div><p>Ball visible in {Math.round(ui.detected / ui.total * 100)}% of processed frames. Visibility is not an accuracy score.</p><p>Save details with the matching video to report a problem. Nothing uploads automatically.</p><button type="button" className="cs-iphone-secondary" onClick={onSaveEvidence}><FiDownload/> Save test details</button></div></details>}</div>
      </section>}
      <footer className="cs-studio-footer"><span><FiShield/> Private until you share.</span><details><summary>Build details<FiChevronDown/></summary><p>{versions.check} · {TRACKER_PRESENTATION_REVISION}<br/>{versions.counter} · {versions.camera} · {versions.frame} · {versions.identity}<br/>{ui.fps > 0 ? `${ui.fps.toFixed(1)} tracking frames/sec` : 'Camera is off'}<br/>Records from Go until Time while the camera stays healthy.</p></details></footer>
    </div>
  </main>;
}
