import usePreviewNavigate from '../lib/usePreviewNavigate.js';
import { PREVIEW_PROFILE, PREVIEW_STATS } from '../lib/previewData.js';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiArrowRight,
  FiAward,
  FiPlay,
  FiTarget,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import { FaFire } from 'react-icons/fa';
import { normalizeStats } from '../lib/trainingAccess.js';
import { supabase } from '../lib/supabaseClient.js';

const achievementDefinitions = [
  {
    key: 'quick-start',
    name: 'Quick Start',
    description: 'Complete your first workout',
    icon: <FiZap />,
    current: (profile) => profile?.workouts_completed ?? 0,
    target: 1,
  },
  {
    key: 'seven-day-streak',
    name: '7-Day Streak',
    description: 'Train seven days in a row',
    icon: <FaFire />,
    current: (profile) => profile?.best_training_streak ?? 0,
    target: 7,
  },
  {
    key: 'ball-handler',
    name: 'Ball Handler',
    description: 'Complete 10 ball-handling workouts',
    icon: <FiActivity />,
    current: (profile) => profile?.workouts_completed ?? 0,
    target: 10,
  },
  {
    key: 'consistency-king',
    name: 'Consistency King',
    description: 'Complete 20 workouts total',
    icon: <FiAward />,
    current: (profile) => profile?.workouts_completed ?? 0,
    target: 20,
  },
];

