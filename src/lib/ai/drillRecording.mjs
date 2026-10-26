export function recordingExtension(type = '') {
  return type.includes('mp4') ? 'mp4' : type.includes('webm') ? 'webm' : 'video';
}

// Records the existing camera stream without adding work to detector frames.
// The caller owns the camera tracks and starts this only at Go.
export class DrillRecording {
  constructor({ onReady = () => {}, onUnavailable = () => {}, Recorder = globalThis.MediaRecorder } = {}) {
    this.Recorder = Recorder;
    this.onReady = onReady;
    this.onUnavailable = onUnavailable;
    this.recorder = null;
    this.discarded = false;
    this.failed = false;
  }
  start(stream) {
    if (this.recorder) return false;
    const Recorder = this.Recorder;
    if (!Recorder) { this.onUnavailable(); return false; }
    // Prefer an explicit, portable H.264 camera source. Chromium can choose
    // VP9 inside generic MP4 with level metadata that native playback accepts
    // but WebCodecs rejects, making a later frame-accurate export impossible.
    const types = ['video/mp4;codecs=avc1.42001f', 'video/mp4', 'video/webm;codecs=vp8', 'video/webm'];
    const supported = types.filter(type => Recorder.isTypeSupported?.(type));
    // If an advertised codec cannot start, let the browser choose its default.
    for (const type of [...supported, null]) {
      let recorder;
      try {
        recorder = type ? new Recorder(stream, { mimeType: type }) : new Recorder(stream);
        const chunks = [];
        recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
        recorder.onerror = () => { this.failed = true; this.onUnavailable(); };
        recorder.onstop = () => {
          if (this.discarded || this.failed) return;
          if (!chunks.length) { this.onUnavailable(); return; }
          const mimeType = chunks[0].type || recorder.mimeType || type;
          if (!mimeType) { this.onUnavailable(); return; }
          this.onReady(new Blob(chunks, { type: mimeType }));
        };
        recorder.start(1000);
        this.recorder = recorder;
        return true;
      } catch {
        if (recorder) recorder.ondataavailable = recorder.onstop = recorder.onerror = null;
      }
    }
    this.onUnavailable();
    return false;
  }
  stop() {
    if (!this.recorder || this.recorder.state === 'inactive') return;
    try { this.recorder.stop(); }
    catch { this.failed = true; if (!this.discarded) this.onUnavailable(); }
  }
  cancel() {
    this.discarded = true;
    this.stop();
  }
}
