import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiActivity,
  FiArrowRight,
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
  const [trainingCircles, setTrainingCircles] = useState([]);
const [circlesLoading, setCirclesLoading] = useState(true);
const [todayXp, setTodayXp] = useState(0);
const [todayTrainingXp, setTodayTrainingXp] = useState(0);
const [todayChallengeXp, setTodayChallengeXp] = useState(0);
const [todayAchievementXp, setTodayAchievementXp] = useState(0);
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
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

const {
  data: circleMemberships,
  error: circlesError,
} = await supabase
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
  .order('joined_at', { ascending: false });

if (!isMounted) return;

if (circlesError) {
  console.error(
    'Could not load dashboard Training Circles:',
    circlesError
  );
} else {
  const loadedCircles = (circleMemberships ?? [])
    .map((membership) => ({
      ...membership.training_circles,
      membershipRole: membership.role,
    }))
    .filter((circle) => circle?.id);

  setTrainingCircles(loadedCircles);
}

setCirclesLoading(false);

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
  const trainingCirclesCount = trainingCircles.length;
const featuredCircle = trainingCircles[0] || null;
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
    <main className="cs-pro-dashboard-page cs-dashboard-redesign">
      <aside className="cs-pro-sidebar">
        <Link to="/" className="cs-pro-sidebar-logo">
          <span className="cs-pro-logo-ball">◉</span>
          <span>
            COURT<strong>STREAK</strong>
          </span>
        </Link>

        <nav
          className="cs-pro-sidebar-nav"
          aria-label="Dashboard navigation"
        >
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

        <button
          type="button"
          className="cs-pro-sidebar-logout"
          onClick={handleLogout}
        >
          <FiLogOut />
          Log Out
        </button>
      </aside>

      <section className="cs-pro-dashboard-main cs-dashboard-main-redesign">
        <header className="cs-dashboard-welcome">
          <div>
            <p className="cs-card-label">PLAYER DASHBOARD</p>

            <h1>
              {profileLoading
                ? 'Loading...'
                : `Welcome back, ${profile?.first_name || 'Player'}.`}
            </h1>

            <p>What are we getting better at today?</p>
          </div>

          <button type="button" onClick={() => navigate('/workout')}>
            <FiPlay />
            Start Training
          </button>
        </header>

        {profileError ? (
          <div className="cs-pro-dashboard-error">{profileError}</div>
        ) : null}

        <section className="cs-dashboard-primary-grid">
          <article className="cs-dashboard-momentum-card">
            <div className="cs-dashboard-momentum-top">
              <div>
                <span className="cs-card-label">YOUR MOMENTUM</span>
                <h2>Keep showing up.</h2>
              </div>

              <div className="cs-dashboard-level-pill">
                <FiZap />
                Level {playerLevel}
              </div>
            </div>

            <div className="cs-dashboard-momentum-numbers">
              <div className="cs-dashboard-streak-summary">
                <span className="cs-dashboard-streak-icon">
                  <FaFire />
                </span>

                <div>
                  <strong>{profile?.training_streak ?? 0}</strong>
                  <span>day streak</span>
                </div>
              </div>

              <div className="cs-dashboard-best-summary">
                <small>PERSONAL BEST</small>
                <strong>
                  {profile?.best_training_streak ?? 0} days
                </strong>
              </div>
            </div>

            <div className="cs-dashboard-weekly-compact">
              <div>
                <span>This week</span>

                <strong>
                  {weeklyWorkouts} of {weeklyGoal} sessions
                </strong>
              </div>

              <div className="cs-dashboard-weekly-track">
                <span style={{ width: `${weeklyProgress}%` }} />
              </div>

              <small>
                {workoutsRemaining === 0
                  ? 'Weekly goal complete. Keep the momentum going.'
                  : `${workoutsRemaining} more to reach your weekly goal.`}
              </small>
            </div>
          </article>

          <article className="cs-dashboard-training-card">
            <div className="cs-dashboard-training-icon">
              <FiActivity />
            </div>

            <div>
              <span className="cs-card-label">AVAILABLE NOW</span>
              <h2>Ball Handling</h2>
              <p>
                Choose your focus, follow the drill, and put in the
                reps.
              </p>
            </div>

            <div className="cs-dashboard-training-tags">
              <span>
                <FiTarget /> Multiple levels
              </span>

              <span>
                <FiZap /> Earn XP
              </span>
            </div>

            <button type="button" onClick={() => navigate('/workout')}>
              Explore Drills
              <FiPlay />
            </button>

            <small>Shooting and finishing coming next</small>
          </article>
        </section>

        <section className="cs-dashboard-progress-card">
          <div className="cs-dashboard-progress-heading">
            <div>
              <span className="cs-card-label">YOUR PROGRESS</span>
              <h2>Level {playerLevel}</h2>
            </div>

            <div>
              <strong>{totalXp.toLocaleString()}</strong>
              <span>Total XP</span>
            </div>
          </div>

          <div className="cs-dashboard-xp-row">
            <div className="cs-dashboard-xp-copy">
              <span>
                {xpIntoLevel} / {xpPerLevel} XP
              </span>

              <strong>
                {xpToNextLevel} XP to Level {playerLevel + 1}
              </strong>
            </div>

            <div className="cs-dashboard-xp-track">
              <span style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          <div className="cs-dashboard-today-row">
            <span>Today</span>

            <strong>+{todayXp} XP</strong>

            <small>
              Training +{todayTrainingXp}
              <i>•</i>
              Challenge +{todayChallengeXp}
              <i>•</i>
              Achievements +{todayAchievementXp}
            </small>
          </div>
        </section>

        <section className="cs-dashboard-quick-stats">
          <article>
            <FiActivity />
            <span>
              <strong>{workoutsCompleted}</strong>
              Training sessions
            </span>
          </article>

          <article>
            <FiTrendingUp />
            <span>
              <strong>{weeklyWorkouts}</strong>
              This week
            </span>
          </article>

          <article>
            <FiAward />
            <span>
              <strong>{badgesEarned}</strong>
              Achievements
            </span>
          </article>

          <article>
            <FiUsers />
            <span>
              <strong>{trainingCirclesCount}</strong>
              Training Circles
            </span>
          </article>
        </section>

        <section className="cs-dashboard-lower-grid">
          <article className="cs-dashboard-community-card">
            <div className="cs-dashboard-section-heading">
              <div>
                <span className="cs-card-label">TRAINING CIRCLES</span>
                <h2>Better together.</h2>
              </div>

              <FiUsers />
            </div>

            {circlesLoading ? (
  <div className="cs-dashboard-circle-loading">
    Loading your Training Circles...
  </div>
) : featuredCircle ? (
  <div className="cs-dashboard-circle-preview">
    <button
      type="button"
      className="cs-dashboard-circle-preview-main"
      onClick={() =>
        navigate(`/training-circles/${featuredCircle.id}`)
      }
    >
      <div className="cs-dashboard-circle-avatar">
        <FiUsers />
      </div>

      <div className="cs-dashboard-circle-details">
        <span>
          {(featuredCircle.circle_type || 'Training Circle').toUpperCase()}
          {featuredCircle.is_private ? ' • PRIVATE' : ' • OPEN'}
        </span>

        <strong>{featuredCircle.name}</strong>

        <small>
          {featuredCircle.membershipRole === 'owner'
            ? 'You created this Circle'
            : 'You are a member'}
        </small>
      </div>

      <div className="cs-dashboard-circle-enter">
        <span>ENTER</span>
        <FiArrowRight />
      </div>
    </button>

    <div className="cs-dashboard-circle-preview-footer">
      <span>
        <FiTarget />
        Weekly goal: {featuredCircle.weekly_workout_goal ?? 20}
      </span>

      <span>
        <FiUsers />
        {trainingCirclesCount}{' '}
        {trainingCirclesCount === 1 ? 'Circle' : 'Circles'}
      </span>
    </div>

    {trainingCirclesCount > 1 ? (
      <button
        type="button"
        className="cs-dashboard-view-all-circles"
        onClick={() => navigate('/training-circles')}
      >
        View all {trainingCirclesCount} Training Circles
      </button>
    ) : null}
  </div>
) : (
  <div className="cs-dashboard-community-empty">
    <div>
      <strong>Build your circle</strong>

      <p>
        Train with friends, teammates, coaches, or family.
      </p>
    </div>

    <button
      type="button"
      onClick={() => navigate('/training-circles')}
    >
      Create or Join
      <FiUsers />
    </button>
  </div>
)}
          </article>

          <article className="cs-dashboard-achievement-card">
            <div className="cs-dashboard-section-heading">
              <div>
                <span className="cs-card-label">ACHIEVEMENTS</span>
                <h2>Your next milestone.</h2>
              </div>

              <button
                type="button"
                onClick={() => navigate('/trophies')}
              >
                View all
              </button>
            </div>

            <div className="cs-dashboard-featured-achievements">
              {[
                ...achievements
                  .filter((achievement) => !achievement.unlocked)
                  .slice(0, 1),
                ...achievements
                  .filter((achievement) => achievement.unlocked)
                  .slice(-1),
              ].map((achievement) => (
                <article
                  key={achievement.key}
                  className={
                    achievement.unlocked ? 'unlocked' : 'in-progress'
                  }
                >
                  <div className="cs-dashboard-achievement-icon">
                    {achievement.icon}
                  </div>

                  <div className="cs-dashboard-achievement-copy">
                    <span>
                      {achievement.unlocked
                        ? 'UNLOCKED'
                        : 'IN PROGRESS'}
                    </span>

                    <strong>{achievement.name}</strong>
                    <small>{achievement.description}</small>

                    <div>
                      <span
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                  </div>

                  <strong>
                    {Math.min(
                      achievement.currentValue,
                      achievement.target
                    )}{' '}
                    / {achievement.target}
                  </strong>
                </article>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
