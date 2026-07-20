import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

export default function CreateAccount() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: 'player',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!supabase) {
      setError('Supabase is not connected. Check your .env.local file.');
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

    setLoading(true);

    const redirectTo =
      window.location.origin +
      import.meta.env.BASE_URL +
      'login';

    const { error: signupError } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: form.fullName.trim(),
          account_type: form.accountType,
        },
      },
    });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    setMessage(
      'Account created! Check your email and click the verification link before logging in.'
    );
  }

  return (
    <main className="cs-auth-page">
      <section className="cs-auth-brand">
        <Link className="cs-auth-logo" to="/">CourtStreak</Link>
        <p className="cs-auth-eyebrow">YOUR STREAK STARTS HERE</p>
        <h1>Build better habits. Become a better player.</h1>
        <p className="cs-auth-intro">
          Create your CourtStreak account for structured training,
          accountability, progress tracking, challenges, and Training Circles.
        </p>

        <div className="cs-auth-benefits">
          <div><strong>Never wonder what to work on again.</strong></div>
          <div><strong>Build a streak you do not want to lose.</strong></div>
          <div><strong>Compete with the people who push you to improve.</strong></div>
        </div>
      </section>

      <section className="cs-auth-card">
        <p className="cs-auth-eyebrow">CREATE YOUR ACCOUNT</p>
        <h2>Start your CourtStreak membership.</h2>
        <p className="cs-auth-muted">
          Enter your information below. You will verify your email before logging in.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              name="fullName"
              value={form.fullName}
              onChange={update}
              placeholder="Trey Redd"
              autoComplete="name"
              required
            />
          </label>

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
            Account type
            <select name="accountType" value={form.accountType} onChange={update}>
              <option value="player">Player</option>
              <option value="parent">Parent</option>
              <option value="coach">Coach</option>
              <option value="trainer">Trainer</option>
            </select>
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

          {error && <div className="cs-auth-message cs-auth-error">{error}</div>}
          {message && <div className="cs-auth-message cs-auth-success">{message}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="cs-auth-login">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
