import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Flame, Lock, Trophy, Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';
import '../circle-invite.css';

export default function JoinTrainingCircle() {
  const navigate = useNavigate();
  const { inviteCode } = useParams();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [circle, setCircle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [auth, setAuth] = useState('checking');
  const [membershipRequired, setMembershipRequired] = useState(false);
  const [searchParams] = useSearchParams();
  const autoJoin = searchParams.get('accept') === '1';
  const attempted = useRef(false);
  const query = `?invite=${encodeURIComponent(inviteCode || '')}&accept=1`;

  useEffect(() => {
    let active = true;
    attempted.current = false;
    setLoading(true); setInvalid(false); setError(''); setMembershipRequired(false);
    async function load() {
      if (!supabase || !inviteCode) {
        if (active) { setError('Your invitation could not be loaded. Please try again shortly.'); setLoading(false); setAuth('guest'); }
        return;
      }
      try {
        const { data, error: previewError } = await supabase.rpc('get_training_circle_invite_preview', { p_invite_code: inviteCode });
        if (!active) return;
        if (previewError) setError('We could not load the Circle details. You can still sign in and try your invite.');
        else if (!data?.[0]) { setInvalid(true); setError('This invitation is invalid or has expired. Ask the sender for a new link.'); }
        else setCircle(data[0]);
      } catch { if (active) setError('We could not load the Circle details. Please check your connection.'); }
      finally { if (active) setLoading(false); }
    }
    load();
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => { if (active) setAuth(data?.session ? 'signed-in' : 'guest'); }).catch(() => { if (active) setAuth('guest'); });
    }
    const { data: subscription } = supabase?.auth.onAuthStateChange((_event, session) => { if (active) setAuth(session ? 'signed-in' : 'guest'); }) || {};
    return () => { active = false; subscription?.subscription?.unsubscribe(); };
  }, [inviteCode]);

  useEffect(() => {
    if (autoJoin && auth === 'signed-in' && !loading && !invalid && !attempted.current) {
      attempted.current = true;
      handleJoin();
    }
  }, [autoJoin, auth, loading, invalid]);

  async function handleJoin() {
    if (joining) return;
    if (!supabase) { setError('We could not connect. Please try again shortly.'); return; }
    setJoining(true); setError('');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) { setAuth('guest'); return; }
      const { data, error: joinError } = await supabase.rpc('join_training_circle_by_invite', { p_invite_code: inviteCode });
      if (joinError) {
        const message = joinError.message || '';
        if (/ACTIVE_MEMBERSHIP_REQUIRED|active CourtStreak membership/i.test(message)) setMembershipRequired(true);
        else if (/not authenticated|not signed in|sign in|log in|no account|authentication required|must be logged/i.test(message)) setAuth('guest');
        else setError('We could not accept this invitation. Please try again or ask the sender for a new link.');
        return;
      }
      if (!data) { setError('We could not confirm your Circle. Please try again.'); return; }
      navigate(`/training-circles/${encodeURIComponent(data)}`);
    } catch { setError('Connection interrupted. Please try again.'); }
    finally { setJoining(false); }
  }

  return (
    <main className="cs-circle-invite">
      <section className="cs-ci-card">
        <Link to="/" className="cs-ci-brand"><Flame size={22} /> COURT<span>STREAK</span></Link>
        <div className="cs-ci-scene">
          <svg viewBox="0 0 600 220" aria-hidden="true">
            <defs><radialGradient id="ciBall"><stop stopColor="#ffb35d"/><stop offset="1" stopColor="#ed702b"/></radialGradient></defs>
            <path d="M20 194H580 M70 194Q300 130 530 194" fill="none" stroke="#263b55" strokeWidth="1.5"/>
            <path d="M548 36V194 M517 36H557V91H517Z" fill="none" stroke="#718299" strokeWidth="3"/>
            <path d="M517 73H531V85H517" fill="none" stroke="#f0f3fa" strokeWidth="2"/>
            <path className="cs-ci-net" d="M481 92L490 126H511L520 92 M487 98L511 126 M514 98L490 126 M484 106H517 M488 116H513" fill="none" stroke="#afbdd0" strokeWidth="1.4"/>
            <g className="cs-ci-ball"><circle r="16" fill="url(#ciBall)" stroke="#633116" strokeWidth="1.5"/><path d="M-16 0H16 M0-16V16 M-11-12Q7 0-11 12 M11-12Q-7 0 11 12" fill="none" stroke="#663119" strokeWidth="1.5"/></g>
            <ellipse cx="500" cy="92" rx="21" ry="4" fill="none" stroke="#fa8a3a" strokeWidth="3"/>
            <text className="cs-ci-swish" x="300" y="55" textAnchor="middle" fill="#ffac6b" fontSize="14" letterSpacing="5">YOUR NEXT CHAPTER.</text>
          </svg>
        </div>
        <p className="cs-ci-eyebrow"><Lock size={12}/> PRIVATE TRAINING CIRCLE</p>
        <h1>{circle?.circle_name ? <>You’re invited to <span>{circle.circle_name}.</span></> : 'Your crew is waiting.'}</h1>
        <p className="cs-ci-description">{circle?.inviter_first_name ? `${circle.inviter_first_name} invited you to train together.` : 'Better habits. A little competition. Your people.'} Build your streak together.</p>
        {circle && <p className="cs-ci-members"><Users size={15}/>{circle.member_count} {Number(circle.member_count) === 1 ? 'member' : 'members'} · Invite only</p>}
        <div className="cs-ci-benefits"><span><Flame size={17}/> Build streaks</span><span><Trophy size={17}/> Compete together</span></div>
        {error && <p className="cs-ci-error" role="alert">{error}</p>}
        {!invalid && <div className="cs-ci-preview-entry">
          <Link className="cs-ci-preview-link" to={`/preview?invite=${encodeURIComponent(inviteCode || '')}`}>Preview CourtStreak <ArrowRight size={18}/></Link>
          <p>No account needed. Explore before you join.</p>
        </div>}
        {!invalid && <div className="cs-ci-actions">
          {auth === 'guest' ? <>
            <p className="cs-ci-status">Create an account or log in to accept your invitation.</p>
            <Link className="cs-ci-primary" to={`/create-account${query}`}>Create Account & Continue <ArrowRight size={18}/></Link>
            <Link className="cs-ci-secondary" to={`/login${query}`}>Already have an account? Log In</Link>
            <p className="cs-ci-note">Your invite continues after sign-in. Active membership required.</p>
          </> : membershipRequired ? <>
            <p className="cs-ci-status">Your next step: activate your membership to join this Circle.</p>
            <Link className="cs-ci-primary" to={`/pricing${query}`}>View Membership <ArrowRight size={18}/></Link>
          </> : <button className="cs-ci-primary" type="button" disabled={joining || auth === 'checking' || loading} onClick={handleJoin}>{joining ? 'Accepting invitation…' : auth === 'checking' || loading ? 'Checking invitation…' : 'Accept Invite'}<ArrowRight size={18}/></button>}
        </div>}
        <p className="cs-ci-footer">Train together. Get better.</p>
      </section>
    </main>
  );
}
