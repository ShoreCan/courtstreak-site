import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function Pricing() {
  return (
    <section id="pricing" className="section pricing-section">
      <div>
        <p className="eyebrow">Membership</p>
        <h2>Everything a serious player needs for $49.99/month.</h2>
        <p>
          Daily training, competition, accountability, and progress tracking in one simple platform.
        </p>
      </div>

      <div className="pricing-card">
        <h3>CourtStreak Membership</h3>
        <div className="price">$49.99<span>/month</span></div>
        <ul>
          <li><CheckCircle2 size={16} /> Daily workouts</li>
          <li><CheckCircle2 size={16} /> Streaks and XP</li>
          <li><CheckCircle2 size={16} /> Direct challenges</li>
          <li><CheckCircle2 size={16} /> Team groups</li>
          <li><CheckCircle2 size={16} /> Leaderboards</li>
          <li><CheckCircle2 size={16} /> Future updates included</li>
        </ul>
        <a href="#join">Start Your Streak</a>
      </div>
    </section>
  );
}
