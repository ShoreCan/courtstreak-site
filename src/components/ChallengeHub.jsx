import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Play,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';

export default function ChallengeHub() {
  return (
    <section
      id="challenge"
      className="section challenge-section cs-home-challenge"
    >
      <div className="cs-home-challenge-glow" />

      <div className="cs-home-challenge-copy">
        <p className="eyebrow">
          <Flame size={16} />
          BONUS CHALLENGE
        </p>

        <h2>
          Think you&apos;ve got
          <span> more in the tank?</span>
        </h2>

        <p>
          Finishing your training doesn&apos;t have to mean you&apos;re
          done. Take on an optional bonus challenge, push yourself
          through every drill, and earn extra XP for putting in
          extra work.
        </p>

        <div className="cs-home-challenge-benefits">
          <div>
            <CheckCircle2 size={18} />
            <span>
              <strong>100% Optional</strong>
              Take it when you&apos;re ready
            </span>
          </div>

          <div>
            <Target size={18} />
            <span>
              <strong>Timed Drills</strong>
              Focused one-minute challenges
            </span>
          </div>

          <div>
            <Trophy size={18} />
            <span>
              <strong>Extra Work Pays</strong>
              Finish the challenge. Earn the reward.
            </span>
          </div>
        </div>
      </div>

      <div className="cs-home-bonus-card">
        <div className="cs-home-bonus-card-glow" />

        <div className="cs-home-bonus-top">
          <div>
            <span>DAILY BONUS</span>
            <strong>EXTRA WORK</strong>
          </div>

          <div className="cs-home-bonus-fire">
            <Flame size={23} />
          </div>
        </div>

        <div className="cs-home-bonus-xp">
          <span>COMPLETE TO EARN</span>

          <strong>
            <Zap size={31} />
            +40 XP
          </strong>

          <p>
            Go beyond your regular training and finish every drill.
          </p>
        </div>

        <div className="cs-home-bonus-drills">
          <div>
            <span className="cs-home-bonus-number">01</span>

            <span className="cs-home-bonus-drill-copy">
              <strong>Control</strong>
              <small>60 second drill</small>
            </span>

            <Play size={16} />
          </div>

          <div>
            <span className="cs-home-bonus-number">02</span>

            <span className="cs-home-bonus-drill-copy">
              <strong>Speed</strong>
              <small>60 second drill</small>
            </span>

            <Play size={16} />
          </div>

          <div>
            <span className="cs-home-bonus-number">03</span>

            <span className="cs-home-bonus-drill-copy">
              <strong>Finish Strong</strong>
              <small>60 second drill</small>
            </span>

            <Play size={16} />
          </div>
        </div>

        <button type="button" className="cs-home-bonus-button">
          ACCEPT THE CHALLENGE
          <ArrowRight size={18} />
        </button>

        <div className="cs-home-bonus-reward-preview">
          <Sparkles size={17} />

          <span>
            <strong>Put in extra work.</strong>
            Make the reward mean something.
          </span>
        </div>
      </div>

      <div className="cs-home-challenge-banner">
        <div>
          <Flame size={22} />

          <span>
            <small>THE MINDSET</small>
            <strong>Someone else stopped. You kept working.</strong>
          </span>
        </div>

        <span className="cs-home-challenge-banner-xp">
          +40 BONUS XP
        </span>
      </div>
    </section>
  );
}