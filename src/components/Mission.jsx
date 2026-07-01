import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const points = [
  'Daily structure',
  'Real accountability',
  'Visible progress',
  'Anywhere, anytime',
  'Affordable for families',
];

export default function Mission() {
  return (
    <section id="mission" className="section mission-section">
      <div className="mission-copy">
        <p className="eyebrow">Our Mission</p>
        <h2>Helping athletes build habits that last far beyond the game.</h2>
        <p>
          CourtStreak exists to help players build discipline, accountability,
          and confidence through consistent basketball training.
        </p>
        <p>
          By combining daily workouts, competitive challenges, Training Circles,
          and measurable progress, CourtStreak turns practice into a habit that
          players actually want to keep.
        </p>
        <strong>
          Make elite basketball development accessible, affordable, and
          motivating for every athlete — anywhere, anytime.
        </strong>
      </div>

      <div className="mission-card">
        {points.map((point) => (
          <div className="mission-point" key={point}>
            <CheckCircle2 size={18} />
            <span>{point}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
