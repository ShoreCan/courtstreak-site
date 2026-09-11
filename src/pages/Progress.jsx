import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  CalendarDays,
  ChevronRight,
  Flame,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(value) {
  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatFullDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function Progress() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [range, setRange] = useState(30);

  useEffect(() => {
    let isMounted = true;

    async function loadProgress() {
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

      const [
        { data: profileData, error: profileError },
        { data: sessionData, error: sessionError },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'first_name, last_name, xp, level, training_streak, best_training_streak, workouts_completed'
          )
          .eq('id', user.id)
          .single(),

        supabase
          .from('training_sessions')
          .select(
            'id, workout_key, drill_index, drill_name, category, difficulty, xp_awarded, duration_seconds, score, reps, completed_at'
          )
          .eq('user_id', user.id)
          .order('completed_at', { ascending: true }),
      ]);

      if (!isMounted) return;

      if (profileError || sessionError) {
        console.error('Progress load error:', {
          profileError,
          sessionError,
        });

        setErrorMessage(
          'CourtStreak could not load your progress right now.'
        );

        setLoading(false);
        return;
      }

      setProfile(profileData);
      setSessions(sessionData ?? []);
      setLoading(false);
    }

    loadProgress();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const stats = useMemo(() => {
    const uniqueDays = new Set(
      sessions.map((session) => dateKey(session.completed_at))
    );

    const trainingXp = sessions.reduce(
      (total, session) => total + (session.xp_awarded ?? 0),
      0
    );

    const totalSeconds = sessions.reduce(
      (total, session) =>
        total + (session.duration_seconds ?? 0),
      0
    );

    return {
      attempts: sessions.length,
      trainingDays: uniqueDays.size,
      trainingXp,
      totalSeconds,
    };
  }, [sessions]);

  const activityByDay = useMemo(() => {
    const map = {};

    sessions.forEach((session) => {
      const key = dateKey(session.completed_at);

      if (!map[key]) {
        map[key] = {
          attempts: 0,
          xp: 0,
        };
      }

      map[key].attempts += 1;
      map[key].xp += session.xp_awarded ?? 0;
    });

    return map;
  }, [sessions]);

  const calendarDays = useMemo(() => {
    const today = startOfDay(new Date());
    const days = [];

    for (let index = 83; index >= 0; index -= 1) {
      const day = new Date(today.getTime() - index * DAY_MS);
      const key = dateKey(day);
      const activity = activityByDay[key];

      days.push({
        key,
        date: day,
        attempts: activity?.attempts ?? 0,
        xp: activity?.xp ?? 0,
      });
    }

    return days;
  }, [activityByDay]);

  const rangeData = useMemo(() => {
    const today = startOfDay(new Date());

    const currentStart = new Date(
      today.getTime() - (range - 1) * DAY_MS
    );

    const previousStart = new Date(
      currentStart.getTime() - range * DAY_MS
    );

    const currentSessions = sessions.filter((session) => {
      const sessionDate = new Date(session.completed_at);
      return sessionDate >= currentStart;
    });

    const previousSessions = sessions.filter((session) => {
      const sessionDate = new Date(session.completed_at);

      return (
        sessionDate >= previousStart &&
        sessionDate < currentStart
      );
    });

    const currentDays = new Set(
      currentSessions.map((session) =>
        dateKey(session.completed_at)
      )
    ).size;

    const previousDays = new Set(
      previousSessions.map((session) =>
        dateKey(session.completed_at)
      )
    ).size;

    const currentXp = currentSessions.reduce(
      (total, session) => total + (session.xp_awarded ?? 0),
      0
    );

    const previousXp = previousSessions.reduce(
      (total, session) => total + (session.xp_awarded ?? 0),
      0
    );

    return {
      currentSessions,
      previousSessions,
      currentDays,
      previousDays,
      currentXp,
      previousXp,
    };
  }, [sessions, range]);

  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const points = [];

    for (let index = range - 1; index >= 0; index -= 1) {
      const day = new Date(today.getTime() - index * DAY_MS);
      const key = dateKey(day);
      const activity = activityByDay[key];

      points.push({
        key,
        date: day,
        attempts: activity?.attempts ?? 0,
        xp: activity?.xp ?? 0,
      });
    }

    return points;
  }, [activityByDay, range]);

  const maxChartAttempts = Math.max(
    ...chartData.map((day) => day.attempts),
    1
  );

  const mostTrainedDrills = useMemo(() => {
    const map = new Map();

    sessions.forEach((session) => {
      const key = `${session.workout_key}-${session.drill_index}`;

      const existing = map.get(key) ?? {
        key,
        name:
          session.drill_name ||
          `Ball Handling Drill ${session.drill_index + 1}`,
        category: session.category || 'Ball Handling',
        attempts: 0,
        xp: 0,
      };

      existing.attempts += 1;
      existing.xp += session.xp_awarded ?? 0;

      map.set(key, existing);
    });

    return Array.from(map.values())
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 4);
  }, [sessions]);
