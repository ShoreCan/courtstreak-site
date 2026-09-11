import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Flame,
  Lock,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';

export default function JoinTrainingCircle() {
  const navigate = useNavigate();
  const { inviteCode } = useParams();

  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [circlePreview, setCirclePreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [membershipRequired, setMembershipRequired] = useState(false);
useEffect(() => {
  let active = true;

  async function loadInvitePreview() {
    if (!supabase || !inviteCode) return;

    setLoadingPreview(true);

    const { data, error: previewError } = await supabase.rpc(
      'get_training_circle_invite_preview',
      {
        p_invite_code: inviteCode,
      }
    );

    if (!active) return;

    if (previewError) {
      console.error('Could not load invite preview:', previewError);
      setError('This invite is invalid or has expired.');
      setLoadingPreview(false);
      return;
    }

    setCirclePreview(data?.[0] ?? null);
    setLoadingPreview(false);
  }

  loadInvitePreview();

  return () => {
    active = false;
  };
}, [inviteCode]);
  async function handleJoin() {
    if (!supabase || !inviteCode) return;

    setJoining(true);
    setError('');

    const { data, error: joinError } = await supabase.rpc(
      'join_training_circle_by_invite',
      {
        p_invite_code: inviteCode,
      }
    );

   if (joinError) {
  console.error('Could not join Circle:', joinError);

  if (
    joinError.message?.includes('ACTIVE_MEMBERSHIP_REQUIRED')
  ) {
    setMembershipRequired(true);
    setError('');
  } else {
    setError(
      joinError.message || 'Could not join this Circle.'
    );
  }

  setJoining(false);
  return;
}

    navigate(`/training-circles/${data}`);
  }

  return (
    <main className="cs-join-page">
      <div className="cs-join-glow" />

      <div className="cs-join-card">
        <div className="cs-join-brand">
          <Flame size={20} />
          <span>COURTSTREAK</span>
        </div>

        <div className="cs-join-exclusive">
          <Lock size={13} />
          PRIVATE INVITATION
        </div>

        <p className="cs-join-eyebrow">
  {circlePreview?.inviter_first_name
    ? `${circlePreview.inviter_first_name.toUpperCase()} INVITED YOU`
    : "YOU'VE BEEN INVITED"}
</p>

        <h1>
  {loadingPreview
    ? 'Your crew is waiting.'
    : `Join ${circlePreview?.circle_name ?? 'your crew'}.`}
</h1>

<p className="cs-join-description">
  {circlePreview ? (
    <>
      🔒 Private Training Circle ·{' '}
      {circlePreview.member_count}{' '}
      {Number(circlePreview.member_count) === 1
        ? 'member'
        : 'members'}
      <br />
      <strong>Think you can take the #1 spot?</strong>
    </>
  ) : (
    'Loading your private CourtStreak invitation...'
  )}
</p>

        <div className="cs-join-benefits">
          <div>
            <Flame size={19} />
            <span>Build streaks together</span>
          </div>

          <div>
            <Trophy size={19} />
            <span>Climb the Circle leaderboard</span>
          </div>

          <div>
            <Zap size={19} />
            <span>Compete for weekly XP</span>
          </div>
        </div>

        {membershipRequired ? (
  <div className="cs-membership-invite">
    <div className="cs-membership-invite-badge">
      INVITE SAVED
    </div>

    <h2>Your spot is waiting.</h2>

    <p>
      Join CourtStreak to enter{' '}
      <strong>
        {circlePreview?.circle_name ?? 'this Training Circle'}
      </strong>
      , compete with your crew, and climb the weekly leaderboard.
    </p>

    <button
      type="button"
      className="cs-join-button"
      onClick={() =>
        navigate(
          `/pricing?invite=${encodeURIComponent(inviteCode)}`
        )
      }
    >
      JOIN COURTSTREAK & ACCEPT INVITE
      <ArrowRight size={19} />
    </button>

    <button
      type="button"
      className="cs-invite-signin"
      onClick={() =>
        navigate(
          `/login?invite=${encodeURIComponent(inviteCode)}`
        )
      }
    >
      Already a member? Sign in
    </button>
  </div>
) : (
  <button
    type="button"
    className="cs-join-button"
    disabled={joining}
    onClick={handleJoin}
  >
    {joining ? (
      'Checking your invite...'
    ) : (
      <>
        ACCEPT INVITE
        <ArrowRight size={19} />
      </>
    )}
  </button>
)}

        <div className="cs-join-code">
          <span>INVITE CODE</span>
          <strong>{inviteCode}</strong>
        </div>

        {error && (
          <p className="cs-join-error">
            {error}
          </p>
        )}

        <div className="cs-join-footer">
          <Users size={15} />
          Invite only. Train together. Get better.
        </div>
      </div>
    </main>
  );
}