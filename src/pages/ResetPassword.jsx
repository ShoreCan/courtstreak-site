import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // checking | recovery | invalid
  const [recoveryStatus, setRecoveryStatus] = useState('checking');

  useEffect(() => {
    if (!supabase) {
      setRecoveryStatus('invalid');
      return;
    }

    let active = true;
    let recoveryDetected = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === 'PASSWORD_RECOVERY' && session) {
        recoveryDetected = true;
        setRecoveryStatus('recovery');
      }
    });

    // Give Supabase time to process the recovery credentials
    // contained in the URL before deciding the link is invalid.
    const timer = window.setTimeout(async () => {
      if (!active || recoveryDetected) return;

      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (!active || recoveryDetected) return;

      if (sessionError || !data.session) {
        setRecoveryStatus('invalid');
        return;
      }

      // A normal signed-in session is not enough to expose this page.
      // The PASSWORD_RECOVERY event above is what unlocks the form.
      setRecoveryStatus('invalid');
    }, 1500);

    return () => {
      active = false;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!supabase || recoveryStatus !== 'recovery') {
      setError(
        'This password reset link is invalid or has expired. Please request a new one.'
      );
      return;
    }

    if (password.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    setMessage('Password updated successfully. Taking you back to log in...');

    await supabase.auth.signOut();

    window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1500);
  }

  if (recoveryStatus === 'checking') {
    return (
      <main className="cs-auth-page">
        <section className="cs-auth-brand">
          <Link className="cs-auth-logo" to="/">CourtStreak</Link>
          <p className="cs-auth-eyebrow">ACCOUNT RECOVERY</p>
          <h1>Checking your reset link.</h1>
          <p className="cs-auth-intro">
            One moment while CourtStreak verifies your password reset request.
          </p>
        </section>

        <section className="cs-auth-card">
          <p className="cs-auth-eyebrow">SECURE RESET</p>
          <h2>Verifying link...</h2>
          <p className="cs-auth-muted">
            This should only take a moment.
          </p>
        </section>
      </main>
    );
  }

  if (recoveryStatus === 'invalid') {
    return (
      <main className="cs-auth-page">
        <section className="cs-auth-brand">
          <Link className="cs-auth-logo" to="/">CourtStreak</Link>
          <p className="cs-auth-eyebrow">ACCOUNT RECOVERY</p>
          <h1 style={{
            fontSize: 'clamp(42px, 5vw, 68px)',
            lineHeight: '0.98',
            maxWidth: '620px',
            letterSpacing: '-0.04em'
          }}>
            Reset your password securely.
          </h1>

          <p
            className="cs-auth-intro"
            style={{
              maxWidth: '540px',
              lineHeight: '1.65'
            }}
          >
            For your security, password changes can only be made through
            a valid CourtStreak recovery email.
          </p>
        </section>

        <section className="cs-auth-card">
          <p className="cs-auth-eyebrow">RESET LINK</p>
          <h2 style={{
            fontSize: 'clamp(30px, 3vw, 42px)',
            lineHeight: '1.05',
            letterSpacing: '-0.03em',
            maxWidth: '520px'
          }}>
            This link is invalid or expired.
          </h2>

          <p
            className="cs-auth-muted"
            style={{
              maxWidth: '520px',
              lineHeight: '1.6'
            }}
          >
            Request a new password reset email and use the secure link
            inside it.
          </p>

          <Link
            to="/forgot-password"
            style={{ textDecoration: 'none' }}
          >
            <button type="button">
              Request New Reset Link
            </button>
          </Link>

          <p className="cs-auth-login">
            Remember your password? <Link to="/login">Back to Log In</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="cs-auth-page">
      <section className="cs-auth-brand">
        <Link className="cs-auth-logo" to="/">CourtStreak</Link>

        <p className="cs-auth-eyebrow">ACCOUNT RECOVERY</p>

        <h1>Create your new password.</h1>

        <p className="cs-auth-intro">
          Choose a new password for your CourtStreak account,
          then get right back to your training.
        </p>

        <div className="cs-auth-benefits">
          <div><strong>Your progress stays with your account.</strong></div>
          <div><strong>Your streak history stays connected.</strong></div>
          <div><strong>Your Training Circles stay intact.</strong></div>
        </div>
      </section>

      <section className="cs-auth-card">
        <p className="cs-auth-eyebrow">NEW PASSWORD</p>

        <h2>Reset your password.</h2>

        <p className="cs-auth-muted">
          Enter your new password twice to make sure it's correct.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter new password again"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          {error && (
            <div className="cs-auth-message cs-auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="cs-auth-message">
              {message}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <p className="cs-auth-login">
          <Link to="/login">Back to Log In</Link>
        </p>
      </section>
    </main>
  );
}
