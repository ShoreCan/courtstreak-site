import {loadAccountUser,accountLoginPath} from '../lib/accountFlow.mjs';
import { favoriteCache } from '../lib/favoriteCache.mjs';
import { getDrillVideo } from '../data/drillVideos.js';
import usePreviewNavigate from '../lib/usePreviewNavigate.js';
import { PREVIEW_DRILLS } from '../data/previewDrills.js';
import DrillGuide from '../components/DrillGuide.jsx';
import FrontCameraCheck from '../components/ai/FrontCameraCheck.jsx';
import PoundTrainingEntry from '../components/ai/PoundTrainingEntry.jsx';
import PoundDemo from '../components/ai/PoundDemo.jsx';
import { CURRENT_POUND_SESSION_PATH } from '../lib/ai/trackerConfiguration.mjs';
import '../cs-mobile-drill-fix.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiClock, FiHeart, FiPlay, FiRefreshCw, FiStar, FiUsers, FiZap } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient.js';

function formatHand(hand) {
  if (hand === 'right') return 'Right Hand';
  if (hand === 'left') return 'Left Hand';
  return 'Both Hands';
}

function normalizeKeyPoints(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // Plain text values are split below.
  }
  return value.split(/\n|•|\|/).map((point) => point.trim()).filter(Boolean);
}


