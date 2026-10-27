import { drawCountedVideo, shareVideoLayout, RESULT_CARD_SECONDS } from './videoCountOverlay.mjs';
import {createCountedVideoRenderer} from './countedVideoRenderer.mjs';

export const SHARE_VIDEO_REVISION = 'SHARE 04';
const abortError = () => new DOMException('Video preparation cancelled.', 'AbortError');

// Process every source frame with its media timestamp, awaiting encoder capacity.
// This is an offline export after the camera/drill stops, never a real-time
// screen recording. A slow encoder takes longer instead of dropping frames.
export async function encodeQualityCountedVideo({ blob, changes, finalCount, completed,
  duration = 20, signal, onProgress = () => {}, media, createCanvas,
  yieldControl = () => new Promise(resolve => setTimeout(resolve, 0)), clock=()=>performance.now(),
  executionContext='main-thread' }) {
  const exportBegan=clock();
  const stageTimingsMs={initialization:0,sampleReadWait:0,render:0,encodeSubmitWait:0,cooperativeYieldWait:0,resultCard:0,finalize:0};
  const check = () => { if (signal?.aborted) throw abortError(); };
  check();
  const lib = media ?? await import('mediabunny');
  const { Input, BlobSource, ALL_FORMATS, Output, Mp4OutputFormat, BufferTarget,
    VideoSampleSink, CanvasSource, Quality, canEncodeVideo } = lib;
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  let output, source, lastFrame=null, finalized = false;
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
    // The camera picture and graphic bands cover the whole output. An opaque
    // surface avoids maintaining an unused transparency channel.
    const ctx = canvas.getContext('2d',{alpha:false});
    if (!ctx) throw new Error('Video rendering is unavailable. Your original is still available.');
    const renderer=createCountedVideoRenderer({layout,changes,finalCount,completed,duration,createCanvas});
    const sink = new VideoSampleSink(track);
    output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() });
    source = new CanvasSource(canvas, { codec: 'avc', quality, latencyMode: 'quality', keyFrameInterval: 1 });
    output.addVideoTrack(source);
    await output.start(); check();
    stageTimingsMs.initialization=clock()-exportBegan;
    let firstTimestamp = null, endTime = 0, frames = 0;
    let waitingForSampleAt=clock();
    for await (const sample of sink.samples()) {
      stageTimingsMs.sampleReadWait+=clock()-waitingForSampleAt;
      lastFrame?.close();lastFrame=sample;
      check();
      if (!(sample.duration > 0) || !Number.isFinite(sample.timestamp)) throw new Error('The camera video has invalid frame timing. Save the original for review.');
      firstTimestamp ??= sample.timestamp;
      const time = sample.timestamp - firstTimestamp;
      const renderAt=clock();renderer.draw(ctx,sample,time);stageTimingsMs.render+=clock()-renderAt;
      const encodeAt=clock();await source.add(time, sample.duration);stageTimingsMs.encodeSubmitWait+=clock()-encodeAt;check();
      frames++; endTime = time + sample.duration;
      onProgress(Math.min(.94, .94 * endTime / Math.max(sourceDuration, .01)));
      // The main-thread fallback yields to page interaction. An independent
      // worker already awaits decoder/encoder capacity and needs no UI timers.
      if (executionContext!=='worker'&&frames % 8 === 0){const yieldAt=clock();await yieldControl();stageTimingsMs.cooperativeYieldWait+=clock()-yieldAt;}
      waitingForSampleAt=clock();
    }
    stageTimingsMs.sampleReadWait+=clock()-waitingForSampleAt;
    if (!frames) throw new Error('The original video contained no decodable frames.');
    const cardAt=clock();
    drawCountedVideo(ctx, lastFrame, layout, { time: endTime, changes, finalCount, duration, completed, result: true });
    lastFrame.close();lastFrame=null;
    // The result picture is static: hold it for two seconds instead of
    // encoding ~60 identical copies. Every original camera frame stays intact.
    check();await source.add(endTime,RESULT_CARD_SECONDS);check();stageTimingsMs.resultCard=clock()-cardAt;onProgress(.99);
    const finalizeAt=clock();source.close();await output.finalize();stageTimingsMs.finalize=clock()-finalizeAt;
    finalized = true; check(); onProgress(1);
    return { blob: new Blob([output.target.buffer], { type: 'video/mp4' }), width: layout.width,
      height: layout.height, resultCardSeconds: RESULT_CARD_SECONDS,
      exportInfo: { revision: SHARE_VIDEO_REVISION, path: 'offline-frame-encoding', codec: 'avc',
        requestedBitrate: bitrate, sourceWidth: width, sourceHeight: height,
        sourceFrames: frames, sourceDuration: endTime, sourceAverageFps: frames / endTime,
        encodedSourceFrames: frames,resultCardFrames:1,resultCardSeconds:RESULT_CARD_SECONDS,encodedFrames:frames+1,
        executionContext,preparationMs:clock()-exportBegan,stageTimingsMs,
        timingMeasurement:'Elapsed pipeline waits; not isolated hardware execution or power measurements',
        renderer:'Cached typography; camera picture rendered for every source frame',
        timing: 'Original camera presentation timestamps; static result card held for two seconds' } };
  } finally {
    signal?.removeEventListener('abort', cancel);
    lastFrame?.close();
    if (!finalized) await output?.cancel().catch(() => {});
    input.dispose();
  }
}

