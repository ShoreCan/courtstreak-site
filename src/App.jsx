import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import BallHandling from './pages/BallHandling.jsx';
import Players from './pages/Players.jsx';
import Parents from './pages/Parents.jsx';
import Coaches from './pages/Coaches.jsx';
import Reviews from './pages/Reviews.jsx';
import FAQPage from './pages/FAQPage.jsx';
import WhatsIncludedPage from './pages/WhatsIncludedPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import About from './pages/About.jsx';
import CreateAccount from './pages/CreateAccount.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Welcome from './pages/Welcome.jsx';
import Workout from './pages/Workout.jsx';
import Profile from './pages/Profile.jsx';
import Membership from './pages/Membership.jsx';
import TrophyCase from './pages/TrophyCase.jsx';
import Settings from './pages/Settings.jsx';
import Progress from './pages/Progress.jsx';
import TrainingCircles from './pages/TrainingCircles.jsx';
import TrainingCircleDetail from './pages/TrainingCircleDetail.jsx';
import JoinTrainingCircle from './pages/JoinTrainingCircle.jsx';
import RequireMembership from './components/RequireMembership.jsx';
export default function App() {
  return (

    <Routes>
      <Route path="/" element={<Home />} />
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
    <RequireMembership>
      <BallHandling />
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
    <RequireMembership>
      <Membership />
    </RequireMembership>
  }
/>

<Route
  path="/trophies"
  element={
    <RequireMembership>
      <TrophyCase />
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

    </Routes>
  );
}
