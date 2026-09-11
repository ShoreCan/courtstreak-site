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

export default function AppPreview() {
  return (
    <section className="section cs-app-preview-section">
      <div className="cs-app-preview-glow cs-app-preview-glow-one" />
      <div className="cs-app-preview-glow cs-app-preview-glow-two" />

      <div className="cs-app-preview-copy">
        <p className="eyebrow">THE COURTSTREAK EXPERIENCE</p>

        <h2>
          Open CourtStreak.
          <span> Choose what gets better.</span>
        </h2>

        <p className="cs-app-preview-description">
          Your training should match your game. Choose the ball-handling
          skill you want to work on, follow the drill, earn XP for the
          work you put in, and keep building your streak.
        </p>

        <div className="cs-app-preview-flow">
          <div>
            <span>01</span>
            <strong>Choose</strong>
            <small>Pick your focus</small>
          </div>

          <ArrowRight size={18} />

          <div>
            <span>02</span>
            <strong>Train</strong>
            <small>Put in the reps</small>
          </div>

          <ArrowRight size={18} />

          <div>
            <span>03</span>
            <strong>Earn</strong>
            <small>Collect XP</small>
          </div>

          <ArrowRight size={18} />

          <div>
            <span>04</span>
            <strong>Level Up</strong>
            <small>See your progress</small>
          </div>
        </div>

        <div className="cs-app-preview-points">
          <div>
            <CheckCircle2 size={18} />
            <span>
              <strong>Train your way</strong>
              No required daily workout
            </span>
          </div>

          <div>
            <Flame size={18} />
            <span>
              <strong>Build consistency</strong>
              Keep your training streak alive
            </span>
          </div>

          <div>
            <Trophy size={18} />
            <span>
              <strong>Make progress visible</strong>
              XP, levels, achievements, and more
            </span>
          </div>
        </div>
      </div>

      <div className="cs-app-preview-device-wrap">
  <div className="cs-app-preview-badge">
    <Sparkles size={15} />
    YOUR TRAINING. YOUR CHOICE.
  </div>

  <div className="cs-iphone-shell">
    <span className="cs-iphone-button cs-iphone-silent" />
    <span className="cs-iphone-button cs-iphone-volume-up" />
    <span className="cs-iphone-button cs-iphone-volume-down" />
    <span className="cs-iphone-button cs-iphone-power" />

    <div className="cs-iphone-island" aria-hidden="true">
      <span />
      <i />
    </div>

    <div className="cs-iphone-statusbar">
      <strong>9:41</strong>

      <div>
        <span className="cs-iphone-signal">
          <i />
          <i />
          <i />
          <i />
        </span>

        <span className="cs-iphone-network">5G</span>

        <span className="cs-iphone-battery">
          <i />
        </span>
      </div>
    </div>

    <div className="phone cs-app-preview-phone">
      <div className="phone-header">
        <div>
          <small>Good evening, Trey</small>
          <h3>What are we working on?</h3>
        </div>

        <span>
          <Flame size={16} />
          17
        </span>
      </div>

      <div className="cs-app-preview-level">
        <div>
          <small>PLAYER LEVEL</small>
          <strong>15</strong>
        </div>

        <div>
          <small>TOTAL XP</small>
          <strong>1,450</strong>
        </div>
      </div>

      <div className="workout-card cs-app-training-card">
        <div className="cs-app-training-top">
          <span>CHOOSE YOUR TRAINING</span>
          <Target size={18} />
        </div>

        <strong>Ball Handling</strong>

        <p>
          Build control, rhythm, confidence, and creativity with
          guided drills.
        </p>

        <div className="cs-app-drill-options">
          <div>
            <span className="cs-app-drill-icon">
              <Play size={15} />
            </span>

            <span>
              <strong>Crossover Control</strong>
              <small>Standard • +10 XP</small>
            </span>

            <ArrowRight size={16} />
          </div>

          <div>
            <span className="cs-app-drill-icon">
              <Play size={15} />
            </span>

            <span>
              <strong>Weak-Hand Rhythm</strong>
              <small>Quick • +5 XP</small>
            </span>

            <ArrowRight size={16} />
          </div>

          <div>
            <span className="cs-app-drill-icon">
              <Play size={15} />
            </span>

            <span>
              <strong>Combo Challenge</strong>
              <small>Advanced • +20 XP</small>
            </span>

            <ArrowRight size={16} />
          </div>
        </div>
      </div>

      <div className="cs-app-preview-progress">
        <div className="cs-app-preview-progress-heading">
          <span>
            <Zap size={15} />
            TODAY&apos;S PROGRESS
          </span>

          <strong>+60 XP</strong>
        </div>

        <div className="cs-app-preview-progress-track">
          <span />
        </div>

        <small>50 XP until Level 16</small>
      </div>

      <div className="cs-app-preview-coming">
        <span>COMING NEXT</span>

        <div>
          <strong>Shooting</strong>
          <strong>Finishing</strong>
        </div>
      </div>
    </div>

    <div className="cs-iphone-home-indicator" />
  </div>

  <div className="cs-app-preview-floating-xp">
    <Zap size={18} />

    <span>
      <strong>+10 XP</strong>
      Drill complete
    </span>
  </div>
</div>
    </section>
  );
}