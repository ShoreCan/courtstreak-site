import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import usePreviewNavigate from '../lib/usePreviewNavigate.js';
import { PREVIEW_CIRCLES, PREVIEW_CIRCLE_STATS } from '../lib/previewData.js';
import { supabase } from '../lib/supabaseClient.js';
import {
  ArrowLeft,
  ChevronRight,
  Flame,
  Plus,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';

export default function TrainingCircles({ previewOnly = false }) {
  const navigate = usePreviewNavigate(previewOnly);
  const location = useLocation();
  const challengeDraft = location.state?.challengeDraft ?? null;
const [showCreateCircle, setShowCreateCircle] = useState(false);
const [circleName, setCircleName] = useState('');
const [circleType, setCircleType] = useState('Friends');
const [creatingCircle, setCreatingCircle] = useState(false);
const [createCircleError, setCreateCircleError] = useState('');
const [circles, setCircles] = useState([]);
const [circleStats, setCircleStats] = useState({});
const [circleStatsError, setCircleStatsError] = useState('');
const [loadingCircles, setLoadingCircles] = useState(true);

  async function loadCircles() {
  if (previewOnly) { setCircles(PREVIEW_CIRCLES); setCircleStats(PREVIEW_CIRCLE_STATS); setLoadingCircles(false); return; }
  if (!supabase) {
    setLoadingCircles(false);
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Could not load current user:', userError);
    setLoadingCircles(false);
    return;
  }

  const { data, error } = await supabase
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
        weekly_workout_goal,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('Could not load Training Circles:', error);
    setLoadingCircles(false);
    return;
  }

  const loadedCircles = (data ?? [])
    .map((membership) => ({
      ...membership.training_circles,
      membershipRole: membership.role,
    }))
    .filter((circle) => circle?.id);

  setCircles(loadedCircles);

  const statsEntries = await Promise.all(
    loadedCircles.map(async (circle) => {
      const { data: statsData, error: statsError } =
        await supabase.rpc('get_training_circle_weekly_stats', {
          p_circle_id: circle.id,
        });

      if (statsError) {
        console.error(
          `Could not load verified stats for Circle ${circle.id}:`,
          statsError
        );

        return [circle.id, null];
      }

      const members = statsData ?? [];

      const weeklyWorkouts = members.reduce(
        (total, member) =>
          total + Number(member.weekly_workouts ?? 0),
        0
      );

      const weeklyTrainingXp = members.reduce(
        (total, member) =>
          total + Number(member.weekly_training_xp ?? 0),
        0
      );

      const leaders = [...members]
        .sort(
          (a, b) =>
            Number(b.weekly_training_xp ?? 0) -
            Number(a.weekly_training_xp ?? 0)
        )
        .filter(
          (member) =>
            Number(member.weekly_workouts ?? 0) > 0 ||
            Number(member.weekly_training_xp ?? 0) > 0
        );

      let pendingChallenges = 0;
      const { data: activeChallenges } = await supabase
        .from('circle_challenges')
        .select('id, target_user_id')
        .eq('circle_id', circle.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      const eligibleChallenges = (activeChallenges ?? []).filter(
        (challenge) => !challenge.target_user_id || challenge.target_user_id === user.id
      );
      if (eligibleChallenges.length) {
        const { data: ownEntries } = await supabase
          .from('circle_challenge_entries')
          .select('challenge_id')
          .eq('user_id', user.id)
          .in('challenge_id', eligibleChallenges.map((challenge) => challenge.id));
        const enteredIds = new Set((ownEntries ?? []).map((entry) => entry.challenge_id));
        pendingChallenges = eligibleChallenges.filter((challenge) => !enteredIds.has(challenge.id)).length;
      }

      return [
        circle.id,
        {
          memberCount: members.length,
          weeklyWorkouts,
          weeklyTrainingXp,
          leaders,
          pendingChallenges,
        },
      ];
    })
  );

  const failedStats = statsEntries.some(
    ([, stats]) => stats === null
  );

  setCircleStats(
    Object.fromEntries(
      statsEntries.filter(([, stats]) => stats !== null)
    )
  );

  setCircleStatsError(
    failedStats
      ? 'Some Circle activity could not be verified right now.'
      : ''
  );

  setLoadingCircles(false);
}
useEffect(() => {
  loadCircles();
}, [previewOnly]);
async function handleCreateCircle() {
  if (previewOnly) { navigate("/preview/membership"); return; }
  const trimmedName = circleName.trim();

  if (!trimmedName || creatingCircle) {
    return;
  }

  if (!supabase) {
    setCreateCircleError(
      'CourtStreak could not connect to Supabase.'
    );
    return;
  }

  setCreatingCircle(true);
  setCreateCircleError('');

  const { data, error } = await supabase.rpc(
    'create_training_circle',
    {
      p_name: trimmedName,
      p_circle_type: circleType,
    }
  );

  if (error) {
    console.error('Could not create Training Circle:', error);

    setCreateCircleError(
      'CourtStreak could not create your Circle right now.'
    );

    setCreatingCircle(false);
    return;
  }

  const createdCircle = data?.[0];

  setCreatingCircle(false);
  setShowCreateCircle(false);
  setCircleName('');
  setCircleType('Friends');

  if (createdCircle?.circle_id) {
    navigate(
      `/training-circles/${createdCircle.circle_id}`
    );
  }
}
  return (
    <main className="cs-circles-page">
      <header className="cs-circles-topbar">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft size={19} />
          Dashboard
        </button>

        <strong>CourtStreak</strong>

        <span />
      </header>

      <div className="cs-circles-shell">

        {/* SIMPLE HERO */}

        <section className="cs-circles-hero">
          <div className="cs-circles-hero-copy">
            <span className="cs-circles-eyebrow">
              TRAINING CIRCLES
            </span>

            <h1>
              Train with the people
              <br />
              <strong>who push you.</strong>
            </h1>

            <p>
              Private groups for friends, teammates, coaches,
              trainers, and family to stay accountable and
              compete together.
            </p>
          </div>

          <div className="cs-circles-hero-actions">
           <button
  type="button"
  className="cs-circles-primary"
  onClick={() => previewOnly ? navigate("/preview/membership") : setShowCreateCircle(true)}
>
              <Plus size={18} />
              Create Circle
            </button>

            <button
              type="button"
              className="cs-circles-secondary"
              onClick={previewOnly ? () => navigate("/preview/membership") : undefined}
            >
              <UserPlus size={18} />
              Join Circle
            </button>
          </div>
        </section>

        {/* YOUR CIRCLES */}

        <section className="cs-circles-section">
          <div className="cs-circles-heading">
            <div>
              <span>YOUR CIRCLES</span>
              <h2>Your Training Community</h2>

              <p>
                Everything important at a glance.
              </p>
            </div>
          </div>

          {challengeDraft ? (
            <div className="cs-circle-challenge-route-banner">
              <span><Trophy size={18} /></span>
              <div>
                <small>START A CIRCLE CHALLENGE</small>
                <strong>Choose who you want to challenge with {challengeDraft.sourceName}.</strong>
              </div>
            </div>
          ) : null}

          <div className="cs-circles-simple-grid">

   {loadingCircles ? (
  <div className="cs-circle-loading-card">
    Loading your Training Circles...
  </div>
) : circles.length > 0 ? (
  circles.map((circle) => {
    const stats = circleStats[circle.id];
    const weeklyGoal = Math.max(
      Number(circle.weekly_workout_goal ?? 20),
      1
    );

    const weeklyWorkouts = stats?.weeklyWorkouts ?? 0;

    const weeklyProgress = Math.min(
      (weeklyWorkouts / weeklyGoal) * 100,
      100
    );

    return (
    <article
      className="cs-circle-showcase"
      key={circle.id}
    >
      <div className="cs-circle-showcase-top">
        <div>
          <span className="cs-circle-showcase-label">
            {(circle.circle_type || 'Circle').toUpperCase()}
            {' · '}
            {circle.is_private ? 'PRIVATE' : 'OPEN'}
          </span>

          <h2>{circle.name}</h2>

          <p>
            Your people. Your progress. Your standard.
          </p>
        </div>

        <div className="cs-circle-showcase-members">
          <div className="cs-circle-showcase-avatars">
            <span>YOU</span>
          </div>

          <small>
            {circle.membershipRole === 'owner'
              ? 'You created this Circle'
              : 'Member'}
          </small>
        </div>
      </div>

      <div className="cs-circle-showcase-main">

        <div className="cs-circle-showcase-progress">
          <span>WEEKLY TEAM GOAL</span>

          {stats ? (
            <>
              <strong>
                {Math.round(weeklyProgress)}
                <small>%</small>
              </strong>

              <p>
                {weeklyWorkouts} of {weeklyGoal} workouts completed
              </p>

              <div className="cs-circle-showcase-track">
                <div style={{ width: `${weeklyProgress}%` }} />
              </div>
            </>
          ) : (
            <p>Circle activity unavailable</p>
          )}

          <div className="cs-circle-showcase-streak">
            <Flame size={16} />
            <strong>Circle streak starts here</strong>
          </div>
        </div>

        <div className="cs-circle-showcase-leaders">
          <span>THIS WEEK&apos;S LEADERS</span>

          {!stats ? (
            <div className="cs-circle-empty-leaderboard">
              <Trophy size={24} />
              <strong>Leaderboard unavailable</strong>
              <p>
                CourtStreak could not verify this Circle&apos;s
                activity right now.
              </p>
            </div>
          ) : stats.leaders.length === 0 ? (
            <div className="cs-circle-empty-leaderboard">
              <Trophy size={24} />
              <strong>No leaderboard yet</strong>
              <p>
                Complete a workout and this week&apos;s rankings
                will appear here.
              </p>
            </div>
          ) : (
            <div className="cs-circle-weekly-leaders">
              {stats.leaders.slice(0, 3).map((leader, index) => (
                <div
                  className="cs-circle-weekly-leader"
                  key={leader.user_id}
                >
                  <strong>
                    #{index + 1} {`${leader.first_name || 'Player'} ${leader.last_name || ''}`.trim()}
                  </strong>

                  <span>
                    {Number(leader.weekly_training_xp ?? 0)} training XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <button
        type="button"
        className="cs-circle-showcase-open"
        onClick={() =>
          navigate(`/training-circles/${circle.id}`, {
            state: challengeDraft ? { challengeDraft } : null,
          })
        }
      >
        <span>
          <Users size={17} />
          Enter {circle.name}
        </span>

        {stats?.pendingChallenges > 0 ? <small className="cs-circle-pending-challenges">{stats.pendingChallenges} new {stats.pendingChallenges === 1 ? 'challenge' : 'challenges'}</small> : null}

        <ChevronRight size={18} />
      </button>
    </article>
    );
  })
) : (
  <div className="cs-circle-empty-state">
    <Users size={28} />

    <h3>No Training Circles yet</h3>

    <p>
      Create your first Circle or join one with an invite.
    </p>
  </div>
)}

            {/* CREATE ANOTHER */}

            <button
              type="button"
              className="cs-circle-simple-create"
              onClick={() => previewOnly ? navigate("/preview/membership") : setShowCreateCircle(true)}
            >
              <div>
                <Plus size={22} />
              </div>

              <span>
                <strong>Create another Circle</strong>
                Team, friends, trainer, or family
              </span>

              <ChevronRight size={18} />
            </button>

          </div>
        </section>

        {/* SMALL BOTTOM MESSAGE */}

        <section className="cs-circles-simple-footer">
          <div className="cs-circles-simple-footer-icon">
            <Flame size={20} />
          </div>

          <div>
            <strong>Consistency is easier together.</strong>

            <span>
              Your Circle celebrates workouts, streaks,
              personal records, and weekly leaders.
            </span>
          </div>
        </section>
{showCreateCircle && (
  <div
    className="cs-circle-modal-backdrop"
    onClick={() => setShowCreateCircle(false)}
  >
    <section
      className="cs-circle-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="cs-circle-modal-header">
        <div>
          <span>NEW TRAINING CIRCLE</span>
          <h2>Create your Circle</h2>

          <p>
            Build a private training group for the people
            who help push your game forward.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateCircle(false)}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <label className="cs-circle-field">
        <span>Circle Name</span>

        <input
          type="text"
          value={circleName}
          onChange={(event) =>
            setCircleName(event.target.value)
          }
          placeholder="Example: My Hoop Group"
          maxLength={40}
        />
      </label>

      <div className="cs-circle-field">
        <span>Circle Type</span>

        <div className="cs-circle-type-options">
          {[
            'Friends',
            'Team',
            'AAU',
            'Trainer',
            'Family',
          ].map((type) => (
            <button
              type="button"
              key={type}
              className={
                circleType === type ? 'active' : ''
              }
              onClick={() => setCircleType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="cs-circle-modal-note">
        <Users size={18} />

        <div>
          <strong>Private by default</strong>

          <span>
            Only players you invite can enter this
            Training Circle.
          </span>
        </div>
      </div>

      {createCircleError && (
  <p className="cs-circle-create-error">
    {createCircleError}
  </p>
)}

<button
  type="button"
  className="cs-circle-create-submit"
  disabled={!circleName.trim() || creatingCircle}
  onClick={handleCreateCircle}
>
  {creatingCircle
    ? 'Creating Circle...'
    : 'Create Training Circle'}

  <ChevronRight size={17} />
</button>
    </section>
  </div>
)}
      </div>
    </main>
  );
}
