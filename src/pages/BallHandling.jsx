import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { WORKOUT_PROGRAMS } from '../data/workoutPrograms.js';
import { PREVIEW_DRILLS } from '../data/previewDrills.js';
import '../customer-preview.css';
export default function BallHandling() {
  return <main><Navbar /><section className="cs-training-start"><p className="cs-preview-eyebrow">BALL HANDLING</p><h1>Build a handle you can trust.</h1><p>Choose a guided workout or focus on a single skill. Learn each drill through its written instructions, coaching cues, and available demonstration video.</p><div className="cs-preview-grid"><article className="cs-preview-card"><span>GUIDED WORKOUTS</span><h2>{WORKOUT_PROGRAMS.length} training plans</h2><p>10- and 20-minute plans with progressive drill sequences and required timed rounds.</p><Link to="/preview/workout">Preview the workout library →</Link></article><article className="cs-preview-card"><span>SINGLE DRILLS</span><h2>{PREVIEW_DRILLS.length} curated drills</h2><p>Foundations, control, crossovers, between the legs, behind the back, combinations, and movement.</p><Link to="/preview/lab">Preview drills and coaching cues →</Link></article></div><p>Guided Manual uses a timer and self-reported results. Automatic camera counting is still being tested. Demonstration videos are added as they become available; written instructions remain accessible.</p><Link className="cs-preview-primary" to="/train">Start Training</Link><Link to="/preview">Explore the app before joining →</Link></section><Footer /></main>;
}
