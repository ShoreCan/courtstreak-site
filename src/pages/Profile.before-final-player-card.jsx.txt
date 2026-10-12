import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  ChevronRight,
  Flame,
  Medal,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [achievementCount, setAchievementCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [membershipLoading, setMembershipLoading] = useState(false);

  async function handleManageMembership() {
    if (membershipLoading) return;
    setMembershipLoading(true);

    try {
      const returnUrl =
        window.location.origin + import.meta.env.BASE_URL + 'profile';
      const { data, error } = await supabase.functions.invoke(
        'create-customer-portal',
        { body: { returnUrl } }
      );

      if (error) throw error;
      if (!data?.url) {
        throw new Error('Stripe did not return a customer portal URL.');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Could not open membership management:', error);
      alert('Could not open membership management. Please try again.');
      setMembershipLoading(false);
    }
  }

  useEffect(() => {
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
          'first_name, last_name, training_streak, best_training_streak, xp, level, workouts_completed, weekly_workouts, weekly_goal'
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

      setProfile(data);

      const { count, error: achievementError } = await supabase
        .from('player_achievements')
        .select('achievement_id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (achievementError) {
        console.error('Could not load achievement count:', achievementError);
      } else {
        setAchievementCount(count ?? 0);
      }

      setLoading(false);
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

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
  const xpProgress = Math.min(100, Math.max(0, xpIntoLevel));
  const xpToNextLevel = xpIntoLevel === 0 && totalXp > 0
    ? xpPerLevel
    : xpPerLevel - xpIntoLevel;

  const currentStreak = profile?.training_streak ?? 0;
  const bestStreak = profile?.best_training_streak ?? 0;
  const completedTraining = profile?.workouts_completed ?? 0;
  const weeklyTraining = profile?.weekly_workouts ?? 0;
  const weeklyGoal = profile?.weekly_goal || 5;
  const weeklyRemaining = Math.max(0, weeklyGoal - weeklyTraining);
  const weeklyProgress = Math.min(100, (weeklyTraining / weeklyGoal) * 100);

  const nextMessage = weeklyRemaining === 0
    ? 'Weekly goal complete. Keep building your edge.'
    : `${weeklyRemaining} ${weeklyRemaining === 1 ? 'workout' : 'workouts'} left to reach your weekly goal.`;

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
            <div className="cs-player-avatar" aria-label={`${fullName} avatar`}>
              <span>{initials}</span>
              <small><ShieldCheck size={15} /></small>
            </div>

            <div className="cs-player-identity">
              <span>MY PLAYER CARD</span>
              <h1>{fullName}</h1>
              <p>Ball Handling Player <i /> Level {playerLevel}</p>
            </div>

            <button
              type="button"
              className="cs-player-edit"
              onClick={() => navigate('/settings')}
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

        <section className="cs-player-stats" aria-label="Player statistics">
          <article>
            <Target />
            <div><strong>{completedTraining}</strong><span>Workouts</span></div>
          </article>
          <article>
            <Flame />
            <div><strong>{currentStreak}</strong><span>Day streak</span></div>
          </article>
          <article>
            <Trophy />
            <div><strong>{achievementCount}</strong><span>Achievements</span></div>
          </article>
          <article>
            <Medal />
            <div><strong>{bestStreak}</strong><span>Best streak</span></div>
          </article>
        </section>

        <section className="cs-player-dashboard-grid">
          <article className="cs-player-mission">
            <div className="cs-player-section-title">
              <div>
                <span>YOUR WEEK</span>
                <h2>Stay on pace.</h2>
              </div>
              <Target />
            </div>

            <div className="cs-player-goal-ring" style={{ '--goal': `${weeklyProgress * 3.6}deg` }}>
              <div>
                <strong>{weeklyTraining}<small>/{weeklyGoal}</small></strong>
                <span>workouts</span>
              </div>
            </div>

            <div className="cs-player-mission-copy">
              <strong>{nextMessage}</strong>
              <p>Consistency beats one perfect workout. Get today’s work in.</p>
              <button type="button" onClick={() => navigate('/workout')}>
                Start Training <ChevronRight size={18} />
              </button>
            </div>
          </article>

          <article className="cs-player-focus">
            <div className="cs-player-section-title">
              <div>
                <span>CURRENT FOCUS</span>
                <h2>Build your handle.</h2>
              </div>
              <Zap />
            </div>

            <div className="cs-player-focus-feature">
              <div><Target /></div>
              <span>
                <small>BALL HANDLING</small>
                <strong>Guard Skill Builder</strong>
                <p>Control, confidence, and game-ready reps.</p>
              </span>
            </div>

            <button type="button" onClick={() => navigate('/progress')}>
              See My Progress <ChevronRight size={18} />
            </button>
          </article>
        </section>

        <section className="cs-player-awards">
          <div className="cs-player-awards-heading">
            <div>
              <span>FEATURED AWARDS</span>
              <h2>Your work, on display.</h2>
              <p>Every earned milestone becomes part of your CourtStreak story.</p>
            </div>
            <button type="button" onClick={() => navigate('/trophies')}>
              View Trophy Case <ChevronRight size={17} />
            </button>
          </div>

          <div className="cs-player-award-row">
            {[0, 1, 2].map((slot) => {
              const earned = achievementCount > slot;
              const Icon = slot === 0 ? Trophy : slot === 1 ? Flame : Award;
              const labels = ['First Step', 'Building Momentum', 'Next Milestone'];

              return (
                <article className={earned ? 'earned' : 'locked'} key={labels[slot]}>
                  <div><Icon /></div>
                  <span>{earned ? 'EARNED' : 'LOCKED'}</span>
                  <strong>{earned ? labels[slot] : 'Keep Training'}</strong>
                  <small>{earned ? 'CourtStreak achievement' : 'Your next award is waiting.'}</small>
                </article>
              );
            })}
          </div>
        </section>

        <section className="cs-player-actions">
          <button type="button" onClick={() => navigate('/training-circles')}>
            <Sparkles />
            <span><small>TRAIN TOGETHER</small><strong>Open Training Circles</strong></span>
            <ChevronRight />
          </button>

          <button
            type="button"
            onClick={handleManageMembership}
            disabled={membershipLoading}
          >
            <ShieldCheck />
            <span><small>COURTSTREAK ACCESS</small><strong>{membershipLoading ? 'Opening...' : 'Manage Membership'}</strong></span>
            <ChevronRight />
          </button>
        </section>
      </section>
    </main>
  );
}
