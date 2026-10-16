import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { safeHubNext } from '../hub/api.js';
import '../signup-polish.css';

function SignupShot() {
  return <svg className="cs-signup-shot" viewBox="0 0 80 58" aria-hidden="true"><path d="M74 6v25M50 30h24M52 32l4 16h10l5-16M55 36l13 9M68 36l-11 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><g className="cs-signup-shot-ball"><circle cx="12" cy="40" r="5" fill="currentColor" /><path d="M7 40h10M12 35v10" stroke="#9a3908" strokeWidth="1" /></g></svg>;
}

export default function CreateAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
const [form, setForm] = useState({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  accountType: ['parent','coach','player'].includes(searchParams.get('role')) ? searchParams.get('role') : 'player',
});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const shotTimer = useRef(null);
  const [shotPlaying, setShotPlaying] = useState(false);
  const [shotKey, setShotKey] = useState(0);
  useEffect(() => () => clearTimeout(shotTimer.current), []);
  function playSignupShot() {
    clearTimeout(shotTimer.current);
    setShotKey((key) => key + 1);
    setShotPlaying(true);
    shotTimer.current = setTimeout(() => setShotPlaying(false), 3200);
  }

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting.current) return;
    setMessage('');
    setError('');

    if (!supabase) {
      setError('Account creation is temporarily unavailable. Please try again shortly.');
      return;
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Enter your first and last name.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    submitting.current = true;
    setLoading(true);
    try {

    const loginUrl = new URL(
      import.meta.env.BASE_URL + 'login',
      window.location.origin
    );

    if (inviteCode) {
      loginUrl.searchParams.set('invite', inviteCode);
      if (searchParams.get('accept') === '1') loginUrl.searchParams.set('accept', '1');
    }

    const hubNext = safeHubNext(searchParams.get('next'));
    if (hubNext) loginUrl.searchParams.set('next', hubNext);
    const redirectTo = loginUrl.toString();

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
  first_name: form.firstName.trim(),
  last_name: form.lastName.trim(),
  full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
  account_type: form.accountType,
},
      },
    });

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (signupData?.session && hubNext) { navigate(hubNext); return; }

    if (signupData?.session && inviteCode) {
      navigate(`/training-circles/join/${encodeURIComponent(inviteCode)}${searchParams.get('accept') === '1' ? '?accept=1' : ''}`);
      return;
    }

    setMessage(signupData?.session
      ? 'Your account is ready. Log in to continue.'
      : 'Check your inbox for a verification link, then log in to continue.');
    } catch {
      setError('We couldn’t finish creating your account. Check your connection and try again.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="cs-auth-page cs-signup-page">
      <section className="cs-auth-brand">
        <Link className="cs-auth-logo" to="/">CourtStreak</Link>
        <p className="cs-auth-eyebrow">YOUR STREAK STARTS HERE</p>
        <h1>Your next chapter starts here.</h1>
        <p className="cs-auth-intro">
          Guided basketball training. Progress you can see. A crew that keeps you accountable.
        </p>

        <div className="cs-auth-benefits">
          <div><strong>Never wonder what to work on again.</strong></div>
          <div><strong>Build a streak you do not want to lose.</strong></div>
          <div><strong>Compete with the people who push you to improve.</strong></div>
        </div>
      </section>

      <section className="cs-auth-card">
        <p className="cs-auth-eyebrow">CREATE YOUR ACCOUNT</p>
        <h2>{inviteCode ? 'Create your account to join your crew.' : 'Create your CourtStreak account.'}</h2>
        <p className="cs-auth-muted">
          Choose an account role first, then enter the name that belongs to that account.
        </p>

        <Link className="cs-signup-preview-card" aria-label="Explore CourtStreak — no account or payment needed" to={inviteCode ? `/preview?invite=${encodeURIComponent(inviteCode)}` : '/preview'}>
          <span className="cs-signup-preview-icon" aria-hidden="true"><SignupShot /></span>
          <span className="cs-signup-preview-copy"><small>SEE IT BEFORE YOU JOIN</small><strong>Explore CourtStreak</strong><span>See the dashboard, drills, and sample progress.</span><em>No account or payment needed</em></span>
          <span className="cs-signup-preview-arrow" aria-hidden="true">↗</span>
        </Link>

        <form onSubmit={handleSubmit} aria-busy={loading}>
          <fieldset className="cs-signup-fields" disabled={loading}>
          <label>
            Whose account are you creating?
            <select name="accountType" value={form.accountType} onChange={update}>
              <option value="player">Player</option>
              <option value="parent">Parent</option>
              <option value="coach">Coach</option>
              <option value="trainer">Trainer</option>
            </select>
          </label>

          <div className="cs-signup-role-guidance" role="note">
            <strong>{form.accountType === 'player' ? 'Player account: use the player’s name.' : form.accountType === 'parent' ? 'Parent account: use your own name.' : 'Coach account: use your own name.'}</strong>
            <p>{form.accountType === 'player' ? 'If you are a parent setting this up for your child, enter your child’s first and last name below. This account will record only that player’s training.' : form.accountType === 'parent' ? 'Enter your name below, not your child’s. Each child needs a separate Player account in their own name. You will link those accounts to your Family Hub after signup.' : 'Enter your own first and last name. Your Team Hub will show only players who grant you access.'}</p>
            {form.accountType === 'parent' && <small>Use a separate sign-in email for each player account so their progress stays separate.</small>}
          </div>
          <div className="cs-auth-name-grid">
  <label>
    First name
    <input
      name="firstName"
      value={form.firstName}
      onChange={update}
      placeholder={form.accountType === 'parent' ? 'Dana' : form.accountType === 'coach' || form.accountType === 'trainer' ? 'Morgan' : 'Jordan'}
      autoComplete="given-name"
      required
    />
  </label>

  <label>
    Last name
    <input
      name="lastName"
      value={form.lastName}
      onChange={update}
      placeholder={form.accountType === 'coach' || form.accountType === 'trainer' ? 'Reed' : 'Carter'}
      autoComplete="family-name"
      required
    />
  </label>
</div>

          <label>
            Email address
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>


          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={update}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={update}
              placeholder="Enter the same password"
              autoComplete="new-password"
              required
            />
          </label>

          </fieldset>
          {error && <div className="cs-auth-message cs-auth-error" role="alert">{error}</div>}
          {message && <div className="cs-auth-message cs-auth-success" role="status">{message}</div>}

          <button type="submit" disabled={loading} onClick={playSignupShot}>
            {(loading || shotPlaying) && <SignupShot key={shotKey} />}
            {loading ? <span role="status">Creating your account…</span> : <>Create Account {!shotPlaying && <span aria-hidden="true">→</span>}</>}
          </button>
        </form>

        <p className="cs-signup-membership-note">Creating an account is free. Paid training unlocks with membership.</p>
        <p className="cs-auth-login">
          Already registered? <Link to={inviteCode ? `/login?invite=${encodeURIComponent(inviteCode)}${searchParams.get('accept') === '1' ? '&accept=1' : ''}` : safeHubNext(searchParams.get('next')) ? `/login?next=${encodeURIComponent(safeHubNext(searchParams.get('next')))}` : '/login'}>Log in</Link>
        </p>

      </section>
    </main>
  );
}
