import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const included = [
  'Daily workouts',
  'Beginner → advanced progressions',
  'New challenges every week',
  'Streak tracking',
  'XP and badges',
  'Private Training Circles',
  'Friend and team leaderboards',
  'Coach dashboard preview',
  'Parent progress visibility',
  'Mobile-friendly web access',
  'Video instruction ready',
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
