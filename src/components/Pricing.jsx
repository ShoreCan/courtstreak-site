import React from 'react';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

const features = [
  'Unlimited daily workouts',
  'Weekly challenges',
  'XP, streaks, and badges',
  'Private Training Circles',
  'Friend and team leaderboards',
  'Parent progress visibility',
  'Coach dashboard tools',
  'New content and features added over time',
];

export default function Pricing() {
  return (
    <section id="pricing" className="section pricing-section premium-pricing">
      <div className="pricing-copy">
        <p className="eyebrow">Membership</p>
        <h2>Start building better habits for $49.99/month.</h2>
        <p>
          A simple membership designed to help players train consistently, compete with their circle, and track visible progress.
        </p>

        <div className="pricing-trust-row">
          <span><ShieldCheck size={16} /> Cancel anytime</span>
          <span><Sparkles size={16} /> New workouts weekly</span>
          <span><CheckCircle2 size={16} /> No long-term contract</span>
        </div>

        <div className="pricing-visual-card">
          <h3>Membership that feels like progress.</h3>
          <p>
            Players do not just unlock workouts. They unlock structure, accountability,
            private competition, and a reason to come back tomorrow.
          </p>

          <div className="member-mockup">
            <div className="member-row">
              <strong>Daily Workout</strong>
              <span>Included</span>
            </div>
            <div className="member-row">
              <strong>Training Circles</strong>
              <span>Included</span>
            </div>
            <div className="member-row">
              <strong>Coach Tools</strong>
              <span>Coming Soon</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pricing-card premium-price-card">
        <span className="pricing-label">CourtStreak Membership</span>
        <div className="price">$49.99<span>/month</span></div>
        <p className="price-subcopy">Everything needed to train, compete, and stay accountable.</p>

        <ul>
          {features.map((feature) => (
            <li key={feature}><CheckCircle2 size={16} /> {feature}</li>
          ))}
        </ul>

        <a href="#join">Start Your Membership</a>
      </div>
    </section>
  );
}
