import React from 'react';
import SitePage from '../components/SitePage.jsx';

const groups = [
  {
    title: 'Getting Started',
    questions: [
      ['What is CourtStreak?', 'CourtStreak is a guided basketball-development membership combining structured plans, professional workout instruction, coaching support, feedback, accountability, challenges, and progress tracking.'],
      ['Is CourtStreak only a video library?', 'No. Videos support the training, but membership is designed to include guided planning, personalized recommendations, coaching feedback, progress review, and trainer access.'],
      ['Who is CourtStreak designed for?', 'CourtStreak is designed for developing players, parents, school teams, AAU programs, coaches, and private trainers.'],
    ],
  },
  {
    title: 'Training and Coaching',
    questions: [
      ['Are plans personalized?', 'Development recommendations can be organized around the player’s goals, position, experience, schedule, available equipment, and areas of need.'],
      ['Can a player receive live feedback?', 'The membership is being structured to include opportunities for live guidance, submitted-video feedback, training questions, and individual trainer support.'],
      ['How often can a plan change?', 'Plans can be adjusted as the player progresses, completes assessments, changes goals, or receives new coaching priorities.'],
      ['What skills are covered?', 'Training can include ball handling, shooting, finishing, footwork, decision-making, strength, mobility, film study, and position-specific development.'],
    ],
  },
  {
    title: 'Parents and Privacy',
    questions: [
      ['Can parents follow progress?', 'Yes. Players can invite parents into a Family Training Circle so they can follow consistency, completed workouts, streaks, and milestones.'],
      ['Is player activity public?', 'It does not need to be. Training Circles let players choose whether activity is shared with friends, family, coaches, trainers, or teams.'],
      ['What equipment is required?', 'Requirements depend on the workout. CourtStreak can organize options around the player’s available space, hoop access, basketballs, cones, and other equipment.'],
    ],
  },
  {
    title: 'Membership and Billing',
    questions: [
      ['What does membership include?', 'Membership is intended to include structured plans, demonstration videos, personalized recommendations, live coaching guidance, progress tracking, streaks, challenges, Training Circles, and ongoing updates.'],
      ['How much does CourtStreak cost?', 'The planned individual membership is $49.99 per month. Final plan details should be reviewed on the Pricing page before purchase.'],
      ['Can a membership be canceled?', 'Membership terms, cancellation timing, and billing details will be clearly presented before payment.'],
      ['Are team plans available?', 'CourtStreak is being structured to support coaches, trainers, teams, and organizations with separate team-level options.'],
    ],
  },
];

export default function FAQPage() {
  return (
    <SitePage
      eyebrow="CourtStreak Help Center"
      title="Clear Answers Before You Create an Account."
      intro="Learn how training plans, coaching support, progress tracking, privacy, memberships, and team access are designed to work."
      secondaryLabel="Contact Support"
      secondaryHref="/courtstreak-site/#contact"
    >
      <section className="section site-content-section">
        <div className="site-faq-groups">
          {groups.map((group) => (
            <section className="site-faq-group" key={group.title}>
              <h2>{group.title}</h2>
              <div className="faq-list">
                {group.questions.map(([question, answer]) => (
                  <details className="faq-item" key={question}>
                    <summary>{question}</summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </SitePage>
  );
}
