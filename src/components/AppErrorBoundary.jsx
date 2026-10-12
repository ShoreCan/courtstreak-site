import React from 'react';
import { Link } from 'react-router-dom';

export default class AppErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('CourtStreak screen error:', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="cs-welcome-page"><section className="cs-welcome-card">
      <p className="cs-auth-eyebrow">COURTSTREAK</p><h1>This screen could not load.</h1>
      <p>Your saved account data has not been changed. Reload this screen or return to your dashboard.</p>
      <button type="button" onClick={() => window.location.reload()}>Reload screen</button>
      <Link to="/dashboard">Return to Dashboard</Link>
    </section></main>;
  }
}
