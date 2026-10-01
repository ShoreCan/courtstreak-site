import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!supabase) {
      setError('Supabase is not connected.');
      return;
    }

    setLoading(true);

    const redirectTo = `${window.location.origin}/courtstreak-site/reset-password`;

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(
      'Check your email. We sent you a secure link to reset your CourtStreak password.'
    );
  }

  return (
    <main className="cs-auth-page">
      <section className="cs-auth-brand">
        <Link className="cs-auth-logo" to="/">CourtStreak</Link>

        <p className="cs-auth-eyebrow">ACCOUNT RECOVERY</p>

        <h1>Get back to your training.</h1>

        <p className="cs-auth-intro">
          Enter the email connected to your CourtStreak account and
          we'll send you a secure password reset link.
        </p>

        <div className="cs-auth-benefits">
          <div><strong>Your streak and progress stay safe.</strong></div>
          <div><strong>Your Training Circles stay connected.</strong></div>
          <div><strong>Reset your password securely.</strong></div>
        </div>
      </section>

      <section className="cs-auth-card">
        <p className="cs-auth-eyebrow">FORGOT PASSWORD?</p>

        <h2>Reset your password.</h2>

        <p className="cs-auth-muted">
          Enter the email address you used to create your CourtStreak account.
        </p>

        <form onSubmit={handleReset}>
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
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="cs-auth-login">
          Remember your password? <Link to="/login">Back to Log In</Link>
        </p>
      </section>
    </main>
  );
}
