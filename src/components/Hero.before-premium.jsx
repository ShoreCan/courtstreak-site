import React from 'react';
import { ArrowRight, CheckCircle2, Flame, Trophy, Users, Mail } from 'lucide-react';

export default function Hero({ email, setEmail, joined, handleSubmit }) {
  return (
    <section id="top" className="hero cinematic-hero-v2">
      <div className="hero-copy">
        <p className="eyebrow">Basketball training made simple</p>

        <h1>
          Train every day.
          <span> Build better habits.</span>
        </h1>

        <p className="hero-text">
          Daily workouts, real progress, private challenges, and Training Circles
          that keep players accountable anywhere, anytime.
        </p>

        <form id="join" className="hero-form premium-join-form-v2" onSubmit={handleSubmit}>
          <div className="input-wrap-v2">
            <Mail size={18} />
            <input
              type="email"
              placeholder="Enter email for full access"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit">Create Account <ArrowRight size={18} /></button>
        </form>

        {joined && <p className="success">You’re on the CourtStreak beta list.</p>}

        <div className="trust-row">
          <span><CheckCircle2 size={16} /> Easy signup</span>
          <span><CheckCircle2 size={16} /> Parent friendly</span>
          <span><CheckCircle2 size={16} /> Built for competitors</span>
        </div>
      </div>

      <div className="hero-showcase-v2">
        <div className="premium-phone-card-v2">
          <div className="phone-mini-top">
            <span>9:41</span>
            <span>● ● ●</span>
          </div>

          <div className="phone-greeting">
            <span>Good evening, Trey 🔥</span>
            <strong>Day 17</strong>
          </div>

          <div className="workout-preview-card">
            <span>Today’s Workout</span>
            <h3>30-Minute Guard Session</h3>
            <div className="progress-track"><div /></div>
          </div>

          <div className="card-stats">
            <div><strong>17</strong><span>Day Streak</span></div>
            <div><strong>850</strong><span>XP Today</span></div>
            <div><strong>#3</strong><span>Team Rank</span></div>
          </div>

          <div className="mini-feed">
            <p><Flame size={15} /> Tight Handle Series unlocked</p>
            <p><Users size={15} /> Jordan sent a challenge</p>
            <p><Trophy size={15} /> Team leaderboard updated</p>
          </div>
        </div>
      </div>
    </section>
  );
}
