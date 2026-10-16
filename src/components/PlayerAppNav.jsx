import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FiActivity,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiGrid,
  FiHome,
  FiLogOut,
  FiPlay,
  FiSettings,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import usePreviewNavigate from '../lib/usePreviewNavigate.js';
import { supabase } from '../lib/supabaseClient.js';

const appRoutes = [
  '/dashboard',
  '/train',
  '/lab',
  '/workout',
  '/progress',
  '/profile',
  '/membership',
  '/settings',
  '/trophies',
  '/training-circles',
];

function routeStartsWith(pathname, route) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default function PlayerAppNav() {
  const location = useLocation();
  const previewOnly = location.pathname === '/preview' || location.pathname.startsWith('/preview/');
  const navigate = usePreviewNavigate(previewOnly);
  const previewPath = location.pathname.slice('/preview'.length);
  const pathname = previewOnly ? (previewPath === '/player' ? '/dashboard' : previewPath.replace(/^\/circles(?=\/|$)/, '/training-circles')) : location.pathname;
  const [trainMenuOpen, setTrainMenuOpen] = useState(false);

  const isAppRoute = appRoutes.some((route) => routeStartsWith(pathname, route));
  const isFocusedExperience =
    pathname.includes('/session') ||
    pathname.startsWith('/training/ball-handling') ||
    pathname.startsWith('/training-circles/join');

  useEffect(() => {
    setTrainMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAppRoute || isFocusedExperience) return undefined;
    document.body.classList.add('cs-player-app-active');
    return () => document.body.classList.remove('cs-player-app-active');
  }, [isAppRoute, isFocusedExperience]);

  if (!isAppRoute || isFocusedExperience) return null;

  const items = [
    { label: 'Home', icon: FiHome, route: '/dashboard' },
    { label: 'Progress', icon: FiBarChart2, route: '/progress' },
    { label: 'Circles', icon: FiUsers, route: '/training-circles' },
    { label: 'Profile', icon: FiUser, route: '/profile' },
  ];

  const desktopItems = [
    { label: 'Dashboard', icon: FiHome, route: '/dashboard' },
    { label: 'Start Training', icon: FiPlay, route: '/train' },
    { label: 'Progress', icon: FiBarChart2, route: '/progress' },
    { label: 'Achievements', icon: FiAward, route: '/trophies' },
    { label: 'Training Circles', icon: FiUsers, route: '/training-circles' },
    { label: 'Profile', icon: FiUser, route: '/profile' },
    { label: 'Membership', icon: FiGrid, route: '/membership' },
    { label: 'My assigned work', icon: FiBookOpen, route: '/assigned-work' },
    
    { label: 'Settings', icon: FiSettings, route: '/settings' },
  ];

  async function handleLogout() {
    if (previewOnly) { navigate('/'); return; }
    if (supabase) await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <>
      <aside className="cs-app-desktop-sidebar">
        <button type="button" className="cs-app-desktop-brand" onClick={() => navigate('/dashboard')}>
          <span>CS</span><strong>CourtStreak</strong>
        </button>

        <nav aria-label="Player navigation">
          {desktopItems.map(({ label, icon: Icon, route }) => (
            <button
              type="button"
              key={route}
              className={(routeStartsWith(pathname, route) || (route === '/train' && ['/workout', '/lab'].some((r) => routeStartsWith(pathname, r)))) ? 'is-active' : ''}
              onClick={() => navigate(route)}
              title={label}
            >
              <Icon /><span>{label}</span>
            </button>
          ))}
        </nav>

        <button type="button" className="cs-app-desktop-logout" onClick={handleLogout}>
          <FiLogOut /><span>{previewOnly ? 'Exit Preview' : 'Log Out'}</span>
        </button>
      </aside>

      {trainMenuOpen ? (
        <div className="cs-app-nav-scrim" onMouseDown={() => setTrainMenuOpen(false)}>
          <section
            className="cs-app-train-sheet"
            aria-label="Choose training"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>START TRAINING</span>
                <h2>How do you want to work?</h2>
              </div>
              <button type="button" onClick={() => setTrainMenuOpen(false)} aria-label="Close training menu">
                <FiX />
              </button>
            </header>

            <button type="button" onClick={() => navigate('/workout')}>
              <span className="cs-app-train-icon"><FiPlay /></span>
              <span><strong>Guided workout</strong><small>Follow a complete 10 or 20 minute plan.</small></span>
            </button>
            <button type="button" onClick={() => navigate('/lab')}>
              <span className="cs-app-train-icon"><FiBookOpen /></span>
              <span><strong>Choose a drill</strong><small>Practice one skill from The Lab.</small></span>
            </button>
          </section>
        </div>
      ) : null}

      <nav className="cs-app-mobile-nav" aria-label="CourtStreak app navigation">
        <button
          type="button"
          className={routeStartsWith(pathname, '/dashboard') ? 'is-active' : ''}
          onClick={() => navigate('/dashboard')}
        >
          <FiHome /><span>Home</span>
        </button>

        <button
          type="button"
          className={`cs-app-train-button ${
            routeStartsWith(pathname, '/train') || routeStartsWith(pathname, '/lab') || routeStartsWith(pathname, '/workout')
              ? 'is-active'
              : ''
          }`}
          onClick={() => navigate('/train')}
          aria-expanded={trainMenuOpen}
        >
          <span className="cs-app-train-orb"><FiActivity /></span>
          <span>Train</span>
        </button>

        {items.slice(1).map(({ label, icon: Icon, route }) => (
          <button
            type="button"
            key={route}
            className={(routeStartsWith(pathname, route) || (route === '/train' && ['/workout', '/lab'].some((r) => routeStartsWith(pathname, r)))) ? 'is-active' : ''}
            onClick={() => navigate(route)}
          >
            <Icon /><span>{label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
