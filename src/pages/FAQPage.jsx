import React from 'react';

const faqs = [
  [
    'What is CourtStreak?',
    'CourtStreak is a basketball training platform built to help players take ownership of their development. Choose what you want to improve, follow guided drills, put in the work, earn XP, build your streak, and track your progress over time.',
  ],
  [
    'What can I train on CourtStreak?',
    'CourtStreak is launching with a focused ball-handling training library. Players can choose individual drills based on what they want to work on instead of being locked into one preplanned workout. Shooting and finishing training are planned for the future.',
  ],
  [
    'Do I have to follow a specific workout?',
    'No. CourtStreak is built around choice. Pick the drill or skill you want to work on that day and train at your own pace. Structured workouts and training programs may also be added as optional ways to train in the future.',
  ],
  [
    'How do I earn XP?',
    'Complete eligible training drills to earn XP. Quick drills can award 5–10 XP, standard drills 10–15 XP, and advanced or longer drills 15–20 XP. Bonus challenges can provide additional opportunities to earn XP.',
  ],
  [
    'Can I repeat a drill?',
    'Absolutely. Repetition is part of getting better. You can repeat a drill as much as you want for the reps, but the same drill will only award its training XP once per day. Come back tomorrow and it can count toward your XP again.',
  ],
  [
    'What are Bonus Challenges?',
    'Bonus Challenges are optional extra-work opportunities that appear after training. Complete the full challenge to earn bonus XP and push your development a little further.',
  ],
  [
    'What are streaks?',
    'Your training streak tracks your consistency. Keep showing up and putting in legitimate training sessions to build your streak and create a habit of working on your game.',
  ],
  [
    'What are achievements?',
    'Achievements recognize milestones in your CourtStreak journey. As you train, build streaks, earn XP, and reach new milestones, you can unlock achievements that are displayed in your Trophy Case.',
  ],
  [
    'How does leveling up work?',
    'The XP you earn from training contributes to your overall CourtStreak level. Your Player Dashboard shows your total XP, current level, and progress toward the next level.',
  ],
  [
    'Is CourtStreak only for advanced basketball players?',
    'No. CourtStreak is designed for players at different stages of development. Drill difficulty and XP rewards help players identify training that matches their current ability while giving them something harder to work toward.',
  ],
  [
    'Will CourtStreak add shooting and finishing?',
    'Yes. CourtStreak is starting with ball handling so the training experience can be focused and high quality. Shooting and finishing are planned as future additions as the training library grows.',
  ],
  [
    'Can parents follow a player’s progress?',
    'CourtStreak is being built to give players a clear record of their consistency, training progress, XP, streaks, and achievements. Parent and Training Circle features can provide additional ways to follow and encourage that development as CourtStreak grows.',
  ],
  [
    'Is CourtStreak a mobile app?',
    'CourtStreak is being built as a mobile-friendly training platform that works across phones, tablets, laptops, and desktops. A dedicated mobile app may come later.',
  ],
 [
  'How much does CourtStreak cost?',
  'CourtStreak membership is $30 per month and includes access to the training library, guided drills, XP progression, streaks, challenges, progress tracking, and future training updates.',
],
];

export default function FAQ() {
  return (
    <section className="section faq-section" id="faq">
      <div className="section-heading center">
        <p className="eyebrow">FAQ</p>
        <h2>Questions? We&apos;ve got you.</h2>
        <p>
          Everything you need to know about training, earning XP,
          building your streak, and improving with CourtStreak.
        </p>
      </div>

      <div className="faq-list">
        {faqs.map(([question, answer]) => (
          <details className="faq-item" key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}