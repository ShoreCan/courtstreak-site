import React from 'react';
import { Link } from 'react-router-dom';
import '../customer-preview.css';
import '../public-preview-entry.css';
import './hero-dashboard-preview.css';
import {
  ArrowRight,
  ArrowUpRight,
  Flame,
  Target,
  Trophy,
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

  <div className="court-phone-shell cs-hero-dashboard-screen">
    <div className="cs-hero-dashboard-viewport" aria-hidden="true">
      <iframe title="CourtStreak dashboard with fictional sample data" src={import.meta.env.BASE_URL+'preview/phone'} loading="lazy" tabIndex={-1} scrolling="no" allow="camera 'none'; microphone 'none'; geolocation 'none'"/>
    </div>
    <Link className="cs-hero-dashboard-link" to="/preview/player" aria-label="Explore the CourtStreak player dashboard">
      <span>Actual dashboard · Sample player<ArrowUpRight size={13}/></span>
    </Link>
  </div>
</div>
</div>
</section>
);
}
