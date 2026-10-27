export const APPEARANCE_KEY = 'courtstreak:appearance';
const valid = value => value === 'light' || value === 'dark';
let current = 'dark';
const listeners = new Set();

function apply() {
  if (typeof document !== 'undefined') document.documentElement.dataset.csAppearance = current;
}

export function initializeAppearance() {
  try {
    const saved = window.localStorage.getItem(APPEARANCE_KEY);
    current = valid(saved) ? saved : 'dark';
  } catch { /* A blocked storage API must not block training. */ }
  apply();
  return current;
}

export function getAppearance() { return current; }

export function setAppearance(value) {
  if (!valid(value)) return;
  if (current === value) return;
  current = value;
  try { window.localStorage.setItem(APPEARANCE_KEY, value); } catch { /* Keep the in-memory choice. */ }
  apply();
  listeners.forEach(listener => listener());
}

export function subscribeAppearance(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  initializeAppearance();
  window.addEventListener('storage', event => {
    if (event.key !== APPEARANCE_KEY && event.key !== null) return;
    current = valid(event.newValue) ? event.newValue : 'dark';
    apply();
    listeners.forEach(listener => listener());
  });
}
