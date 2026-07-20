import React from 'react';
import { Flame, MessageCircle, Trophy, Zap } from 'lucide-react';

export default function AppPreview() {
  return (
    <section className="section split">
      <div>
        <p className="eyebrow">App preview</p>
        <h2>One clean dashboard players can understand instantly.</h2>
        <p>
          No confusion. Open the app, see today’s workout, complete the challenge,
          protect your streak, and compete with your circle.
        </p>
      </div>

      <div className="phone">
        <div className="phone-header">
          <div>
            <small>Good evening, Trey</small>
            <h3>Day 17</h3>
          </div>
          <span><Flame size={16} /> 17</span>
        </div>

        <div className="workout-card">
          <strong>Tight Handle Series</strong>
          <p>12 minutes • +250 XP</p>
        </div>

        <div className="challenge-message">
          <MessageCircle size={18} />
          <div>
            <strong>Jordan challenged you</strong>
            <p>Beat 60 reps in 30 seconds.</p>
          </div>
        </div>

        <div className="phone-stats">
          <span><Trophy size={16} /> Gold III</span>
          <span><Zap size={16} /> 13,420 XP</span>
        </div>
      </div>
    </section>
  );
}