export default function Dashboard({ previewOnly = false }) {
  const navigate = usePreviewNavigate(previewOnly);
  const [verifiedStats, setVerifiedStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [trainingCircles, setTrainingCircles] = useState([]);
  const [circlesLoading, setCirclesLoading] = useState(true);
  const [todayXp, setTodayXp] = useState(0);
  const [spotlightTab, setSpotlightTab] = useState('progress');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (previewOnly) {
        setProfile(PREVIEW_PROFILE); setVerifiedStats(PREVIEW_STATS); setTodayXp(30);
        setTrainingCircles([{ id: 'sample', name: 'Sample Training Crew', weekly_workout_goal: 20, circle_type: 'friends', privacy: 'private' }]);
        setProfileLoading(false); setCirclesLoading(false); return;
      }
      if (!supabase) {
        setProfileError('CourtStreak could not connect to Supabase.');
        setCirclesLoading(false);
        setProfileLoading(false);
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

      const { data: hasMembership, error: membershipError } =
        await supabase.rpc('has_active_courtstreak_membership');

      if (membershipError) {
        console.error('Could not verify membership:', membershipError);
        if (isMounted) {
          setProfileError('CourtStreak could not verify your membership.');
          setProfileLoading(false);
        }
        return;
      }

      if (!hasMembership) {
        navigate('/pricing?checkout=membership', { replace: true });
        return;
      }

      const { error: streakError } = await supabase.rpc(
        'refresh_training_streak'
      );

      if (streakError) {
        console.error('Could not refresh training streak:', streakError);
      }

      const [profileResult, todayXpResult, statsResult, circlesResult] =
        await Promise.all([
          supabase
            .from('profiles')
            .select(
              'first_name, last_name, training_streak, best_training_streak, xp, level, workouts_completed, weekly_workouts, weekly_goal'
            )
            .eq('id', user.id)
            .single(),
          supabase.rpc('get_today_xp'),
          supabase.rpc('get_my_courtstreak_stats'),
          supabase
            .from('training_circle_members')
            .select(`
              role,
              joined_at,
              training_circles (
                id,
                name,
                circle_type,
                owner_id,
                is_private,
                weekly_workout_goal
              )
            `)
            .eq('user_id', user.id)
            .order('joined_at', { ascending: false }),
        ]);

      if (!isMounted) return;

      if (profileResult.error) {
        console.error(profileResult.error);
        setProfileError('CourtStreak could not load your profile.');
      } else {
        setProfile(profileResult.data);
      }

      if (todayXpResult.error) {
        console.error('Could not load today XP:', todayXpResult.error);
      } else {
        setTodayXp(todayXpResult.data?.[0]?.total_today_xp ?? 0);
      }

      if (statsResult.error || !normalizeStats(statsResult.data)) {
        console.error(
          'Could not load verified CourtStreak stats:',
          statsResult.error
        );
        setProfileError('CourtStreak could not load your verified stats.');
      } else {
        setVerifiedStats(normalizeStats(statsResult.data));
      }

      if (circlesResult.error) {
        console.error(
          'Could not load dashboard Training Circles:',
          circlesResult.error
        );
      } else {
        const circles = (circlesResult.data ?? [])
          .map((membership) => ({
            ...membership.training_circles,
            membershipRole: membership.role,
          }))
          .filter((circle) => circle?.id);

        setTrainingCircles(circles);
      }

      setCirclesLoading(false);
      setProfileLoading(false);
    }

    loadDashboard().catch(() => { if (isMounted) { setProfileError("Your dashboard could not load. Please try again."); setProfileLoading(false); setCirclesLoading(false); } });

    return () => {
      isMounted = false;
    };
  }, [navigate, previewOnly]);

  const achievements = useMemo(
    () =>
      achievementDefinitions.map((achievement) => {
        const currentValue = achievement.current(profile);
        const completedValue = Math.min(currentValue, achievement.target);

        return {
          ...achievement,
          currentValue,
          unlocked: currentValue >= achievement.target,
          progress: Math.round(
            (completedValue / achievement.target) * 100
          ),
        };
      }),
    [profile]
  );

  const nextAchievement =
    achievements.find((achievement) => !achievement.unlocked) ||
    achievements[achievements.length - 1];
  const featuredCircle = trainingCircles[0] || null;
  if (profileLoading) return <main className="cs-welcome-page"><section className="cs-welcome-card"><h1>Loading your dashboard…</h1><p>Preparing your training and progress.</p></section></main>;
  if (profileError) return <main className="cs-welcome-page"><section className="cs-welcome-card"><h1>Your dashboard could not load.</h1><p>{profileError}</p><button onClick={() => window.location.reload()}>Try again</button></section></main>;
  const totalXp = verifiedStats?.xp ?? profile?.xp ?? 0;
  const playerLevel = verifiedStats?.level ?? profile?.level ?? 1;
  const weeklyWorkouts = verifiedStats?.weekly_workouts ?? 0;
  const weeklyGoal = Math.max(verifiedStats?.weekly_goal ?? 5, 1);
  const weeklyProgress = Math.min(
    (weeklyWorkouts / weeklyGoal) * 100,
    100
  );
  const workoutsRemaining = Math.max(weeklyGoal - weeklyWorkouts, 0);
  const xpIntoLevel = Number(verifiedStats?.level_progress_percent ?? 0);
  const xpToNextLevel = verifiedStats?.xp_needed_for_next_level ?? 0;

  return (
    <main className="cs-dash-v3">
      <section className="cs-dash-v3-main">
        <header className="cs-dash-v3-header">
          <div>
            <span className="cs-dash-v3-label">PLAYER DASHBOARD</span>
            <h1>
              {profileLoading
                ? 'Loading your dashboard…'
                : `Ready to work, ${profile?.first_name || 'Player'}?`}
            </h1>
          </div>

          <div className="cs-dash-v3-header-stats">
            <span><FaFire /> {verifiedStats?.training_streak ?? profile?.training_streak ?? 0} days</span>
            <span><FiZap /> Level {playerLevel}</span>
          </div>
        </header>

        {profileError ? (
          <div className="cs-dash-v3-error">{profileError}</div>
        ) : null}

        <section className="cs-dash-v3-layout">
          <div className="cs-dash-v3-primary">
            <article className="cs-dash-v3-training">
              <div className="cs-dash-v3-training-copy">
                <span className="cs-dash-v3-label">TODAY'S TRAINING</span>
                <h2>Build your handle.</h2>
                <p>
                  Choose a ball-handling workout that matches your level
                  and turn today's reps into progress.
                </p>

                <div className="cs-dash-v3-tags">
                  <span><FiActivity /> Ball Handling</span>
                  <span><FiTarget /> Multiple Levels</span>
                  <span><FiZap /> Earn XP</span>
                </div>
              </div>

              <button type="button" onClick={() => navigate('/train')}>
                <span><FiPlay /> Start Training</span>
                <FiArrowRight />
              </button>
            </article>

            <article className="cs-dash-v3-week">
              <div className="cs-dash-v3-section-head">
                <div>
                  <span className="cs-dash-v3-label">WEEKLY MOMENTUM</span>
                  <h2>Your consistency</h2>
                </div>
                <button type="button" onClick={() => navigate('/progress')}>
                  Full progress <FiArrowRight />
                </button>
              </div>

              <div className="cs-dash-v3-week-content">
                <div className="cs-dash-v3-week-score">
                  <strong>{weeklyWorkouts}</strong>
                  <span>of {weeklyGoal} workouts</span>
                </div>

                <div className="cs-dash-v3-week-progress">
                  <div>
                    <span style={{ width: `${weeklyProgress}%` }} />
                  </div>
                  <p>
                    {workoutsRemaining === 0
                      ? 'Weekly goal complete. Keep the streak alive.'
                      : `${workoutsRemaining} workout${
                          workoutsRemaining === 1 ? '' : 's'
                        } left this week.`}
                  </p>
                </div>

                <div className="cs-dash-v3-today-xp">
                  <span>TODAY</span>
                  <strong>+{todayXp} XP</strong>
                </div>
              </div>
            </article>
          </div>

          <div className="cs-dash-v3-secondary">
            <section className="cs-dash-v3-spotlight" aria-label="Your CourtStreak at a glance">
              <div className="cs-dash-v3-spotlight-heading">
                <div>
                  <span className="cs-dash-v3-label">AT A GLANCE</span>
                  <h2>Your CourtStreak</h2>
                </div>
                <nav aria-label="Dashboard summary">
                  <button type="button" className={spotlightTab === 'progress' ? 'active' : ''} onClick={() => setSpotlightTab('progress')}>
                    Progress
                  </button>
                  <button type="button" className={spotlightTab === 'circle' ? 'active' : ''} onClick={() => setSpotlightTab('circle')}>
                    Circle
                  </button>
                  <button type="button" className={spotlightTab === 'milestone' ? 'active' : ''} onClick={() => setSpotlightTab('milestone')}>
                    Next win
                  </button>
                </nav>
              </div>

              <div className="cs-dash-v3-spotlight-content" aria-live="polite">
            {spotlightTab === 'progress' ? <article className="cs-dash-v3-player-card">
              <div className="cs-dash-v3-player-top">
                <div className="cs-dash-v3-level-ring">
                  <span>LEVEL</span>
                  <strong>{playerLevel}</strong>
                </div>
                <div>
                  <span className="cs-dash-v3-label">PLAYER PROGRESS</span>
                  <strong>{totalXp.toLocaleString()} XP</strong>
                  <small>{xpToNextLevel} XP to Level {playerLevel + 1}</small>
                </div>
              </div>

              <div className="cs-dash-v3-xp-track">
                <span style={{ width: `${xpIntoLevel}%` }} />
              </div>

              <div className="cs-dash-v3-player-meta">
                <span>
                  <strong>{verifiedStats?.workouts_completed ?? 0}</strong>
                  Workouts
                </span>
                <span>
                  <strong>{verifiedStats?.best_training_streak ?? profile?.best_training_streak ?? 0}</strong>
                  Best streak
                </span>
              </div>
            </article> : null}

            {spotlightTab === 'circle' ? <article className="cs-dash-v3-circle-card">
              <div className="cs-dash-v3-section-head">
                <div>
                  <span className="cs-dash-v3-label">TRAINING CIRCLE</span>
                  <h2>Your crew</h2>
                </div>
                <FiUsers />
              </div>

              {circlesLoading ? (
                <p className="cs-dash-v3-muted">Loading your Circle…</p>
              ) : featuredCircle ? (
                <button
                  type="button"
                  className="cs-dash-v3-circle-preview"
                  onClick={() =>
                    navigate(`/training-circles/${featuredCircle.id}`)
                  }
                >
                  <span className="cs-dash-v3-circle-icon"><FiUsers /></span>
                  <span>
                    <small>
                      {(featuredCircle.circle_type || 'Circle').toUpperCase()}
                      {featuredCircle.is_private ? ' · PRIVATE' : ' · OPEN'}
                    </small>
                    <strong>{featuredCircle.name}</strong>
                    <em>
                      Weekly goal: {featuredCircle.weekly_workout_goal ?? 20}
                    </em>
                  </span>
                  <FiArrowRight />
                </button>
              ) : (
                <div className="cs-dash-v3-circle-empty">
                  <p>Train with the people who push you.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/training-circles')}
                  >
                    Create or Join <FiArrowRight />
                  </button>
                </div>
              )}

              {trainingCircles.length > 1 ? (
                <button
                  type="button"
                  className="cs-dash-v3-text-button"
                  onClick={() => navigate('/training-circles')}
                >
                  View all {trainingCircles.length} Circles
                </button>
              ) : null}
            </article> : null}

            {spotlightTab === 'milestone' ? <article className="cs-dash-v3-achievement">
              <div className="cs-dash-v3-achievement-icon">
                {nextAchievement.icon}
              </div>
              <div>
                <span className="cs-dash-v3-label">
                  {nextAchievement.unlocked ? 'LATEST WIN' : 'NEXT MILESTONE'}
                </span>
                <strong>{nextAchievement.name}</strong>
                <small>{nextAchievement.description}</small>
                <div className="cs-dash-v3-achievement-track">
                  <span style={{ width: `${nextAchievement.progress}%` }} />
                </div>
              </div>
              <button type="button" onClick={() => navigate('/trophies')}>
                <FiArrowRight />
              </button>
            </article> : null}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
