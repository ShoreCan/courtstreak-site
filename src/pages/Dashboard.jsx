import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiClock,
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
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!supabase) {
        setProfileError('CourtStreak could not connect to Supabase.');
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

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'first_name, last_name, training_streak, best_training_streak, xp, level, workouts_completed, weekly_workouts, weekly_goal'
        )
        .eq('id', user.id)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error(error);
        setProfileError('CourtStreak could not load your profile.');
      } else {
        setProfile(data);
      }

      setProfileLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const achievements = useMemo(() => {
    return achievementDefinitions.map((achievement) => {
      const currentValue = achievement.current(profile);
      const clampedValue = Math.min(currentValue, achievement.target);

      return {
        ...achievement,
        currentValue,
        progress: Math.round((clampedValue / achievement.target) * 100),
        unlocked: currentValue >= achievement.target,
      };
    });
  }, [profile]);

  const badgesEarned = achievements.filter((achievement) => achievement.unlocked).length;
  const workoutsCompleted = profile?.workouts_completed ?? 0;
  const weeklyWorkouts = profile?.weekly_workouts ?? 0;
  const weeklyGoal = Math.max(profile?.weekly_goal ?? 4, 1);
  const weeklyProgress = Math.min((weeklyWorkouts / weeklyGoal) * 100, 100);
  const workoutsRemaining = Math.max(weeklyGoal - weeklyWorkouts, 0);
  const trainingCirclesCount = 0;

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    navigate('/login');
  }

  function handleComingSoon(featureName) {
    window.alert(`${featureName} is coming soon to CourtStreak.`);
  }

  const navigationItems = [
    { label: 'Dashboard', icon: <FiHome />, active: true, action: () => {} },
    { label: 'Workouts', icon: <FiPlay />, action: () => navigate('/workout') },
    { label: 'Drills', icon: <FiGrid />, action: () => handleComingSoon('Drills') },
    { label: 'Challenges', icon: <FiTarget />, action: () => handleComingSoon('Challenges') },
    { label: 'Progress', icon: <FiBarChart2 />, action: () => handleComingSoon('Progress') },
    { label: 'Achievements', icon: <FiAward />, action: () => handleComingSoon('Achievements') },
    { label: 'Training Circles', icon: <FiUsers />, action: () => handleComingSoon('Training Circles') },
    { label: 'Profile', icon: <FiUser />, action: () => handleComingSoon('Profile') },
    { label: 'Settings', icon: <FiSettings />, action: () => handleComingSoon('Settings') },
  ];

  return (
    <main className="cs-pro-dashboard-page">
      <aside className="cs-pro-sidebar">
        <Link to="/" className="cs-pro-sidebar-logo">
          <span className="cs-pro-logo-ball">◉</span>
          <span>
            COURT<strong>STREAK</strong>
          </span>
        </Link>

        <nav className="cs-pro-sidebar-nav" aria-label="Dashboard navigation">
          {navigationItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={item.active ? 'active' : ''}
              onClick={item.action}
            >
              {item.icon}
              <span>{item.label}</span>
              {!item.active && item.label !== 'Workouts' ? <small>Soon</small> : null}
            </button>
          ))}
        </nav>

        <div className="cs-pro-sidebar-motivation">
          <strong>
            <FaFire /> Build your streak
          </strong>
          <p>Consistency today. Confidence tomorrow.</p>
        </div>

        <button type="button" className="cs-pro-sidebar-logout" onClick={handleLogout}>
          <FiLogOut />
          Log Out
        </button>
      </aside>

      <section className="cs-pro-dashboard-main">
        <header className="cs-pro-dashboard-topbar">
          <div>
            <p className="cs-card-label">PLAYER DASHBOARD</p>
            <h1>
              {profileLoading
                ? 'Loading your dashboard...'
                : `Welcome back, ${profile?.first_name || 'Player'}.`}
            </h1>
            <p>Build your handle one focused session at a time.</p>
          </div>

          <div className="cs-pro-topbar-actions">
            <span>
              <FiClock /> Today&apos;s Training
            </span>
            <button type="button" onClick={() => navigate('/workout')}>
              <FiPlay /> Start Workout
            </button>
          </div>
        </header>

        {profileError ? <div className="cs-pro-dashboard-error">{profileError}</div> : null}

        <section className="cs-pro-highlight-grid">
          <article className="cs-pro-streak-card">
            <div>
              <span className="cs-card-label">CURRENT STREAK</span>
              <div className="cs-pro-streak-value">
                <FaFire />
                <strong>{profile?.training_streak ?? 0}</strong>
              </div>
              <p>days in a row</p>
            </div>
            <div>
              <span>Personal best</span>
              <strong>{profile?.best_training_streak ?? 0} days</strong>
            </div>
          </article>

          <article className="cs-pro-workout-card">
            <div>
              <span className="cs-card-label">TODAY&apos;S WORKOUT</span>
              <h2>Guard Skill Builder</h2>
              <p>Ball handling, control, rhythm, and footwork.</p>
            </div>
            <div className="cs-pro-workout-meta">
              <span><FiClock /> 35 min</span>
              <span><FiActivity /> 6 drills</span>
              <span><FiTarget /> Intermediate</span>
            </div>
            <button type="button" onClick={() => navigate('/workout')}>
              <FiPlay /> Start Today&apos;s Workout
            </button>
          </article>
        </section>

        <section className="cs-pro-stat-grid">
          <article>
            <FiActivity />
            <div>
              <strong>{workoutsCompleted}</strong>
              <span>Workouts completed</span>
            </div>
          </article>
          <article>
            <FiTrendingUp />
            <div>
              <strong>{weeklyWorkouts}</strong>
              <span>Workouts this week</span>
            </div>
          </article>
          <article>
            <FiAward />
            <div>
              <strong>{badgesEarned}</strong>
              <span>Achievements earned</span>
            </div>
          </article>
          <article>
            <FiUsers />
            <div>
              <strong>{trainingCirclesCount}</strong>
              <span>Training Circles</span>
            </div>
          </article>
        </section>

        <section className="cs-pro-dashboard-grid">
          <article className="cs-pro-panel cs-pro-weekly-panel">
            <div className="cs-pro-panel-heading">
              <div>
                <span className="cs-card-label">WEEKLY PROGRESS</span>
                <h2>Your consistency</h2>
              </div>
              <FiBarChart2 />
            </div>

            <div className="cs-pro-progress-summary">
              <strong>{weeklyWorkouts} of {weeklyGoal}</strong>
              <span>weekly workouts completed</span>
            </div>

            <div className="cs-pro-progress-track">
              <div style={{ width: `${weeklyProgress}%` }} />
            </div>

            <p>
              {workoutsRemaining === 0
                ? 'Weekly goal complete. Keep building momentum.'
                : `${workoutsRemaining} workout${workoutsRemaining === 1 ? '' : 's'} remaining to reach your weekly goal.`}
            </p>
          </article>

          <article className="cs-pro-panel cs-pro-circles-panel">
            <div className="cs-pro-panel-heading">
              <div>
                <span className="cs-card-label">TRAINING CIRCLES</span>
                <h2>Train together. Get better.</h2>
              </div>
              <FiUsers />
            </div>

            <div className="cs-pro-empty-state">
              <FiUsers />
              <h3>You&apos;re not in any circles yet</h3>
              <p>Create a circle or join with an invite code to train with friends, teammates, or family.</p>
              <button type="button" onClick={() => handleComingSoon('Training Circles')}>
                Create or Join a Circle
              </button>
            </div>
          </article>

          <article className="cs-pro-panel cs-pro-achievements-panel">
            <div className="cs-pro-panel-heading">
              <div>
                <span className="cs-card-label">ACHIEVEMENTS</span>
                <h2>Earn. Improve. Unlock.</h2>
              </div>
              <button type="button" onClick={() => handleComingSoon('Achievements')}>View all</button>
            </div>

            <div className="cs-pro-achievement-grid">
              {achievements.map((achievement) => (
                <article
                  key={achievement.key}
                  className={achievement.unlocked ? 'unlocked' : 'locked'}
                >
                  <div className="cs-pro-achievement-icon">{achievement.icon}</div>
                  <div>
                    <strong>{achievement.name}</strong>
                    <p>{achievement.description}</p>
                  </div>
                  <div className="cs-pro-achievement-progress-row">
                    <span>{Math.min(achievement.currentValue, achievement.target)} / {achievement.target}</span>
                    <div className="cs-pro-mini-progress">
                      <div style={{ width: `${achievement.progress}%` }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="cs-pro-panel cs-pro-leaderboard-panel">
            <div className="cs-pro-panel-heading">
              <div>
                <span className="cs-card-label">FRIENDS LEADERBOARD</span>
                <h2>This week</h2>
              </div>
              <FiTrendingUp />
            </div>

            <div className="cs-pro-empty-state">
              <FiAward />
              <h3>Leaderboard coming soon</h3>
              <p>Join a Training Circle to compare weekly progress with friends and teammates.</p>
              <button type="button" onClick={() => handleComingSoon('Training Circles')}>
                Join or Create a Circle
              </button>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
