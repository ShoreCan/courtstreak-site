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
const [todayXp, setTodayXp] = useState(0);
const [todayTrainingXp, setTodayTrainingXp] = useState(0);
const [todayChallengeXp, setTodayChallengeXp] = useState(0);
const [todayAchievementXp, setTodayAchievementXp] = useState(0);
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
      const {
  data: hasActiveMembership,
  error: membershipError,
} = await supabase.rpc('has_active_courtstreak_membership');

if (membershipError) {
  console.error('Could not verify CourtStreak membership:', membershipError);

  if (isMounted) {
    setProfileError('CourtStreak could not verify your membership.');
    setProfileLoading(false);
  }

  return;
}

if (!hasActiveMembership) {
  navigate('/pricing?checkout=membership', { replace: true });
  return;
}
const { error: streakRefreshError } = await supabase.rpc(
  'refresh_training_streak'
);

if (streakRefreshError) {
  console.error(
    'Could not refresh training streak:',
    streakRefreshError
  );
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

/* Load the player's legitimate XP earned today */
const {
  data: todayXpData,
  error: todayXpError,
} = await supabase.rpc('get_today_xp');

if (todayXpError) {
  console.error('Could not load today XP:', todayXpError);
} else {
  const todayReward = todayXpData?.[0];

  setTodayTrainingXp(todayReward?.training_xp ?? 0);
  setTodayChallengeXp(todayReward?.challenge_xp ?? 0);
  setTodayAchievementXp(todayReward?.achievement_xp ?? 0);
  setTodayXp(todayReward?.total_today_xp ?? 0);
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
const totalXp = profile?.xp ?? 0;
const playerLevel = profile?.level ?? 1;

const xpPerLevel = 100;
const xpIntoLevel = totalXp % xpPerLevel;
const xpToNextLevel = xpPerLevel - xpIntoLevel;
const xpProgress = Math.min(
  (xpIntoLevel / xpPerLevel) * 100,
  100
);
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
  {
    label: 'Dashboard',
    icon: <FiHome />,
    active: true,
    action: () => {},
  },
  {
    label: 'Training',
    icon: <FiPlay />,
    soon: true,
    action: () => handleComingSoon('Training'),
  },
  {
    label: 'Drill Library',
    icon: <FiGrid />,
    soon: true,
    action: () => handleComingSoon('Drill Library'),
  },
  {
    label: 'Challenges',
    icon: <FiTarget />,
    soon: true,
    action: () => handleComingSoon('Challenges'),
  },
  {
    label: 'Progress',
    icon: <FiBarChart2 />,
    action: () => navigate('/progress'),
  },
  {
    label: 'Achievements',
    icon: <FiAward />,
    soon: true,
    action: () => handleComingSoon('Achievements'),
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
  icon: <FiSettings />,
  action: () => navigate('/membership'),
},
  {
  label: 'Settings',
  icon: <FiSettings />,
  action: () => navigate('/settings'),
},
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
             {item.soon ? <small>Soon</small> : null}
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
            <p>
  What do you want to get better at today? Choose a skill,
  put in the reps, and keep building your game.
</p>
          </div>

          <div className="cs-pro-topbar-actions">
            <span>
              <FiClock /> Today&apos;s Training
            </span>
            <button type="button" onClick={() => navigate('/workout')}>
  <FiPlay /> Explore Drills
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

          <article className="cs-pro-workout-card cs-pro-choose-training-card">
  <div>
    <span className="cs-card-label">CHOOSE YOUR TRAINING</span>

    <h2>What do you want to get better at today?</h2>

    <p>
      Pick a ball-handling drill that matches what you want to
      work on. Every legitimate session moves your game forward.
    </p>
  </div>

  <div className="cs-pro-workout-meta">
    <span><FiActivity /> Ball Handling</span>
    <span><FiTarget /> Multiple Levels</span>
    <span><FiZap /> Earn XP</span>
  </div>

  <button type="button" onClick={() => navigate('/workout')}>
    <FiPlay /> Explore Ball-Handling Drills
  </button>

  <div className="cs-pro-training-coming-soon">
    <span>COMING NEXT</span>
    <strong>Shooting + Finishing</strong>
  </div>
</article>
        </section>
<section className="cs-pro-xp-card">
  <div className="cs-pro-xp-header">
    <div>
      <span className="cs-card-label">PLAYER XP</span>
      <h2>Level {playerLevel}</h2>
      <p>Every legitimate rep moves you forward.</p>
    </div>

    <div className="cs-pro-xp-total">
      <span>TOTAL XP</span>
      <strong>{totalXp.toLocaleString()}</strong>
    </div>
  </div>

  <div className="cs-pro-xp-progress-heading">
    <span>
      {xpIntoLevel} / {xpPerLevel} XP
    </span>

    <strong>
      {xpToNextLevel} XP to Level {playerLevel + 1}
    </strong>
  </div>

  <div className="cs-pro-xp-progress-track">
    <div style={{ width: `${xpProgress}%` }} />
  </div>
  <div className="cs-pro-today-xp">
  <div className="cs-pro-today-xp-main">
    <span>TODAY&apos;S XP</span>
    <strong>+{todayXp}</strong>
  </div>

  <div className="cs-pro-today-xp-breakdown">
    <div className="cs-pro-today-xp-breakdown">
  <span>
    Training
    <strong>+{todayTrainingXp}</strong>
  </span>

  <span>
    Bonus Challenge
    <strong>+{todayChallengeXp}</strong>
  </span>
</div>

    <span>
      Achievements
      <strong>+{todayAchievementXp}</strong>
    </span>
  </div>
</div>
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
              <button type="button" onClick={() => navigate('/training-circles')}>
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
              <button type="button" onClick={() => navigate('/training-circles')}>
                Join or Create a Circle
              </button>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
