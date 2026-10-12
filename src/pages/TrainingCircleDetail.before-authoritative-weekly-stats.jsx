import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDot,
  Copy,
  Crown,
  Dumbbell,
  Flame,
  LogOut,
  Mail,
  Medal,
  MessageCircle,
  Palette,
  Save,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Star,
  Target,
  Trash2,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';

const circleTypes = [
  'Friends',
  'Team',
  'Coach-Led',
  'AAU',
  'Trainer',
  'Family',
];

const badgeOptions = [
  { key: 'basketball', label: 'Basketball', Icon: CircleDot },
  { key: 'flame', label: 'Flame', Icon: Flame },
  { key: 'trophy', label: 'Trophy', Icon: Trophy },
  { key: 'target', label: 'Target', Icon: Target },
  { key: 'bolt', label: 'Bolt', Icon: Zap },
  { key: 'shield', label: 'Shield', Icon: Shield },
  { key: 'star', label: 'Star', Icon: Star },
  { key: 'crown', label: 'Crown', Icon: Crown },
];

const themeOptions = [
  { key: 'orange', label: 'Court Orange', color: '#ff6b0b' },
  { key: 'blue', label: 'Electric Blue', color: '#3b82f6' },
  { key: 'purple', label: 'Playmaker Purple', color: '#8b5cf6' },
  { key: 'green', label: 'Victory Green', color: '#22c55e' },
  { key: 'red', label: 'Competitive Red', color: '#ef4444' },
  { key: 'gold', label: 'Champion Gold', color: '#f59e0b' },
];

