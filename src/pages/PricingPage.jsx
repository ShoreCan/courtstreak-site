import React from 'react';
import { Check, MessagesSquare, Sparkles, UserRoundCheck, UsersRound } from 'lucide-react';
import SitePage from '../components/SitePage.jsx';

export default function PricingPage() {
  return (
    <SitePage
      eyebrow="CourtStreak Membership"
      title="A Complete Development Membership—not Just Workout Videos."
      intro="CourtStreak combines professional training content with guided planning, personalized support, feedback, accountability, and progress tracking."
      primaryLabel="Create Account"
      secondaryLabel="Compare Player Features"
      secondaryHref="/courtstreak-site/players"
    >
      <section className="section site-content-section">
        <div className="site-pricing-grid">
          <article className="site-price-card featured">
            <div className="site-price-top">
              <span className="site-icon"><UserRoundCheck size={24} /></span>
              <p className="eyebrow">Individual Membership</p>
              <h2>$49.99 <small>/ month</small></h2>
              <p>For players and families seeking a more guided development experience.</p>
            </div>
            <ul className="site-check-list compact">
              <li><Check /> Personalized development roadmap</li>
              <li><Check /> Structured weekly training plans</li>
              <li><Check /> Professional demonstration videos</li>
              <li><Check /> Live coaching guidance and feedback</li>
              <li><Check /> Individual trainer access</li>
              <li><Check /> Progress reviews and plan adjustments</li>
              <li><Check /> Streaks, badges, and challenges</li>
              <li><Check /> Training Circles and parent visibility</li>
              <li><Check /> Progress tracking and personal records</li>
            </ul>
            <a className="site-primary-button full" href="/courtstreak-site/#join">Create Account</a>
          </article>

          <article className="site-price-card">
            <div className="site-price-top">
              <span className="site-icon"><UsersRound size={24} /></span>
              <p className="eyebrow">Coach and Team Plans</p>
              <h2>Custom <small>pricing</small></h2>
              <p>For school teams, AAU programs, private trainers, and development groups.</p>
            </div>
            <ul className="site-check-list compact">
              <li><Check /> Private team Training Circles</li>
              <li><Check /> Player invitations and organization</li>
              <li><Check /> Workout assignments</li>
              <li><Check /> Team accountability dashboard</li>
              <li><Check /> Individual development plans</li>
              <li><Check /> Coach feedback and communication</li>
              <li><Check /> Group challenges and milestones</li>
              <li><Check /> Program-level support</li>
            </ul>
            <a className="site-secondary-button full" href="/courtstreak-site/#contact">Contact CourtStreak</a>
          </article>
        </div>

        <div className="site-pricing-note">
          <Sparkles />
          <div>
            <strong>Why the membership goes beyond prerecorded content</strong>
            <p>
              Videos explain drills. CourtStreak’s greater value is helping players know
              what to do, providing guidance while they train, reviewing progress, and
              adjusting the development plan over time.
            </p>
          </div>
        </div>
      </section>

      <section className="section site-value-strip">
        <div><UserRoundCheck /><strong>Personalized</strong><span>Recommendations built around the player.</span></div>
        <div><MessagesSquare /><strong>Guided</strong><span>Questions, coaching, and useful feedback.</span></div>
        <div><Sparkles /><strong>Progressive</strong><span>Plans adjust as development continues.</span></div>
        <div><UsersRound /><strong>Connected</strong><span>Parents, coaches, trainers, and teammates.</span></div>
      </section>
    </SitePage>
  );
}
