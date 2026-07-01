import React from 'react';
import { ArrowRight, CheckCircle2, Sparkles, Flame, Trophy, Users } from 'lucide-react';

export default function Hero({ email, setEmail, joined, handleSubmit }) {
  return (
    <section id="top" className="hero cinematic-hero">
      <div className="hero-copy">
        <p className="eyebrow"><Sparkles size={16} /> Basketball training made simple</p>

        <h1>
          Train every day.
          <span> Compete with your circle.</span>
        </h1>

        <p className="hero-text">
          CourtStreak helps players build consistency through daily workouts,
          streaks, private challenges, Training Circles, and visible progress.
        </p>

        <form id="join" className="hero-form premium-join-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Enter email for beta access"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit">Join Beta <ArrowRight size={18} /></button>
        </form>

        {joined && <p className="success">You’re on the CourtStreak beta list.</p>}

        <div className="trust-row premium-trust">
          <span><CheckCircle2 size={16} /> Easy signup</span>
          <span><CheckCircle2 size={16} /> Parent friendly</span>
          <span><CheckCircle2 size={16} /> Built for competitors</span>
        </div>
      </div>

      <div className="hero-showcase">
        <div className="phone-glow"></div>

        <div className="hero-card premium-phone-card">
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
