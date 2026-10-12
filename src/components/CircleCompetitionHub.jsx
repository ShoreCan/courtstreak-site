import React, { useEffect, useMemo, useState } from 'react';
import usePreviewNavigate from '../lib/usePreviewNavigate.js';
import {
  Activity,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Crown,
  Dumbbell,
  Flame,
  Medal,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import { WORKOUT_PROGRAMS } from '../data/workoutPrograms.js';
import '../circle-competition.css';

const AWARD_META = {
  workhorse: { label: 'Workhorse', detail: 'Most verified training minutes', Icon: Dumbbell },
  consistency: { label: 'Consistency Champion', detail: 'Most qualifying training days', Icon: Flame },
  improvement: { label: 'Most Improved', detail: 'Strongest eligible progress', Icon: Activity },
  challenge: { label: 'Challenge Champion', detail: 'Most Circle challenge wins', Icon: Trophy },
};

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'champions', label: 'Champions' },
];

function formatDeadline(value) {
  if (!value) return 'No deadline';
  const date = new Date(value);
  const hours = Math.ceil((date.getTime() - Date.now()) / 3600000);
  if (hours <= 0) return 'Closed';
  if (hours < 24) return `${hours}h left`;
  return `${Math.ceil(hours / 24)}d left`;
}

function sourceLabel(type) {
  if (type === 'drill') return 'Drill';
  if (type === 'custom_workout') return 'Custom workout';
  return 'Workout';
}

