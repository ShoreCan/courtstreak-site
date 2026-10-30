import {loadAccountUser,accountLoginPath} from '../lib/accountFlow.mjs';
// CourtStreak quality update v1
import { comparisonGroups, resultValue as metricValue } from '../lib/trainingMetrics.js';
import { loadResultContexts, loadTrainingHistory } from '../lib/resultContext.js';
import ShareTraining from '../components/ShareTraining.jsx';
import usePreviewNavigate from '../lib/usePreviewNavigate.js';
import { PREVIEW_PROFILE, PREVIEW_STATS, PREVIEW_EARNED_ACHIEVEMENTS, previewSessions } from '../lib/previewData.js';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import '../progress-visuals.css';

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;

function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek(value = new Date()) {
  const date = startOfDay(value);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date;
}

function dateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function resultValue(session) {
  return metricValue(session) ?? 0;
}

function resultLabel(session) {
  if (!session) return '—';
  if (metricValue(session) === null) return 'Completed';
  const value = resultValue(session);
  return `${value.toLocaleString()} ${session.reps != null ? 'reps' : 'points'}`;
}

function shortDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}

export default function Progress({ previewOnly = false }) {
  const navigate = usePreviewNavigate(previewOnly);
  const [profile, setProfile] = useState(null);
  const [verifiedStats, setVerifiedStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [achievementCount, setAchievementCount] = useState(0);
  const [selectedDrill, setSelectedDrill] = useState('');
  const [contextsAvailable, setContextsAvailable] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(dateKey(new Date()));
  const [calendarPage, setCalendarPage] = useState(0);
  const [selectedPerformanceIndex, setSelectedPerformanceIndex] = useState(0);
  const [mobileCalendarSummaryOpen, setMobileCalendarSummaryOpen] = useState(false);
  const [progressView, setProgressView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProgress() {
      if (previewOnly) {
        const history = previewSessions();
        setProfile(PREVIEW_PROFILE); setVerifiedStats(PREVIEW_STATS); setSessions(history);
        setAchievementCount(PREVIEW_EARNED_ACHIEVEMENTS.length); setSelectedDrill(comparisonGroups(history).at(-1)?.key || ''); setLoading(false); return;
      }
      if (!supabase) {
        setErrorMessage('CourtStreak could not connect to Supabase.');
        setLoading(false);
        return;
      }

      const user = await loadAccountUser(supabase);
      if (!active) return;
      if (!user) {
        navigate(accountLoginPath('/progress'), {replace:true});
        return;
      }

      await supabase.rpc('refresh_training_streak');

      const [profileResult, statsResult, sessionResult, achievementResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name, last_name, xp, level, training_streak, best_training_streak, workouts_completed, weekly_workouts, weekly_goal')
          .eq('id', user.id)
          .single(),
        supabase.rpc('get_my_courtstreak_stats'),
        loadTrainingHistory(user.id),
        supabase
          .from('player_achievements')
          .select('achievement_id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);

      if (!active) return;
      if (profileResult.error) {
        console.error(profileResult.error);
        setErrorMessage('CourtStreak could not load your progress.');
        setLoading(false);
        return;
      }

      if (statsResult.error) { setErrorMessage('Your training totals could not load. Please try again.'); setLoading(false); return; }
      if (sessionResult.error) { setErrorMessage('Your training history could not load. Your saved results are unchanged.'); setLoading(false); return; }
      if (achievementResult.error) { setErrorMessage('Your achievements could not load. Please retry.'); setLoading(false); return; }

      const context = await loadResultContexts(user.id, sessionResult.data ?? []);
      if (!active) return;
      const history = context.sessions;
      setContextsAvailable(context.available);
      const scoredHistory = history.filter((session) => resultValue(session) > 0);
      setProfile(profileResult.data);
      setVerifiedStats(statsResult.data?.[0] ?? statsResult.data ?? null);
      setSessions(history);
      setAchievementCount(achievementResult.count ?? 0);
      setSelectedDrill(comparisonGroups(history).at(-1)?.key || '');
      setLoading(false);
    }

    setLoading(true); setErrorMessage('');
    loadProgress().catch(() => { if (active) { setErrorMessage('Your progress could not load. Please retry.'); setLoading(false); } });
    return () => { active = false; };
  }, [navigate, previewOnly, loadAttempt]);

  const stats = verifiedStats ?? profile ?? {};
  const playerLevel = Number(stats.level ?? 1);
  const totalXp = Number(stats.xp ?? 0);
  const levelProgress = Math.max(0, Math.min(100, Number(stats.level_progress_percent ?? 0)));
  const xpToNext = Number(stats.xp_needed_for_next_level ?? 0);
  const currentStreak = Number(stats.training_streak ?? 0);
  const bestStreak = Number(stats.best_training_streak ?? 0);
  const workouts = Number(stats.workouts_completed ?? 0);
  const weeklyWorkouts = Number(stats.weekly_workouts ?? 0);
  const weeklyGoal = Math.max(1, Number(stats.weekly_goal ?? 5));
  const weeklyPercent = Math.min(100, Math.round((weeklyWorkouts / weeklyGoal) * 100));

  const drillOptions = useMemo(() => comparisonGroups(sessions), [sessions]);
  const selectedGroup = drillOptions.find(group => group.key === selectedDrill);
  const excludedResults = sessions.filter(session => metricValue(session) !== null).length - drillOptions.reduce((sum, group) => sum + group.count, 0);

  const currentWeekDays = useMemo(() => {
    const weekStart = startOfWeek();
    const counts = new Map();
    sessions.forEach((session) => {
      const completed = new Date(session.completed_at);
      if (completed >= weekStart && completed < new Date(weekStart.getTime() + WEEK)) {
        const key = dateKey(completed);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index);
      return {
        key: dateKey(date),
        label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][index],
        count: counts.get(dateKey(date)) ?? 0,
        isToday: dateKey(date) === dateKey(new Date()),
        isFuture: date > startOfDay(),
      };
    });
  }, [sessions]);

  const calendarWeeks = useMemo(() => {
    const today = startOfDay();
    const calendarStart = new Date(startOfWeek(today).getTime() - 3 * WEEK + calendarPage * 4 * WEEK);
    const dailyCounts = new Map();
    sessions.forEach((session) => {
      const key = dateKey(session.completed_at);
      dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
    });
    return Array.from({ length: 4 }, (_, weekIndex) => ({
      label: shortDate(new Date(calendarStart.getTime() + weekIndex * WEEK)),
      days: Array.from({ length: 7 }, (_, dayIndex) => {
        const date = new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + weekIndex * 7 + dayIndex);
        return {
          date,
          key: dateKey(date),
          count: dailyCounts.get(dateKey(date)) ?? 0,
          isFuture: date > today,
          isToday: dateKey(date) === dateKey(today),
        };
      }),
    }));
  }, [sessions, calendarPage]);

  const calendarDays = calendarWeeks.flatMap((week) => week.days);
  const calendarMaxDailyCount = Math.max(1, ...calendarDays.map((day) => day.count));
  const elapsedCalendarDays = calendarDays.filter((day) => !day.isFuture);
  const activeDays = elapsedCalendarDays.filter((day) => day.count > 0).length;
  const selectedDay = calendarDays.find((day) => day.key === selectedCalendarDate) ?? calendarDays.at(-1);
  const selectedDaySessions = sessions.filter((session) => dateKey(session.completed_at) === selectedDay?.key);
  const calendarRangeStart = calendarDays[0]?.date;
  const calendarRangeEnd = calendarDays.at(-1)?.date;
  const calendarSessionCount = elapsedCalendarDays.reduce((total, day) => total + day.count, 0);
  const averagePerActiveDay = activeDays ? (calendarSessionCount / activeDays).toFixed(1) : '0';
  const mostActiveDay = elapsedCalendarDays.reduce(
    (best, day) => day.count > (best?.count ?? 0) ? day : best,
    null
  );
  const currentFourWeekStart = new Date(startOfWeek().getTime() - 3 * WEEK);
  const currentActiveDays = new Set(
    sessions
      .filter((session) => {
        const completed = new Date(session.completed_at);
        return completed >= currentFourWeekStart && completed <= new Date();
      })
      .map((session) => dateKey(session.completed_at))
  ).size;

  const matchingHistory = selectedGroup?.sessions || [];
  const selectedHistory = matchingHistory.slice(-12);

  useEffect(() => {
    setSelectedPerformanceIndex(Math.max(0, selectedHistory.length - 1));
  }, [selectedDrill, selectedHistory.length]);

  const chart = useMemo(() => {
    if (!selectedHistory.length) return null;
    const values = selectedHistory.map(resultValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = Math.max(1, max - min);
    const left = 56;
    const right = 692;
    const top = 28;
    const bottom = 205;
    const points = values.map((value, index) => ({
      x: values.length === 1 ? (left + right) / 2 : left + (index / (values.length - 1)) * (right - left),
      y: max === min ? (top + bottom) / 2 : bottom - ((value - min) / spread) * (bottom - top),
      value,
    }));
    const line = points.map((point) => `${point.x},${point.y}`).join(' ');
    const area = `${left},${bottom} ${line} ${right},${bottom}`;
    return { points, line, area, min, max };
  }, [selectedHistory]);

  const latestResult = selectedHistory.at(-1);
  const bestResult = matchingHistory.length
    ? matchingHistory.reduce((best, session) => resultValue(session) > resultValue(best) ? session : best)
    : null;
  const firstValue = resultValue(selectedHistory[0]);
  const latestValue = resultValue(latestResult);
  const improvement = firstValue > 0 ? Math.round(((latestValue - firstValue) / firstValue) * 100) : 0;
  const safePerformanceIndex = Math.min(selectedPerformanceIndex, Math.max(0, selectedHistory.length - 1));
  const selectedPerformanceResult = selectedHistory[safePerformanceIndex] ?? latestResult;
  const selectedPerformanceValue = resultValue(selectedPerformanceResult);
  const previousPerformanceValue = safePerformanceIndex > 0
    ? resultValue(selectedHistory[safePerformanceIndex - 1])
    : null;
  const selectedPerformanceDelta = previousPerformanceValue == null
    ? null
    : selectedPerformanceValue - previousPerformanceValue;
  const selectedChartPoint = chart?.points[safePerformanceIndex];
  const selectedTooltipX = selectedChartPoint
    ? Math.max(92, Math.min(650, selectedChartPoint.x))
    : 92;

  function selectPerformanceFromPointer(event) {
    if (selectedHistory.length < 2) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const chartLeft = bounds.left + bounds.width * (56 / 720);
    const chartRight = bounds.left + bounds.width * (692 / 720);
    const ratio = Math.max(0, Math.min(1, (event.clientX - chartLeft) / (chartRight - chartLeft)));
    setSelectedPerformanceIndex(Math.round(ratio * (selectedHistory.length - 1)));
  }

  function changeCalendarPage(nextPage) {
    const safePage = Math.min(0, nextPage);
    const today = startOfDay();
    const pageStart = new Date(startOfWeek(today).getTime() - 3 * WEEK + safePage * 4 * WEEK);
    const pageEnd = new Date(pageStart.getTime() + 27 * DAY);
    setCalendarPage(safePage);
    setSelectedCalendarDate(dateKey(safePage === 0 ? today : pageEnd));
  }

  if (loading) {
    return <main className="cs-progress-page cs-progress-status"><p>Building your progress view…</p></main>;
  }

  if (errorMessage) {
    return (
      <main className="cs-progress-page cs-progress-status">
        <p>{errorMessage}</p>
        <button type="button" onClick={() => setLoadAttempt(value => value + 1)}>Try again</button>
        <button type="button" onClick={() => navigate('/dashboard')}>Dashboard</button>
      </main>
    );
  }

  return (
    <main className="cs-progress-page">
      <header className="cs-progress-topbar">
        <button type="button" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} /> Dashboard
        </button>
        <Link to="/" className="cs-progress-brand">CourtStreak</Link>
        <span>PLAYER PROGRESS</span>
      </header>

      <div className="cs-progress-shell">
        <section className="cs-progress-hero">
          <div className="cs-progress-hero-copy">
            <span className="cs-progress-eyebrow">YOUR DEVELOPMENT</span>
            <h1>Your work, in motion.</h1>
            <p>A visual record of the consistency, reps, and breakthroughs you are building over time.</p>
          </div>

          <div className="cs-progress-level-panel">
            <div className="cs-progress-level-ring" style={{ '--progress': `${levelProgress}%` }}>
              <div><small>LEVEL</small><strong>{playerLevel}</strong></div>
            </div>
            <div>
              <span>PLAYER PROGRESS</span>
              <strong>{totalXp.toLocaleString()} XP</strong>
              <p>{xpToNext ? `${xpToNext.toLocaleString()} XP to Level ${playerLevel + 1}` : 'Keep training to reach the next level'}</p>
            </div>
          </div>
        </section>

        <nav className="cs-progress-view-switcher" aria-label="Progress views">
          <button type="button" className={progressView === 'overview' ? 'active' : ''} onClick={() => setProgressView('overview')}><BarChart3 />Overview</button>
          <button type="button" className={progressView === 'activity' ? 'active' : ''} onClick={() => setProgressView('activity')}><CalendarDays />Activity</button>
        </nav>

        {progressView === 'overview' ? <div className="cs-progress-view-panel">
        <section className="cs-progress-kpis" aria-label="Progress summary">
          <article><BarChart3 /><div><strong>{workouts}</strong><span>Total workouts</span></div></article>
          <article><Flame /><div><strong>{currentStreak}</strong><span>Current streak</span></div></article>
          <article><Trophy /><div><strong>{achievementCount}</strong><span>Achievements</span></div></article>
          <article><CalendarDays /><div><strong>{currentActiveDays}</strong><span>Active days · current 4 weeks</span></div></article>
        </section>

        <section className="cs-progress-week-pulse" aria-label="Weekly goal progress">
          <div className="cs-progress-week-score">
            <span>WEEKLY PACE</span>
            <strong>{weeklyWorkouts}<small> / {weeklyGoal}</small></strong>
            <p>{weeklyPercent >= 100 ? 'Goal complete — every extra session builds momentum.' : `${Math.max(0, weeklyGoal - weeklyWorkouts)} more ${Math.max(0, weeklyGoal - weeklyWorkouts) === 1 ? 'workout' : 'workouts'} to reach your goal.`}</p>
          </div>
          <div className="cs-progress-week-track">
            <div><span style={{ width: `${weeklyPercent}%` }} /></div>
            <small>{weeklyPercent}% complete</small>
          </div>
          <div className="cs-progress-week-days" aria-label="Training activity this week">
            {currentWeekDays.map((day) => (
              <div className={`${day.count ? 'trained' : ''} ${day.isToday ? 'today' : ''} ${day.isFuture ? 'future' : ''}`} key={day.key}>
                <span style={{ '--day-strength': Math.min(1, day.count / 3) }}>{day.count || ''}</span>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
          <div className="cs-progress-week-streak"><Flame /><span>Current streak<strong>{currentStreak} days</strong></span><small>Best {bestStreak}</small></div>
        </section>

        <section className="cs-progress-card cs-progress-performance-card cs-progress-overview-performance">
          <div className="cs-progress-performance-top">
            <div className="cs-progress-card-heading">
              <div>
                <span>DRILL PERFORMANCE</span>
                <h2>See every step forward</h2>
                <p>Choose a drill, then drag across the timeline to compare attempts with the same drill, timer, counting rule, and recording method.</p>
              </div>
            </div>
            <label className="cs-progress-drill-select">
              <span className="cs-progress-sr-only">Choose a drill</span>
              <select value={selectedDrill} onChange={(event) => setSelectedDrill(event.target.value)} disabled={!drillOptions.length}>
                {!drillOptions.length && <option>No completed drills yet</option>}
                {drillOptions.map((drill) => <option value={drill.key} key={drill.key}>{drill.name}</option>)}
              </select>
              <ChevronDown size={17} />
            </label>
          </div>

          {(!contextsAvailable || excludedResults > 0) && <p className="cs-comparison-note">{!contextsAvailable ? 'Comparison details could not load. Saved history is still available.' : `${excludedResults} older results remain in your calendar; missing comparison details exclude them from trends.`}</p>}
          {chart ? (
            <div className="cs-progress-performance-layout">
              <div className="cs-progress-chart-wrap">
                <div className="cs-progress-chart-instruction"><span>DRAG TO EXPLORE</span><small>Attempt {safePerformanceIndex + 1} of {selectedHistory.length}</small></div>
                <svg
                  viewBox="0 0 720 240"
                  role="img"
                  aria-label={`${selectedDrill} result trend. Selected attempt ${safePerformanceIndex + 1} scored ${selectedPerformanceValue}.`}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    selectPerformanceFromPointer(event);
                  }}
                  onPointerMove={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) selectPerformanceFromPointer(event);
                  }}
                  onPointerUp={(event) => {
                    selectPerformanceFromPointer(event);
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                >
                  <defs>
                    <linearGradient id="progressArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff7426" stopOpacity=".34" />
                      <stop offset="100%" stopColor="#ff7426" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <text x="45" y="32" textAnchor="end" className="cs-progress-chart-number">{chart.max}</text>
                  <text x="45" y="120" textAnchor="end" className="cs-progress-chart-number">{Math.round((chart.max + chart.min) / 2)}</text>
                  <text x="45" y="209" textAnchor="end" className="cs-progress-chart-number">{chart.min}</text>
                  <line x1="56" y1="205" x2="692" y2="205" className="cs-progress-chart-axis" />
                  <line x1="56" y1="116" x2="692" y2="116" className="cs-progress-chart-gridline" />
                  <line x1="56" y1="28" x2="692" y2="28" className="cs-progress-chart-gridline" />
                  <polygon points={chart.area} fill="url(#progressArea)" />
                  <polyline points={chart.line} className="cs-progress-chart-line" />
                  {selectedChartPoint && <line x1={selectedChartPoint.x} y1="24" x2={selectedChartPoint.x} y2="205" className="cs-progress-chart-cursor" />}
                  {chart.points.map((point, index) => (
                    <circle key={index} cx={point.x} cy={point.y} r={index === safePerformanceIndex ? 8 : 5} className={`cs-progress-chart-point ${index === safePerformanceIndex ? 'selected' : ''}`} />
                  ))}
                  {selectedChartPoint && (
                    <g transform={`translate(${selectedTooltipX},${Math.max(20, selectedChartPoint.y - 34)})`} className="cs-progress-chart-tooltip">
                      <rect x="-38" y="-17" width="76" height="30" rx="9" />
                      <text x="0" y="4" textAnchor="middle">{selectedPerformanceValue}</text>
                    </g>
                  )}
                </svg>
                <div className="cs-progress-chart-dates"><span>{shortDate(selectedHistory[0].completed_at)}</span><span>{shortDate(selectedHistory.at(-1).completed_at)}</span></div>
                <div className="cs-progress-scrubber">
                  <input type="range" min="0" max={Math.max(0, selectedHistory.length - 1)} step="1" value={safePerformanceIndex} onChange={(event) => setSelectedPerformanceIndex(Number(event.target.value))} disabled={selectedHistory.length < 2} aria-label={`Select a ${selectedDrill} attempt`} />
                  <div><span>First attempt</span><strong>Drag to review your scores</strong><span>Latest</span></div>
                </div>
              </div>
              <div className="cs-progress-result-summary">
                <div className="selected-attempt">
                  <span>SELECTED ATTEMPT</span>
                  <strong>{resultLabel(selectedPerformanceResult)}</strong>
                  <p>{selectedPerformanceResult ? shortDate(selectedPerformanceResult.completed_at) : 'No date'} · Attempt {safePerformanceIndex + 1}</p>
                  <em className={selectedPerformanceDelta == null || selectedPerformanceDelta >= 0 ? 'positive' : 'negative'}>
                    {selectedPerformanceDelta == null ? 'Starting result' : selectedPerformanceDelta === 0 ? 'Same as previous' : `${selectedPerformanceDelta > 0 ? '+' : ''}${selectedPerformanceDelta} from previous`}
                  </em>
                </div>
                {!previewOnly && selectedPerformanceResult && <ShareTraining text={`CourtStreak: ${selectedPerformanceResult.drill_name} · ${selectedPerformanceResult.duration_seconds}s · ${resultLabel(selectedPerformanceResult)} · Self-reported result.`} />}
                <div><span>BEST MATCHING RESULT</span><strong>{resultLabel(bestResult)}</strong></div>
                <div><span>LATEST RESULT</span><strong>{resultLabel(latestResult)}</strong></div>
                <div className={improvement >= 0 ? 'positive' : 'negative'}><span>CHANGE</span><strong>{improvement > 0 ? '+' : ''}{improvement}%</strong></div>
                <small>Trend uses your last {selectedHistory.length} recorded {selectedHistory.length === 1 ? 'result' : 'results'}.</small>
              </div>
            </div>
          ) : (
            <div className="cs-progress-empty-state">
              <TrendingUp />
              <div><strong>Your first trend is waiting.</strong><p>Save an attempt with comparison details to start a fair trend. Older results stay in Activity.</p></div>
            </div>
          )}
        </section>
        </div> : null}

        {progressView === 'activity' ? <div className="cs-progress-view-panel">
        <section className="cs-progress-grid cs-progress-grid-secondary">
          <article className="cs-progress-card cs-progress-consistency-card">
            <div className="cs-progress-calendar-title-row">
              <div className="cs-progress-card-heading">
                <div>
                  <span>TRAINING CALENDAR</span>
                  <h2>Days you showed up</h2>
                  <p>Select a day to review saved drills and results.</p>
                </div>
              </div>

              <div className="cs-progress-calendar-navigation">
                <button type="button" onClick={() => changeCalendarPage(calendarPage - 1)} aria-label="Show the previous four weeks">
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <span>{calendarPage === 0 ? 'CURRENT FOUR WEEKS' : `${Math.abs(calendarPage) * 4}–${Math.abs(calendarPage) * 4 + 3} WEEKS AGO`}</span>
                  <strong>{calendarRangeStart && calendarRangeEnd ? `${shortDate(calendarRangeStart)} – ${shortDate(calendarRangeEnd)}` : 'Four-week history'}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => changeCalendarPage(calendarPage + 1)}
                  disabled={calendarPage === 0}
                  aria-label="Show the next four weeks"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="cs-progress-calendar-layout">
              <div>
                <div className="cs-progress-calendar" aria-label={`${activeDays} active training days during the selected four weeks`}>
                  <div className="cs-progress-calendar-head" aria-hidden="true">
                    <span />
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
                  </div>
                  {calendarWeeks.map((week) => (
                    <div className="cs-progress-calendar-row" key={week.label}>
                      <small>{week.label}</small>
                      {week.days.map((day) => (
                        <button
                          type="button"
                          key={day.key}
                          disabled={day.isFuture}
                          onClick={() => setSelectedCalendarDate(day.key)}
                          className={[
                            day.count ? `trained level-${Math.min(4, Math.max(1, Math.ceil((day.count / calendarMaxDailyCount) * 4)))}` : 'rest',
                            day.isFuture ? 'future' : '',
                            day.isToday ? 'today' : '',
                            selectedCalendarDate === day.key ? 'selected' : '',
                          ].join(' ')}
                          aria-label={`${shortDate(day.date)}: ${day.isFuture ? 'upcoming' : `${day.count} training ${day.count === 1 ? 'session' : 'sessions'}`}`}
                        >
                          <span>{day.date.getDate()}</span>
                          {day.count > 0 && <strong>{day.count}</strong>}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="cs-progress-calendar-summary">
                  <div>
                    <span>{selectedDay ? new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(selectedDay.date) : 'Selected day'}</span>
                    <strong>{selectedDay?.count ?? 0} training {(selectedDay?.count ?? 0) === 1 ? 'session' : 'sessions'}</strong>
                  </div>
                  <ul className="cs-day-results">{sessions.filter(session => dateKey(session.completed_at) === selectedDay?.key).map(session => <li key={session.id}><span>{session.drill_name}<small>{session.duration_seconds ? `${session.duration_seconds}s · ` : ''}{session.verification_mode === 'manual' ? 'Self-reported' : 'Recording details unavailable'}</small></span><strong>{resultLabel(session)}</strong></li>)}</ul>
                  <p><i /> Lighter = less work <i /> Darker = more work</p>
                </div>
                <div className="cs-progress-day-results" aria-live="polite">
                  {selectedDaySessions.length ? <ul>{selectedDaySessions.map((session) => (
                    <li key={session.id}><strong>{session.drill_name || session.category || 'Training session'}</strong><span>{session.reps != null ? `${session.reps} reps` : session.score != null ? `${session.score} score` : 'Completed'}</span></li>
                  ))}</ul> : <p>No training recorded on this date.</p>}
                </div>
              </div>

              <button
                type="button"
                className="cs-progress-mobile-summary-toggle"
                aria-expanded={mobileCalendarSummaryOpen}
                onClick={() => setMobileCalendarSummaryOpen((open) => !open)}
              >
                <span>Four-week summary</span>
                <ChevronDown size={17} className={mobileCalendarSummaryOpen ? 'open' : ''} />
              </button>

              <aside className={`cs-progress-calendar-overview ${mobileCalendarSummaryOpen ? 'mobile-open' : ''}`}>
                <span>FOUR-WEEK OVERVIEW</span>
                <h3>{calendarPage === 0 ? 'Your recent consistency' : 'Your history at a glance'}</h3>
                <div className="cs-progress-calendar-metrics">
                  <div><strong>{calendarSessionCount}</strong><span>Training sessions</span></div>
                  <div><strong>{activeDays}</strong><span>Active days</span></div>
                  <div><strong>{averagePerActiveDay}</strong><span>Sessions per active day</span></div>
                </div>
                <div className="cs-progress-calendar-highlight">
                  <CalendarDays size={19} />
                  <div>
                    <span>MOST ACTIVE DAY</span>
                    <strong>
                      {mostActiveDay?.count
                        ? `${shortDate(mostActiveDay.date)} · ${mostActiveDay.count} ${mostActiveDay.count === 1 ? 'session' : 'sessions'}`
                        : 'No sessions recorded'}
                    </strong>
                  </div>
                </div>
                {calendarPage < 0 && (
                  <button type="button" className="cs-progress-return-current" onClick={() => changeCalendarPage(0)}>
                    Return to current weeks <ChevronRight size={16} />
                  </button>
                )}
              </aside>
            </div>
          </article>
        </section>
        </div> : null}

      </div>
    </main>
  );
}
