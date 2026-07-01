import React from 'react';
import { ShieldCheck, CalendarCheck, BarChart3 } from 'lucide-react';

const items = [
  ['Structure', 'Players know exactly what to do every day.', CalendarCheck],
  ['Accountability', 'Streaks and XP keep players coming back.', ShieldCheck],
  ['Progress', 'Parents can understand what their player is completing.', BarChart3],
];

export default function ParentTrust() {
  return (
    <section id="parents" className="section parent-section">
      <div className="section-heading">
        <p className="eyebrow">For parents</p>
        <h2>Finally, an app that gets your player excited to practice.</h2>
        <p>
          CourtStreak is built to feel simple for families and motivating for players.
          The goal is to make training consistent, organized, and worth the investment.
        </p>
      </div>

      <div className="feature-grid">
        {items.map(([title, copy, Icon]) => (
          <article className="feature-card" key={title}>
            <Icon size={24} />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
