import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Mail,
    Swords,
  Target,
  TrendingUp,
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
            Basketball training built around your game
          </p>

          <h1>
            <span>What do you want to</span>
            <strong>get better at today?</strong>
          </h1>

          <p className="court-home-description">
            Choose the ball-handling skills you want to improve.
            Follow guided drills, put in the reps, earn XP, build
            your streak, and keep leveling up your game.
          </p>

          <div className="court-home-training-focus">
            <span>AVAILABLE NOW</span>
            <strong>Ball Handling</strong>
            <p>Shooting + Finishing coming next</p>
          </div>

          {joined ? (
            <div className="court-home-success">
              <CheckCircle2 size={25} />

              <div>
                <strong>You&apos;re officially on the membership.</strong>
                <span>
                  Check your inbox for your CourtStreak confirmation.
                </span>
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
                  placeholder="Enter email to start training"
                  autoComplete="email"
                  required
                />
              </label>

              <button type="submit">
                Start Training
                <ArrowRight size={19} />
              </button>
            </form>
          )}

          <div className="court-home-benefits">
            <div>
              <Target size={29} />

              <span>
                <strong>Choose Your Focus</strong>
                Train what matters to you
              </span>
            </div>

            <div>
              <Flame size={29} />

              <span>
                <strong>Build Your Streak</strong>
                Keep showing up
              </span>
            </div>

            <div>
              <Trophy size={29} />

              <span>
                <strong>Earn XP</strong>
                Turn your work into progress
              </span>
            </div>
          </div>
        </div>

        <div
  className="cs-iphone-shell court-hero-iphone"
  aria-label="Preview of the CourtStreak player dashboard"
>
  <span className="cs-iphone-button cs-iphone-silent" />
  <span className="cs-iphone-button cs-iphone-volume-up" />
  <span className="cs-iphone-button cs-iphone-volume-down" />
  <span className="cs-iphone-button cs-iphone-power" />

  <div className="cs-iphone-island" aria-hidden="true">
    <span />
    <i />
  </div>

  <div className="cs-iphone-statusbar">
    <strong>9:41</strong>

    <div>
      <span className="cs-iphone-signal">
        <i />
        <i />
        <i />
        <i />
      </span>

      <span className="cs-iphone-network">5G</span>

      <span className="cs-iphone-battery">
        <i />
      </span>
    </div>
  </div>

  <div className="court-phone-shell">

          <div className="court-phone-header">
            <div>
              <p>Good evening, Trey</p>
              <h2>Ready to work?</h2>
            </div>

            <div className="court-phone-fire">
              <Flame size={17} />
              <strong>17</strong>
            </div>
          </div>

          <section className="court-phone-workout">
            <p>CHOOSE YOUR TRAINING</p>
            <h3>What are you working on today?</h3>

            <div className="court-phone-skill-choice">
              <div>
                <Target size={18} />
                <span>
                  <strong>Ball Handling</strong>
                  Drills available now
                </span>
              </div>

              <strong>›</strong>
            </div>
          </section>

          <div className="court-phone-stats">
  <div>
    <strong>3 / 4</strong>
    <span>Weekly goal</span>
  </div>

  <div>
    <strong>+29%</strong>
    <span>Crossover improvement</span>
  </div>
</div>

          <section className="court-phone-streak">
            <div className="court-phone-streak-copy">
              <p>Your streak</p>

              <h3>
                <Flame size={23} />
                17 Days
              </h3>

              <span>Keep showing up!</span>
            </div>

            <div className="court-phone-ring">
              <strong>17</strong>
              <span>day streak</span>
            </div>
          </section>

         <div className="court-phone-proof">
  <div className="court-phone-proof-heading">
    <div>
      <Users size={16} />
      <span>FRIENDS TRAINING CIRCLE</span>
    </div>

    <strong>6 players</strong>
  </div>

  <div className="court-phone-challenge">
    <div className="court-phone-challenge-icon">
      <Swords size={18} />
    </div>

    <div>
      <span>MARCUS CHALLENGED YOU</span>
      <strong>Crossover Control</strong>
      <small>3 more reps to take the lead</small>
    </div>

    <ArrowRight size={17} />
  </div>

  <div className="court-phone-improvement">
    <TrendingUp size={17} />

    <span>
      <strong>New personal best</strong>
      Improved from 38 to 49 reps
    </span>

            <Trophy size={17} />
      </div>
    </div>
  </div>
</div>
</div>
</section>
);
}