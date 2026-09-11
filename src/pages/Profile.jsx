import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Flame,
  Medal,
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
        window.location.origin +
        import.meta.env.BASE_URL +
        'profile';

      const { data, error } = await supabase.functions.invoke(
        'create-customer-portal',
        {
          body: { returnUrl },
        }
      );

      if (error) {
        throw error;
      }

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
        setErrorMessage('CourtStreak could not load your profile.');
        setLoading(false);
        return;
      }

      setProfile(data);

      const {
        count,
        error: achievementError,
      } = await supabase
        .from('player_achievements')
        .select('achievement_id', {
          count: 'exact',
          head: true,
        })
        .eq('user_id', user.id);

      if (achievementError) {
        console.error(
          'Could not load achievement count:',
          achievementError
        );
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

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </button>
      </main>
    );
  }

  const firstName = profile?.first_name || 'Player';
  const lastName = profile?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();

  const initials =
    `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() ||
    'CS';

  const totalXp = profile?.xp ?? 0;
  const playerLevel = profile?.level ?? 1;

  const xpPerLevel = 100;
  const xpIntoLevel = totalXp % xpPerLevel;
  const xpProgress = Math.min(
    100,
    Math.max(0, (xpIntoLevel / xpPerLevel) * 100)
  );

  const xpToNextLevel =
    xpIntoLevel === 0 && totalXp > 0
      ? xpPerLevel
      : xpPerLevel - xpIntoLevel;

  const currentStreak = profile?.training_streak ?? 0;
  const bestStreak = profile?.best_training_streak ?? 0;
  const completedTraining = profile?.workouts_completed ?? 0;
  const weeklyTraining = profile?.weekly_workouts ?? 0;
  const weeklyGoal = profile?.weekly_goal ?? 0;

  return (
    <main className="cs-profile-page">
      <header className="cs-profile-topbar">
        <button
          type="button"
          className="cs-profile-back"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={19} />
          Dashboard
        </button>

        <Link to="/" className="cs-profile-brand">
          CourtStreak
        </Link>

        <span className="cs-profile-topbar-spacer" />
      </header>

      <section className="cs-profile-shell">
        <section className="cs-profile-hero">
          <div className="cs-profile-hero-glow" />

          <div className="cs-profile-identity">
            <div className="cs-profile-avatar">
              <span>{initials}</span>
            </div>

            <div className="cs-profile-name">
              <span>PLAYER PROFILE</span>

              <h1>{fullName}</h1>

              <p>
                Ball Handling
                <span>•</span>
                Level {playerLevel}
              </p>
            </div>
          </div>

          <div className="cs-profile-level-card">
            <div className="cs-profile-level-heading">
              <div>
                <span>PLAYER LEVEL</span>
                <strong>Level {playerLevel}</strong>
              </div>

              <div className="cs-profile-level-xp">
                <Zap size={16} />
                {totalXp.toLocaleString()} XP
              </div>
            </div>

            <div className="cs-profile-xp-track">
              <div
                style={{
                  width: `${xpProgress}%`,
                }}
              />
            </div>

            <div className="cs-profile-xp-footer">
              <span>
                {xpIntoLevel} / {xpPerLevel} XP
              </span>

              <strong>
                {xpToNextLevel} XP to Level {playerLevel + 1}
              </strong>
            </div>
          </div>
        </section>

        <section className="cs-profile-stat-grid">
          <article>
            <Target size={21} />

            <strong>{completedTraining}</strong>

            <span>Training Completed</span>
          </article>

          <article>
            <Flame size={21} />

            <strong>{currentStreak}</strong>

            <span>Day Streak</span>
          </article>

          <article>
            <Trophy size={21} />

            <strong>{achievementCount}</strong>

            <span>Achievements</span>
          </article>
        </section>

        <section className="cs-profile-training-section">
          <div className="cs-profile-section-heading">
            <div>
              <span>CURRENT TRAINING</span>
              <h2>Build your handle.</h2>
            </div>

            <Target size={25} />
          </div>

          <div className="cs-profile-training-card">
            <div>
              <div className="cs-profile-training-icon">
                <Target size={22} />
              </div>

              <span>
                <strong>Ball Handling</strong>
                <small>Available now</small>
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/workout')}
            >
              Explore Drills
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="cs-profile-coming-training">
            <span>COMING NEXT</span>

            <div>
              <strong>Shooting</strong>
              <strong>Finishing</strong>
            </div>
          </div>
        </section>

        <section className="cs-profile-progress-card">
          <div className="cs-profile-section-heading">
            <div>
              <span>YOUR CONSISTENCY</span>
              <h2>Keep showing up.</h2>
            </div>

            <Flame size={25} />
          </div>

          <div className="cs-profile-progress-grid">
            <div>
              <span>Current streak</span>
              <strong>{currentStreak} days</strong>
            </div>

            <div>
              <span>Personal best</span>
              <strong>{bestStreak} days</strong>
            </div>

            <div>
              <span>This week</span>
              <strong>
                {weeklyTraining}
                {weeklyGoal > 0 ? ` / ${weeklyGoal}` : ''}
              </strong>
            </div>
          </div>
        </section>

        <section className="cs-profile-trophy-preview">
          <div className="cs-profile-trophy-heading">
            <div>
              <span>TROPHY CASE</span>
              <h2>Your work deserves to be remembered.</h2>

              <p>
                Achievements are earned through real CourtStreak
                milestones — training, consistency, XP, and progress.
              </p>
            </div>

            <div className="cs-profile-trophy-count">
              <Trophy size={24} />

              <strong>{achievementCount}</strong>

              <span>Earned</span>
            </div>
          </div>

          <div className="cs-profile-trophy-stage">
            {achievementCount > 0 ? (
              <>
                <div className="cs-profile-trophy-medal">
                  <div className="cs-profile-trophy-medal-glow" />

                  <Medal size={38} />
                </div>

                <div>
                  <span>YOUR COLLECTION</span>

                  <strong>
                    {achievementCount}{' '}
                    {achievementCount === 1
                      ? 'Achievement'
                      : 'Achievements'}{' '}
                    Earned
                  </strong>

                  <p>
                    Keep training to unlock more CourtStreak trophies.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="cs-profile-trophy-medal locked">
                  <Sparkles size={34} />
                </div>

                <div>
                  <span>TROPHY CASE</span>

                  <strong>Your first trophy is waiting.</strong>

                  <p>
                    Complete CourtStreak milestones to start building
                    your collection.
                  </p>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            className="cs-profile-view-trophies"
            onClick={() => navigate('/trophies')}
          >
            View Full Trophy Case
            <ChevronRight size={18} />
          </button>
                    <button
            type="button"
            className="cs-profile-view-trophies"
            onClick={handleManageMembership}
            disabled={membershipLoading}
          >
            {membershipLoading ? 'Opening Membership...' : 'Manage Membership'}
            <ChevronRight size={18} />
          </button>
        </section>
      </section>
    </main>
  );
}