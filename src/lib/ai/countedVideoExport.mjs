import { DrillRecording } from './drillRecording.mjs';
import { drawCountedVideo, shareVideoLayout, RESULT_CARD_SECONDS } from './videoCountOverlay.mjs';

// Only runs after tracking stops. The original recording remains unchanged.
// Real-time encoding takes about 22 seconds for a 20-second round plus end card.
export function createCountedVideo({ video, sourceURL, changes, finalCount, completed,
  duration = 20, signal, onProgress = () => {}, document = globalThis.document,
  canvas = document?.createElement('canvas'), Recorder = globalThis.MediaRecorder,
  requestFrame = callback => globalThis.requestAnimationFrame(callback),
  cancelFrame = id => globalThis.cancelAnimationFrame(id), clock = () => performance.now() }) {
  return new Promise((resolve, reject) => {
    let recording, capture, animation, timer, layout, done = false, started = false;
    let resultAt = null, playStarted = null, lastAdvance = clock(), lastTime = -1;
    const originalMuted = video?.muted;
    const cleanup = () => {
      cancelFrame(animation); clearTimeout(timer);
      signal?.removeEventListener('abort', aborted);
      document?.removeEventListener('visibilitychange', visibility);
      video?.removeEventListener('loadeddata', start);
      video?.removeEventListener('error', failed);
      video?.removeEventListener('ended', ended);
      if (video) { video.pause(); video.muted = originalMuted; }
      capture?.getTracks().forEach(track => track.stop());
    };
    const fail = error => {
      if (done) return; done = true; recording?.cancel(); cleanup(); reject(error);
    };
    const aborted = () => fail(new DOMException('Video preparation cancelled.', 'AbortError'));
    const visibility = () => { if (document.hidden) fail(new Error('Keep CourtStreak open while preparing the video.')); };
    const failed = () => fail(new Error('The original video could not be played.'));
    const ended = () => { if (started && resultAt === null) resultAt = clock(); };
    const paint = () => {
      if (done) return;
      try {
        const now = clock(), time = video.currentTime;
        if (time !== lastTime) { lastTime = time; lastAdvance = now; }
        if (resultAt === null && now - lastAdvance > 6000) throw new Error('Video preparation paused. The original video is still available.');
        if (playStarted !== null && now - playStarted > (duration + 15) * 1000) throw new Error('Video preparation took too long. The original video is still available.');
        drawCountedVideo(canvas.getContext('2d'), video, layout, {
          time, changes, finalCount, duration, completed, result: resultAt !== null });
        const sourceDuration = Number.isFinite(video.duration) ? video.duration : duration;
        onProgress(Math.min(.99, (resultAt === null ? time : sourceDuration + (now - resultAt) / 1000) / (sourceDuration + RESULT_CARD_SECONDS)));
        if (resultAt !== null && now - resultAt >= RESULT_CARD_SECONDS * 1000) {
          timer = setTimeout(() => fail(new Error('The counter video could not finish saving.')), 8000);
          recording.stop(); return;
        }
        animation = requestFrame(paint);
      } catch (error) { fail(error); }
    };
    const start = () => {
      if (started || done || video.readyState < 2) return;
      try {
        layout = shareVideoLayout(video.videoWidth, video.videoHeight);
        canvas.width = layout.width; canvas.height = layout.height;
        if (!canvas.getContext('2d')) throw new Error('Counter video rendering is unavailable.');
        drawCountedVideo(canvas.getContext('2d'), video, layout, { changes, finalCount, duration, completed });
        capture = canvas.captureStream(30);
        recording = new DrillRecording({ Recorder,
          onReady: blob => {
            if (done) return; done = true; cleanup(); onProgress(1);
            resolve({ blob, width: layout.width, height: layout.height, resultCardSeconds: RESULT_CARD_SECONDS });
          },
          onUnavailable: () => fail(new Error('This browser could not prepare a counter video. The original is still available.'))
        });
        if (!recording.start(capture)) return;
        started = true; clearTimeout(timer); playStarted = lastAdvance = clock();
        Promise.resolve(video.play()).then(() => { if (!done) animation = requestFrame(paint); }).catch(fail);
      } catch (error) { fail(error); }
    };
    if (!video || !canvas?.captureStream || !Recorder) { fail(new Error('Counter video export is unavailable in this browser.')); return; }
    if (signal?.aborted) { aborted(); return; }
    if (document?.hidden) { visibility(); return; }
    signal?.addEventListener('abort', aborted, { once: true });
    document?.addEventListener('visibilitychange', visibility);
    video.addEventListener('loadeddata', start); video.addEventListener('error', failed); video.addEventListener('ended', ended);
    timer = setTimeout(() => fail(new Error('The original video did not load.')), 10000);
    video.pause(); video.muted = true; video.loop = false; video.playbackRate = 1;
    video.src = sourceURL; video.load(); start();
  });
}
