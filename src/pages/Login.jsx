import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';
import { getHubAccount, hubHome, safeHubNext } from '../hub/api.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
const hubNext = safeHubNext(searchParams.get('next')) || safeHubNext(location.state?.from);
const inviteRole = hubNext ? new URL(hubNext, window.location.origin).searchParams.get('role') : null;
const inviteCode = searchParams.get('invite');
const checkoutType = searchParams.get('checkout');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!supabase) {
      setError('Supabase is not connected. Check your .env.local file.');
      return;
    }

    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

   if (inviteCode) {
  navigate(`/training-circles/join/${encodeURIComponent(inviteCode)}${searchParams.get('accept') === '1' ? '?accept=1' : ''}`);
  return;
}

const next = hubNext;
if (next) { navigate(next); return; }
try {
  const account = await getHubAccount();
  if (account.role !== 'player') { navigate(hubHome(account.role)); return; }
} catch (error) { setError(error.message); return; }

const {
  data: hasActiveMembership,
  error: membershipError,
} = await supabase.rpc('has_active_courtstreak_membership');

if (membershipError) {
  console.error('Could not verify CourtStreak membership:', membershipError);
  setError('Could not verify your CourtStreak membership. Please try again.');
  return;
}

if (hasActiveMembership) {
  navigate('/dashboard');
} else {
  navigate('/pricing?checkout=membership');
}
  }

  return (
    <main className="cs-auth-page">
      <section className="cs-auth-brand">
        <Link className="cs-auth-logo" to="/">CourtStreak</Link>
        <p className="cs-auth-eyebrow">WELCOME BACK</p>
        <h1>Keep your streak moving forward.</h1>
        <p className="cs-auth-intro">
          Log in to access your CourtStreak account, training plan,
          progress, challenges, and Training Circles.
        </p>

        <div className="cs-auth-benefits">
          <div><strong>Your training plan stays organized.</strong></div>
          <div><strong>Your streak keeps you accountable.</strong></div>
          <div><strong>Your progress stays connected to your goals.</strong></div>
        </div>
      </section>

      <section className="cs-auth-card">
        <p className="cs-auth-eyebrow">LOG IN</p>
        <h2>Access your account.</h2>
        <p className="cs-auth-muted">
          Use the email and password you selected when creating your account.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </label>

          <div style={{ textAlign: 'right', marginTop: '-6px', marginBottom: '16px' }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          {error && <div className="cs-auth-message cs-auth-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="cs-auth-login">
         Need an account?{' '}
<Link
  to={
    inviteCode
      ? `/create-account?invite=${encodeURIComponent(inviteCode)}${searchParams.get('accept') === '1' ? '&accept=1' : ''}`
      : hubNext
        ? `/create-account?next=${encodeURIComponent(hubNext)}${['parent','coach'].includes(inviteRole)?'&role='+inviteRole:''}`
      : checkoutType === 'membership'
        ? '/create-account?checkout=membership'
        : '/create-account'
  }
>
  Create one
</Link>
        </p>
      </section>
    </main>
  );
}
