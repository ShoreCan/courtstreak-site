import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiArrowRight,
  FiAward,
  FiBarChart2,
  FiGrid,
  FiHome,
  FiLogOut,
  FiPlay,
  FiSettings,
  FiTarget,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import { FaFire } from 'react-icons/fa';
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [verifiedWeeklyWorkouts, setVerifiedWeeklyWorkouts] = useState(0);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [trainingCircles, setTrainingCircles] = useState([]);
  const [circlesLoading, setCirclesLoading] = useState(true);
  const [todayXp, setTodayXp] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
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

      const [profileResult, todayXpResult, weeklyResult, circlesResult] =
        await Promise.all([
          supabase
            .from('profiles')
            .select(
              'first_name, last_name, training_streak, best_training_streak, xp, level, workouts_completed, weekly_workouts, weekly_goal'
            )
            .eq('id', user.id)
            .single(),
          supabase.rpc('get_today_xp'),
          supabase
            .from('workout_completions')
            .select('id, completed_at')
            .eq('user_id', user.id)
            .gte(
              'completed_at',
              (() => {
                const now = new Date();
                const start = new Date(now);
                const day = start.getDay();
                const daysSinceMonday = (day + 6) % 7;
                start.setDate(start.getDate() - daysSinceMonday);
                start.setHours(0, 0, 0, 0);
                return start.toISOString();
              })()
            ),
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

      if (weeklyResult.error) {
        console.error(
          'Could not load verified weekly workouts:',
          weeklyResult.error
        );
        setVerifiedWeeklyWorkouts(0);
      } else {
        setVerifiedWeeklyWorkouts(weeklyResult.data?.length ?? 0);
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

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

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
  const totalXp = profile?.xp ?? 0;
  const playerLevel = profile?.level ?? 1;
  const weeklyWorkouts = verifiedWeeklyWorkouts;
  const weeklyGoal = Math.max(profile?.weekly_goal ?? 4, 1);
  const weeklyProgress = Math.min(
    (weeklyWorkouts / weeklyGoal) * 100,
    100
  );
  const workoutsRemaining = Math.max(weeklyGoal - weeklyWorkouts, 0);
  const xpIntoLevel = totalXp % 100;
  const xpToNextLevel = xpIntoLevel === 0 ? 100 : 100 - xpIntoLevel;

  const navigationItems = [
    { label: 'Dashboard', icon: <FiHome />, active: true },
    {
      label: 'Start Training',
      icon: <FiPlay />,
      action: () => navigate('/workout'),
    },
    {
      label: 'Progress',
      icon: <FiBarChart2 />,
      action: () => navigate('/progress'),
    },
    {
      label: 'Achievements',
      icon: <FiAward />,
      action: () => navigate('/trophies'),
    },
    {
      label: 'Training Circles',
      icon: <FiUsers />,
      action: () => navigate('/training-circles'),
    },
    {
      label: 'Profile',
      icon: <FiUser />,
      action: () => navigate('/profile'),
    },
    {
      label: 'Membership',
      icon: <FiGrid />,
      action: () => navigate('/membership'),
    },
    {
      label: 'Settings',
      icon: <FiSettings />,
      action: () => navigate('/settings'),
    },
  ];

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <main className="cs-dash-v3">
      <aside className="cs-dash-v3-sidebar">
        <Link to="/" className="cs-dash-v3-logo">
          <span>CS</span>
          <strong>CourtStreak</strong>
        </Link>

        <nav aria-label="Player navigation">
          {navigationItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={item.active ? 'active' : ''}
              onClick={item.action}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="cs-dash-v3-logout"
          onClick={handleLogout}
        >
          <FiLogOut />
          <span>Log Out</span>
        </button>
      </aside>

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
            <span><FaFire /> {profile?.training_streak ?? 0} days</span>
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

              <button type="button" onClick={() => navigate('/workout')}>
                <span><FiPlay /> Start Workout</span>
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
            <article className="cs-dash-v3-player-card">
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
                  <strong>{profile?.workouts_completed ?? 0}</strong>
                  Workouts
                </span>
                <span>
                  <strong>{profile?.best_training_streak ?? 0}</strong>
                  Best streak
                </span>
              </div>
            </article>

            <article className="cs-dash-v3-circle-card">
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
            </article>

            <article className="cs-dash-v3-achievement">
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
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
