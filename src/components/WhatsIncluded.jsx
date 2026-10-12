import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const included = [
  '10- and 20-minute guided workouts',
  'Drill instructions and coaching cues',
  'Circle challenges',
  'Streak tracking',
  'XP and badges',
  'Private Training Circles',
  'Friend and team leaderboards',
  'Workout and drill library',
  'Training progress and personal bests',
  'Mobile-friendly web access',
  'Demonstrations where available',
  'Future updates included',
];

export default function WhatsIncluded() {
  return (
    <section id="included" className="section included-section">
      <div>
        <p className="eyebrow">What’s Included</p>
        <h2>Everything players need to stay consistent.</h2>
        <p>
          CourtStreak is built around structure, accountability, and motivation — the pieces that help players keep showing up.
        </p>
      </div>

      <div className="included-grid">
        {included.map((item) => (
          <div className="included-item" key={item}>
            <CheckCircle2 size={18} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
