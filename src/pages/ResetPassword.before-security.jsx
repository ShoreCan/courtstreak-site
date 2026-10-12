import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!supabase) {
      setError('Supabase is not connected.');
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

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage('Password updated successfully. Taking you back to log in...');

    await supabase.auth.signOut();

    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1500);
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