const personalBests = useMemo(() => {
  const drillMap = new Map();

  sessions.forEach((session) => {
    if (
      session.reps === null ||
      session.reps === undefined ||
      !session.drill_name
    ) {
      return;
    }

    const key = `${session.workout_key}-${session.drill_index}`;

    const existing = drillMap.get(key) ?? {
      key,
      name: session.drill_name,
      category: session.category || 'Training',
      best: 0,
      latest: 0,
      attempts: 0,
      results: [],
    };

    existing.results.push({
      reps: Number(session.reps),
      completedAt: session.completed_at,
    });

    existing.attempts += 1;

    drillMap.set(key, existing);
  });

  return Array.from(drillMap.values())
    .map((drill) => {
      const orderedResults = [...drill.results].sort(
        (a, b) =>
          new Date(a.completedAt) -
          new Date(b.completedAt)
      );

      const first = orderedResults[0]?.reps ?? 0;
      const latest =
        orderedResults[orderedResults.length - 1]?.reps ?? 0;

      const best = Math.max(
        ...orderedResults.map((result) => result.reps)
      );

      const improvement = latest - first;

      return {
        ...drill,
        first,
        latest,
        best,
        improvement,
      };
    })
    .sort((a, b) => b.best - a.best);
}, [sessions]);
  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort(
        (a, b) =>
          new Date(b.completed_at) -
          new Date(a.completed_at)
      )
      .slice(0, 8);
  }, [sessions]);

  const firstTrainingDate =
    sessions.length > 0
      ? sessions[0].completed_at
      : null;

  const firstName = profile?.first_name || 'Player';

  const totalHours = Math.floor(stats.totalSeconds / 3600);

  const totalMinutes = Math.floor(
    (stats.totalSeconds % 3600) / 60
  );

  const hasDurationData = stats.totalSeconds > 0;

  if (loading) {
    return (
      <main className="cs-progress-page cs-progress-loading">
        <div className="cs-progress-loading-mark">
          <Zap size={27} />
        </div>

        <p>Building your progress story...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="cs-progress-page cs-progress-loading">
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

  return (
    <main className="cs-progress-page">
      <header className="cs-progress-topbar">
        <button
          type="button"
          className="cs-progress-back"
          onClick={() => navigate('/profile')}
        >
          <ArrowLeft size={19} />
          Profile
        </button>

        <strong className="cs-progress-brand">
          CourtStreak
        </strong>

        <span />
      </header>

      <div className="cs-progress-shell">

        {/* HERO */}

        <section className="cs-progress-hero">
          <div className="cs-progress-hero-copy">
            <span className="cs-progress-eyebrow">
              YOUR PROGRESS
            </span>

            <h1>
              Look how far
              <br />
              <strong>you&apos;ve come.</strong>
            </h1>

            <p>
              Every session adds up. This is the work you&apos;ve
              put in, the consistency you&apos;ve built, and the
              progress you&apos;re creating over time.
            </p>

            {firstTrainingDate && (
              <span className="cs-progress-since">
                <CalendarDays size={15} />
                Training with CourtStreak since{' '}
                {formatFullDate(firstTrainingDate)}
              </span>
            )}
          </div>

          <div className="cs-progress-hero-card">
            <span>PLAYER LEVEL</span>

            <strong>{profile?.level ?? 1}</strong>

            <small>
              {profile?.xp ?? 0} lifetime XP
            </small>

            <div className="cs-progress-level-track">
              <div
                style={{
                  width: `${
                    ((profile?.xp ?? 0) % 100)
                  }%`,
                }}
              />
            </div>

            <p>
              {100 - ((profile?.xp ?? 0) % 100)} XP until
              Level {(profile?.level ?? 1) + 1}
            </p>
          </div>
        </section>


        {/* LIFETIME SNAPSHOT */}

        <section className="cs-progress-section">
          <div className="cs-progress-heading">
            <div>
              <span>THE WORK ADDS UP</span>
              <h2>{firstName}&apos;s Training Footprint</h2>
            </div>
          </div>

          <div className="cs-progress-stat-grid">
            <article>
              <div className="cs-progress-stat-icon">
                <Target size={21} />
              </div>

              <strong>{stats.attempts}</strong>
              <span>Drill Attempts</span>

              <small>
                Every recorded training attempt
              </small>
            </article>

            <article>
              <div className="cs-progress-stat-icon">
                <CalendarDays size={21} />
              </div>

              <strong>{stats.trainingDays}</strong>
              <span>Days Trained</span>

              <small>
                Days you showed up and worked
              </small>
            </article>

            <article>
              <div className="cs-progress-stat-icon">
                <Zap size={21} />
              </div>

              <strong>{profile?.xp ?? 0}</strong>
              <span>Total XP</span>

              <small>
                Your complete CourtStreak XP
              </small>
            </article>

            <article>
              <div className="cs-progress-stat-icon">
                <Flame size={21} />
              </div>

              <strong>
                {profile?.best_training_streak ?? 0}
              </strong>

              <span>Best Streak</span>

              <small>
                Your longest run of training days
              </small>
            </article>
          </div>
        </section>


        {/* TRAINING HEATMAP */}

        <section className="cs-progress-section">
          <div className="cs-progress-heading">
            <div>
              <span>CONSISTENCY</span>
              <h2>Your Training Calendar</h2>

              <p>
                Every square represents a day. The brighter it
                gets, the more work you put in.
              </p>
            </div>

            <div className="cs-progress-heat-legend">
              <span>Less</span>
              <i data-level="0" />
              <i data-level="1" />
              <i data-level="2" />
              <i data-level="3" />
              <i data-level="4" />
              <span>More</span>
            </div>
          </div>

          <div className="cs-progress-heatmap-wrap">
            <div className="cs-progress-heatmap">
              {calendarDays.map((day) => {
                let level = 0;

                if (day.attempts >= 1) level = 1;
                if (day.attempts >= 2) level = 2;
                if (day.attempts >= 4) level = 3;
                if (day.attempts >= 6) level = 4;

                return (
                  <div
                    key={day.key}
                    className="cs-progress-heat-day"
                    data-level={level}
                    title={`${formatFullDate(
                      day.date
                    )}: ${day.attempts} drill ${
                      day.attempts === 1
                        ? 'attempt'
                        : 'attempts'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="cs-progress-heatmap-note">
            <Flame size={17} />

            <span>
              Current streak:{' '}
              <strong>
                {profile?.training_streak ?? 0} days
              </strong>
            </span>
          </div>
        </section>


        {/* ACTIVITY TREND */}

        <section className="cs-progress-section">
          <div className="cs-progress-heading cs-progress-heading-row">
            <div>
              <span>MOMENTUM</span>
              <h2>Your Training Activity</h2>

              <p>
                See how often you&apos;ve been putting in work.
              </p>
            </div>

            <div className="cs-progress-range-tabs">
              {[7, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  className={
                    range === days ? 'active' : ''
                  }
                  onClick={() => setRange(days)}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>

          <div className="cs-progress-period-summary">
            <div>
              <strong>
                {rangeData.currentSessions.length}
              </strong>
              <span>Attempts</span>
            </div>

            <div>
              <strong>{rangeData.currentDays}</strong>
              <span>Training Days</span>
            </div>

            <div>
              <strong>{rangeData.currentXp}</strong>
              <span>Training XP</span>
            </div>
          </div>

          <div className="cs-progress-chart">
            {chartData.map((day, index) => {
              const height =
                day.attempts === 0
                  ? 4
                  : Math.max(
                      (day.attempts / maxChartAttempts) * 100,
                      12
                    );

              const showLabel =
                range === 7 ||
                index === 0 ||
                index === chartData.length - 1 ||
                index %
                  Math.max(
                    Math.floor(chartData.length / 5),
                    1
                  ) ===
                  0;

              return (
                <div
                  className="cs-progress-chart-column"
                  key={day.key}
                  title={`${formatShortDate(
                    day.date
                  )}: ${day.attempts} attempts`}
                >
                  <div className="cs-progress-chart-bar-area">
                    <div
                      className={
                        day.attempts > 0
                          ? 'cs-progress-chart-bar active'
                          : 'cs-progress-chart-bar'
                      }
                      style={{ height: `${height}%` }}
                    />
                  </div>

                  <span>
                    {showLabel
                      ? formatShortDate(day.date)
                      : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </section>


        {/* MOST TRAINED */}

        <section className="cs-progress-section">
          <div className="cs-progress-heading">
            <div>
              <span>YOUR WORK</span>
              <h2>Where You&apos;ve Put In The Reps</h2>

              <p>
                These are the drills you&apos;ve returned to most.
              </p>
            </div>
          </div>

          {mostTrainedDrills.length > 0 ? (
            <div className="cs-progress-drill-list">
              {mostTrainedDrills.map((drill, index) => {
                const maxAttempts =
                  mostTrainedDrills[0]?.attempts || 1;

                const width =
                  (drill.attempts / maxAttempts) * 100;

                return (
                  <article
                    className="cs-progress-drill-row"
                    key={drill.key}
                  >
                    <div className="cs-progress-drill-rank">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="cs-progress-drill-info">
                      <div>
                        <span>{drill.category}</span>
                        <h3>{drill.name}</h3>
                      </div>

                      <strong>
                        {drill.attempts}{' '}
                        {drill.attempts === 1
                          ? 'attempt'
                          : 'attempts'}
                      </strong>

                      <div className="cs-progress-drill-track">
                        <div
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="cs-progress-empty">
              <Target size={30} />

              <h3>Your progress starts with one drill.</h3>

              <p>
                Complete training and your work will begin
                appearing here automatically.
              </p>
            </div>
          )}
        </section>


        {/* PROOF OF WORK */}

        <section className="cs-progress-section">
          <div className="cs-progress-heading">
            <div>
              <span>PROOF OF WORK</span>
              <h2>Your Recent Training</h2>

              <p>
                A permanent record of the work you&apos;ve put in.
              </p>
            </div>
          </div>

          {recentSessions.length > 0 ? (
            <div className="cs-progress-history">
              {recentSessions.map((session) => (
                <article
                  className="cs-progress-history-row"
                  key={session.id}
                >
                  <div className="cs-progress-history-icon">
                    <Target size={18} />
                  </div>

                  <div className="cs-progress-history-main">
                    <span>
                      {session.category || 'Ball Handling'}
                    </span>

                    <strong>
                      {session.drill_name ||
                        `Ball Handling Drill ${
                          session.drill_index + 1
                        }`}
                    </strong>

                    <small>
                      {formatFullDate(session.completed_at)}
                    </small>
                  </div>

                  <div className="cs-progress-history-reward">
                    {session.xp_awarded > 0 ? (
                      <>
                        <Zap size={14} />
                        +{session.xp_awarded} XP
                      </>
                    ) : (
                      <span>Extra practice</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="cs-progress-empty">
              <Trophy size={30} />

              <h3>No training history yet.</h3>

              <p>
                Your completed sessions will appear here.
              </p>
            </div>
          )}
        </section>


        {/* PERSONAL BESTS */}

<section className="cs-progress-section">
  <div className="cs-progress-heading">
    <div>
      <span>PERSONAL BESTS</span>
      <h2>Your Best Performances</h2>

      <p>
        Track your measurable results and watch your game
        improve over time.
      </p>
    </div>
  </div>

  {personalBests.length > 0 ? (
    <div className="cs-progress-pb-grid">
        {personalBests.length > 3 && (
  <button
    type="button"
    className="cs-progress-view-all-pb"
    onClick={() => navigate('/personal-bests')}
  >
    View All Personal Bests
    <ChevronRight size={16} />
  </button>
)}
      {personalBests.slice(0, 3).map((drill) => (
        <article
          className="cs-progress-pb-card"
          key={drill.key}
        >
          <div className="cs-progress-pb-top">
            <div className="cs-progress-pb-icon">
              <Trophy size={19} />
            </div>

            <span>{drill.category}</span>
          </div>

          <h3>{drill.name}</h3>

          <div className="cs-progress-pb-best">
            <span>PERSONAL BEST</span>

            <strong>
              {drill.best}
              <small> reps</small>
            </strong>
          </div>

          <div className="cs-progress-pb-stats">
            <div>
              <span>Latest</span>
              <strong>{drill.latest}</strong>
            </div>

            <div>
              <span>First</span>
              <strong>{drill.first}</strong>
            </div>

            <div>
              <span>Attempts</span>
              <strong>{drill.attempts}</strong>
            </div>
          </div>

          {drill.attempts > 1 && (
            <div
              className={
                drill.improvement > 0
                  ? 'cs-progress-pb-change positive'
                  : 'cs-progress-pb-change'
              }
            >
              {drill.improvement > 0
                ? `↑ +${drill.improvement} reps since your first result`
                : drill.improvement === 0
                  ? 'Match your best and keep pushing.'
                  : 'Keep working — your next PR is waiting.'}
            </div>
          )}
        </article>
      ))}
    </div>
  ) : (
    <div className="cs-progress-empty"> 
      <Award size={30} />

      <h3>Your first personal best is waiting.</h3>

      <p>
        Complete a measurable drill and your results will
        automatically appear here.
      </p>
    </div>
  )}
</section>


        {/* CTA */}

        <button
          type="button"
          className="cs-progress-train-cta"
          onClick={() => navigate('/workout')}
        >
          <span>
            <Flame size={21} />

            <span>
              <strong>Keep building your story.</strong>
              Your next session becomes part of this record.
            </span>
          </span>

          <span>
            Train Now
            <ChevronRight size={17} />
          </span>
        </button>

      </div>
    </main>
  );
}