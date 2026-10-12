import React, { useEffect } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Dashboard from './Dashboard.jsx';
import Workout from './Workout.jsx';
import Lab from './Lab.jsx';
import LabDrillDetail from './LabDrillDetail.jsx';
import Progress from './Progress.jsx';
import TrainingStart from './TrainingStart.jsx';
import Settings from './Settings.jsx';
import Profile from './Profile.jsx';
import TrophyCollection from './TrophyCollection.jsx';
import TrainingCircles from './TrainingCircles.jsx';
import TrainingCircleDetail from './TrainingCircleDetail.jsx';
import '../customer-preview.css';

function PreviewMembership() {
  return <main className="cs-training-start"><p className="cs-preview-eyebrow">MAKE IT YOURS</p><h1>Ready to start your own progress?</h1><p>Membership unlocks timed training, saving your results, XP, streaks, achievements, and Training Circles.</p><div className="cs-preview-card"><h2>$29.99 / month</h2><p>Monthly membership for one player. Manage or cancel through your Membership page.</p><p>Guided Manual is available. Automatic camera counting is still being tested and is not currently included as a working web feature.</p><Link className="cs-preview-primary" to="/create-account">Create your account</Link><Link to="/pricing">View membership details</Link></div><p className="cs-guide-note">You can keep exploring for free. Preview stats belong to a fictional player; nothing in this preview records training or awards rewards.</p><Link to="/preview/train">Keep exploring →</Link></main>;
}

export default function CustomerPreview() {
  useEffect(() => { document.body.classList.add('cs-customer-preview'); return () => document.body.classList.remove('cs-customer-preview'); }, []);
  return <div className="cs-preview-shell">
    <div className="cs-preview-content"><header className="cs-preview-banner"><div><strong>EXPLORE COURTSTREAK</strong><span>Sample player data · Browsing only</span></div><Link to="/create-account">Join CourtStreak →</Link></header>
      <Routes>
        <Route index element={<Dashboard previewOnly />} />
        <Route path="train" element={<TrainingStart previewOnly />} />
        <Route path="workout" element={<Workout previewOnly />} />
        <Route path="lab" element={<Lab previewOnly />} />
        <Route path="lab/drill/:drillKey" element={<LabDrillDetail previewOnly />} />
        <Route path="lab/drill/:drillKey/session" element={<PreviewMembership />} />
        <Route path="progress" element={<Progress previewOnly />} />
        <Route path="circles" element={<TrainingCircles previewOnly />} />
        <Route path="circles/:circleId" element={<TrainingCircleDetail previewOnly />} />
        <Route path="training-circles/:circleId" element={<TrainingCircleDetail previewOnly />} />
        <Route path="trophies/*" element={<TrophyCollection previewOnly />} />
        <Route path="profile" element={<Profile previewOnly />} />
        <Route path="membership" element={<PreviewMembership />} />
        <Route path="settings" element={<Settings previewOnly />} />
        <Route path="*" element={<TrainingStart previewOnly />} />
      </Routes>
    </div>
  </div>;
}
