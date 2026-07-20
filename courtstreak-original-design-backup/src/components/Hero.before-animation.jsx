import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Mail,
  Trophy,
  Users,
} from 'lucide-react';

export default function Hero({
  email,
  setEmail,
  joined,
  handleSubmit,
}) {
  return (
    <section className="court-home-hero" id="top">
      <div className="court-home-shade" />

      <div className="court-home-content">
        <div className="court-home-copy">
          <p className="court-home-eyebrow">
            Basketball training made simple
          </p>

          <h1>
            <span>Build better habits.</span>
            <strong>Become a better player.</strong>
          </h1>

          <p className="court-home-description">
            CourtStreak helps players train consistently with structured daily
            workouts, private challenges, Training Circles, streaks, XP, and
            visible progress.
          </p>

          {joined ? (
            <div className="court-home-success">
              <CheckCircle2 size={25} />

              <div>
                <strong>You’re officially on the waitlist.</strong>
                <span>Check your inbox for your CourtStreak confirmation.</span>
              </div>
            </div>
          ) : (
            <form
              className="court-home-form"
              id="join"
              onSubmit={handleSubmit}
            >
              <label>
                <Mail size={20} />

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email for beta access"
                  autoComplete="email"
                  required
                />
              </label>

              <button type="submit">
                Join Beta
                <ArrowRight size={19} />
              </button>
            </form>
          )}

          <div className="court-home-benefits">
            <div>
              <Flame size={29} />

              <span>
                <strong>Stay Consistent</strong>
                Build your streak
              </span>
            </div>

            <div>
              <Trophy size={29} />

              <span>
                <strong>Compete</strong>
                Challenge anyone
              </span>
            </div>

            <div>
              <Users size={29} />

              <span>
                <strong>Connect</strong>
                Train together
              </span>
            </div>
          </div>
        </div>

        <div
          className="court-phone-shell"
          aria-label="Preview of the CourtStreak player dashboard"
        >
          <div className="court-phone-status">
            <span>9:41</span>
            <span>● ● ●</span>
          </div>

          <div className="court-phone-header">
            <div>
              <p>Good evening, Trey</p>
              <h2>Day 17</h2>
            </div>

            <div className="court-phone-fire">
              <Flame size={17} />
              <strong>17</strong>
            </div>
          </div>

          <section className="court-phone-workout">
            <p>Today’s workout</p>
            <h3>30-Minute Guard Session</h3>

            <div className="court-phone-progress">
              <span />
            </div>
          </section>

          <div className="court-phone-stats">
            <div>
              <strong>850</strong>
              <span>XP Today</span>
            </div>

            <div>
              <strong>#3</strong>
              <span>Team Rank</span>
            </div>
          </div>

          <section className="court-phone-streak">
            <div className="court-phone-streak-copy">
              <p>Your streak</p>

              <h3>
                <Flame size={23} />
                17 Days
              </h3>

              <span>Keep it going!</span>
            </div>

            <div className="court-phone-ring">
              <strong>17</strong>
              <span>day streak</span>
            </div>
          </section>

          <div className="court-phone-feed">
            <div>
              <span>
                <Flame size={17} />
                Tight Handle Series unlocked
              </span>
              <strong>›</strong>
            </div>

            <div>
              <span>
                <Users size={17} />
                Jordan sent a challenge
              </span>
              <strong>›</strong>
            </div>

            <div>
              <span>
                <Trophy size={17} />
                Team leaderboard updated
              </span>
              <strong>›</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
