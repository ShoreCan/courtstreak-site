import React from 'react';
import { BadgeCheck, Brain, Flame, Target } from 'lucide-react';
import SitePage from '../components/SitePage.jsx';

export default function About() {
  return (
    <SitePage
      eyebrow="The CourtStreak Story"
      title="Built Around the Habits That Help Players Improve."
      intro="CourtStreak was created to solve a problem many players experience: they want to improve, but they do not always know what to work on or how to remain consistent."
      secondaryLabel="Explore Player Features"
      secondaryHref="/courtstreak-site/players"
    >
      <section className="section site-split-section">
        <div>
          <p className="eyebrow">Founder Story</p>
          <h2>Created from real college basketball experience.</h2>
          <p>
            Trey Redd created CourtStreak after experiencing the demands of college
            basketball and seeing how much purposeful preparation, decision-making,
            repetition, and accountability influence development.
          </p>
          <p>
            As a college point guard who ranked nationally in assist-to-turnover ratio
            and assists, Trey understands that improvement requires more than motivation.
            Players need structure, feedback, and people who help them remain accountable.
          </p>
          <p>
            CourtStreak is being built to give developing players access to those same
            principles in a format they can follow from anywhere.
          </p>
        </div>

        <div className="site-highlight-card">
          <BadgeCheck size={32} />
          <p className="eyebrow">The CourtStreak Belief</p>
          <h3>Consistency is a skill.</h3>
          <p>
            The goal is not simply to complete more drills. The goal is to help players
            become more intentional, more accountable, and more consistent over time.
          </p>
        </div>
      </section>

      <section className="section site-value-strip">
        <div><Target /><strong>Direction</strong><span>Never wonder what to work on again.</span></div>
        <div><Flame /><strong>Consistency</strong><span>Build a streak you do not want to lose.</span></div>
        <div><Brain /><strong>Guidance</strong><span>Understand how and why the plan works.</span></div>
        <div><BadgeCheck /><strong>Accountability</strong><span>Train with people who push you.</span></div>
      </section>
    </SitePage>
  );
}
