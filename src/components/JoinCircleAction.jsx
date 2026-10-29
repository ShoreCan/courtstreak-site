import React, { useRef, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { circleInviteCode } from '../lib/circleInvite.mjs';
import './join-circle-action.css';

export default function JoinCircleAction({ navigate, previewOnly }) {
  const dialog = useRef(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  function open() {
    if (previewOnly) { navigate('/preview/membership'); return; }
    setError('');
    dialog.current.showModal();
    dialog.current.querySelector('input').focus();
  }
  function join(event) {
    event.preventDefault();
    const code = circleInviteCode(value, window.location.origin);
    if (!code) { setError('Paste a CourtStreak Circle invite link or code.'); return; }
    dialog.current.close();
    navigate(`/training-circles/join/${encodeURIComponent(code)}`);
  }
  return <>
    <button type="button" className="cs-circles-secondary" onClick={open}><UserPlus size={18} />Join Circle</button>
    <dialog ref={dialog} className="cs-join-dialog" aria-labelledby="cs-join-title">
      <button type="button" className="cs-join-close" aria-label="Close invitation entry" onClick={() => dialog.current.close()}><X size={20} /></button>
      <h2 id="cs-join-title">Join your crew.</h2>
      <form onSubmit={join}>
        <label htmlFor="cs-circle-invite">Invite link or code</label>
        <input id="cs-circle-invite" autoFocus required autoComplete="off" autoCapitalize="none" spellCheck={false} value={value} onChange={event => setValue(event.target.value)} />
        {error && <p role="alert">{error}</p>}
        <button type="submit">Continue</button>
      </form>
    </dialog>
  </>;
}