export default function CircleCompetitionHub({
  circle,
  members,
  currentUserId,
  initialDraft,
  showFeedback,
  previewOnly = false,
}) {
  const navigate = usePreviewNavigate(previewOnly);
  const [activeTab, setActiveTab] = useState(initialDraft ? 'challenges' : 'today');
  const [loading, setLoading] = useState(true);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [entries, setEntries] = useState([]);
  const [awards, setAwards] = useState([]);
  const [pulse, setPulse] = useState(null);
  const [createOpen, setCreateOpen] = useState(Boolean(initialDraft));
  const [draft, setDraft] = useState(initialDraft ?? null);
  const [targetUserId, setTargetUserId] = useState('circle');
  const [deadlineHours, setDeadlineHours] = useState(48);
  const [creating, setCreating] = useState(false);
  const [sourceType, setSourceType] = useState('workout');
  const [sourceKey, setSourceKey] = useState(WORKOUT_PROGRAMS[0]?.key ?? '');
  const [drills, setDrills] = useState([]);
  const [customWorkouts, setCustomWorkouts] = useState([]);

  const memberMap = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members]
  );

  const entryMap = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => {
      const list = map.get(entry.challenge_id) ?? [];
      list.push(entry);
      map.set(entry.challenge_id, list);
    });
    return map;
  }, [entries]);

  const selectedSource = useMemo(() => {
    if (draft) return draft;
    if (sourceType === 'drill') {
      const item = drills.find((candidate) => candidate.drill_key === sourceKey);
      return item ? {
        sourceType: 'drill',
        sourceKey: item.drill_key,
        sourceName: item.name,
        sourcePayload: { durationSeconds: item.default_duration_seconds },
        challengeType: 'score',
      } : null;
    }
    if (sourceType === 'custom_workout') {
      const item = customWorkouts.find((candidate) => candidate.workout_key === sourceKey);
      return item ? {
        sourceType: 'custom_workout',
        sourceKey: item.workout_key,
        sourceName: item.name,
        sourcePayload: { program: item.workout_data },
        challengeType: 'score',
      } : null;
    }
    const item = WORKOUT_PROGRAMS.find((candidate) => candidate.key === sourceKey);
    return item ? {
      sourceType: 'workout',
      sourceKey: item.key,
      sourceName: item.name,
      sourcePayload: { durationMinutes: item.durationMinutes },
      challengeType: 'score',
    } : null;
  }, [draft, drills, customWorkouts, sourceKey, sourceType]);

  async function loadCompetition() {
    if (previewOnly) {
      const sample={id:'sample-challenge',circle_id:'sample-crew',creator_id:'alex',source_type:'drill',source_key:'crossovers',source_name:'Crossovers',source_payload:{durationSeconds:60},challenge_type:'score',duration_seconds:60,status:'active',verification_mode:'manual',expires_at:new Date(Date.now()+86400000).toISOString()};
      setDailyChallenge(sample); setChallenges([sample]);
      setEntries([{id:'sample-entry',challenge_id:sample.id,user_id:'alex',status:'completed',score:52,verification_mode:'manual'}]);
      setAwards([]); setPulse(null); setLoading(false); return;
    }
    if (!circle?.id || !currentUserId) return;
    setLoading(true);

    // Safe to call repeatedly: database uniqueness rules award each completed
    // weekly title only once and prevent multi-Circle XP duplication.
    await supabase.rpc('finalize_circle_weekly_awards', { p_circle_id: circle.id });

    const [dailyResult, challengeResult, awardResult, pulseResult, drillResult, customResult] = await Promise.all([
      supabase.rpc('get_or_create_circle_daily_challenge', { p_circle_id: circle.id }),
      supabase.from('circle_challenges').select('*').eq('circle_id', circle.id).in('status', ['active', 'completed']).order('created_at', { ascending: false }).limit(30),
      supabase.rpc('get_training_circle_weekly_awards', { p_circle_id: circle.id }),
      supabase.rpc('get_training_circle_pulse', { p_circle_id: circle.id }),
      supabase.from('drills').select('drill_key, name, default_duration_seconds').eq('status', 'active').order('display_order').limit(100),
      supabase.from('custom_workouts').select('workout_key, name, workout_data').eq('user_id', currentUserId).eq('is_archived', false).order('updated_at', { ascending: false }),
    ]);

    const competitionError = dailyResult.error || challengeResult.error || awardResult.error || pulseResult.error;
    if (competitionError) {
      console.error('Could not load Circle competition:', competitionError);
      showFeedback?.('error', 'Run the Circle competition SQL to activate challenges and weekly champions.');
      setLoading(false);
      return;
    }

    const loadedChallenges = challengeResult.data ?? [];
    const challengeIds = loadedChallenges.map((challenge) => challenge.id);
    let loadedEntries = [];
    if (challengeIds.length) {
      const entryResult = await supabase
        .from('circle_challenge_entries')
        .select('*')
        .in('challenge_id', challengeIds)
        .order('completed_at', { ascending: true });
      if (!entryResult.error) loadedEntries = entryResult.data ?? [];
    }

    setDailyChallenge(dailyResult.data?.[0] ?? null);
    setChallenges(loadedChallenges);
    setEntries(loadedEntries);
    setAwards(awardResult.data ?? []);
    setPulse(pulseResult.data?.[0] ?? null);
    setDrills(drillResult.data ?? []);
    setCustomWorkouts(customResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void loadCompetition();
  }, [circle?.id, currentUserId, previewOnly]);

  useEffect(() => {
    if (!initialDraft) return;
    setDraft(initialDraft);
    setCreateOpen(true);
    setActiveTab('challenges');
  }, [initialDraft]);

  function openBuilder() {
    if (previewOnly) { navigate("/preview/membership"); return; }
    setDraft(null);
    setSourceType('workout');
    setSourceKey(WORKOUT_PROGRAMS[0]?.key ?? '');
    setTargetUserId('circle');
    setDeadlineHours(48);
    setCreateOpen(true);
  }

  async function createChallenge() {
    if (previewOnly) { navigate("/preview/membership"); return; }
    if (!selectedSource || creating) return;
    setCreating(true);
    const { data, error } = await supabase.rpc('create_circle_challenge', {
      p_circle_id: circle.id,
      p_target_user_id: targetUserId === 'circle' ? null : targetUserId,
      p_source_type: selectedSource.sourceType,
      p_source_key: selectedSource.sourceKey,
      p_source_name: selectedSource.sourceName,
      p_source_payload: selectedSource.sourcePayload ?? {},
      p_challenge_type: selectedSource.challengeType ?? 'score',
      p_duration_seconds: selectedSource.sourcePayload?.durationSeconds ?? null,
      p_deadline_hours: deadlineHours,
      p_baseline_score: selectedSource.baselineScore ?? null,
      p_verification_mode: 'manual',
    });
    setCreating(false);
    if (error) {
      console.error('Could not create challenge:', error);
      showFeedback?.('error', error.message || 'Challenge could not be created.');
      return;
    }
    setCreateOpen(false);
    setDraft(null);
    showFeedback?.('success', 'Challenge sent. The Circle can accept it now.');
    await loadCompetition();
    return data;
  }

  async function acceptChallenge(challenge) {
    if (previewOnly) { navigate("/preview/membership"); return; }
    const { error } = await supabase.rpc('accept_circle_challenge', { p_challenge_id: challenge.id });
    if (error) {
      showFeedback?.('error', error.message || 'Challenge could not be accepted.');
      return;
    }
    await loadCompetition();
    startChallenge(challenge);
  }

  function startChallenge(challenge) {
    if (previewOnly) { navigate("/preview/membership"); return; }
    const state = {
      circleChallenge: {
        id: challenge.id,
        circleId: circle.id,
        circleName: circle.name,
        sourceType: challenge.source_type,
        sourceKey: challenge.source_key,
        sourceName: challenge.source_name,
        sourcePayload: challenge.source_payload ?? {},
      },
    };
    if (challenge.source_type === 'drill') {
      navigate(`/lab/drill/${challenge.source_key}/session`, { state });
      return;
    }
    navigate('/workout', { state });
  }

  function challengeAction(challenge) {
    const challengeEntries = entryMap.get(challenge.id) ?? [];
    const ownEntry = challengeEntries.find((entry) => entry.user_id === currentUserId);
    const isEligible = !challenge.target_user_id || challenge.target_user_id === currentUserId || challenge.creator_id === currentUserId;
    if (!isEligible) return <span className="cs-competition-waiting">Direct challenge</span>;
    if (ownEntry?.status === 'completed') return <span className="cs-competition-complete"><Check /> Completed</span>;
    if (ownEntry?.status === 'accepted') return <button onClick={() => startChallenge(challenge)}>Start <ChevronRight /></button>;
    return <button onClick={() => acceptChallenge(challenge)}>Accept <ChevronRight /></button>;
  }

  const activeChallenges = challenges.filter((challenge) => challenge.status === 'active');
  const incomingChallenge = activeChallenges.find((challenge) => {
    const challengeEntries = entryMap.get(challenge.id) ?? [];
    const ownEntry = challengeEntries.find((entry) => entry.user_id === currentUserId);
    const eligible = !challenge.target_user_id || challenge.target_user_id === currentUserId;
    const postedScore = challengeEntries.some((entry) => entry.status === 'completed' && entry.user_id !== currentUserId);
    return eligible && !ownEntry && postedScore;
  });
  const incomingEntries = incomingChallenge ? (entryMap.get(incomingChallenge.id) ?? []) : [];
  const incomingLeader = [...incomingEntries]
    .filter((entry) => entry.status === 'completed')
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))[0];
  const incomingPlayer = incomingLeader ? memberMap.get(incomingLeader.user_id) : null;

  return (
    <section className="cs-competition-hub">
      <header className="cs-competition-header">
        <div className="cs-competition-title-lockup">
          <span className="cs-competition-title-mark"><Trophy /></span>
          <div>
            <span>CIRCLE COMPETITION</span>
            <h2>Train together. Earn your spot.</h2>
            <p>Real workouts, clearly labeled results, and four meaningful ways to lead.</p>
          </div>
        </div>
        <button type="button" className="cs-competition-create" onClick={openBuilder}><Plus /> Create challenge</button>
      </header>

      <nav className="cs-competition-tabs" aria-label="Circle competition sections">
        {TABS.map((tab) => (
          <button key={tab.key} className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
        ))}
      </nav>

      {loading ? <div className="cs-competition-loading">Preparing the Circle competition board…</div> : null}

      {!loading && activeTab === 'today' ? (
        <div className="cs-competition-today">
          {incomingChallenge && incomingLeader ? (
            <article className="cs-challenge-spotlight">
              <div className="player"><span>{incomingPlayer?.initials ?? 'CS'}</span><small>NEW CHALLENGE</small></div>
              <div>
                <h3><strong>{incomingPlayer?.name ?? 'A Circle player'}</strong> posted {Number(incomingLeader.score ?? 0).toLocaleString()} {incomingChallenge.challenge_type === 'completion' ? 'completed rounds' : 'reps'}.</h3>
                <p>{incomingChallenge.source_name}{incomingChallenge.duration_seconds ? ` · ${incomingChallenge.duration_seconds} seconds` : ''} · {incomingLeader.verification_mode === 'ai' ? 'Camera count (experimental)' : 'Manual result'}</p>
                <span>Think you can beat it?</span>
              </div>
              <button onClick={() => acceptChallenge(incomingChallenge)}>Challenge back <ChevronRight /></button>
            </article>
          ) : null}

          <div className="cs-competition-primary-grid">
            <article className="cs-daily-challenge-card">
              <div className="cs-daily-challenge-icon"><Zap /></div>
              <div>
                <span>DAILY CIRCLE CHALLENGE</span>
                <h3>{dailyChallenge?.source_name ?? 'Today’s challenge is loading'}</h3>
                <p>One verified completion keeps the Circle active. Everyone can post a result.</p>
                <div><small><Clock3 /> Resets daily</small><small><ShieldCheck /> Results labeled</small></div>
              </div>
              {dailyChallenge ? <div className="cs-circle-challenge-action">{challengeAction(dailyChallenge)}</div> : null}
            </article>

            <div className="cs-circle-pulse-card">
              <div><Flame /><span><small>CIRCLE PULSE</small><strong>{pulse?.current_streak ?? 0} active days</strong></span></div>
              <p>{pulse?.active_members_today ?? 0} of {pulse?.required_members_today ?? 2} required members have trained today.</p>
              <div className="cs-circle-pulse-track"><span style={{ width: `${Math.min(100, ((pulse?.active_members_today ?? 0) / Math.max(1, pulse?.required_members_today ?? 2)) * 100)}%` }} /></div>
              <small>Shared momentum—not a replacement for personal streaks.</small>
            </div>
          </div>

          <div className="cs-competition-quick-grid">
            <button onClick={() => navigate('/workout')}><Dumbbell /><span><strong>Start a workout</strong><small>Choose a 10- or 20-minute plan</small></span><ChevronRight /></button>
            <button onClick={() => navigate('/lab')}><Target /><span><strong>Train a drill</strong><small>Build a focused score</small></span><ChevronRight /></button>
          </div>
        </div>
      ) : null}

      {!loading && activeTab === 'challenges' ? (
        <div className="cs-challenge-board">
          <div className="cs-challenge-board-heading"><div><span>OPEN CHALLENGES</span><h3>Answer the call.</h3></div><strong>{activeChallenges.length} active</strong></div>
          {activeChallenges.length ? activeChallenges.map((challenge) => {
            const challengeEntries = entryMap.get(challenge.id) ?? [];
            const leader = [...challengeEntries].filter((entry) => entry.status === 'completed').sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))[0];
            const leaderMember = leader ? memberMap.get(leader.user_id) : null;
            return (
              <article className="cs-circle-challenge-card" key={challenge.id}>
                <div className="cs-circle-challenge-source"><span>{sourceLabel(challenge.source_type)}</span><strong>{challenge.source_name}</strong><small>{leader ? `${leaderMember?.name ?? 'A player'} posted ${Number(leader.score ?? 0).toLocaleString()} ${challenge.challenge_type === 'completion' ? 'rounds' : 'reps'} · Think you can beat it?` : challenge.is_daily ? 'CourtStreak daily challenge' : `Created by ${memberMap.get(challenge.creator_id)?.name ?? 'a Circle member'}`}</small></div>
                <div className="cs-circle-challenge-status"><span><Users /> {challengeEntries.length} joined</span><span><CalendarDays /> {formatDeadline(challenge.expires_at)}</span>{leader ? <strong><Crown /> {memberMap.get(leader.user_id)?.name ?? 'Player'} · {leader.score ?? 0}</strong> : <small>No posted score yet</small>}</div>
                <div className="cs-circle-challenge-action">{challengeAction(challenge)}</div>
              </article>
            );
          }) : <div className="cs-competition-empty"><Trophy /><strong>No open member challenges.</strong><span>Send a drill or workout to one player—or the entire Circle.</span><button onClick={openBuilder}>Create the first challenge</button></div>}
        </div>
      ) : null}

      {!loading && activeTab === 'champions' ? (
        <div className="cs-weekly-champions">
          <div className="cs-challenge-board-heading"><div><span>FOUR WAYS TO WIN</span><h3>This week’s champions.</h3><p>No single overall winner. One player can earn more than one title.</p></div><strong>+25 XP each</strong></div>
          <div className="cs-weekly-award-grid">
            {Object.entries(AWARD_META).map(([key, meta]) => {
              const result = awards.find((award) => award.award_key === key);
              const winner = result?.winner_user_id ? memberMap.get(result.winner_user_id) : null;
              const Icon = meta.Icon;
              return (
                <article key={key}>
                  <span className="award-icon"><Icon /></span>
                  <small>WEEKLY TITLE</small>
                  <h4>{meta.label}</h4>
                  <p>{meta.detail}</p>
                  {winner ? <div className="winner"><span>{winner.initials}</span><strong>{winner.name}</strong><small>{result.metric_label}</small></div> : <div className="winner open"><Medal /><span><strong>Still open</strong><small>Qualifying activity is needed.</small></span></div>}
                </article>
              );
            })}
          </div>
          <div className="cs-champion-integrity"><ShieldCheck /><span><strong>Fair competition by design</strong><small>Replays do not farm XP. Each challenge rewards once, and weekly title XP is claimable once per category across the account.</small></span></div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="cs-competition-overlay" onMouseDown={() => setCreateOpen(false)}>
          <section className="cs-competition-modal" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setCreateOpen(false)} aria-label="Close"><X /></button>
            <div className="modal-mark"><Sparkles /></div>
            <span>CREATE A CIRCLE CHALLENGE</span>
            <h2>Who is ready to compete?</h2>
            <p>Choose real CourtStreak training, the opponent, and the deadline.</p>

            {draft ? (
              <div className="cs-selected-challenge-source"><small>{sourceLabel(draft.sourceType)}</small><strong>{draft.sourceName}</strong>{draft.baselineScore != null ? <em>{Number(draft.baselineScore).toLocaleString()} reps · {draft.verificationMode === 'ai' ? 'Camera count (experimental)' : 'Manual result'}</em> : null}<button onClick={() => setDraft(null)}>Choose something else</button></div>
            ) : (
              <>
                <label><span>Training type</span><select value={sourceType} onChange={(event) => { const next = event.target.value; setSourceType(next); setSourceKey(next === 'drill' ? drills[0]?.drill_key ?? '' : next === 'custom_workout' ? customWorkouts[0]?.workout_key ?? '' : WORKOUT_PROGRAMS[0]?.key ?? ''); }}><option value="workout">CourtStreak workout</option><option value="drill">Single drill</option><option value="custom_workout" disabled={!customWorkouts.length}>My custom workout</option></select></label>
                <label><span>Challenge</span><select value={sourceKey} onChange={(event) => setSourceKey(event.target.value)}>{sourceType === 'drill' ? drills.map((item) => <option value={item.drill_key} key={item.drill_key}>{item.name}</option>) : sourceType === 'custom_workout' ? customWorkouts.map((item) => <option value={item.workout_key} key={item.workout_key}>{item.name}</option>) : WORKOUT_PROGRAMS.map((item) => <option value={item.key} key={item.key}>{item.name} · {item.durationMinutes} min</option>)}</select></label>
              </>
            )}

            <label><span>Challenge</span><select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)}><option value="circle">Entire Circle</option>{members.filter((member) => member.userId !== currentUserId).map((member) => <option value={member.userId} key={member.userId}>{member.name}</option>)}</select></label>
            <label><span>Deadline</span><select value={deadlineHours} onChange={(event) => setDeadlineHours(Number(event.target.value))}><option value={24}>24 hours</option><option value={48}>48 hours</option><option value={72}>3 days</option><option value={168}>7 days</option></select></label>

            <div className="cs-competition-modal-note"><ShieldCheck /><span><strong>Results stay transparent.</strong><small>Results identify their recording method. Guided Manual totals are self-reported.</small></span></div>
            <button className="submit" disabled={!selectedSource || creating} onClick={createChallenge}>{creating ? 'Sending…' : 'Send challenge'}<ChevronRight /></button>
          </section>
        </div>
      ) : null}
    </section>
  );
}
