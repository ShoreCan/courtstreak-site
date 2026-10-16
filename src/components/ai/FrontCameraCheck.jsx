import React, { useEffect, useRef, useState } from 'react';

export default function FrontCameraCheck() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('Use the front-facing camera to check your full-body framing before your drill.');

  function stop() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
  }

  useEffect(() => {
    const onHide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onHide);
    return () => { document.removeEventListener('visibilitychange', onHide); streamRef.current?.getTracks().forEach(track => track.stop()); };
  }, []);

  async function start() {
    stop();
    setStatus('loading');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus('error'); setMessage('Camera access needs HTTPS and Safari camera permission.'); return;
    }
    try {
      // Do not fall back silently to the rear camera.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { exact: 'user' }, width: { ideal: 720 }, height: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('ready');
      setMessage('Front camera connected. You should see a mirror preview of yourself. Place the phone on a stable tripod with your dribbling hand, ball, and floor in frame.');
    } catch (err) {
      stop(); setStatus('error');
      setMessage(err?.name === 'NotAllowedError' ? 'Camera permission was denied. In Safari, check Website Settings → Camera, then try again.' : 'The front camera could not start. Check Safari permissions and close other apps using the camera. The rear camera was not used.');
    }
  }

  return <section className="cs-front-check" aria-label="Front camera setup test">
    <div className="cs-front-check-heading"><strong>Check your camera setup</strong><span>Front camera · preview only</span></div>
    <p>{message}</p>
    <div className={`cs-front-frame ${status === 'ready' ? 'is-ready' : ''}`}>
      <video ref={videoRef} autoPlay muted playsInline aria-label="Mirrored front camera view" />
      {status !== 'ready' && <div className="cs-front-placeholder">{status === 'loading' ? 'Opening front camera…' : 'Your camera preview appears here'}</div>}
    </div>
    <div className="cs-front-controls">
      {status === 'ready' ? <button type="button" onClick={stop}>Turn off camera</button> : <button type="button" disabled={status === 'loading'} onClick={start}>{status === 'loading' ? 'Opening…' : 'Test front camera'}</button>}
    </div>
    <small>This tests framing and permissions only; it does not count dribbles, record video, or award XP. AI counting is still under development for iPhone.</small>
  </section>;
}
