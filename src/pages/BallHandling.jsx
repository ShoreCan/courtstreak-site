import React from 'react';
import { ArrowRight, CheckCircle2, Clock, Lock, Play, Trophy, Zap, Brain, Shield, Target } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const levels = [
  {
    title: 'Beginner',
    subtitle: 'Foundation',
    sessions: '18 Sessions',
    progress: '0% Complete',
    text: 'Build your fundamentals and develop complete ball control.',
    className: 'beginner',
  },
  {
    title: 'Intermediate',
    subtitle: 'Development',
    sessions: '24 Sessions',
    progress: '0% Complete',
    text: 'Add moves, create space, and improve your change of pace.',
    className: 'intermediate',
  },
  {
    title: 'Advanced',
    subtitle: 'Mastery',
    sessions: '28 Sessions',
    progress: '0% Complete',
    text: 'Master combos, read defenders, and handle pressure.',
    className: 'advanced',
  },
  {
    title: 'Pro',
    subtitle: 'Elite Level',
    sessions: 'Coming Soon',
    progress: 'Locked',
    text: 'Elite skills, advanced reads, and pro-level decision making.',
    className: 'pro',
  },
];

const skills = [
  ['Ball Control', 'Handle the ball with confidence in any situation.', Target],
  ['Change of Pace', 'Learn to shift speeds and keep defenders off balance.', Zap],
  ['Create Space', 'Use footwork and dribble moves to create separation.', CheckCircle2],
  ['Beat Defenders', 'Attack off the dribble and finish with confidence.', Shield],
  ['Game IQ', 'Read defenders and make smarter decisions on the court.', Brain],
];

const curriculum = [
  ['Stationary Pounds', 'Preview'],
  ['Basic Crossovers', 'Locked'],
  ['Between the Legs', 'Locked'],
  ['Behind the Back', 'Locked'],
  ['Low Pound Series', 'Locked'],
];

export default function BallHandling() {
  return (
    <main>
      <Navbar />

      <section className="bh-page">
        <div className="bh-breadcrumb">Training <span>/</span> Ball Handling</div>

        <section className="bh-hero">
          <div className="bh-hero-copy">
            <p>Training Path</p>
            <h1>Ball Handling</h1>
            <h2>Complete control. Confident game.</h2>
            <span>
              A structured path that takes you from learning the basics to mastering
              advanced moves used by elite players.
            </span>

            <div className="bh-stats">
              <div><strong>120+</strong><small>Drills</small></div>
              <div><strong>4</strong><small>Levels</small></div>
              <div><strong>15+</strong><small>Hours</small></div>
              <div><strong>Track</strong><small>Your Progress</small></div>
            </div>
          </div>

          <div className="bh-player-visual">
            <div className="bh-player-card">
              <div className="bh-ball"></div>
              <div className="bh-player-shadow"></div>
            </div>
          </div>
        </section>

        <div className="bh-section-title">
          <span></span>
          <h2>The CourtStreak Path</h2>
          <span></span>
        </div>

        <section className="bh-level-grid">
          {levels.map((level) => (
            <article className={`bh-level-card ${level.className}`} key={level.title}>
              <h3>{level.title}</h3>
              <h4>{level.subtitle}</h4>
              <div className="bh-level-image">
                {level.className === 'pro' && <Lock size={38} />}
              </div>
              <p>{level.text}</p>
              <div className="bh-level-footer">
                <span>{level.progress}</span>
                <span>{level.sessions}</span>
              </div>
            </article>
          ))}
        </section>

        <section className="bh-master">
          <h2>What You’ll Master</h2>
          <div className="bh-master-grid">
            {skills.map(([title, text, Icon]) => (
              <div className="bh-master-item" key={title}>
                <Icon size={34} />
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bh-bottom-grid">
          <article className="bh-preview">
            <p>Free Preview</p>
            <h2>Stationary Pounds</h2>
            <div className="bh-preview-meta">
              <span><Clock size={16} /> 10 Minutes</span>
              <span><Trophy size={16} /> Beginner</span>
            </div>

            <div className="bh-video">
              <button type="button"><Play size={30} fill="currentColor" /></button>
            </div>

            <p className="bh-preview-copy">
              The key to great handles starts with control. Build strength in your hands
              and develop rhythm with this foundational ball handling drill.
            </p>

            <a href="/courtstreak-site/#join">Watch Preview</a>
          </article>

          <article className="bh-curriculum">
            <p>Curriculum Overview</p>

            <div className="bh-module open">
              <div className="bh-module-header">
                <strong><span>1</span> Foundation</strong>
                <small>18 Drills</small>
              </div>

              {curriculum.map(([lesson, status], index) => (
                <div className="bh-lesson" key={lesson}>
                  <span>{index + 1}. {lesson}</span>
                  <small className={status.toLowerCase()}>{status}</small>
                </div>
              ))}
            </div>

            <div className="bh-module-locked"><span>2</span> Development <small>24 Drills</small></div>
            <div className="bh-module-locked"><span>3</span> Mastery <small>28 Drills</small></div>
            <div className="bh-module-locked"><span>4</span> Elite Level <small>Coming Soon 🔒</small></div>
          </article>
        </section>

        <section className="bh-cta">
          <div>
            <p>Unlock the Full Path</p>
            <h2>Become unstoppable</h2>
            <span>Join CourtStreak and start your journey today.</span>
          </div>

          <a href="/courtstreak-site/#join">
            Join the Waitlist <ArrowRight size={18} />
          </a>
        </section>
      </section>

      <Footer />
    </main>
  );
}
