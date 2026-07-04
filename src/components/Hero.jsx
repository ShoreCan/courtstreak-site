import React from 'react';
import { ArrowRight, CheckCircle2, Flame, Trophy, Users, Mail, ShieldCheck } from 'lucide-react';

export default function Hero({ email, setEmail, joined, handleSubmit }) {
  return (
    <section id="top" className="premium-hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-kicker">Basketball training made simple</p>

          <h1>
            Build better habits.
            <span> Become a better player.</span>
          </h1>

          <p className="hero-subtitle">
            CourtStreak helps players train consistently with daily workouts,
            private challenges, Training Circles, streaks, XP, and visible progress.
          </p>

          <form id="join" className={`hero-signup ${joined ? "joined" : ""}`} onSubmit={handleSubmit}>
            <div className="hero-input">
              <Mail size={18} />
              <input
                type="email"
                placeholder="Enter email for beta access"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit">
              {joined ? "You’re on the waitlist" : "Join Beta"} <ArrowRight size={18} />
            </button>
          </form>

          {joined && (
            <div className="waitlist-success-card">
              <h3>You’re officially on the CourtStreak waitlist.</h3>
              <p>
                We’ll email <strong>{email}</strong> when beta access opens.
                In the meantime, start thinking about the teammates, coaches,
                and training circles you want to bring with you.
              </p>
            </div>
          )}

          <div className="hero-trust">
            <span><CheckCircle2 size={16} /> Easy signup</span>
            <span><ShieldCheck size={16} /> Parent friendly</span>
            <span><Users size={16} /> Built for teams</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-orb"></div>

          <div className="court-phone">
            <div className="phone-topbar">
              <span>9:41</span>
              <span>● ● ●</span>
            </div>

            <div className="phone-title">
              <div>
                <small>Good evening, Trey</small>
                <h3>Day 17</h3>
              </div>
              <span className="streak-badge"><Flame size={16} /> 17</span>
            </div>

            <div className="workout-tile">
              <span>Today’s Workout</span>
              <h4>30-Minute Guard Session</h4>
              <div className="hero-progress"><div /></div>
            </div>

            <div className="mini-stats">
              <div><strong>850</strong><span>XP Today</span></div>
              <div><strong>#3</strong><span>Team Rank</span></div>
            </div>

            <div className="activity-feed">
              <p><Flame size={15} /> Tight Handle Series unlocked</p>
              <p><Users size={15} /> Jordan sent a challenge</p>
              <p><Trophy size={15} /> Team leaderboard updated</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
