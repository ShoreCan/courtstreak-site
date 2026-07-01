import React from 'react';
import { Flame, Trophy, BarChart3 } from 'lucide-react';

const playerCards = [
  ['Build Your Streak', 'Every workout builds momentum. Stay consistent and protect the habit.', Flame],
  ['Compete With Friends', 'Challenge teammates, join Training Circles, and climb private leaderboards.', Trophy],
  ['See Real Progress', 'Track XP, badges, workouts, streaks, and improvement over time.', BarChart3],
];

export default function PlayersSection() {
  return (
    <section id="players" className="section players-section">
      <div className="section-heading center">
        <p className="eyebrow">For Players</p>
        <h2>Built for players who want more.</h2>
        <p>
          CourtStreak gives players a reason to come back tomorrow — not just another list of drills.
        </p>
      </div>

      <div className="player-card-grid">
        {playerCards.map(([title, copy, Icon]) => (
          <article className="player-card" key={title}>
            <Icon size={34} />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
