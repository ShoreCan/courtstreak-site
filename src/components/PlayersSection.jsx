import React from 'react';
import {
  Flame,
  Trophy,
  Target,
  Zap,
  ArrowRight,
} from 'lucide-react';

const playerCards = [
  {
    eyebrow: 'YOUR GAME',
    title: 'Choose Your Focus',
    copy: 'No assigned workout. Pick the ball-handling skill you want to improve and train what matters to your game.',
    Icon: Target,
  },
  {
    eyebrow: 'YOUR WORK',
    title: 'Earn Your XP',
    copy: 'Complete legitimate training drills to earn XP, level up, and turn the work you put in into visible progress.',
    Icon: Zap,
  },
  {
    eyebrow: 'YOUR CONSISTENCY',
    title: 'Build Your Streak',
    copy: 'Keep showing up. CourtStreak tracks your consistency and gives you another reason to put in meaningful reps tomorrow.',
    Icon: Flame,
  },
];

export default function PlayersSection() {
  return (
    <section
      id="players"
      className="section players-section cs-home-players"
    >
      <div className="cs-home-players-glow" />

      <div className="section-heading center cs-home-dark-heading">
        <p className="eyebrow">BUILT FOR PLAYERS</p>

        <h2>
          Your game. Your focus.
          <span> Your progress.</span>
        </h2>

        <p>
          CourtStreak puts the player in control. Choose what you
          want to improve, put in the work, and build a training
          history you can actually be proud of.
        </p>
      </div>

      <div className="player-card-grid cs-home-player-grid">
        {playerCards.map(({ eyebrow, title, copy, Icon }) => (
          <article className="player-card cs-home-player-card" key={title}>
            <div className="cs-home-player-icon">
              <Icon size={27} />
            </div>

            <span className="cs-home-player-eyebrow">{eyebrow}</span>

            <h3>{title}</h3>

            <p>{copy}</p>

            <div className="cs-home-player-card-footer">
              <span>COURTSTREAK</span>
              <ArrowRight size={17} />
            </div>
          </article>
        ))}
      </div>

      <div className="cs-home-player-bottom">
        <div>
          <Trophy size={24} />

          <span>
            <strong>Put in the work.</strong>
            Let your progress speak for itself.
          </span>
        </div>

        <div className="cs-home-player-coming">
          <span>TRAINING NOW</span>
          <strong>Ball Handling</strong>
          <small>Shooting + Finishing coming next</small>
        </div>
      </div>
    </section>
  );
}