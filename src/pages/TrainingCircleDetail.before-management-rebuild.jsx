import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import {
  ArrowLeft,
  ChevronRight,
  Flame,
  Medal,
  MoreHorizontal,
  Share2,
  Target,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';




async function handleLeaveCircle() {
  if (!supabase || !circleId || leavingCircle) return;

  setLeavingCircle(true);
  setLeaveError('');

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setLeaveError('You must be signed in to leave a Training Circle.');
    setLeavingCircle(false);
    return;
  }

  const currentMembership = circleMembers.find(
    (member) => member.userId === user.id
  );

  if (currentMembership?.role === 'owner') {
    setLeaveError(
      'Circle owners cannot leave until ownership is transferred or the Circle is deleted.'
    );
    setLeavingCircle(false);
    return;
  }

  const { error: deleteError } = await supabase
    .from('training_circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Could not leave Training Circle:', deleteError);
    setLeaveError('Could not leave the Training Circle. Please try again.');
    setLeavingCircle(false);
    return;
  }

  setLeaveConfirmOpen(false);
  setLeavingCircle(false);
  navigate('/training-circles');
}
export default function TrainingCircleDetail() {
  const navigate = useNavigate();
  const [leaderboardType, setLeaderboardType] =
    useState('weekly');
    const { circleId } = useParams();

const [circle, setCircle] = useState(null);
const [loadingCircle, setLoadingCircle] = useState(true);
const [circleError, setCircleError] = useState('');
const [circleMembers, setCircleMembers] = useState([]);
const [leaderboardMembers, setLeaderboardMembers] = useState([]);
const [weeklyLeaderboardXp, setWeeklyLeaderboardXp] = useState({});
const [circleActivity, setCircleActivity] = useState([]);
const [circleStreak, setCircleStreak] = useState(0);
const [inviteCode, setInviteCode] = useState('');
const [inviteExpiresAt, setInviteExpiresAt] = useState(null);
const [creatingInvite, setCreatingInvite] = useState(false);
const [inviteError, setInviteError] = useState('');
const [moreMenuOpen, setMoreMenuOpen] = useState(false);
const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
const [leavingCircle, setLeavingCircle] = useState(false);
const [leaveError, setLeaveError] = useState('');
const [weeklyStats, setWeeklyStats] = useState({
  
  
  workouts: 0,
  xp: 0,
  minutes: 0,
});
  const weeklyGoal =
  circle?.weekly_workout_goal ?? 20;

const weeklyCompleted =
  weeklyStats.workouts;

  const goalPercentage = Math.min(
    (weeklyCompleted / weeklyGoal) * 100,
    100
  );
useEffect(() => {
  let active = true;

  async function loadCircle() {
    if (!supabase || !circleId) {
      setCircleError('CourtStreak could not load this Circle.');
      setLoadingCircle(false);
      return;
    }

    const { data, error } = await supabase
      .from('training_circles')
      .select(`
        id,
        name,
        circle_type,
        owner_id,
        is_private,
        weekly_workout_goal,
        created_at
      `)
      .eq('id', circleId)
      .single();

    if (!active) return;

    if (error) {
      console.error('Could not load Training Circle:', error);

      setCircleError(
        'CourtStreak could not load this Training Circle.'
      );

      setLoadingCircle(false);
      return;
    }

    setCircle(data);
    setLoadingCircle(false);
  }

  loadCircle();

  return () => {
    active = false;
  };
}, [circleId]);
useEffect(() => {
  let active = true;

  async function loadCircleMembers() {
    if (!supabase || !circleId) {
      return;
    }

    const { data: memberships, error: memberError } =
      await supabase
        .from('training_circle_members')
        .select(`
          id,
          user_id,
          role,
          joined_at
        `)
        .eq('circle_id', circleId)
        .order('joined_at', { ascending: true });

    if (!active) return;

    if (memberError) {
      console.error(
        'Could not load Circle members:',
        memberError
      );
      return;
    }

    const membersData = memberships ?? [];

    setCircleMembers(membersData);

    if (membersData.length === 0) {
      setLeaderboardMembers([]);
      return;
    }

    const userIds = membersData.map(
      (member) => member.user_id
    );

    const { data: profiles, error: profileError } =
      await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          xp,
          training_streak
        `)
        .in('id', userIds);

    if (!active) return;

    if (profileError) {
      console.error(
        'Could not load Circle profiles:',
        profileError
      );
      return;
    }

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile,
      ])
    );

    const realMembers = membersData
      .map((membership) => {
        const profile = profileMap.get(
          membership.user_id
        );

        const firstName =
          profile?.first_name || 'Player';

        const lastName =
          profile?.last_name || '';

        const initials = `${firstName[0] ?? 'P'}${
          lastName[0] ?? ''
        }`.toUpperCase();

        return { 
          id: membership.id,
          userId: membership.user_id,
          role: membership.role,
          name: `${firstName} ${lastName}`.trim(),
          initials,
          streak: profile?.training_streak ?? 0,
          xp: profile?.xp ?? 0,
        };
      })
      .sort((a, b) => b.xp - a.xp)
      .map((member, index) => ({
        ...member,
        rank: index + 1,
      }));

    setLeaderboardMembers(realMembers);
  }

  loadCircleMembers();

  return () => {
    active = false;
  };
}, [circleId]);
   useEffect(() => {
  let active = true;

  async function loadWeeklyStats() {
    if (!supabase || circleMembers.length === 0) {
      setWeeklyStats({
        workouts: 0,
        xp: 0,
        minutes: 0,
      });
      return;
    }

    const userIds = circleMembers.map(
      (member) => member.user_id
    );

    const now = new Date();
    const startOfWeek = new Date(now);

    startOfWeek.setHours(0, 0, 0, 0);

    const day = startOfWeek.getDay();
    const diffToMonday =
      day === 0 ? 6 : day - 1;

    startOfWeek.setDate(
      startOfWeek.getDate() - diffToMonday
    );

    const { data, error } = await supabase
      .from('workout_completions')
      .select(`
        user_id,
        xp_earned,
        minutes_trained,
        completed_at
      `)
      .in('user_id', userIds)
      .gte(
        'completed_at',
        startOfWeek.toISOString()
      );

    if (!active) return;

    if (error) {
      console.error(
        'Could not load Circle weekly stats:',
        error
      );
      return;
    }

    const workouts = data?.length ?? 0;

    const xp = (data ?? []).reduce(
      (total, workout) =>
        total + (workout.xp_earned ?? 0),
      0
    );

    const minutes = (data ?? []).reduce(
      (total, workout) =>
        total + (workout.minutes_trained ?? 0),
      0
    );

    setWeeklyStats({
      workouts,
      xp,
      minutes,
    });
  }

  loadWeeklyStats();

  return () => {
    active = false;
  };
}, [circleMembers]);
useEffect(() => {
  let active = true;

  async function loadWeeklyLeaderboardXp() {
    if (!supabase || circleMembers.length === 0) {
      setWeeklyLeaderboardXp({});
      return;
    }

    const userIds = circleMembers.map(
      (member) => member.user_id
    );

    const now = new Date();
    const startOfWeek = new Date(now);

    startOfWeek.setHours(0, 0, 0, 0);

    const day = startOfWeek.getDay();
    const diffToMonday =
      day === 0 ? 6 : day - 1;

    startOfWeek.setDate(
      startOfWeek.getDate() - diffToMonday
    );

    const { data, error } = await supabase
      .from('workout_completions')
      .select(`
        user_id,
        xp_earned,
        completed_at
      `)
      .in('user_id', userIds)
      .gte(
        'completed_at',
        startOfWeek.toISOString()
      );

    if (!active) return;

    if (error) {
      console.error(
        'Could not load weekly leaderboard XP:',
        error
      );
      return;
    }

    const xpByUser = {};

    for (const workout of data ?? []) {
      xpByUser[workout.user_id] =
        (xpByUser[workout.user_id] ?? 0) +
        (workout.xp_earned ?? 0);
    }

    setWeeklyLeaderboardXp(xpByUser);
  }

  loadWeeklyLeaderboardXp();

  return () => {
    active = false;
  };
}, [circleMembers]);

useEffect(() => {
  let active = true;

  async function loadCircleActivity() {

    if (!supabase || circleMembers.length === 0) {
      setCircleActivity([]);
      return;
    }

    const userIds = circleMembers.map(
      (member) => member.user_id
    );

    const { data, error } = await supabase
      .from('workout_completions')
      .select(`
        id,
        user_id,
        workout_name,
        workout_focus,
        minutes_trained,
        xp_earned,
        completed_at
      `)
      .in('user_id', userIds)
      .order('completed_at', { ascending: false })
      .limit(8);

    if (!active) return;

    if (error) {
      console.error(
        'Could not load Circle activity:',
        error
      );
      return;
    }

    const profileMap = new Map(
      leaderboardMembers.map((member) => [
        member.userId,
        member,
      ])
    );

    const realActivity = (data ?? []).map(
      (workout) => {
        const member = profileMap.get(
          workout.user_id
        );

        return {
          id: workout.id,
          type: 'workout',
          name: member?.name || 'Player',
          text: 'completed a workout',
          detail: `${
            workout.workout_name ||
            workout.workout_focus ||
            'CourtStreak Workout'
          } · ${workout.minutes_trained ?? 0} min`,
          completedAt: workout.completed_at,
        };
      }
    );

    setCircleActivity(realActivity);
  }

  loadCircleActivity();
  return () => {
  active = false;
};
}, [circleMembers, leaderboardMembers]);
useEffect(() => {
  let active = true;

  async function loadCircleStreak() {
    if (!supabase || circleMembers.length === 0) {
      setCircleStreak(0);
      return;
    }

    const userIds = circleMembers.map(
      (member) => member.user_id
    );

    const { data, error } = await supabase
      .from('workout_completions')
      .select('completed_at')
      .in('user_id', userIds)
      .order('completed_at', { ascending: false });

    if (!active) return;

    if (error) {
      console.error(
        'Could not load Circle streak:',
        error
      );
      setCircleStreak(0);
      return;
    }

    const uniqueDays = [
      ...new Set(
        (data ?? []).map((workout) =>
          new Date(workout.completed_at)
            .toISOString()
            .slice(0, 10)
        )
      ),
    ];

    if (uniqueDays.length === 0) {
      setCircleStreak(0);
      return;
    }

    let streak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mostRecentDay = new Date(
      `${uniqueDays[0]}T00:00:00`
    );

    if (
      mostRecentDay.getTime() !== today.getTime() &&
      mostRecentDay.getTime() !== yesterday.getTime()
    ) {
      setCircleStreak(0);
      return;
    }

    let expectedDay = new Date(mostRecentDay);

    for (const dayString of uniqueDays) {
      const workoutDay = new Date(
        `${dayString}T00:00:00`
      );

      if (
        workoutDay.getTime() ===
        expectedDay.getTime()
      ) {
        streak += 1;

        expectedDay.setDate(
          expectedDay.getDate() - 1
        );
      } else {
        break;
      }
    }

    setCircleStreak(streak);
  }

  loadCircleStreak();

  return () => {
    active = false;
  };
}, [circleMembers, leaderboardMembers]);
  return (
    <main className="cs-circle-detail-page">
      <header className="cs-circle-detail-topbar">
        <button
          type="button"
          onClick={() => navigate('/training-circles')}
        >
          <ArrowLeft size={19} />
          Circles
        </button>

        <strong>CourtStreak</strong>

        <div className="cs-circle-more-wrap">
  <button
    type="button"
    className="cs-circle-more"
    aria-label="Circle settings"
    onClick={() => setMoreMenuOpen((open) => !open)}
  >
    <MoreHorizontal size={20} />
  </button>

  {moreMenuOpen && (
    <div className="cs-circle-more-menu">
      <button
  type="button"
  className="cs-circle-leave-option"
  onClick={() => {
    setMoreMenuOpen(false);
    setLeaveConfirmOpen(true);
  }}
>
  Leave Training Circle
</button>
    </div>
  )}
</div>
      </header>

      <div className="cs-circle-detail-shell">

        {/* CIRCLE HEADER */}

        <section className="cs-circle-detail-hero">
          <div className="cs-circle-detail-identity">
            <div className="cs-circle-detail-avatar">
              <Users size={27} />
            </div>

            <div>
              <span>
  {(circle?.circle_type || 'Circle').toUpperCase()}
</span>

<h1>
  {loadingCircle
    ? 'Loading Circle...'
    : circle?.name || 'Training Circle'}
</h1>

<p>
  {circleMembers.length}{' '}
  {circleMembers.length === 1 ? 'member' : 'members'}
  {' · '}
  {circle?.is_private ? 'Private' : 'Open'} Training Circle
</p>
            </div>
          </div>

          <div className="cs-circle-detail-actions">
            <button
              type="button"
              className="cs-circle-invite-button"
            >
              <UserPlus size={17} />
              <button
  type="button"
  className="cs-circle-invite-button"
  disabled={creatingInvite}
  onClick={async () => {
    if (!supabase || !circleId) return;

    setCreatingInvite(true);
    setInviteError('');

    const { data, error } = await supabase.rpc(
      'create_training_circle_invite',
      {
        p_circle_id: circleId,
      }
    );

    if (error) {
      console.error('Could not create Circle invite:', error);
      setInviteError('Could not create invite.');
      setCreatingInvite(false);
      return;
    }

    const invite = data?.[0];

    setInviteCode(invite?.invite_code ?? '');
    setInviteExpiresAt(invite?.expires_at ?? null);
    setCreatingInvite(false);
  }}
>
  <UserPlus size={17} />
  {creatingInvite ? 'Creating Invite...' : 'Invite Players'}
</button>
            </button>

            <button
              type="button"
              className="cs-circle-share-button"
              aria-label="Share Training Circle"
            >
              <Share2 size={18} />
            </button>
          </div>
        </section>

        {/* GROUP SNAPSHOT */}

        <section className="cs-circle-snapshot-grid">
          <article>
            <div>
              <Flame size={19} />
              <span>CIRCLE STREAK</span>
            </div>

            <strong>{circleStreak}</strong>
            <small>days active together</small>
          </article>

          <article>
            <div>
              <Target size={19} />
              <span>THIS WEEK</span>
            </div>

            <strong>{weeklyCompleted}</strong>
            <small>group workouts completed</small>
          </article>

          <article>
            <div>
              <Zap size={19} />
              <span>GROUP XP</span>
            </div>

           <strong>
  {weeklyStats.xp.toLocaleString()}
</strong>
            <small>XP earned this week</small>
          </article>
        </section>

        {/* WEEKLY GOAL */}

        <section className="cs-circle-detail-card">
          <div className="cs-circle-section-heading">
            <div>
              <span>WEEKLY TEAM GOAL</span>
              <h2>20 workouts together.</h2>

              <p>
                Every workout from every member moves the
                circle closer to the goal.
              </p>
            </div>

            <strong>
              {weeklyCompleted}/{weeklyGoal}
            </strong>
          </div>

          <div className="cs-circle-goal-track">
            <div
              style={{ width: `${goalPercentage}%` }}
            />
          </div>

          <div className="cs-circle-goal-footer">
            <span>
              <Flame size={15} />
              {weeklyGoal - weeklyCompleted} workouts to go
            </span>

            <strong>
              {Math.round(goalPercentage)}%
            </strong>
          </div>
        </section>

        {/* LEADERBOARD */}

        <section className="cs-circle-detail-card">
          <div className="cs-circle-section-heading">
            <div>
              <span>FRIENDLY COMPETITION</span>
              <h2>Circle Leaderboard</h2>

              <p>
                See who&apos;s been putting in the work.
              </p>
            </div>

            <div className="cs-circle-leaderboard-tabs">
              <button
                type="button"
                className={
                  leaderboardType === 'weekly'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setLeaderboardType('weekly')
                }
              >
                This Week
              </button>

              <button
                type="button"
                className={
                  leaderboardType === 'all'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setLeaderboardType('all')
                }
              >
                All Time
              </button>
            </div>
          </div>

          <div className="cs-circle-leaderboard">
            {[...leaderboardMembers]
  .map((member) => ({
    ...member,
    displayXp:
      leaderboardType === 'weekly'
        ? weeklyLeaderboardXp[member.userId] ?? 0
        : member.xp,
  }))
  .sort((a, b) => b.displayXp - a.displayXp)
  .map((member, index) => ({
    ...member,
    rank: index + 1,
  }))
  .map((member) => (
              <button
                type="button"
                className="cs-circle-member-row"
                key={member.id}
              >
                <div className="cs-circle-member-rank">
                  {member.rank <= 3 ? (
                    <Medal size={18} />
                  ) : (
                    member.rank
                  )}
                </div>

                <div className="cs-circle-member-avatar">
                  {member.initials}
                </div>

                <div className="cs-circle-member-name">
                  <strong>{member.name}</strong>

                  <span>
                    <Flame size={12} />
                    {member.streak} day streak
                  </span>
                </div>

                <div className="cs-circle-member-stat">
  <strong>
    {member.role === 'owner' ? 'Owner' : 'Member'}
  </strong>
  <span>Circle Role</span>
</div>

                <div className="cs-circle-member-stat">
                  <strong>{member.displayXp.toLocaleString()}</strong>
                  <span>XP</span>
                </div>

                <ChevronRight size={17} />
              </button>
            ))}
          </div>

          
        </section>

        {/* ACTIVITY */}

        <section className="cs-circle-detail-card">
          <div className="cs-circle-section-heading">
            <div>
              <span>CIRCLE ACTIVITY</span>
              <h2>Your People Are Working.</h2>

              <p>
                Keep up with workouts, streaks, and new
                personal records inside your circle.
              </p>
            </div>
          </div>

          <div className="cs-circle-activity-list">
           {circleActivity.map((item) => (
              <article
                className="cs-circle-activity-row"
                key={item.id}
              >
                <div
                  className={`cs-circle-activity-icon ${item.type}`}
                >
                  {item.type === 'pr' && (
                    <Trophy size={17} />
                  )}

                  {item.type === 'workout' && (
                    <Target size={17} />
                  )}

                  {item.type === 'streak' && (
                    <Flame size={17} />
                  )}
                </div>

                <div className="cs-circle-activity-main">
                  <p>
                    <strong>{item.name}</strong>{' '}
                    {item.text}
                  </p>

                  <span>{item.detail}</span>
                </div>

                <time>
  {item.completedAt
    ? new Date(item.completedAt).toLocaleDateString()
    : ''}
</time>
              </article>
            ))}
          </div>
        </section>

        {/* CHALLENGE */}

        <section className="cs-circle-challenge-card">
          <div>
            <span>CHALLENGE YOUR CIRCLE</span>

            <h2>
              Think you&apos;ve got the best handles?
            </h2>

            <p>
              Send a measurable CourtStreak challenge to
              everyone in this circle or challenge one
              player directly.
            </p>
          </div>

          <button type="button">
            <Trophy size={18} />
            Start a Challenge
          </button>
        </section>

      </div>
      {leaveConfirmOpen && (
  <div className="cs-invite-overlay">
    <div className="cs-invite-modal">
      <button
        type="button"
        className="cs-invite-close"
        onClick={() => setLeaveConfirmOpen(false)}
      >
        ×
      </button>

      <h2>Leave Training Circle?</h2>

      <p>
        Are you sure you want to leave{' '}
        <strong>{circle?.name ?? 'this Training Circle'}</strong>?
        Your personal CourtStreak progress and workouts will not be deleted.
      </p>

      <button
  type="button"
  className="cs-leave-confirm-button"
  disabled={leavingCircle}
  onClick={handleLeaveCircle}
>
  {leavingCircle ? 'Leaving...' : 'Leave Training Circle'}
</button>

{leaveError && (
  <p className="cs-invite-error">
    {leaveError}
  </p>
)}

      <button
        type="button"
        className="cs-leave-cancel-button"
        onClick={() => setLeaveConfirmOpen(false)}
      >
        Cancel
      </button>
    </div>
  </div>
)}
      {inviteCode && (
  <div className="cs-invite-overlay">
    <div className="cs-invite-modal">
      <button
        type="button"
        className="cs-invite-close"
        onClick={() => setInviteCode('')}
      >
        ×
      </button>

      <div className="cs-invite-modal-icon">
        <UserPlus size={24} />
      </div>

      <h2>Invite Players</h2>

      <p>
        Invite players to join <strong>{circle?.name}</strong>
      </p>

      
<div className="cs-invite-link-actions">
  <button
    type="button"
    className="cs-invite-share-button"
    onClick={async () => {
      const inviteUrl =
        `${window.location.origin}/courtstreak-site/training-circles/join/${inviteCode}`;

      const shareText =
  `🏀 I invited you to join ${circle?.name ?? 'my Training Circle'} on CourtStreak.\n\n` +
  `We're competing, building streaks, and seeing who can take the #1 spot each week. Think you can beat us? 🔥`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `Join ${circle?.name ?? 'my CourtStreak Circle'}`,
            text: shareText,
            url: inviteUrl,
          });
        } catch (error) {
          if (error?.name !== 'AbortError') {
            console.error('Could not share invite:', error);
          }
        }
      } else {
        await navigator.clipboard.writeText(
          `${shareText}\n\n${inviteUrl}`
        );

        alert('Invite link copied!');
      }
    }}
  >
    <Share2 size={17} />
    Share Invite
  </button>
</div>
     <button
  type="button"
  className="cs-invite-copy-button"
  onClick={async () => {
    const inviteUrl =
      `${window.location.origin}/courtstreak-site/training-circles/join/${inviteCode}`;

    await navigator.clipboard.writeText(inviteUrl);

    alert('Invite link copied!');
  }}
>
  Copy Invite Link
</button>

      {inviteExpiresAt && (
        <small>
          Invite expires in 7 days
        </small>
      )}
    </div>
  </div>
)}

{inviteError && (
  <p className="cs-invite-error">
    {inviteError}
  </p>
)}
    </main>
  );
}
