import React, { lazy, Suspense, useLayoutEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
const CourtStreakExperience = lazy(() => import('./features/courtstreak-ui/CourtStreakExperience'));
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
import './ui-polish.css';

const RestorePlayer = lazy(() => import('./hub/RestorePlayer.jsx'));
const Hub = lazy(() => import('./hub/Hub.jsx'));
const HubEntry = lazy(() => import('./hub/HubEntry.jsx').then(m=>({default:m.HubEntry})));
const HubInvite = lazy(() => import('./hub/HubEntry.jsx').then(m=>({default:m.HubInvite})));
const HubTraining = lazy(() => import('./hub/HubTraining.jsx'));

function RouteScrollReset() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    if (!hash) { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); return; }
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    if (!/^[a-zA-Z][\w-]*$/.test(id)) return;
    const scroll = () => {
      const element = document.getElementById(id);
      if (!element) return false;
      element.scrollIntoView({block: 'start'}); return true;
    };
    if (scroll()) return;
    // Lazy routes and account data can render an anchor after navigation.
    const observer = new MutationObserver(() => { if (scroll()) observer.disconnect(); });
    observer.observe(document.getElementById('root'), {childList: true, subtree: true});
    const timeout = setTimeout(() => observer.disconnect(), 10000);
    return () => { clearTimeout(timeout); observer.disconnect(); };
  }, [pathname, hash]);
  return null;
}

export default function App() {
  const location = useLocation();
  return (
    <AppErrorBoundary key={location.pathname === "/preview" || location.pathname.startsWith("/preview/") ? "customer-preview" : location.pathname}>
      <RouteScrollReset />
      <Suspense fallback={<main className="cs-welcome-page"><section className="cs-welcome-card"><h1>Opening CourtStreak…</h1></section></main>}>
      <Routes>
        <Route path="/experience-lab" element={<CourtStreakExperience />} />
      <Route path="/" element={<Home />} />
      <Route path="/preview/hub/*" element={<Hub preview />} />
      <Route path="/account/restore-player" element={<RequireAccount><RestorePlayer /></RequireAccount>} />
      <Route path="/hub" element={<RequireAccount><HubEntry /></RequireAccount>} />
      <Route path="/hub/invite/:token" element={<RequireAccount><HubInvite /></RequireAccount>} />
      <Route path="/team-hub/*" element={<RequireAccount><Hub /></RequireAccount>} />
      <Route path="/family-hub/*" element={<RequireAccount><Hub /></RequireAccount>} />
      <Route path="/assigned-work/*" element={<RequireAccount><Hub /></RequireAccount>} />
      <Route path="/connections" element={<RequireAccount><Hub /></RequireAccount>} />
      <Route path="/assigned-training/:assignmentId/:runId" element={<RequireMembership><HubTraining /></RequireMembership>} />
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
<Route path="/welcome" element={<RequireAccount><Welcome /></RequireAccount>} />

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
