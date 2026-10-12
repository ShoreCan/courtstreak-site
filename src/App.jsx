import React, { lazy, Suspense } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
const BallHandling = lazy(() => import('./pages/BallHandling.jsx'));
const Players = lazy(() => import('./pages/Players.jsx'));
const Parents = lazy(() => import('./pages/Parents.jsx'));
const Coaches = lazy(() => import('./pages/Coaches.jsx'));
const Reviews = lazy(() => import('./pages/Reviews.jsx'));
const FAQPage = lazy(() => import('./pages/FAQPage.jsx'));
const WhatsIncludedPage = lazy(() => import('./pages/WhatsIncludedPage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage.jsx'));
const PricingPage = lazy(() => import('./pages/PricingPage.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const CreateAccount = lazy(() => import('./pages/CreateAccount.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Welcome = lazy(() => import('./pages/Welcome.jsx'));
const Workout = lazy(() => import('./pages/Workout.jsx'));
const Lab = lazy(() => import('./pages/Lab.jsx'));
const LabDrillDetail = lazy(() => import('./pages/LabDrillDetail.jsx'));
const LabDrillSession = lazy(() => import('./pages/LabDrillSession.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Membership = lazy(() => import('./pages/Membership.jsx'));
const TrophyCollection = lazy(() => import('./pages/TrophyCollection.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Progress = lazy(() => import('./pages/Progress.jsx'));
const TrainingCircles = lazy(() => import('./pages/TrainingCircles.jsx'));
const TrainingCircleDetail = lazy(() => import('./pages/TrainingCircleDetail.jsx'));
const JoinTrainingCircle = lazy(() => import('./pages/JoinTrainingCircle.jsx'));
import RequireMembership from './components/RequireMembership.jsx';
const TrainingStart = lazy(() => import('./pages/TrainingStart.jsx'));
const CustomerPreview = lazy(() => import('./pages/CustomerPreview.jsx'));
import RequireAccount from './components/RequireAccount.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';
import PlayerAppNav from './components/PlayerAppNav.jsx';
export default function App() {
  const location = useLocation();
  return (
    <AppErrorBoundary key={location.pathname}>
      <Suspense fallback={<main className="cs-welcome-page"><section className="cs-welcome-card"><h1>Opening CourtStreak…</h1></section></main>}>
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/preview/*" element={<CustomerPreview />} />
      <Route path="/train" element={<RequireMembership><TrainingStart /></RequireMembership>} />
      <Route path="/players" element={<Players />} />
      <Route path="/parents" element={<Parents />} />
      <Route path="/coaches" element={<Coaches />} />
      <Route path="/reviews" element={<Reviews />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route
  path="/whats-included"
  element={<WhatsIncludedPage />}
/>

<Route
  path="/contact"
  element={<ContactPage />}
/>
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/about" element={<About />} />
      <Route path="/create-account" element={<CreateAccount />} />
<Route path="/login" element={<Login />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
<Route path="/welcome" element={<Welcome />} />

<Route
  path="/dashboard"
  element={
    <RequireMembership>
      <Dashboard />
    </RequireMembership>
  }
/>
<Route
  path="/settings"
  element={
    <RequireMembership>
      <Settings />
    </RequireMembership>
  }
/>

<Route
  path="/training/ball-handling"
  element={
    <BallHandling />
  }
/>

<Route
  path="/lab"
  element={
    <RequireMembership>
      <Lab />
    </RequireMembership>
  }
/>

<Route
  path="/lab/drill/:drillKey"
  element={
    <RequireMembership>
      <LabDrillDetail />
    </RequireMembership>
  }
/>

<Route
  path="/lab/drill/:drillKey/session"
  element={
    <RequireMembership>
      <LabDrillSession />
    </RequireMembership>
  }
/>

<Route
  path="/workout"
  element={
    <RequireMembership>
      <Workout />
    </RequireMembership>
  }
/>

<Route
  path="/progress"
  element={
    <RequireMembership>
      <Progress />
    </RequireMembership>
  }
/>

<Route
  path="/profile"
  element={
    <RequireMembership>
      <Profile />
    </RequireMembership>
  }
/>
<Route
  path="/membership"
  element={
    <RequireAccount>
      <Membership />
    </RequireAccount>
  }
/>

<Route
  path="/trophies"
  element={
    <RequireMembership>
      <TrophyCollection />
    </RequireMembership>
  }
/>
<Route
  path="/trophies/collection"
  element={
    <RequireMembership>
      <TrophyCollection />
    </RequireMembership>
  }
/>

<Route
  path="/training-circles"
  element={
    <RequireMembership>
      <TrainingCircles />
    </RequireMembership>
  }
/>

<Route
  path="/training-circles/:circleId"
  element={
    <RequireMembership>
      <TrainingCircleDetail />
    </RequireMembership>
  }
/>

<Route
  path="/training-circles/join/:inviteCode"
  element={<JoinTrainingCircle />}
/>

      <Route path="*" element={<main className="cs-welcome-page"><section className="cs-welcome-card"><h1>Page not found.</h1><p>Choose a destination to continue.</p><Link to="/dashboard">Dashboard</Link> · <Link to="/preview">Explore CourtStreak</Link></section></main>} />
      </Routes>
      </Suspense>
      <PlayerAppNav />
    </AppErrorBoundary>
  );
}
