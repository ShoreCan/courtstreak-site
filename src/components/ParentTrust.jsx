import React from 'react';
import { ShieldCheck, CalendarCheck, BarChart3, HeartHandshake } from 'lucide-react';

const items = [
  ['Structure families can trust', 'Players know exactly what to work on without guessing or scrolling through random videos.', CalendarCheck],
  ['Accountability that feels positive', 'Streaks, XP, and challenges help players stay consistent without parents having to remind them every day.', ShieldCheck],
  ['Progress parents can see', 'Families can follow completed workouts, effort, and consistency—not just hope training is happening.', BarChart3],
];

export default function ParentTrust() {
  return (
    <section id="parents" className="section parent-section parent-premium">
      <div className="parent-copy">
        <p className="eyebrow">For Parents</p>
        <h2>More than drills — a system that helps players stay committed.</h2>
        <p>
          CourtStreak gives families a simple, affordable way to support player development
          from anywhere. Players get daily structure and motivation, while parents get confidence
          that real work is being done.
        </p>

        <div className="parent-highlight">
          <HeartHandshake size={22} />
          <span>Built to help kids build discipline, confidence, and consistency through basketball.</span>
        </div>
      </div>

      <div className="parent-card-grid">
        {items.map(([title, copy, Icon]) => (
          <article className="parent-card" key={title}>
            <Icon size={26} />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
