import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Check,
  Flame,
  Lock,
  Trophy,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';

const achievementDefinitions = [
  {
    key: 'quick-start',
    name: 'Quick Start',
    description: 'Complete your first workout',
    category: 'Training',
    target: 1,
    icon: Zap,
    current: (profile) => profile?.workouts_completed ?? 0,
  },
  {
    key: 'seven-day-streak',
    name: '7-Day Streak',
    description: 'Train seven days in a row',
    category: 'Consistency',
    target: 7,
    icon: Flame,
    current: (profile) => profile?.best_training_streak ?? 0,
  },
  {
    key: 'ball-handler',
    name: 'Ball Handler',
    description: 'Complete 10 ball-handling workouts',
    category: 'Ball Handling',
    target: 10,
    icon: Trophy,
    current: (profile) => profile?.workouts_completed ?? 0,
  },
  {
    key: 'consistency-king',
    name: 'Consistency King',
    description: 'Complete 20 workouts total',
    category: 'Milestone',
    target: 20,
    icon: Award,
    current: (profile) => profile?.workouts_completed ?? 0,
  },
];

export default function TrophyCase() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadTrophyCase() {
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

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'first_name, last_name, training_streak, best_training_streak, xp, level, workouts_completed'
        )
        .eq('id', user.id)
        .single();

      if (!isMounted) return;

      if (error) {
        console.error(error);
        setErrorMessage('CourtStreak could not load your Trophy Case.');
      } else {
        setProfile(data);
      }

      setLoading(false);
    }

    loadTrophyCase();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const achievements = useMemo(() => {
    return achievementDefinitions.map((achievement) => {
      const currentValue = achievement.current(profile);

      const clampedValue = Math.min(
        currentValue,
        achievement.target
      );

      const progress = Math.round(
        (clampedValue / achievement.target) * 100
      );

      return {
        ...achievement,
        currentValue,
        progress,
        unlocked: currentValue >= achievement.target,
      };
    });
  }, [profile]);

  const earnedAchievements = achievements.filter(
    (achievement) => achievement.unlocked
  );

  const lockedAchievements = achievements.filter(
    (achievement) => !achievement.unlocked
  );

  if (loading) {
    return (
      <main className="cs-trophy-page cs-trophy-loading">
        <Trophy size={34} />
        <p>Opening your Trophy Case...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="cs-trophy-page cs-trophy-loading">
        <p>{errorMessage}</p>

        <button
          type="button"
          onClick={() => navigate('/profile')}
        >
          Return to Profile
        </button>
      </main>
    );
  }

  const firstName = profile?.first_name || 'Player';

  return (
    <main className="cs-trophy-page">
      <header className="cs-trophy-topbar">
        <button
          type="button"
          className="cs-trophy-back"
          onClick={() => navigate('/profile')}
        >
          <ArrowLeft size={19} />
          Profile
        </button>

        <strong className="cs-trophy-brand">
          CourtStreak
        </strong>

        <span />
      </header>

      <section className="cs-trophy-shell">

        {/* HERO */}

        <section className="cs-trophy-hero">
          <div className="cs-trophy-hero-copy">
            <span className="cs-trophy-eyebrow">
              PLAYER TROPHY CASE
            </span>

            <h1>
              Earn it.
              <br />
              <strong>Keep it.</strong>
            </h1>

            <p>
              Every trophy represents work you actually put in.
              Train, stay consistent, and keep building your
              CourtStreak legacy.
            </p>
          </div>

          <div className="cs-trophy-hero-award">
            <div className="cs-trophy-main-icon">
              <Trophy size={54} />
            </div>

            <span>{firstName}&apos;s Collection</span>

            <strong>
              {earnedAchievements.length} / {achievements.length}
            </strong>

            <small>Achievements Earned</small>
          </div>
        </section>


        {/* PROGRESS SUMMARY */}

        <section className="cs-trophy-summary">
          <div>
            <span>UNLOCKED</span>
            <strong>{earnedAchievements.length}</strong>
          </div>

          <div>
            <span>STILL TO EARN</span>
            <strong>{lockedAchievements.length}</strong>
          </div>

          <div>
            <span>COMPLETION</span>
            <strong>
              {Math.round(
                (earnedAchievements.length /
                  achievements.length) *
                  100
              )}
              %
            </strong>
          </div>
        </section>


        {/* EARNED TROPHIES */}

        <section className="cs-trophy-section">
          <div className="cs-trophy-section-heading">
            <div>
              <span>EARNED</span>
              <h2>Your Trophy Case</h2>
            </div>

            <Trophy size={25} />
          </div>

          {earnedAchievements.length > 0 ? (
            <div className="cs-trophy-grid">
              {earnedAchievements.map((achievement) => {
                const Icon = achievement.icon;

                return (
                  <article
                    className="cs-trophy-card unlocked"
                    key={achievement.key}
                  >
                    <div className="cs-trophy-card-top">
                      <div className="cs-trophy-icon unlocked">
                        <Icon size={31} />
                      </div>

                      <span className="cs-trophy-earned-badge">
                        <Check size={13} />
                        Earned
                      </span>
                    </div>

                    <span className="cs-trophy-category">
                      {achievement.category}
                    </span>

                    <h3>{achievement.name}</h3>

                    <p>{achievement.description}</p>

                    <div className="cs-trophy-complete">
                      <span>COMPLETE</span>
                      <strong>
                        {achievement.target} /{' '}
                        {achievement.target}
                      </strong>
                    </div>

                    <div className="cs-trophy-progress">
                      <div style={{ width: '100%' }} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="cs-trophy-empty">
              <div>
                <Trophy size={35} />
              </div>

              <h3>Your first trophy is waiting.</h3>

              <p>
                Complete your first CourtStreak training session
                to begin your Trophy Case.
              </p>

              <button
                type="button"
                onClick={() => navigate('/workout')}
              >
                Start Training
              </button>
            </div>
          )}
        </section>


        {/* LOCKED TROPHIES */}

        {lockedAchievements.length > 0 && (
          <section className="cs-trophy-section">
            <div className="cs-trophy-section-heading">
              <div>
                <span>UP NEXT</span>
                <h2>Keep Chasing</h2>
              </div>

              <Lock size={23} />
            </div>

            <div className="cs-trophy-grid">
              {lockedAchievements.map((achievement) => {
                const Icon = achievement.icon;

                return (
                  <article
                    className="cs-trophy-card locked"
                    key={achievement.key}
                  >
                    <div className="cs-trophy-card-top">
                      <div className="cs-trophy-icon locked">
                        <Icon size={29} />
                      </div>

                      <span className="cs-trophy-locked-badge">
                        <Lock size={12} />
                        Locked
                      </span>
                    </div>

                    <span className="cs-trophy-category">
                      {achievement.category}
                    </span>

                    <h3>{achievement.name}</h3>

                    <p>{achievement.description}</p>

                    <div className="cs-trophy-complete">
                      <span>PROGRESS</span>

                      <strong>
                        {Math.min(
                          achievement.currentValue,
                          achievement.target
                        )}{' '}
                        / {achievement.target}
                      </strong>
                    </div>

                    <div className="cs-trophy-progress locked">
                      <div
                        style={{
                          width: `${achievement.progress}%`,
                        }}
                      />
                    </div>

                    <small className="cs-trophy-progress-copy">
                      {achievement.progress}% complete
                    </small>
                  </article>
                );
              })}
            </div>
          </section>
        )}


        {/* FOOTER CTA */}

        <section className="cs-trophy-cta">
          <div>
            <Flame size={25} />

            <span>
              <strong>Keep building your CourtStreak.</strong>
              Every session moves you closer to the next trophy.
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/workout')}
          >
            Train Now
          </button>
        </section>

      </section>
    </main>
  );
}