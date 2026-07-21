import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient.js';

export default function Dashboard() {
  const navigate = useNavigate();

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    navigate('/login');
  }

  return (
    <main className="cs-dashboard-page">
      <header className="cs-dashboard-header">
        <Link to="/" className="cs-auth-logo">CourtStreak</Link>
        <button type="button" onClick={handleLogout}>Log Out</button>
      </header>

      <section className="cs-dashboard-content">
        <p className="cs-auth-eyebrow">ACCOUNT ACTIVE</p>
        <h1>Welcome to your CourtStreak dashboard.</h1>
        <p>
          Your account and email verification are working. This page will become
          the home for workouts, streaks, progress, challenges, and Training Circles.
        </p>

        <div className="cs-dashboard-grid">
          <article>
            <strong>0</strong>
            <span>Workouts completed</span>
          </article>
          <article>
            <strong>0</strong>
            <span>Current streak</span>
          </article>
          <article>
            <strong>New</strong>
            <span>Account status</span>
          </article>
        </div>
      </section>
    </main>
  );
}
