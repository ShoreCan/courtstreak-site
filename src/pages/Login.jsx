import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

export default function Login() {
  const navigate = useNavigate();
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

    navigate('/dashboard');
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

          {error && <div className="cs-auth-message cs-auth-error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="cs-auth-login">
          Need an account? <Link to="/create-account">Create one</Link>
        </p>
      </section>
    </main>
  );
}
