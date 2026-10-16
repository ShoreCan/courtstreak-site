import React, { useState } from 'react';
import { Share2 } from 'lucide-react';

export default function ShareTraining({ text, disabled = false }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function share() {
    if (busy || disabled) return;
    setBusy(true); setMessage('');
    try {
      if (navigator.share) await navigator.share({ title: 'My CourtStreak training', text, url: `${window.location.origin}${import.meta.env.BASE_URL}preview` });
      else { await navigator.clipboard.writeText(`${text}\n${window.location.origin}${import.meta.env.BASE_URL}preview`); setMessage('Training summary copied.'); }
    } catch (error) { if (error.name !== 'AbortError') setMessage('Sharing could not open. Try again.'); }
    finally { setBusy(false); }
  }
  return <div className="cs-share-training"><button type="button" className="secondary" disabled={disabled || busy} onClick={share}><Share2 size={17} /> {busy ? 'Opening…' : 'Share training'}</button><span role="status">{message}</span></div>;
}
