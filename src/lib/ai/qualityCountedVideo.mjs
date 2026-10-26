import { drawCountedVideo, shareVideoLayout, RESULT_CARD_SECONDS } from './videoCountOverlay.mjs';

export const SHARE_VIDEO_REVISION = 'SHARE 02';
const abortError = () => new DOMException('Video preparation cancelled.', 'AbortError');

// Process every source frame with its media timestamp, awaiting encoder capacity.
// This is an offline export after the camera/drill stops, never a real-time
// screen recording. A slow encoder takes longer instead of dropping frames.
export async function encodeQualityCountedVideo({ blob, changes, finalCount, completed,
  duration = 20, signal, onProgress = () => {}, media, createCanvas,
  yieldControl = () => new Promise(resolve => setTimeout(resolve, 0)) }) {
  const check = () => { if (signal?.aborted) throw abortError(); };
  check();
  const lib = media ?? await import('mediabunny');
  const { Input, BlobSource, ALL_FORMATS, Output, Mp4OutputFormat, BufferTarget,
    CanvasSink, CanvasSource, Quality, canEncodeVideo } = lib;
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  let output, source, finalized = false;
  const cancel = () => { void output?.cancel().catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    const track = await input.getPrimaryVideoTrack(); check();
    if (!track || !await track.canDecode()) throw new Error('This browser cannot decode the original for a counted export. Save the original video, or try the export in a supported browser.');
    const [width, height, sourceDuration] = await Promise.all([
      track.getDisplayWidth(), track.getDisplayHeight(), track.computeDuration()]);
    const layout = shareVideoLayout(width, height);
    const bitrate = Math.round(Math.max(4_000_000, layout.width * layout.height * 5));
    const quality = new Quality({ bitrate, bitrateMode: 'variable' });
    if (!await canEncodeVideo('avc', { width: layout.width, height: layout.height, quality })) {
      throw new Error('High-quality MP4 export is unavailable in this browser. Your original camera video is still available.');
    }
    check();
    const canvas = createCanvas ? createCanvas(layout.width, layout.height) :
      typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(layout.width, layout.height) :
      Object.assign(document.createElement('canvas'), { width: layout.width, height: layout.height });
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Video rendering is unavailable. Your original is still available.');
    const sink = new CanvasSink(track, { width: layout.picture.width, height: layout.picture.height, fit: 'contain', poolSize: 2 });
    output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
    source = new CanvasSource(canvas, { codec: 'avc', quality, latencyMode: 'quality', keyFrameInterval: 1 });
    output.addVideoTrack(source);
    await output.start(); check();
    let firstTimestamp = null, lastCanvas = null, endTime = 0, frames = 0;
    const frameDurations = [];
    for await (const sample of sink.canvases()) {
      check();
      if (!(sample.duration > 0) || !Number.isFinite(sample.timestamp)) throw new Error('The camera video has invalid frame timing. Save the original for review.');
      firstTimestamp ??= sample.timestamp;
      const time = sample.timestamp - firstTimestamp;
      drawCountedVideo(ctx, sample.canvas, layout, { time, changes, finalCount, duration, completed });
      await source.add(time, sample.duration); check();
      frames++; endTime = time + sample.duration; lastCanvas = sample.canvas;
      frameDurations.push(sample.duration);
      onProgress(Math.min(.94, .94 * endTime / Math.max(sourceDuration, .01)));
      if (frames % 8 === 0) await yieldControl();
    }
    if (!frames) throw new Error('The original video contained no decodable frames.');
    const sorted = frameDurations.slice().sort((a,b) => a-b);
    const endCardFps = Math.min(60, Math.max(1, Math.round(1 / sorted[Math.floor(sorted.length / 2)])));
    const endFrames = Math.round(RESULT_CARD_SECONDS * endCardFps);
    drawCountedVideo(ctx, lastCanvas, layout, { time: endTime, changes, finalCount, duration, completed, result: true });
    for (let i = 0; i < endFrames; i++) {
      check(); await source.add(endTime + i / endCardFps, 1 / endCardFps);
      onProgress(.94 + .05 * (i + 1) / endFrames);
    }
    source.close(); await output.finalize(); finalized = true; check(); onProgress(1);
    return { blob: new Blob([output.target.buffer], { type: 'video/mp4' }), width: layout.width,
      height: layout.height, resultCardSeconds: RESULT_CARD_SECONDS,
      exportInfo: { revision: SHARE_VIDEO_REVISION, path: 'offline-frame-encoding', codec: 'avc',
        requestedBitrate: bitrate, sourceWidth: width, sourceHeight: height,
        sourceFrames: frames, sourceDuration: endTime, sourceAverageFps: frames / endTime,
        encodedSourceFrames: frames, timing: 'Original presentation timestamps; no frame-rate upsampling' } };
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (!finalized) await output?.cancel().catch(() => {});
    input.dispose();
  }
}

