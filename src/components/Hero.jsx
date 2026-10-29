import React from 'react';
import { Link } from 'react-router-dom';
import '../customer-preview.css';
import '../public-preview-entry.css';
import {
  ArrowRight,
  Flame,
    Swords,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';

export default function Hero() {
  return (
    <section className="court-home-hero" id="top">
      <div className="court-home-shade" />

      <div className="court-home-content">
        <div className="court-home-copy">
          <p className="court-home-eyebrow">
            BALL HANDLING · BUILT FOR YOU
          </p>

          <h1>
            <span>Better handles.</span>
            <strong>Start here.</strong>
          </h1>

          <p className="court-home-description">
            Pick a drill. Put in the reps. See your progress.
          </p>

          <div className="cs-home-entry-actions" id="join">
            <Link className="cs-home-entry-primary" to="/preview">Try the preview <ArrowRight size={19} aria-hidden="true" /></Link>
            <Link className="cs-home-entry-secondary" to="/create-account">Create account</Link>
          </div>
          <p className="cs-home-entry-note">Preview free · No login needed</p>
          <p className="cs-preview-price">Player membership · $29.99/month · Cancel anytime</p>
          <div className="cs-home-audience"><Link to="/parents">For parents</Link><Link to="/coaches">For coaches</Link></div>
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
              <p>Sample player preview</p>
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
      <small>4 more reps to take the lead</small>
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