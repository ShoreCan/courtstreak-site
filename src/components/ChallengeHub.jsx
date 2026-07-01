import React from 'react';
import { MessageCircle, Users } from 'lucide-react';

export default function ChallengeHub() {
  return (
    <section id="challenge" className="section challenge-section">
      <div className="section-heading">
        <p className="eyebrow"><MessageCircle size={16} /> Challenge Hub</p>
        <h2>DM challenges and team group chats make training social.</h2>
        <p>
          Players can challenge friends individually, compete inside private team groups,
          or climb the main CourtStreak leaderboard.
        </p>
      </div>

      <div className="challenge-grid">
        <div className="chat-panel">
          <h3>Direct Challenge</h3>
          <div className="bubble left"><strong>Jordan</strong><p>Beat my 2-ball score tonight. I got 60 reps in 30 seconds.</p></div>
          <div className="bubble right"><strong>You</strong><p>Accepted. I’m going for 65 after practice.</p></div>
          <div className="bubble left"><strong>Jordan</strong><p>Winner gets 300 XP and bragging rights.</p></div>
        </div>

        <div className="chat-panel">
          <h3><Users size={18} /> Team Group</h3>
          <div className="bubble left"><strong>Coach</strong><p>Team challenge: 500 made shots this week. Post your progress daily.</p></div>
          <div className="bubble right"><strong>Team</strong><p>Bet. I’m at 185 makes already.</p></div>
          <div className="bubble left"><strong>Coach</strong><p>Leaderboard resets Sunday. Top 3 earn bonus XP.</p></div>
        </div>
      </div>
    </section>
  );
}