export default function LabDrillDetail({ previewOnly = false }) {
  const { drillKey } = useParams();
  const navigate = usePreviewNavigate(previewOnly);
  const [drill, setDrill] = useState(null);
  const [section, setSection] = useState(null);
  const [userId, setUserId] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true); setErrorMessage(''); setVideoFailed(false); setFavoriteMessage(''); setIsFavorite(false); setDrill(null); setSection(null);

    async function loadDrill() {
      if (previewOnly) {
        const item = PREVIEW_DRILLS.find((d) => d.drill_key === drillKey);
        if (item) { setDrill(item); setSection({ name: item.section_key.replace(/-/g, ' ') }); }
        else setErrorMessage('This drill could not be found.');
        setLoading(false); return;
      }
      if (!supabase) {
        setErrorMessage('CourtStreak could not connect to Supabase.');
        setLoading(false);
        return;
      }

      const user = await loadAccountUser(supabase);
      if (!mounted) return;
      if (!user) {
        navigate(accountLoginPath(`/lab/drill/${drillKey}`), {replace:true});
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from('drills')
        .select(`
          id,
          drill_key,
          section_id,
          name,
          hand,
          demo_video_url,
          key_points,
          short_description,
          metric_type,
          metric_label,
          default_duration_seconds,
          allowed_durations_seconds,
          ai_tracking_available,
          xp_reward,
          status
        `)
        .eq('drill_key', drillKey)
        .eq('status', 'active')
        .maybeSingle();

      if (!mounted) return;
      if (error || !data) {
        setErrorMessage('This drill is unavailable or could not be found.');
        setLoading(false);
        return;
      }

      setDrill(data);
      const { data: favorite } = await supabase
        .from('drill_favorites')
        .select('drill_key')
        .eq('user_id', user.id)
        .eq('drill_key', data.drill_key)
        .maybeSingle();
      if (mounted) setIsFavorite(Boolean(favorite) || favoriteCache.read(user.id).includes(data.drill_key));
      if (data.section_id) {
        const { data: sectionData } = await supabase
          .from('lab_sections')
          .select('name, section_key')
          .eq('id', data.section_id)
          .maybeSingle();
        if (mounted) setSection(sectionData ?? null);
      }
      if (mounted) setLoading(false);
    }

    loadDrill().catch(() => { if (mounted) { setErrorMessage("The drill could not load. Please try again."); setLoading(false); } });
    return () => { mounted = false; };
  }, [drillKey, previewOnly]);

  const keyPoints = useMemo(() => normalizeKeyPoints(drill?.key_points), [drill]);

  async function toggleFavorite() {
    if (previewOnly) { navigate('/preview/membership'); return; }
    if (!userId || !drill || favoriteBusy) return;
    const previous = isFavorite, next = !previous, keys = favoriteCache.read(userId);
    const nextKeys = next ? [...new Set([...keys, drill.drill_key])] : keys.filter(key => key !== drill.drill_key);
    setFavoriteBusy(true); setFavoriteMessage(''); setIsFavorite(next);
    const cached = favoriteCache.write(userId, nextKeys);
    try {
      const result = previous
        ? await supabase.from('drill_favorites').delete().eq('user_id', userId).eq('drill_key', drill.drill_key)
        : await supabase.from('drill_favorites').upsert({user_id: userId, drill_key: drill.drill_key});
      if (result.error) throw result.error;
    } catch {
      if (!cached) setIsFavorite(previous);
      setFavoriteMessage(cached ? 'Changed on this device. Account sync could not finish.' : 'Favorite could not save. Please try again.');
    } finally { setFavoriteBusy(false); }
  }

  if (loading) {
    return (
      <main className="cs-drill-detail-page">
        <div className="cs-lab-state"><FiRefreshCw /><strong>Loading drill...</strong><span>Preparing your CourtStreak training screen.</span></div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="cs-drill-detail-page">
        <section className="cs-lab-error">
          <strong>Drill unavailable</strong><span>{errorMessage}</span>
          <button type="button" onClick={() => navigate('/lab')}><FiArrowLeft /> Back to The Lab</button>
        </section>
      </main>
    );
  }

  return (
    <main className="cs-drill-detail-page">
      <header className="cs-drill-detail-topbar">
        <Link to={previewOnly ? "/preview/lab" : "/lab"}><FiArrowLeft /> The Lab</Link>
        <span>COURTSTREAK DRILL</span>
      </header>

      <section className="cs-drill-detail-shell">
        <div className="cs-drill-detail-media">
          {getDrillVideo(drill) && !videoFailed ? (
            <video src={getDrillVideo(drill)} controls playsInline preload="metadata" onError={() => setVideoFailed(true)} />
          ) : drill.drill_key === 'right-hand-pound' ? (
            <PoundDemo />
          ) : (
            <div className="cs-drill-detail-placeholder">
              <div className="cs-lab-ball cs-lab-ball-large">
                <i className="cs-lab-ball-seam cs-lab-ball-seam-one" />
                <i className="cs-lab-ball-seam cs-lab-ball-seam-two" />
                <i className="cs-lab-ball-seam cs-lab-ball-seam-three" />
              </div>
              <strong>Written drill guide</strong>
              <span>Read the setup, steps, coaching cues, and counting rule below.</span>
            </div>
          )}
        </div>

        <div className="cs-drill-detail-copy">
          <span className="cs-lab-eyebrow">{section?.name ?? 'BALL HANDLING'}</span>
          <h1>{drill.name}</h1>
          {favoriteMessage && <p role="status">{favoriteMessage}</p>}
          <div className="cs-drill-detail-meta">
            <span>{formatHand(drill.hand)}</span>
            <span><FiClock /> {drill.drill_key === 'right-hand-pound' ? 'Timer · ' : ''}{drill.default_duration_seconds} sec</span>
            <span><FiStar /> {drill.drill_key === 'right-hand-pound' ? 'Timer ' : ''}+{Math.min(10, drill.xp_reward)} XP</span>
            <span>{drill.drill_key === 'right-hand-pound' ? 'AI or timer' : 'Guided manual'}</span>
            <button type="button" className={`cs-drill-favorite ${isFavorite ? 'is-favorite' : ''}`} onClick={toggleFavorite} disabled={favoriteBusy} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}><FiHeart /><span>{isFavorite ? 'Saved' : 'Save'}</span></button>
          </div>

          {drill.drill_key !== 'right-hand-pound' && <div className="cs-mobile-drill-quick-actions">
            <button className="cs-drill-start-button" type="button" onClick={() => navigate(`/lab/drill/${drill.drill_key}/session`)}><FiPlay /> Start This Drill</button>
            <button className="cs-drill-challenge-button" type="button" onClick={() => navigate('/training-circles', { state: { challengeDraft: { sourceType: 'drill', sourceKey: drill.drill_key, sourceName: drill.name, sourcePayload: { durationSeconds: drill.default_duration_seconds }, challengeType: 'score' } } })}><FiUsers /> Challenge a Circle</button>
          </div>}
          {drill.drill_key === 'right-hand-pound' && (
            <PoundTrainingEntry previewOnly={previewOnly} onCamera={previewOnly ? () => navigate('/preview/ai-training') : () => navigate(CURRENT_POUND_SESSION_PATH)} onManual={() => navigate('/lab/drill/right-hand-pound/session')} />
          )}
          {!previewOnly && drill.drill_key === 'right-hand-pound' && <details className="cs-iphone-camera-details"><summary>Check front-camera framing <span>Optional setup</span></summary><FrontCameraCheck /></details>}
          <DrillGuide drill={drill} showVideo={false} />

          <div className="cs-drill-primary-actions">
            <button className="cs-drill-start-button" type="button" onClick={() => navigate(`/lab/drill/${drill.drill_key}/session`)}><FiPlay /> Start This Drill</button>
            <button
              className="cs-drill-challenge-button"
              type="button"
              onClick={() => navigate('/training-circles', {
                state: {
                  challengeDraft: {
                    sourceType: 'drill',
                    sourceKey: drill.drill_key,
                    sourceName: drill.name,
                    sourcePayload: { durationSeconds: drill.default_duration_seconds },
                    challengeType: 'score',
                  },
                },
              })}
            >
              <FiUsers /> Challenge a Circle
            </button>
          </div>
          {import.meta.env.DEV && !previewOnly && drill.drill_key === 'right-hand-pound' && ['localhost', '127.0.0.1'].includes(window.location.hostname) && <div className="cs-drill-primary-actions"><button className="cs-drill-start-button" type="button" onClick={() => navigate('/lab/drill/right-hand-pound/session?mode=ai-test')}><FiPlay /> Try AI camera test · 20 sec</button></div>}
          <p className="cs-drill-start-note">Get in position. Your training countdown begins after you start.</p>
        </div>
      </section>
    </main>
  );
}
