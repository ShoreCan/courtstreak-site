import React from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Target,
  Flame,
  Trophy,
} from 'lucide-react';

const features = [
  'Full ball-handling drill library',
  'Guided individual training drills',
  'XP and player level progression',
  'Training streaks and consistency tracking',
  'Bonus XP challenges',
  'Achievements and Trophy Case',
  'Private Training Circles',
  'Parent progress visibility',
  'New training content added over time',
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="section pricing-section premium-pricing"
    >
      <div className="pricing-copy">
        <p className="eyebrow">COURTSTREAK MEMBERSHIP</p>

        <h2>
          Invest in your game.
          <br />
          <span>Keep getting better.</span>
        </h2>

        <p>
          One membership gives players access to the CourtStreak training
          experience — choose what you want to improve, follow guided drills,
          earn XP, build your streak, and track your progress.
        </p>

        <div className="pricing-trust-row">
          <span>
            <ShieldCheck size={16} />
            Cancel anytime
          </span>

          <span>
            <Sparkles size={16} />
            New training added
          </span>

          <span>
            <CheckCircle2 size={16} />
            No long-term contract
          </span>
        </div>

        <div className="pricing-visual-card">
          <div className="pricing-visual-heading">
            <div>
              <span>BUILT FOR PROGRESS</span>
              <h3>More than a drill library.</h3>
            </div>

            <Target size={28} />
          </div>

          <p>
            CourtStreak gives players a reason to put in the work, see their
            progress, and come back ready to improve again.
          </p>

          <div className="member-mockup">
            <div className="member-row">
              <span className="member-row-icon">
                <Target size={17} />
              </span>

              <strong>Ball Handling Training</strong>
              <span>Available Now</span>
            </div>

            <div className="member-row">
              <span className="member-row-icon">
                <Flame size={17} />
              </span>

              <strong>Streaks + Bonus Challenges</strong>
              <span>Included</span>
            </div>

            <div className="member-row">
              <span className="member-row-icon">
                <Trophy size={17} />
              </span>

              <strong>XP + Trophy Case</strong>
              <span>Included</span>
            </div>

            <div className="member-row member-row-coming">
              <span className="member-row-icon">
                <Sparkles size={17} />
              </span>

              <strong>Shooting + Finishing</strong>
              <span>Coming Next</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pricing-card premium-price-card">
        <span className="pricing-label">COURTSTREAK MEMBERSHIP</span>

       <div className="price">
  $29.99
  <span>/month</span>
</div>

        <p className="price-subcopy">
          Everything players need to train with purpose and keep progressing.
        </p>

        <ul>
          {features.map((feature) => (
            <li key={feature}>
              <CheckCircle2 size={16} />
              {feature}
            </li>
          ))}
        </ul>

        <a href="#join">
          Start Training
        </a>

        <p className="pricing-bottom-note">
          Train your game. Build your streak. Own your progress.
        </p>
      </div>
    </section>
  );
}