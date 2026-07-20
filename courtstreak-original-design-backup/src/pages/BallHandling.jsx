import React from 'react';
import { ArrowRight, CheckCircle2, Lock, Play, Quote, Trophy, Flame } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const method = [
  ['01', 'Control', 'Own the basketball before you attack with it.'],
  ['02', 'Movement', 'Move with the ball at game speed.'],
  ['03', 'Creation', 'Create advantages and separation from defenders.'],
  ['04', 'Mastery', 'React, read, and handle pressure.'],
];

const week = [
  ['Monday', 'Stationary Pounds'],
  ['Tuesday', 'Weak Hand Series'],
  ['Wednesday', 'Control Circuit'],
  ['Thursday', 'Recovery / Ball Feel'],
  ['Friday', 'Crossover Foundations'],
  ['Saturday', 'Challenge Day'],
  ['Sunday', 'Review + Streak Check'],
];

const curriculum = [
  ['Control', ['Stationary Pounds — Preview', 'Weak Hand Series', 'Control Circuit', 'Crossover Foundations']],
  ['Movement', ['Walking Combos', 'Change of Pace', 'Retreat Dribble']],
  ['Creation', ['Snatch Back', 'Hesitation Combo', 'Attack Angles']],
  ['Mastery', ['Pressure Reads', 'Trap Escape', 'Game-Speed Combos']],
];

export default function BallHandling() {
  return (
    <main>
      <Navbar />

      <section className="bh-premium-page">
        <section className="bh-premium-hero">
          <div>
            <p className="bh-kicker">Ball Handling Path</p>
            <h1>Master your handle.</h1>
            <p>
              Follow a guided path from basic control to game-ready creation — no random drills, no guessing what to work on next.
            </p>
            <div className="bh-hero-stats">
              <span><strong>52</strong> Sessions</span>
              <span><strong>4</strong> Levels</span>
              <span><strong>Weekly</strong> Challenges</span>
              <span><strong>Progress</strong> Tracked</span>
            </div>
            <a href="#path">Start the Path <ArrowRight size={18} /></a>
          </div>
        </section>

        <section id="path" className="bh-method">
          <div className="bh-section-head">
            <p>The CourtStreak Method</p>
            <h2>A clear journey from control to mastery.</h2>
          </div>

          <div className="bh-method-grid">
            {method.map(([num, title, copy]) => (
              <article key={title}>
                <span>{num}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bh-two-col">
          <div className="bh-week">
            <p className="bh-kicker">Weekly Path Preview</p>
            <h2>Week 1: Ball Control Foundation</h2>
            {week.map(([day, workout]) => (
              <div className="bh-week-row" key={day}>
                <strong>{day}</strong>
                <span>{workout}</span>
              </div>
            ))}
          </div>

          <div className="bh-preview-card">
            <p className="bh-kicker">Free Preview</p>
            <h2>Stationary Pounds</h2>
            <div className="bh-video-box"><Play size={36} fill="currentColor" /></div>
            <h3>Goal</h3>
            <p>Build hand strength, rhythm, and complete ball control.</p>
            <h3>Key Points</h3>
            <ul>
              <li><CheckCircle2 size={16} /> Stay low</li>
              <li><CheckCircle2 size={16} /> Eyes up</li>
              <li><CheckCircle2 size={16} /> Pound the ball hard</li>
              <li><CheckCircle2 size={16} /> Control with both hands</li>
            </ul>
          </div>
        </section>

        <section className="bh-curriculum-premium">
          <div className="bh-section-head">
            <p>Curriculum</p>
            <h2>Preview the full progression.</h2>
          </div>

          <div className="bh-curriculum-grid">
            {curriculum.map(([module, lessons], moduleIndex) => (
              <article key={module}>
                <h3>{module}</h3>
                {lessons.map((lesson, index) => (
                  <div className="bh-lock-row" key={lesson}>
                    <span>{moduleIndex === 0 && index === 0 ? '✓' : <Lock size={15} />}</span>
                    <p>{lesson}</p>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>

        <section className="bh-coach-challenge">
          <div className="bh-coach">
            <Quote size={34} />
            <h2>Coach’s Corner</h2>
            <p>
              “Elite handles are not built by doing random drills. They are built by stacking quality reps every day. Master control first, then add speed, movement, and pressure.”
            </p>
            <strong>— Trey Redd, Founder of CourtStreak</strong>
          </div>

          <div className="bh-challenge">
            <Flame size={34} />
            <p className="bh-kicker">This Week’s Challenge</p>
            <h2>1,000 Strong-Hand + Weak-Hand Pounds</h2>
            <span><Trophy size={18} /> Reward: Ball Control Badge</span>
            <a href="/courtstreak-site/#join">Join the Waitlist</a>
          </div>
        </section>

        <section className="bh-app-preview-clean">
          <div className="bh-section-head">
            <p>App Preview</p>
            <h2>Guided training without the guesswork.</h2>
          </div>

          <div className="bh-preview-clean-grid">
            <article>
              <span>Today’s Session</span>
              <h3>Change of Pace</h3>
              <p>Week 2 • Day 4 • 22 minutes</p>
            </article>

            <article>
              <span>Your Progress</span>
              <h3>4 / 7 Sessions</h3>
              <div className="mini-progress"><div></div></div>
              <p>Keep building your streak.</p>
            </article>

            <article>
              <span>Coach View</span>
              <h3>Team Accountability</h3>
              <p>Coaches can see who is training and who needs encouragement.</p>
            </article>
          </div>
        </section>

        <section className="bh-final-cta">
          <h2>Unlock the Ball Handling Path.</h2>
          <p>Start with control. Build confidence. Create separation.</p>
          <a href="/courtstreak-site/#join">Join the Waitlist <ArrowRight size={18} /></a>
        </section>
      </section>

      <Footer />
    </main>
  );
}
