// CourtStreak quality update v1
import { saveResultContext } from '../lib/resultContext.js';
import ShareTraining from '../components/ShareTraining.jsx';
import TrainingVisibility from '../components/TrainingVisibility.jsx';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiPlay } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient.js';
import { requireTrainingAccess } from '../lib/trainingAccess.js';
import DrillGuide from '../components/DrillGuide.jsx';

const LocalPoundPilot = import.meta.env.DEV ? React.lazy(() => import('../components/ai/LocalPoundPilot.jsx')) : null;
const IPhonePoundTest = React.lazy(() => import('../components/ai/IPhonePoundTest.jsx'));
const RecordedTrackerProfile = React.lazy(() => import('../components/ai/RecordedTrackerProfile.jsx'));
const PoseExecutionCheck = React.lazy(() => import('../components/ai/PoseExecutionCheck.jsx'));
const RecordingLoadCheck = React.lazy(() => import('../components/ai/RecordingLoadCheck.jsx'));
export default function LabDrillSession() {
  const { drillKey } = useParams();
  const location = useLocation();
  if (drillKey === 'right-hand-pound' && new URLSearchParams(location.search).get('mode') === 'iphone-fresh-frame-test') {
    return <React.Suspense fallback={<main className="cs-session-page">Opening on-device camera…</main>}><IPhonePoundTest key="fresh-frames" freshFrames /></React.Suspense>;
  }
  if (drillKey === 'right-hand-pound' && new URLSearchParams(location.search).get('mode') === 'recording-load') {
    return <React.Suspense fallback={<main className="cs-session-page">Opening recording-load check…</main>}><RecordingLoadCheck /></React.Suspense>;
  }
  if (drillKey === 'right-hand-pound' && new URLSearchParams(location.search).get('mode') === 'pose-execution') {
    return <React.Suspense fallback={<main className="cs-session-page">Opening saved-image check…</main>}><PoseExecutionCheck /></React.Suspense>;
  }
  if (drillKey === 'right-hand-pound' && new URLSearchParams(location.search).get('mode') === 'recorded-profile') {
    return <React.Suspense fallback={<main className="cs-session-page">Opening saved-video check…</main>}><RecordedTrackerProfile /></React.Suspense>;
  }
  if (drillKey === 'right-hand-pound' && new URLSearchParams(location.search).get('mode') === 'iphone-vision-test') {
    return <React.Suspense fallback={<main className="cs-session-page">Opening on-device camera…</main>}><IPhonePoundTest /></React.Suspense>;
  }
  if (import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname) && drillKey === 'right-hand-pound' && new URLSearchParams(location.search).get('mode') === 'ai-test') {
    return <React.Suspense fallback={<main className="cs-session-page">Opening camera test…</main>}><LocalPoundPilot /></React.Suspense>;
  }
  return <GuidedLabDrillSession />;
}
function GuidedLabDrillSession() {
  const { drillKey } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const challenge = location.state?.circleChallenge;
  const [drill, setDrill] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [countdown, setCountdown] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reps, setReps] = useState('');
  const [message, setMessage] = useState('');
  const [sharedCircleIds, setSharedCircleIds] = useState([]);
  const [visibilityReady, setVisibilityReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const attemptRef = useRef(null);
  const savingRef = useRef(false);
  const receiptRef = useRef(null);
  const [comparisonSaved, setComparisonSaved] = useState(true);
  const durationRef = useRef(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        await requireTrainingAccess();
        const result = await supabase.from('drills').select('drill_key, name, hand, default_duration_seconds, key_points, short_description, demo_video_url, metric_label').eq('drill_key', drillKey).eq('status', 'active').maybeSingle();
        if (!active) return;
        if (result.error || !result.data) throw new Error('This drill could not be loaded. Return to the library and try again.');
        setDrill(result.data); setSecondsLeft(result.data.default_duration_seconds || 30); setPhase('ready');
      } catch (error) { if (active) { setMessage(error.message); setPhase('error'); } }
    }
    void load(); return () => { active = false; };
  }, [drillKey]);
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) { setPhase('active'); return; }
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);
  useEffect(() => {
    if (phase !== 'active' || paused) return;
    if (secondsLeft <= 0) { setPhase('finished'); return; }
    const timer = setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft, paused]);
  useEffect(() => {
    const onHidden = () => { if (document.hidden && phase === 'active') { setPaused(true); setMessage('Paused while CourtStreak is off screen. Resume when you are ready.'); } };
    document.addEventListener('visibilitychange', onHidden); return () => document.removeEventListener('visibilitychange', onHidden);
  }, [phase]);
  async function start() {
    if (!visibilityReady || !drill || !['ready', 'finished'].includes(phase) || savingRef.current) return;
    savingRef.current = true; setSaving(true); setMessage('');
    try {
      await requireTrainingAccess();
      const result = await supabase.rpc('begin_lab_drill_attempt', { p_drill_key: drill.drill_key, p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', p_shared_circle_ids: [...new Set([...sharedCircleIds, ...(challenge?.circleId ? [challenge.circleId] : [])])] });
      if (result.error) throw new Error('Drill recording is not available yet. Please contact support; no training has been recorded.');
      const attempt = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!attempt?.attempt_id || !Number.isInteger(attempt.duration_seconds)) throw new Error('The training timer could not be prepared. Please try again.');
      durationRef.current = attempt.duration_seconds;
      attemptRef.current = attempt.attempt_id; receiptRef.current = null;
      setSecondsLeft(attempt.duration_seconds); setCountdown(5); setReps(''); setPaused(false); setPhase('countdown');
    } catch (error) { setMessage(error.message); }
    finally { savingRef.current = false; setSaving(false); }
  }
  async function save() {
    if (phase !== 'finished' || secondsLeft !== 0 || !attemptRef.current || savingRef.current) return;
    const numericReps = Number(reps);
    if (!reps.trim() || !Number.isSafeInteger(numericReps) || numericReps < 0 || numericReps > 10000) { setMessage('Enter a whole number from 0 to 10,000. Count only clean reps.'); return; }
    savingRef.current = true; setSaving(true); setMessage('');
    try {
      await requireTrainingAccess();
      if (!receiptRef.current) {
        const result = await supabase.rpc('complete_lab_drill_attempt', { p_attempt_id: attemptRef.current, p_reps: numericReps });
        if (result.error) throw new Error('Your result could not be saved. Keep this screen open and retry.');
        receiptRef.current = Array.isArray(result.data) ? result.data[0] : result.data;
        setComparisonSaved(await saveResultContext(receiptRef.current?.session_id, drill, durationRef.current));
      }
      if (challenge?.id) {
        const result = await supabase.rpc('submit_circle_challenge_result', { p_challenge_id: challenge.id, p_score: numericReps, p_verification_mode: 'manual', p_result_payload: { drillKey: drill.drill_key, attemptId: attemptRef.current, durationSeconds: durationRef.current } });
        if (result.error) throw new Error('Your training result was saved, but the Circle result was not posted. Retry to post it.');
      }
      setPhase('saved');
    } catch (error) { setMessage(error.message); }
    finally { savingRef.current = false; setSaving(false); }
  }
  const clock = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;
  return <main className="cs-session-page"><header className="cs-session-topbar"><button onClick={() => navigate(`/lab/drill/${drillKey}`)}><FiArrowLeft /> Drill details</button><span>GUIDED DRILL</span></header>
    <section className="cs-session-shell"><div>{drill && <DrillGuide drill={drill} />}</div><aside className="cs-session-panel"><span className="cs-lab-eyebrow">GUIDED MANUAL</span><h1>{drill?.name || 'Preparing your drill…'}</h1><p>Follow the full timer, then enter your clean reps. Camera access is not required.</p>
      <div className="cs-session-timer">{phase === 'countdown' ? countdown : clock}</div>
      {phase === 'ready' && <TrainingVisibility onReady={setVisibilityReady} value={sharedCircleIds} onChange={setSharedCircleIds} lockedCircleId={challenge?.circleId} />}
      {phase === 'ready' && <button className="cs-session-primary" disabled={saving || !visibilityReady} onClick={start}><FiPlay /> {saving ? 'Preparing…' : 'Start countdown'}</button>}
      {phase === 'active' && <button className="cs-session-primary" onClick={() => { setPaused(!paused); setMessage(''); }}>{paused ? 'Resume' : 'Pause'}</button>}
      {phase === 'finished' && <div className="cs-session-result"><label htmlFor="session-reps">Clean reps completed</label><input id="session-reps" type="number" inputMode="numeric" min="0" max="10000" step="1" value={reps} onChange={(event) => setReps(event.target.value)} /><p>Timer completed · Result self-reported</p><button className="cs-session-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save result'}</button></div>}
      {phase === 'saved' && <div className="cs-session-result"><FiCheck /><h2>Result saved.</h2>{!comparisonSaved && <p>Comparison details could not save. Your result is still in history.</p>}<ShareTraining text={`CourtStreak: ${drill.name} · ${durationRef.current}s · ${reps} clean reps · Self-reported result.`} /><p>Your recorded drill appears in Progress. This counts as a single drill, rather than a full workout.</p><button className="cs-session-primary" onClick={() => navigate(challenge ? `/training-circles/${challenge.circleId}` : '/progress')}>View {challenge ? 'Circle' : 'Progress'}</button></div>}
      {message && <p className="cs-session-message" role="alert">{message}</p>}
      {['countdown', 'active'].includes(phase) && <button onClick={() => { setPhase('ready'); setSecondsLeft(drill.default_duration_seconds); attemptRef.current = null; setMessage('Round canceled. No result was saved.'); }}>Cancel round</button>}
    </aside></section></main>;
}
