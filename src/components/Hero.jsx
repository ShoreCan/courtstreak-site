import React from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export default function Hero({ email, setEmail, joined, handleSubmit }) {
  return (
    <section id="top" className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><Sparkles size={16} /> Basketball training made simple</p>
        <h1>Train every day. Compete with your friends.</h1>
        <p className="hero-text">
          CourtStreak helps players build better habits with daily workouts, streaks, XP,
          private challenges, team chats, and leaderboards.
        </p>

        <form id="join" className="hero-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter email for beta access"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit">Join Beta <ArrowRight size={17} /></button>
        </form>

        {joined && <p className="success">You’re on the CourtStreak beta list.</p>}

        <div className="trust-row">
          <span><CheckCircle2 size={16} /> Easy signup</span>
          <span><CheckCircle2 size={16} /> Parent friendly</span>
          <span><CheckCircle2 size={16} /> Built for competitors</span>
        </div>
      </div>

      <div className="hero-card">
        <span className="card-label">Today’s Workout</span>
        <h3>30-Minute Guard Session</h3>
        <div className="progress-track"><div /></div>
        <div className="card-stats">
          <div><strong>17</strong><span>Day Streak</span></div>
          <div><strong>850</strong><span>XP Today</span></div>
          <div><strong>#3</strong><span>Team Rank</span></div>
        </div>
        <ul>
          <li>Tight Handle Series</li>
          <li>First-Step Footwork</li>
          <li>Finishing Challenge</li>
        </ul>
      </div>
    </section>
  );
}
