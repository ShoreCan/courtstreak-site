import React from 'react';
import { MessageCircle, Lightbulb, Bug, Video, HelpCircle } from 'lucide-react';

const options = [
  ['Training Question', 'Ask about a drill or skill focus.', MessageCircle],
  ['Drill Help', 'Get clarification on technique.', HelpCircle],
  ['Feature Idea', 'Suggest something CourtStreak should add.', Lightbulb],
  ['Report a Bug', 'Let us know if something is not working.', Bug],
  ['Video Request', 'Request a drill breakdown or tutorial.', Video],
];

export default function ContactSupport() {
  return (
    <section id="contact" className="section contact-section">
      <div className="section-heading">
        <p className="eyebrow">Need Help?</p>
        <h2>Questions, drill help, and feedback in one place.</h2>
        <p>
          Early users should feel supported. CourtStreak will give players,
          parents, and coaches a simple way to ask questions and help improve the platform.
        </p>
      </div>

      <div className="contact-grid">
        {options.map(([title, copy, Icon]) => (
          <article className="contact-card" key={title}>
            <Icon size={24} />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>

      <div className="contact-box">
        <div>
          <h3>Contact the CourtStreak Team</h3>
          <p>For now, this can collect interest and questions. Later, we can connect it to real inbox messaging.</p>
        </div>
        <a href="#join">Send a Question</a>
      </div>
    </section>
  );
}
