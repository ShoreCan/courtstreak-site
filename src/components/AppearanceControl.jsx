import React, { useSyncExternalStore } from 'react';
import { FiCheck, FiMoon, FiSun } from 'react-icons/fi';
import { getAppearance, setAppearance, subscribeAppearance } from '../lib/appearance.mjs';
import './appearance.css';

export function useAppearance() {
  return useSyncExternalStore(subscribeAppearance, getAppearance, () => 'dark');
}

export function AppearanceOptions() {
  const appearance = useAppearance();
  return <div className="cs-appearance-options" role="group" aria-label="CourtStreak appearance">
    {[['dark', 'Dark', FiMoon], ['light', 'Light', FiSun]].map(([value, label, Icon]) =>
      <button key={value} type="button" aria-pressed={appearance === value} onClick={() => setAppearance(value)}>
        <Icon /><span>{label}</span>{appearance === value && <FiCheck className="cs-appearance-check" />}
      </button>)}
  </div>;
}

export function AppearanceSettings() {
  return <section className="cs-settings-card cs-appearance-settings" id="appearance-settings">
    <div className="cs-settings-card-heading"><span className="cs-settings-card-icon"><FiSun /></span><div><small>APPEARANCE</small><h2>Your CourtStreak look</h2></div></div>
    <AppearanceOptions />
    <p>Applies across CourtStreak. Saved on this device.</p>
  </section>;
}
