import React from 'react';
import { Bug, Calendar, Mail, MessageCircle, PhoneCall, Video } from 'lucide-react';

const supportOptions = [
  ['Report a Problem', 'Tell us what is not working so we can fix it fast.', Bug],
  ['Ask a Training Question', 'Need help understanding a drill or workout?', MessageCircle],
  ['Request a Video Breakdown', 'Ask for a clearer explanation or future drill video.', Video],
  ['Coach / Team Support', 'Coaches can ask about groups, challenges, and player tracking.', PhoneCall],
];

export default function ContactSupport() {
  return (
    <section id="contact" className="section contact-section upgraded-contact">
      <div className="section-heading center">
        <p className="eyebrow">Support</p>
        <h2>Need help? Reach out directly.</h2>
        <p>
          CourtStreak is built to be interactive. Players, parents, and coaches should be able
          to report problems, ask questions, or request a meeting when they need more support.
        </p>
      </div>

      <div className="support-card-grid">
        {supportOptions.map(([title, copy, Icon]) => (
          <article className="support-card" key={title}>
            <Icon size={26} />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>

      <div className="contact-action-grid">
        <div className="contact-action-card dark">
          <Mail size={28} />
          <h3>Email CourtStreak</h3>
          <p>
            Send questions, report bugs, or explain what you need help with.
          </p>
          <a href="mailto:tredd2@g.emporia.edu?subject=CourtStreak Support Request">
            Email Support
          </a>
        </div>

        <div className="contact-action-card light">
          <Calendar size={28} />
          <h3>Request a Meeting</h3>
          <p>
            Parents, coaches, or trainers can request a time to talk through bigger questions,
            team setup, or feedback.
          </p>
          <a href="mailto:tredd2@g.emporia.edu?subject=CourtStreak Meeting Request">
            Schedule a Meeting
          </a>
        </div>
      </div>
    </section>
  );
}
