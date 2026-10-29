import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const faqs = [
  ['How do I start?', 'Try the free preview to explore. Create a Player account and activate membership when you’re ready to train.'],
  ['What can I train?', 'Ball handling. Choose a single drill or a structured 10- or 20-minute workout.'],
  ['Does the camera count every drill?', 'Live counting is available for the right-hand pound camera trial. Guided manual drills use a timer; you enter your clean rep count afterward.'],
  ['How do XP and streaks work?', 'Eligible saved training contributes to your progress. A single drill and a full workout have different rewards; your results screen shows what counted. Camera trials do not award XP.'],
  ['Can parents and coaches follow progress?', 'Yes. Use your own Parent or Coach account. Each player has a separate Player account and approves access to their progress.'],
  ['Who can see my training?', 'Choose sharing before each session. Private sessions stay private. Circle challenges post to their Circle, and approved parent or coach connections can view the progress they have access to.'],
  ['Can I use my iPhone, iPad, or computer?', 'Open CourtStreak in your browser. Camera drills need camera permission. Try your device and setup before starting a full session.'],
  ['How much is membership?', 'Player membership is $29.99 per month. Manage or cancel it from Membership in your account.'],
];

export default function FAQPage() {
  return <main><Navbar /><section className="section faq-section cs-public-help" id="faq">
    <div className="section-heading center"><p className="eyebrow">HELP</p><h1>A few quick answers.</h1></div>
    <div className="faq-list">{faqs.map(([question, answer]) => <details className="faq-item" key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
    <p className="cs-help-more">Need a hand? <Link to="/contact">Contact CourtStreak</Link></p>
  </section><Footer /></main>;
}
