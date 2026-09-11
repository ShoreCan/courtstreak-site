import React from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Flame,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react';

export default function ProgressCommunity() {
  return (
 <section
  id="community"
  className="section cs-progress-community"
>
      <div className="cs-progress-community-glow" />

      <div className="cs-progress-community-heading">
        <p className="eyebrow">PROGRESS YOU CAN SEE</p>

        <h2>
          Get better together.
          <span> See the work paying off.</span>
        </h2>

        <p>
          Track your improvement over time, celebrate personal bests,
          and compete with the friends, teammates, coaches, and
          family members who push you to improve.
        </p>
      </div>

      <div className="cs-progress-community-grid">
        <article className="cs-progress-showcase">
          <div className="cs-showcase-topbar">
            <div>
              <span>PLAYER PROGRESS</span>
              <strong>Your improvement</strong>
            </div>

            <span className="cs-progress-period">Last 4 weeks</span>
          </div>

          <div className="cs-progress-metric-row">
            <div>
              <span>CROSSOVER CONTROL</span>

              <strong>
                49
                <small> reps</small>
              </strong>
            </div>

            <div className="cs-progress-improvement">
              <TrendingUp size={17} />
              +29%
            </div>
          </div>

          <div className="cs-progress-chart">
            <div className="cs-progress-chart-labels">
              <span>50</span>
              <span>40</span>
              <span>30</span>
            </div>

            <div className="cs-progress-chart-stage">
              <span className="cs-chart-line cs-chart-line-one" />
              <span className="cs-chart-line cs-chart-line-two" />
              <span className="cs-chart-line cs-chart-line-three" />

              <svg
                viewBox="0 0 500 180"
                preserveAspectRatio="none"
                aria-label="Crossover Control improvement from 38 to 49 reps"
              >
                <defs>
                  <linearGradient
                    id="progressArea"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#f97316"
                      stopOpacity="0.35"
                    />

                    <stop
                      offset="100%"
                      stopColor="#f97316"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                <path
                  className="cs-chart-area"
                  d="M20,140 L170,112 L330,78 L480,35 L480,180 L20,180 Z"
                />

                <polyline
                  className="cs-chart-path"
                  points="20,140 170,112 330,78 480,35"
                />

                <circle cx="20" cy="140" r="6" />
                <circle cx="170" cy="112" r="6" />
                <circle cx="330" cy="78" r="6" />
                <circle cx="480" cy="35" r="7" />
              </svg>

              <div className="cs-progress-weeks">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
            </div>
          </div>

          <div className="cs-personal-best">
            <div>
              <Trophy size={20} />

              <span>
                <strong>New personal best</strong>
                You improved by 11 reps
              </span>
            </div>

            <CheckCircle2 size={21} />
          </div>
        </article>

        <article className="cs-community-showcase">
          <div className="cs-circle-heading">
            <div className="cs-circle-icon">
              <Users size={21} />
            </div>

            <div>
              <span>TRAINING CIRCLE</span>
              <strong>Friends</strong>
            </div>

            <div className="cs-circle-members">
              <span>TR</span>
              <span>MJ</span>
              <span>DK</span>
              <span>+3</span>
            </div>
          </div>

          <div className="cs-circle-message">
            <Flame size={17} />

            <span>
              Your circle completed <strong>18 drills</strong> this
              week.
            </span>
          </div>

          <div className="cs-friend-challenge">
            <div className="cs-challenge-heading">
              <div>
                <Swords size={19} />
                FRIEND CHALLENGE
              </div>

              <span>23h left</span>
            </div>

            <h3>Marcus challenged you.</h3>

            <p>
              Complete Crossover Control and record your best score.
            </p>

            <div className="cs-challenge-scores">
              <div>
                <span>Marcus</span>
                <strong>52 reps</strong>

                <div>
                  <span style={{ width: '87%' }} />
                </div>
              </div>

              <div>
                <span>Your best</span>
                <strong>49 reps</strong>

                <div>
                  <span style={{ width: '81%' }} />
                </div>
              </div>
            </div>

            <div className="cs-challenge-action">
              <Target size={18} />

              <span>
                <strong>3 reps to take the lead</strong>
                Healthy competition. Real accountability.
              </span>

              <ArrowRight size={18} />
            </div>
          </div>
        </article>
      </div>

     <div className="cs-progress-community-cta">
  <div>
    <span>READY TO BUILD YOUR STREAK?</span>

    <h3>Train with purpose. Improve together.</h3>

    <p>
      Start training, make your progress visible, and compete
      with the people who bring out your best.
    </p>
  </div>

  <div>
    <Link to="/create-account">
      Create Your Account
      <ArrowRight size={18} />
    </Link>

    <small>$29.99/month • Manage or cancel anytime</small>
  </div>
</div>
</section>
);
}