function getStartOfWeek() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return start;
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TrainingCircleDetail() {
  const navigate = useNavigate();
  const { circleId } = useParams();

  const [currentUserId, setCurrentUserId] = useState('');
  const [circle, setCircle] = useState(null);
  const [members, setMembers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [weeklyXpByUser, setWeeklyXpByUser] = useState({});
  const [weeklyStats, setWeeklyStats] = useState({ workouts: 0, xp: 0 });
  const [circleStreak, setCircleStreak] = useState(0);
  const [leaderboardType, setLeaderboardType] = useState('weekly');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteExpiresAt, setInviteExpiresAt] = useState(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const [manageOpen, setManageOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    circleType: 'Friends',
    motto: '',
    badgeKey: 'basketball',
    themeKey: 'orange',
    weeklyGoal: 20,
    allowMemberInvites: false,
    allowMemberChallenges: true,
  });

  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const currentMembership = members.find(
    (member) => member.userId === currentUserId
  );
  const isOwner = circle?.owner_id === currentUserId;
  const canInvite = Boolean(currentMembership);
  const weeklyGoal = Math.max(circle?.weekly_workout_goal ?? 20, 1);
  const goalPercentage = Math.min(
    (weeklyStats.workouts / weeklyGoal) * 100,
    100
  );

  const selectedTheme =
    themeOptions.find((theme) => theme.key === circle?.theme_key) ||
    themeOptions[0];

  const SelectedBadge =
    badgeOptions.find((badge) => badge.key === circle?.badge_key)?.Icon ||
    CircleDot;

  const rankedMembers = useMemo(() => {
    return members
      .map((member) => ({
        ...member,
        displayXp:
          leaderboardType === 'weekly'
            ? weeklyXpByUser[member.userId] ?? 0
            : member.xp,
      }))
      .sort((a, b) => b.displayXp - a.displayXp)
      .map((member, index) => ({ ...member, rank: index + 1 }));
  }, [members, leaderboardType, weeklyXpByUser]);

  const weeklyActivityChart = useMemo(() => {
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const start = getStartOfWeek();

    return dayLabels.map((label, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const dateKey = getLocalDateKey(date);
      const dayActivity = activity.filter(
        (item) =>
          getLocalDateKey(item.completedAt) === dateKey
      );

      return {
        label,
        count: dayActivity.length,
        xp: dayActivity.reduce((total, item) => total + item.xp, 0),
      };
    });
  }, [activity]);

  const mostActiveDay = weeklyActivityChart.reduce(
    (best, day) => (day.count > best.count ? day : best),
    weeklyActivityChart[0] || { label: '—', count: 0 }
  );

  const activeMembersThisWeek = new Set(
    activity.map((item) => item.userId)
  ).size;

  function showFeedback(type, message) {
    setFeedback({ type, message });
    window.setTimeout(() => setFeedback(null), 3200);
  }

  async function loadCirclePage() {
    if (!supabase || !circleId) {
      setPageError('CourtStreak could not load this Training Circle.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      navigate('/login', { replace: true });
      return;
    }

    setCurrentUserId(user.id);

    const { data: circleData, error: circleError } = await supabase
      .from('training_circles')
      .select(`
        id,
        name,
        circle_type,
        owner_id,
        is_private,
        weekly_workout_goal,
        motto,
        badge_key,
        theme_key,
        allow_member_invites,
        allow_member_challenges,
        created_at,
        updated_at
      `)
      .eq('id', circleId)
      .single();

    if (circleError || !circleData) {
      console.error('Could not load Training Circle:', circleError);
      setPageError(
        'This Circle is unavailable or you no longer have access.'
      );
      setLoading(false);
      return;
    }

    setCircle(circleData);
    setSettingsForm({
      name: circleData.name || '',
      circleType: circleData.circle_type || 'Friends',
      motto: circleData.motto || '',
      badgeKey: circleData.badge_key || 'basketball',
      themeKey: circleData.theme_key || 'orange',
      weeklyGoal: circleData.weekly_workout_goal || 20,
      allowMemberInvites: Boolean(circleData.allow_member_invites),
      allowMemberChallenges:
        circleData.allow_member_challenges !== false,
    });

    const { data: memberships, error: memberError } = await supabase
      .from('training_circle_members')
      .select('id, user_id, role, joined_at')
      .eq('circle_id', circleId)
      .order('joined_at', { ascending: true });

    if (memberError) {
      console.error('Could not load Circle members:', memberError);
      setPageError('CourtStreak could not load the Circle members.');
      setLoading(false);
      return;
    }

    const memberRows = memberships ?? [];
    const userIds = memberRows.map((member) => member.user_id);
    let realMembers = [];

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, xp, training_streak')
        .in('id', userIds);

      if (profileError) {
        console.error('Could not load Circle profiles:', profileError);
      }

      const profileMap = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile])
      );

      realMembers = memberRows.map((membership) => {
        const profile = profileMap.get(membership.user_id);
        const firstName = profile?.first_name || 'Player';
        const lastName = profile?.last_name || '';

        return {
          id: membership.id,
          userId: membership.user_id,
          role: membership.role,
          joinedAt: membership.joined_at,
          name: `${firstName} ${lastName}`.trim(),
          initials: `${firstName[0] || 'P'}${lastName[0] || ''}`.toUpperCase(),
          streak: profile?.training_streak ?? 0,
          xp: profile?.xp ?? 0,
        };
      });
    }

    setMembers(realMembers);

    if (userIds.length === 0) {
      setWeeklyStats({ workouts: 0, xp: 0 });
      setWeeklyXpByUser({});
      setActivity([]);
      setCircleStreak(0);
      setLoading(false);
      return;
    }

    const startOfWeek = getStartOfWeek().toISOString();

    const { data: weeklyWorkouts, error: weeklyError } = await supabase
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
      .gte('completed_at', startOfWeek)
      .order('completed_at', { ascending: false });

    if (weeklyError) {
      console.error('Could not load weekly Circle activity:', weeklyError);
    }

    const xpMap = {};
    for (const workout of weeklyWorkouts ?? []) {
      xpMap[workout.user_id] =
        (xpMap[workout.user_id] ?? 0) + (workout.xp_earned ?? 0);
    }

    setWeeklyXpByUser(xpMap);
    setWeeklyStats({
      workouts: weeklyWorkouts?.length ?? 0,
      xp: (weeklyWorkouts ?? []).reduce(
        (total, workout) => total + (workout.xp_earned ?? 0),
        0
      ),
    });

    const { data: recentWorkouts, error: activityError } = await supabase
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

    if (activityError) {
      console.error('Could not load recent Circle activity:', activityError);
    }

    const memberMap = new Map(
      realMembers.map((member) => [member.userId, member])
    );

    setActivity(
      (weeklyWorkouts ?? []).map((workout) => ({
        id: workout.id,
        userId: workout.user_id,
        name: memberMap.get(workout.user_id)?.name || 'Player',
        workout:
          workout.workout_name ||
          workout.workout_focus ||
          'CourtStreak training',
        minutes: workout.minutes_trained ?? 0,
        xp: workout.xp_earned ?? 0,
        completedAt: workout.completed_at,
      }))
    );

    const uniqueDays = [
      ...new Set(
        (recentWorkouts ?? []).map((workout) =>
          getLocalDateKey(workout.completed_at)
        )
      ),
    ];

    let calculatedStreak = 0;
    if (uniqueDays.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const mostRecent = new Date(`${uniqueDays[0]}T00:00:00`);

      if (
        mostRecent.getTime() === today.getTime() ||
        mostRecent.getTime() === yesterday.getTime()
      ) {
        const expected = new Date(mostRecent);
        for (const dateString of uniqueDays) {
          const activityDay = new Date(`${dateString}T00:00:00`);
          if (activityDay.getTime() !== expected.getTime()) break;
          calculatedStreak += 1;
          expected.setDate(expected.getDate() - 1);
        }
      }
    }

    setCircleStreak(calculatedStreak);
    setLoading(false);
  }

  useEffect(() => {
    loadCirclePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId]);

  async function handleCreateInvite() {
    if (!canInvite || creatingInvite) return;

    setCreatingInvite(true);
    const { data, error } = await supabase.rpc(
      'create_training_circle_invite',
      { p_circle_id: circleId }
    );
    setCreatingInvite(false);

    if (error) {
      console.error('Could not create Circle invite:', error);
      showFeedback('error', error.message || 'Could not create the invite.');
      return;
    }

    const invite = data?.[0];
    setInviteCode(invite?.invite_code || '');
    setInviteExpiresAt(invite?.expires_at || null);
    setInviteOpen(true);
  }

  function getInviteUrl() {
    const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    return `${window.location.origin}${basePath}/training-circles/join/${inviteCode}`;
  }

  function getInviteMessage() {
    return (
      `🏀 Join ${circle?.name || 'my Training Circle'} on CourtStreak. ` +
      `Train together, build your streak, and compete each week.\n\n` +
      getInviteUrl()
    );
  }

  function shareWithMessages() {
    window.location.href = `sms:?&body=${encodeURIComponent(getInviteMessage())}`;
  }

  function shareWithWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(getInviteMessage())}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  function shareWithEmail() {
    window.location.href =
      `mailto:?subject=${encodeURIComponent(`Join ${circle?.name} on CourtStreak`)}` +
      `&body=${encodeURIComponent(getInviteMessage())}`;
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(inviteCode);
    showFeedback('success', 'Invitation code copied.');
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(getInviteUrl());
    showFeedback('success', 'Invitation link copied.');
  }

  async function shareInvite() {
    const text = getInviteMessage();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${circle?.name || 'my Training Circle'}`,
          text,
        });
      } catch (error) {
        if (error?.name !== 'AbortError') {
          showFeedback('error', 'CourtStreak could not open sharing.');
        }
      }
    } else {
      await copyInviteLink();
    }
  }

  async function handleSaveSettings(event) {
    event.preventDefault();
    if (!isOwner || savingSettings) return;

    setSavingSettings(true);
    const { data, error } = await supabase.rpc(
      'update_training_circle_settings',
      {
        p_circle_id: circleId,
        p_name: settingsForm.name,
        p_circle_type: settingsForm.circleType,
        p_motto: settingsForm.motto,
        p_badge_key: settingsForm.badgeKey,
        p_theme_key: settingsForm.themeKey,
        p_weekly_workout_goal: Number(settingsForm.weeklyGoal),
        p_allow_member_invites: true,
        p_allow_member_challenges: settingsForm.allowMemberChallenges,
      }
    );
    setSavingSettings(false);

    if (error) {
      console.error('Could not update Circle:', error);
      showFeedback('error', error.message || 'Circle settings were not saved.');
      return;
    }

    const updatedCircle = Array.isArray(data) ? data[0] : data;
    if (updatedCircle) setCircle(updatedCircle);
    setManageOpen(false);
    showFeedback('success', 'Training Circle updated.');
  }

  async function handleLeaveCircle() {
    if (isOwner || actionLoading) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('leave_training_circle', {
      p_circle_id: circleId,
    });
    setActionLoading(false);

    if (error) {
      console.error('Could not leave Circle:', error);
      showFeedback('error', error.message || 'Could not leave this Circle.');
      return;
    }

    navigate('/training-circles', { replace: true });
  }

  async function handleDeleteCircle() {
    if (!isOwner || actionLoading) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('delete_training_circle', {
      p_circle_id: circleId,
    });
    setActionLoading(false);

    if (error) {
      console.error('Could not delete Circle:', error);
      showFeedback('error', error.message || 'Could not delete this Circle.');
      return;
    }

    navigate('/training-circles', { replace: true });
  }

  async function handleRemoveMember(member) {
    if (!isOwner || actionLoading) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('remove_training_circle_member', {
      p_circle_id: circleId,
      p_member_id: member.userId,
    });
    setActionLoading(false);

    if (error) {
      console.error('Could not remove member:', error);
      showFeedback('error', error.message || 'Could not remove this member.');
      return;
    }

    setConfirmAction(null);
    showFeedback('success', `${member.name} was removed from the Circle.`);
    await loadCirclePage();
  }

  async function handleTransferOwnership(member) {
    if (!isOwner || actionLoading) return;
    setActionLoading(true);
    const { error } = await supabase.rpc(
      'transfer_training_circle_ownership',
      {
        p_circle_id: circleId,
        p_new_owner_id: member.userId,
      }
    );
    setActionLoading(false);

    if (error) {
      console.error('Could not transfer ownership:', error);
      showFeedback('error', error.message || 'Ownership was not transferred.');
      return;
    }

    setConfirmAction(null);
    setManageOpen(false);
    showFeedback('success', `${member.name} is now the Circle owner.`);
    await loadCirclePage();
  }

  async function handleRevokeInvites() {
    if (!isOwner || actionLoading) return;
    setActionLoading(true);
    const { error } = await supabase.rpc('revoke_training_circle_invites', {
      p_circle_id: circleId,
    });
    setActionLoading(false);

    if (error) {
      showFeedback('error', error.message || 'Invitations were not revoked.');
      return;
    }

    setInviteCode('');
    setInviteOpen(false);
    setConfirmAction(null);
    showFeedback('success', 'Active invitations were revoked.');
  }

  if (loading) {
    return (
      <main className="cs-circle-rebuild-page">
        <div className="cs-circle-rebuild-loading">
          <span />
          Loading your Training Circle...
        </div>
      </main>
    );
  }

  if (pageError || !circle) {
    return (
      <main className="cs-circle-rebuild-page">
        <div className="cs-circle-rebuild-error">
          <Shield />
          <h1>Circle unavailable</h1>
          <p>{pageError}</p>
          <button onClick={() => navigate('/training-circles')}>
            Return to Training Circles
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="cs-circle-rebuild-page"
      style={{ '--circle-accent': selectedTheme.color }}
    >
      <header className="cs-circle-rebuild-topbar">
        <button type="button" onClick={() => navigate('/training-circles')}>
          <ArrowLeft size={18} />
          Circles
        </button>
        <strong>COURT<span>STREAK</span></strong>
        <small>{currentMembership?.role === 'owner' ? 'Owner' : 'Member'}</small>
      </header>

      <div className="cs-circle-rebuild-shell">
        <section className="cs-circle-rebuild-hero">
          <div className="cs-circle-rebuild-identity">
            <div className="cs-circle-rebuild-badge"><SelectedBadge /></div>
            <div>
              <span>{circle.circle_type.toUpperCase()} · {circle.is_private ? 'PRIVATE' : 'OPEN'}</span>
              <h1>{circle.name}</h1>
              <p>{circle.motto || 'Your people. Your progress. Your standard.'}</p>
              <small>{members.length} {members.length === 1 ? 'member' : 'members'}</small>
            </div>
          </div>

          <div className="cs-circle-rebuild-actions">
            {canInvite ? (
              <button type="button" className="primary" onClick={handleCreateInvite} disabled={creatingInvite}>
                <UserPlus size={17} />
                {creatingInvite ? 'Creating...' : 'Invite Players'}
              </button>
            ) : null}
            <button type="button" onClick={() => setManageOpen(true)}>
              <Settings size={17} />
              Manage Circle
            </button>
          </div>
        </section>

        <section className="cs-circle-rebuild-stats">
          <article><Flame /><span><strong>{circleStreak}</strong>Circle streak</span></article>
          <article><Target /><span><strong>{weeklyStats.workouts}</strong>This week</span></article>
          <article><Zap /><span><strong>{weeklyStats.xp.toLocaleString()}</strong>Weekly XP</span></article>
          <article><Users /><span><strong>{members.length}</strong>Members</span></article>
        </section>

        <section className="cs-circle-rebuild-grid">
          <article className="cs-circle-rebuild-card cs-circle-rebuild-goal">
            <div className="cs-circle-rebuild-card-heading">
              <div><span>WEEKLY CIRCLE GOAL</span><h2>Keep the Circle moving.</h2></div>
              <strong>{weeklyStats.workouts}/{weeklyGoal}</strong>
            </div>
            <div className="cs-circle-rebuild-goal-track"><span style={{ width: `${goalPercentage}%` }} /></div>
            <div className="cs-circle-rebuild-goal-footer">
              <span>{Math.max(weeklyGoal - weeklyStats.workouts, 0)} sessions remaining</span>
              <strong>{Math.round(goalPercentage)}%</strong>
            </div>
          </article>

          <article className="cs-circle-rebuild-card cs-circle-rebuild-leaderboard">
            <div className="cs-circle-rebuild-card-heading">
              <div><span>FRIENDLY COMPETITION</span><h2>Circle standings</h2></div>
              <div className="cs-circle-rebuild-tabs">
                <button className={leaderboardType === 'weekly' ? 'active' : ''} onClick={() => setLeaderboardType('weekly')}>Week</button>
                <button className={leaderboardType === 'all' ? 'active' : ''} onClick={() => setLeaderboardType('all')}>All time</button>
              </div>
            </div>
            <div className="cs-circle-rebuild-member-list">
              {rankedMembers.length ? rankedMembers.slice(0, 5).map((member) => (
                <div key={member.id} className="cs-circle-rebuild-member">
                  <span className="rank">{member.rank <= 3 ? <Medal /> : member.rank}</span>
                  <span className="avatar">{member.initials}</span>
                  <span className="name"><strong>{member.name}</strong><small><Flame /> {member.streak} day streak</small></span>
                  <span className="xp"><strong>{member.displayXp.toLocaleString()}</strong><small>XP</small></span>
                </div>
              )) : <div className="cs-circle-rebuild-empty">Invite players to start your standings.</div>}
            </div>
          </article>

          <article className="cs-circle-rebuild-card cs-circle-week-visual">
            <div className="cs-circle-rebuild-card-heading">
              <div><span>THIS WEEK</span><h2>Training rhythm</h2></div>
              <button type="button" onClick={() => setActivityOpen(true)}>
                View activity <ChevronRight />
              </button>
            </div>

            <div className="cs-circle-week-bars">
              {weeklyActivityChart.map((day) => {
                const maxCount = Math.max(
                  ...weeklyActivityChart.map((item) => item.count),
                  1
                );
                const height = day.count
                  ? Math.max((day.count / maxCount) * 100, 20)
                  : 7;

                return (
                  <div key={day.label}>
                    <span className="value">{day.count || ''}</span>
                    <span className="track">
                      <i
                        className={day.count ? 'active' : ''}
                        style={{ height: `${height}%` }}
                      />
                    </span>
                    <small>{day.label}</small>
                  </div>
                );
              })}
            </div>

            <div className="cs-circle-week-summary">
              <span><strong>{weeklyStats.workouts}</strong> sessions</span>
              <span><strong>{activeMembersThisWeek}</strong> active members</span>
              <span><strong>{mostActiveDay.count ? mostActiveDay.label : '—'}</strong> most active day</span>
            </div>

            {activity.length ? (
              <div className="cs-circle-week-highlights">
                {activity.slice(0, 2).map((item) => (
                  <div key={item.id}>
                    <span className="icon"><Dumbbell /></span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.workout} · +{item.xp} XP</small>
                    </span>
                    <time>{formatDate(item.completedAt)}</time>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cs-circle-rebuild-empty">
                Be the first to train this week.
              </div>
            )}
          </article>

        </section>
      </div>

      {feedback ? <div className={`cs-circle-rebuild-feedback ${feedback.type}`}><Check />{feedback.message}</div> : null}

      {inviteOpen ? (
        <div className="cs-circle-rebuild-overlay" onMouseDown={() => setInviteOpen(false)}>
          <section className="cs-circle-rebuild-modal invite" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setInviteOpen(false)} aria-label="Close"><X /></button>
            <div className="modal-icon"><UserPlus /></div>
            <span>INVITE TO YOUR CIRCLE</span>
            <h2>Bring someone into {circle.name}.</h2>
            <p>Only people you invite can enter this private Training Circle.</p>
            <div className="cs-circle-rebuild-code"><span><small>INVITATION CODE</small><strong>{inviteCode}</strong></span><button onClick={copyInviteCode}><Copy /> Copy</button></div>
            <div className="cs-circle-quick-share">
              <button className="messages" onClick={shareWithMessages}>
                <MessageCircle /><span>Messages</span>
              </button>
              <button className="whatsapp" onClick={shareWithWhatsApp}>
                <MessageCircle /><span>WhatsApp</span>
              </button>
              <button className="email" onClick={shareWithEmail}>
                <Mail /><span>Email</span>
              </button>
              <button className="more" onClick={shareInvite}>
                <Share2 /><span>More Apps</span>
              </button>
            </div>
            <div className="cs-circle-rebuild-invite-actions single">
              <button onClick={copyInviteLink}><Copy /> Copy Invite Link</button>
            </div>
            {inviteExpiresAt ? <small className="expires">Expires {new Date(inviteExpiresAt).toLocaleDateString()}</small> : null}
            {isOwner ? <button className="revoke" onClick={() => setConfirmAction({ type: 'revoke' })}>Revoke active invitations</button> : null}
          </section>
        </div>
      ) : null}

      {activityOpen ? (
        <div
          className="cs-circle-rebuild-overlay"
          onMouseDown={() => setActivityOpen(false)}
        >
          <section
            className="cs-circle-rebuild-modal activity"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => setActivityOpen(false)}
              aria-label="Close"
            >
              <X />
            </button>

            <div className="modal-icon"><Dumbbell /></div>
            <span>WEEKLY ACTIVITY</span>
            <h2>{circle.name}</h2>
            <p>
              {weeklyStats.workouts} sessions ·{' '}
              {weeklyStats.xp.toLocaleString()} XP ·{' '}
              {activeMembersThisWeek} active members
            </p>

            <div className="cs-circle-full-activity-list">
              {activity.length ? activity.map((item) => (
                <div key={item.id}>
                  <span className="avatar">
                    {members.find((member) => member.userId === item.userId)?.initials || 'P'}
                  </span>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.workout} · {item.minutes} min · +{item.xp} XP
                    </small>
                  </span>
                  <time>{formatDate(item.completedAt)}</time>
                </div>
              )) : (
                <div className="cs-circle-rebuild-empty">
                  No Circle activity has been recorded this week.
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {manageOpen ? (
        <div className="cs-circle-rebuild-overlay" onMouseDown={() => setManageOpen(false)}>
          <section className="cs-circle-rebuild-manage" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><span>MANAGE CIRCLE</span><h2>{circle.name}</h2></div><button onClick={() => setManageOpen(false)}><X /></button></header>

            {isOwner ? (
              <form onSubmit={handleSaveSettings}>
                <div className="cs-circle-manage-section">
                  <div className="section-title"><Palette /><span><strong>Circle identity</strong><small>Make this space feel like your group.</small></span></div>
                  <label><span>Circle name</span><input value={settingsForm.name} maxLength={40} onChange={(event) => setSettingsForm({ ...settingsForm, name: event.target.value })} required /></label>
                  <label><span>Circle motto</span><input value={settingsForm.motto} maxLength={80} placeholder="Your people. Your progress. Your standard." onChange={(event) => setSettingsForm({ ...settingsForm, motto: event.target.value })} /></label>
                  <label><span>Circle purpose</span><select value={settingsForm.circleType} onChange={(event) => setSettingsForm({ ...settingsForm, circleType: event.target.value })}>{circleTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                  <div className="cs-circle-badge-picker"><span>Team badge</span><div>{badgeOptions.map(({ key, label, Icon }) => <button type="button" key={key} title={label} className={settingsForm.badgeKey === key ? 'active' : ''} onClick={() => setSettingsForm({ ...settingsForm, badgeKey: key })}><Icon /></button>)}</div></div>
                  <div className="cs-circle-theme-picker"><span>Team color</span><div>{themeOptions.map((theme) => <button type="button" key={theme.key} title={theme.label} className={settingsForm.themeKey === theme.key ? 'active' : ''} style={{ '--option-color': theme.color }} onClick={() => setSettingsForm({ ...settingsForm, themeKey: theme.key })} />)}</div></div>
                </div>

                <div className="cs-circle-manage-section">
                  <div className="section-title"><Target /><span><strong>Goals and permissions</strong><small>Set expectations without overcomplicating the Circle.</small></span></div>
                  <label><span>Weekly Circle goal</span><input type="number" min="1" max="100" value={settingsForm.weeklyGoal} onChange={(event) => setSettingsForm({ ...settingsForm, weeklyGoal: event.target.value })} /></label>
                  <label className="toggle"><span><strong>Allow friendly challenges</strong><small>Members can challenge one another.</small></span><input type="checkbox" checked={settingsForm.allowMemberChallenges} onChange={(event) => setSettingsForm({ ...settingsForm, allowMemberChallenges: event.target.checked })} /></label>
                </div>

                <button className="cs-circle-save-settings" type="submit" disabled={savingSettings}><Save />{savingSettings ? 'Saving...' : 'Save Circle Settings'}</button>
              </form>
            ) : (
              <div className="cs-circle-member-access"><Shield /><h3>Member access</h3><p>The Circle owner manages its appearance, goals, and permissions.</p></div>
            )}

            <div className="cs-circle-manage-section members">
              <div className="section-title"><Users /><span><strong>Members</strong><small>{members.length} people in this Circle</small></span></div>
              {members.map((member) => (
                <div className="cs-circle-manage-member" key={member.id}>
                  <span className="avatar">{member.initials}</span>
                  <span><strong>{member.name}</strong><small>{member.role === 'owner' ? 'Circle owner' : 'Member'}</small></span>
                  {isOwner && member.userId !== currentUserId ? <div><button onClick={() => setConfirmAction({ type: 'transfer', member })} title="Transfer ownership"><Crown /></button><button className="danger" onClick={() => setConfirmAction({ type: 'remove', member })} title="Remove member"><UserMinus /></button></div> : null}
                </div>
              ))}
            </div>

            <div className="cs-circle-manage-danger">
              <span>DANGER ZONE</span>
              {isOwner ? <><p>Owners must transfer ownership before leaving, or permanently delete the Circle.</p><button onClick={() => setConfirmAction({ type: 'delete' })}><Trash2 /> Delete Training Circle</button></> : <><p>Your personal progress will remain on CourtStreak.</p><button onClick={() => setConfirmAction({ type: 'leave' })}><LogOut /> Leave Training Circle</button></>}
            </div>
          </section>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="cs-circle-rebuild-overlay confirm" onMouseDown={() => setConfirmAction(null)}>
          <section className="cs-circle-confirm-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="warning"><Shield /></div>
            <h2>{confirmAction.type === 'delete' ? `Delete ${circle.name}?` : confirmAction.type === 'leave' ? `Leave ${circle.name}?` : confirmAction.type === 'remove' ? `Remove ${confirmAction.member?.name}?` : confirmAction.type === 'transfer' ? `Make ${confirmAction.member?.name} the owner?` : 'Revoke invitations?'}</h2>
            <p>{confirmAction.type === 'delete' ? 'This permanently deletes the Circle, its memberships, and active invitations. Personal player progress will remain.' : confirmAction.type === 'leave' ? 'You will lose access to this Circle. Your personal CourtStreak progress will remain.' : confirmAction.type === 'remove' ? 'This player will lose access to the Circle. Their personal progress will remain.' : confirmAction.type === 'transfer' ? 'You will become a regular member. Only the new owner will be able to manage the Circle.' : 'Every active invitation link and code for this Circle will stop working.'}</p>
            <div><button onClick={() => setConfirmAction(null)}>Cancel</button><button className="danger" disabled={actionLoading} onClick={() => { if (confirmAction.type === 'delete') handleDeleteCircle(); if (confirmAction.type === 'leave') handleLeaveCircle(); if (confirmAction.type === 'remove') handleRemoveMember(confirmAction.member); if (confirmAction.type === 'transfer') handleTransferOwnership(confirmAction.member); if (confirmAction.type === 'revoke') handleRevokeInvites(); }}>{actionLoading ? 'Working...' : 'Confirm'}</button></div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
