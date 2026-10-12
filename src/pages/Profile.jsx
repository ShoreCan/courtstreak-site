import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  CircleDot,
  ChevronRight,
  Flame,
  LayoutGrid,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import usePreviewNavigate from '../lib/usePreviewNavigate.js';
import { PREVIEW_STATS, previewSessions, PREVIEW_EARNED_ACHIEVEMENTS } from '../lib/previewData.js';
import { normalizeStats } from '../lib/trainingAccess.js';
import { supabase } from '../lib/supabaseClient.js';

export default function Profile({ previewOnly = false }) {
  const navigate = usePreviewNavigate(previewOnly);
  const [profile, setProfile] = useState(null);
  const [achievementCount, setAchievementCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [earnedAchievements, setEarnedAchievements] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editorError, setEditorError] = useState('');
  const [draft, setDraft] = useState(null);
  const [profileView, setProfileView] = useState('highlights');

  function handleManageMembership() { navigate('/membership'); }

  useEffect(() => {
    if (previewOnly) {
      setProfile({...PREVIEW_STATS,avatar_key:'basketball',position:'Point Guard',dominant_hand:'Right',team_name:'Sample Team',training_goal:'Build a consistent training routine'});
      setTrainingSessions(previewSessions()); setEarnedAchievements(PREVIEW_EARNED_ACHIEVEMENTS);
      setAchievementCount(PREVIEW_EARNED_ACHIEVEMENTS.length); setLoading(false); return undefined;
    }
    let isMounted = true;

    async function loadProfile() {
      if (!supabase) {
        setErrorMessage('CourtStreak could not connect to Supabase.');
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate('/login');
        return;
      }

      const { error: streakRefreshError } = await supabase.rpc(
        'refresh_training_streak'
      );

      if (streakRefreshError) {
        console.error('Could not refresh training streak:', streakRefreshError);
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'first_name, last_name, training_streak, best_training_streak, xp, level, workouts_completed, weekly_workouts, weekly_goal, avatar_key, position, dominant_hand, team_name, training_goal'
        )
        .eq('id', user.id)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error(error);
        setErrorMessage('CourtStreak could not load your profile.');
        setLoading(false);
        return;
      }

      const statsResult = await supabase.rpc('get_my_courtstreak_stats');
      if (statsResult.error) {
        setErrorMessage('CourtStreak could not load your training totals. Please try again.');
        setLoading(false);
        return;
      }
      const totals = normalizeStats(statsResult.data);
      setProfile({ ...data, ...(totals || {}) });

      const { data: sessionData, error: sessionError } = await supabase
        .from('training_sessions')
        .select('id, drill_name, category, score, reps, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (sessionError) {
        console.error('Could not load training results:', sessionError);
      } else {
        setTrainingSessions(sessionData ?? []);
      }

      const { count, error: achievementError } = await supabase
        .from('player_achievements')
        .select('achievement_id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (achievementError) {
        console.error('Could not load achievement count:', achievementError);
      } else {
        setAchievementCount(count ?? 0);
      }

      const { data: earnedRows, error: earnedError } = await supabase
        .from('player_achievements')
        .select('achievement_id, unlocked_at, featured')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });

      if (earnedError) {
        console.error('Could not load earned achievements:', earnedError);
      } else if ((earnedRows ?? []).length > 0) {
        const ids = earnedRows.map((row) => row.achievement_id);
        const { data: awardRows, error: awardError } = await supabase
          .from('achievements')
          .select('id, name, description, category, icon, tier, is_trophy')
          .in('id', ids);

        if (awardError) {
          console.error('Could not load achievement details:', awardError);
        } else {
          const awardMap = new Map((awardRows ?? []).map((award) => [award.id, award]));
          setEarnedAchievements(
            earnedRows
              .map((row) => ({ ...row, ...awardMap.get(row.achievement_id) }))
              .filter((row) => row.name)
          );
        }
      }

      setLoading(false);
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [navigate, previewOnly]);

  if (loading) {
    return (
      <main className="cs-profile-page cs-profile-loading">
        <p>Loading your CourtStreak profile...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="cs-profile-page cs-profile-loading">
        <p>{errorMessage}</p>
        <button type="button" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </button>
      </main>
    );
  }

  const firstName = profile?.first_name || 'Player';
  const lastName = profile?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  const initials =
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'CS';

  const totalXp = profile?.xp ?? 0;
  const playerLevel = profile?.level ?? 1;
  const xpPerLevel = 100;
  const xpIntoLevel = totalXp % xpPerLevel;
  const xpProgress = Math.min(100, Math.max(0, Number(profile?.level_progress_percent ?? xpIntoLevel)));
  const xpToNextLevel = profile?.xp_needed_for_next_level ?? (xpIntoLevel === 0 && totalXp > 0 ? xpPerLevel : xpPerLevel - xpIntoLevel);

  const avatarKey = profile?.avatar_key || 'initials';
  const latestSession = trainingSessions[0] || null;
  const sessionMetric = (session) => Number(session?.reps ?? session?.score ?? 0);
  const bestSession = trainingSessions.reduce(
    (best, session) => sessionMetric(session) > sessionMetric(best) ? session : best,
    null
  );
  const featuredAchievements = [
    ...earnedAchievements.filter((award) => award.featured),
    ...earnedAchievements.filter((award) => !award.featured),
  ].slice(0, 3);

  function AvatarGraphic({ avatar = avatarKey, size = 34 }) {
    if (avatar === 'basketball') return <CircleDot size={size} />;
    if (avatar === 'flame') return <Flame size={size} />;
    if (avatar === 'shield') return <ShieldCheck size={size} />;
    if (avatar === 'bolt') return <Zap size={size} />;
    if (avatar === 'court') return <LayoutGrid size={size} />;
    return <span>{initials}</span>;
  }

  function openEditor() {
    if (previewOnly) { navigate("/preview/membership"); return; }
    setDraft({
      avatar_key: avatarKey,
      position: profile?.position || 'Not Set',
      dominant_hand: profile?.dominant_hand || 'Not Set',
      team_name: profile?.team_name || '',
      training_goal: profile?.training_goal || 'Train more consistently',
      featuredIds: featuredAchievements.filter((award) => award.featured).map((award) => award.achievement_id),
    });
    setEditorError('');
    setShowEditor(true);
  }

  function toggleFeatured(id) {
    setDraft((current) => {
      const selected = current.featuredIds.includes(id);
      if (!selected && current.featuredIds.length >= 3) {
        setEditorError('Choose up to three featured trophies.');
        return current;
      }
      setEditorError('');
      return {
        ...current,
        featuredIds: selected
          ? current.featuredIds.filter((item) => item !== id)
          : [...current.featuredIds, id],
      };
    });
  }

  async function savePlayerCard() {
    if (previewOnly) { navigate("/preview/membership"); return; }
    if (!draft || savingProfile) return;
    setSavingProfile(true);
    setEditorError('');

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Please sign in again.');

      const updates = {
        avatar_key: draft.avatar_key,
        position: draft.position,
        dominant_hand: draft.dominant_hand,
        team_name: draft.team_name.trim() || null,
        training_goal: draft.training_goal,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (profileError) throw profileError;

      for (const achievement of earnedAchievements) {
        const shouldFeature = draft.featuredIds.includes(achievement.achievement_id);
        if (Boolean(achievement.featured) !== shouldFeature) {
          const { error } = await supabase.rpc('set_featured_achievement', {
            p_achievement_id: achievement.achievement_id,
            p_featured: shouldFeature,
          });
          if (error) throw error;
        }
      }

      setProfile((current) => ({ ...current, ...updates }));
      setEarnedAchievements((current) => current.map((award) => ({
        ...award,
        featured: draft.featuredIds.includes(award.achievement_id),
      })));
      setShowEditor(false);
    } catch (error) {
      console.error('Could not save Player Card:', error);
      setEditorError(error?.message || 'Could not save your Player Card.');
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <main className="cs-profile-page cs-player-profile">
      <header className="cs-profile-topbar">
        <button
          type="button"
          className="cs-profile-back"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={19} />
          Dashboard
        </button>

        <Link to="/" className="cs-profile-brand">CourtStreak</Link>
        <span className="cs-profile-topbar-spacer" />
      </header>

      <section className="cs-player-shell">
        <section className="cs-player-card">
          <div className="cs-player-card-glow" />

          <div className="cs-player-card-main">
            <div className={`cs-player-avatar avatar-${avatarKey}`} aria-label={`${fullName} avatar`}>
              <AvatarGraphic />
              <small><ShieldCheck size={15} /></small>
            </div>

            <div className="cs-player-identity">
              <span>MY PLAYER CARD</span>
              <h1>{fullName}</h1>
              <p>
                {profile?.position && profile.position !== 'Not Set' ? profile.position : 'Basketball Player'}
                <i />
                {profile?.dominant_hand && profile.dominant_hand !== 'Not Set' ? `${profile.dominant_hand} Hand` : 'CourtStreak Player'}
              </p>
              {profile?.team_name && <small className="cs-player-team">{profile.team_name}</small>}
              <div className="cs-player-card-goal">
                <Target size={15} />
                <span><small>CURRENT GOAL</small><strong>{profile?.training_goal || 'Train more consistently'}</strong></span>
              </div>
            </div>

            <button
              type="button"
              className="cs-player-edit"
              onClick={openEditor}
            >
              <Settings size={17} />
              Edit Profile
            </button>
          </div>

          <div className="cs-player-level">
            <div>
              <span>LEVEL {playerLevel}</span>
              <strong><Zap size={17} /> {totalXp.toLocaleString()} XP</strong>
            </div>
            <div className="cs-player-level-track">
              <span style={{ width: `${xpProgress}%` }} />
            </div>
            <small>{xpToNextLevel} XP until Level {playerLevel + 1}</small>
          </div>
        </section>

        <section className="cs-profile-purpose-bar">
          <div>
            <ShieldCheck />
            <span><small>YOUR COURTSTREAK IDENTITY</small><strong>This is how teammates see you in Circles, challenges, and shared results.</strong></span>
          </div>
          <p><i /> Player card <i /> Featured work <i /> Personal goals</p>
        </section>

        <section className="cs-profile-workspace">
          <header className="cs-profile-workspace-heading">
            <div><span>PLAYER PROFILE</span><h2>Make your work recognizable.</h2></div>
            <nav aria-label="Profile sections">
              <button type="button" className={profileView === 'highlights' ? 'active' : ''} onClick={() => setProfileView('highlights')}>Identity</button>
              <button type="button" className={profileView === 'trophies' ? 'active' : ''} onClick={() => setProfileView('trophies')}>Showcase</button>
              <button type="button" className={profileView === 'shortcuts' ? 'active' : ''} onClick={() => setProfileView('shortcuts')}>Account</button>
            </nav>
          </header>

          <div className="cs-profile-workspace-content" aria-live="polite">
            {profileView === 'highlights' ? (
              <section className="cs-profile-identity-panel cs-profile-tab-panel">
                <article className="cs-profile-scout-card">
                  <div className={`cs-profile-scout-avatar avatar-${avatarKey}`}><AvatarGraphic size={42} /></div>
                  <div>
                    <span>PLAYER SNAPSHOT</span>
                    <h3>{fullName}</h3>
                    <p>{profile?.position && profile.position !== 'Not Set' ? profile.position : 'Basketball Player'} · {profile?.dominant_hand && profile.dominant_hand !== 'Not Set' ? `${profile.dominant_hand}-hand dominant` : 'Hand preference not set'}</p>
                    <div className="cs-profile-tags">
                      <small>{profile?.team_name || 'Independent player'}</small>
                      <small>Level {playerLevel}</small>
                    </div>
                  </div>
                </article>

                <div className="cs-profile-identity-details">
                  <article>
                    <Target />
                    <span><small>CURRENT FOCUS</small><strong>{profile?.training_goal || 'Train more consistently'}</strong><p>The goal guiding your recommendations and weekly work.</p></span>
                  </article>
                  <article>
                    <Award />
                    <span><small>SIGNATURE RESULT</small><strong>{bestSession ? bestSession.drill_name : 'Build your first signature result'}</strong><p>{bestSession ? `${sessionMetric(bestSession)} reps · your strongest recorded performance` : 'Complete a tracked drill to add it to your identity.'}</p></span>
                  </article>
                  <article>
                    <Zap />
                    <span><small>RECENT WORK</small><strong>{latestSession ? latestSession.drill_name : 'No result recorded yet'}</strong><p>{latestSession ? `${sessionMetric(latestSession)} reps in your latest recorded attempt` : 'Your latest completed drill will appear here.'}</p></span>
                  </article>
                </div>
              </section>
            ) : null}

            {profileView === 'trophies' ? (
              <section className="cs-profile-tab-panel cs-profile-trophy-panel">
                <div className="cs-profile-achievement-rail">
                  {[0, 1, 2].map((slot) => {
                    const achievement = featuredAchievements[slot];
                    const earned = Boolean(achievement);
                    const Icon = slot === 0 ? Trophy : slot === 1 ? Flame : Award;
                    return (
                      <article className={earned ? `earned ${achievement?.tier || 'bronze'}` : 'locked'} key={achievement?.achievement_id || `featured-${slot}`}>
                        <div className="cs-profile-achievement-seal"><Icon /></div>
                        <div className="cs-profile-achievement-copy">
                          <span>{earned ? (achievement.category || 'COURTSTREAK') : 'FEATURED SLOT'}</span>
                          <strong>{earned ? achievement.name : 'Choose an achievement'}</strong>
                          <small>{earned ? `Earned • ${achievement?.tier || 'bronze'}` : 'Add one from Edit Profile'}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <button type="button" className="cs-profile-view-all" onClick={() => navigate('/trophies')}>Open full trophy case · {achievementCount} earned <ChevronRight size={17} /></button>
              </section>
            ) : null}

            {profileView === 'shortcuts' ? (
              <section className="cs-player-actions cs-profile-tab-panel">
                <button type="button" onClick={() => navigate('/training-circles')}>
                  <Sparkles /><span><small>TRAIN TOGETHER</small><strong>Training Circles</strong></span><ChevronRight />
                </button>
                <button type="button" onClick={() => navigate('/settings')}>
                  <Settings /><span><small>ACCOUNT</small><strong>Settings</strong></span><ChevronRight />
                </button>
                <button type="button" onClick={handleManageMembership} disabled={membershipLoading}>
                  <ShieldCheck /><span><small>COURTSTREAK ACCESS</small><strong>{membershipLoading ? 'Opening…' : 'Manage Membership'}</strong></span><ChevronRight />
                </button>
              </section>
            ) : null}
          </div>
        </section>
      </section>

      {showEditor && draft && (
        <div className="cs-player-editor-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowEditor(false)}>
          <section className="cs-player-editor" role="dialog" aria-modal="true" aria-labelledby="player-editor-title">
            <div className="cs-player-editor-heading">
              <div><span>PLAYER CARD</span><h2 id="player-editor-title">Make it yours.</h2><p>Choose how your basketball identity appears in CourtStreak.</p></div>
              <button type="button" aria-label="Close" onClick={() => setShowEditor(false)}><X /></button>
            </div>

            <label className="cs-player-field-label">CHOOSE YOUR EMBLEM</label>
            <div className="cs-avatar-picker">
              {['initials', 'basketball', 'flame', 'shield', 'bolt', 'court'].map((key) => (
                <button type="button" className={draft.avatar_key === key ? 'active' : ''} onClick={() => setDraft({ ...draft, avatar_key: key })} key={key}>
                  <AvatarGraphic avatar={key} size={27} /><small>{key}</small>
                </button>
              ))}
            </div>

            <div className="cs-player-form-grid">
              <label>Position<select value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })}>{['Not Set','Point Guard','Shooting Guard','Small Forward','Power Forward','Center','Combo Guard','Wing'].map((value) => <option key={value}>{value}</option>)}</select></label>
              <label>Dominant hand<select value={draft.dominant_hand} onChange={(e) => setDraft({ ...draft, dominant_hand: e.target.value })}>{['Not Set','Right','Left','Both'].map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="wide">Team name <small>Optional</small><input maxLength="40" value={draft.team_name} onChange={(e) => setDraft({ ...draft, team_name: e.target.value })} placeholder="Your school, AAU team, or club" /></label>
              <label className="wide">Training goal<select value={draft.training_goal} onChange={(e) => setDraft({ ...draft, training_goal: e.target.value })}>{['Train more consistently','Improve my weak hand','Build better ball control','Get game-ready','Improve speed and conditioning','Complete my weekly goal'].map((value) => <option key={value}>{value}</option>)}</select></label>
            </div>

            <div className="cs-feature-picker-heading"><span>FEATURED TROPHIES</span><small>{draft.featuredIds.length}/3 selected</small></div>
            <div className="cs-feature-picker">
              {earnedAchievements.length ? earnedAchievements.map((award) => (
                <button type="button" className={draft.featuredIds.includes(award.achievement_id) ? 'active' : ''} onClick={() => toggleFeatured(award.achievement_id)} key={award.achievement_id}><Trophy /><span><strong>{award.name}</strong><small>{award.category}</small></span></button>
              )) : <p>Earn your first achievement to feature it here.</p>}
            </div>

            {editorError && <p className="cs-player-editor-error">{editorError}</p>}
            <button type="button" className="cs-player-save" disabled={savingProfile} onClick={savePlayerCard}><Save />{savingProfile ? 'Saving...' : 'Save Player Card'}</button>
          </section>
        </div>
      )}
    </main>
  );
}
