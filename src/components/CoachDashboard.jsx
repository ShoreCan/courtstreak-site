import React from 'react';
import { CheckCircle2, AlertCircle, Flame, Send, Users } from 'lucide-react';

const players = [
  ['Trey R.', '17-day streak', 'Completed today', 'good'],
  ['Jordan M.', '12-day streak', '850 XP this week', 'good'],
  ['Mason K.', 'Missed yesterday', 'Needs reminder', 'warning'],
  ['Tyler B.', 'Inactive 6 days', 'Coach check-in', 'danger'],
];

export default function CoachDashboard() {
  return (
    <section id="coach-dashboard" className="section coach-section">
      <div className="section-heading">
        <p className="eyebrow">Coach Dashboard</p>
        <h2>Know who is putting in the work.</h2>
        <p>
          Coaches and trainers can monitor their group, track consistency, send
          challenges, and see which players are improving over time.
        </p>
      </div>

      <div className="coach-grid">
        <div className="coach-card">
          <div className="coach-top">
            <div>
              <span>Team Overview</span>
              <h3>Midwest Elite 2029</h3>
            </div>
            <Users size={28} />
          </div>

          <div className="coach-stats">
            <div><strong>36</strong><span>Players</span></div>
            <div><strong>29</strong><span>Completed Today</span></div>
            <div><strong>11.6</strong><span>Avg. Streak</span></div>
          </div>

          <div className="player-list">
            {players.map(([name, streak, note, status]) => (
              <div className={`player-row ${status}`} key={name}>
                <div>
                  <strong>{name}</strong>
                  <span>{streak}</span>
                </div>
                <small>{note}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="coach-actions">
          <h3>Send a Team Challenge</h3>
          <p>
            Example: “Everyone complete the 2-Ball Pound Series by Friday.
            Top 3 players earn bonus XP.”
          </p>

          <div className="challenge-preview-card">
            <Flame size={22} />
            <div>
              <strong>Weekly Challenge</strong>
              <span>500 made shots • Due Sunday • +750 XP</span>
            </div>
          </div>

          <button type="button"><Send size={18} /> Send Challenge</button>

          <div className="coach-points">
            <span><CheckCircle2 size={16} /> Assign workouts</span>
            <span><CheckCircle2 size={16} /> Track completion</span>
            <span><AlertCircle size={16} /> Spot inactive players</span>
          </div>
        </div>
      </div>
    </section>
  );
}
