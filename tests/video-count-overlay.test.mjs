import test from 'node:test';
import assert from 'node:assert/strict';
import { DisplayedCountTimeline, countAtTime, shareVideoLayout, drawCountedVideo } from '../src/lib/ai/videoCountOverlay.mjs';
import { createCountedVideo } from '../src/lib/ai/countedVideoExport.mjs';

test('saved counter waits for acceptance rather than the earlier bounce time', () => {
  const timeline = new DisplayedCountTimeline(); timeline.record(5, 99);
  timeline.start(100); timeline.record(1, 101.37); timeline.record(1, 101.9);
  assert.equal(countAtTime(timeline.snapshot(), 1.25).count, 0);
  assert.equal(countAtTime(timeline.snapshot(), 1.38).count, 1);
  assert.equal(timeline.snapshot().length, 2);
});
test('review confirmation cannot backdate a count into the completed clip', () => {
  const timeline = new DisplayedCountTimeline(); timeline.start(50);
  timeline.record(19, 69.7); timeline.record(20, 70.4);
  assert.equal(countAtTime(timeline.snapshot(), 20).count, 19);
  assert.equal(countAtTime(timeline.snapshot(), 20.5).count, 20);
});
test('new round resets its clock and snapshots cannot mutate live counts', () => {
  const timeline = new DisplayedCountTimeline(); timeline.start(10); timeline.record(3, 12);
  const previous = timeline.snapshot(); previous[1].count = 99;
  assert.equal(timeline.snapshot()[1].count, 3);
  timeline.start(30); assert.deepEqual(timeline.snapshot(), [{ time: 0, count: 0 }]);
});
test('portrait, landscape and tablet layouts retain the complete camera picture', () => {
  for (const [width, height] of [[720, 1280], [1280, 720], [1920, 1080], [768, 1024]]) {
    const layout = shareVideoLayout(width, height);
    assert.ok(Math.abs(layout.picture.width / layout.picture.height - width / height) < .005);
    assert.equal(layout.picture.x, 0); assert.equal(layout.picture.y, layout.top);
    assert.equal(layout.height, layout.top + layout.picture.height + layout.bottom);
    assert.equal(layout.width % 2, 0); assert.equal(layout.height % 2, 0);
  }
});
function context() {
  return { words: [], pictures: [], save() {}, restore() {}, fillRect() {},
    fillText(value) { this.words.push(String(value)); }, drawImage(...args) { this.pictures.push(args); } };
}
test('graphics preserve the source and clearly label detections and partial results', () => {
  const ctx = context(), source = {}, layout = shareVideoLayout(720, 1280);
  drawCountedVideo(ctx, source, layout, { time: 5, changes: [{ time: 3, count: 4 }], finalCount: 8 });
  assert.deepEqual(ctx.pictures[0], [source, 0, layout.top, 720, 1280]);
  assert.ok(ctx.words.includes('4')); assert.ok(ctx.words.includes('DETECTED REPS')); assert.ok(!ctx.words.includes('8'));
  ctx.words = [];
  drawCountedVideo(ctx, source, layout, { finalCount: 8, result: true, completed: false });
  assert.ok(ctx.words.includes('8')); assert.ok(ctx.words.includes('INCOMPLETE ATTEMPT'));
  assert.ok(ctx.words.includes('PARTIAL COUNT')); assert.ok(!ctx.words.includes('ROUND COMPLETE'));
});

function environment({ recordingError = false, badCodec = false } = {}) {
  const ctx = context(); let now = 0, nextId = 0, trackStops = 0;
  const callbacks = new Map();
  class Video extends EventTarget {
    constructor() { super(); this.readyState = 0; this.currentTime = 0; this.videoWidth = 720; this.videoHeight = 1280; this.duration = 20; this.muted = false; }
    load() { this.readyState = 2; this.currentTime = 0; this.dispatchEvent(new Event('loadeddata')); }
    play() { this.playing = true; return Promise.resolve(); }
    pause() { this.playing = false; }
  }
  const video = new Video(), document = new EventTarget(); document.hidden = false;
  const canvas = { getContext: () => ctx, captureStream: () => ({ getTracks: () => [{ stop: () => trackStops++ }] }) };
  class Recorder {
    static isTypeSupported(type) { return type === 'video/mp4'; }
    constructor(stream, options = {}) { this.mimeType = options.mimeType || 'video/webm'; this.state = 'inactive'; }
    start() { if (badCodec && this.mimeType === 'video/mp4') throw new Error('codec refused'); this.state = 'recording'; }
    stop() { this.state = 'inactive'; if (recordingError) this.onerror?.(); this.ondataavailable?.({ data: new Blob(['encoded-counter'], { type: this.mimeType }) }); this.onstop?.(); }
  }
  const options = { video, canvas, document, Recorder, sourceURL: 'blob:untouched-original',
    changes: [{ time: 0, count: 0 }, { time: 1.5, count: 1 }, { time: 20.5, count: 2 }], finalCount: 2, completed: true,
    clock: () => now, requestFrame: cb => { callbacks.set(++nextId, cb); return nextId; }, cancelFrame: id => callbacks.delete(id) };
  return { options, ctx, video, document, trackStops: () => trackStops, pending: () => callbacks.size,
    tick(milliseconds, mediaTime) { now = milliseconds; video.currentTime = mediaTime;
      const entry = callbacks.entries().next().value; assert.ok(entry, 'a frame was scheduled'); callbacks.delete(entry[0]); entry[1](); } };
}
test('export plays once then appends the reviewed final count for two seconds', async () => {
  const env = environment(), progress = [];
  const result = createCountedVideo({ ...env.options, onProgress: value => progress.push(value) });
  await Promise.resolve(); env.tick(1000, 1); assert.ok(env.ctx.words.includes('0'));
  env.ctx.words = []; env.tick(1600, 1.6); assert.ok(env.ctx.words.includes('1'));
  env.video.dispatchEvent(new Event('ended')); env.ctx.words = [];
  env.tick(2000, 20); assert.ok(env.ctx.words.includes('2')); assert.ok(env.ctx.words.includes('ROUND COMPLETE'));
  env.tick(3600, 20);
  const exported = await result;
  assert.equal(exported.blob.type, 'video/mp4'); assert.equal(exported.resultCardSeconds, 2);
  assert.equal(env.trackStops(), 1); assert.equal(env.pending(), 0);
  assert.equal(env.video.muted, false); assert.equal(env.video.playing, false);
  assert.equal(env.video.src, 'blob:untouched-original'); assert.equal(progress.at(-1), 1);
});
test('unsupported advertised codec falls back without changing the source', async () => {
  const env = environment({ badCodec: true }), result = createCountedVideo(env.options);
  await Promise.resolve(); env.video.dispatchEvent(new Event('ended')); env.tick(2000, 20);
  assert.equal((await result).blob.type, 'video/webm'); assert.equal(env.trackStops(), 1);
});
test('cancelling releases only the export capture track', async () => {
  const env = environment(), controller = new AbortController();
  const result = createCountedVideo({ ...env.options, signal: controller.signal });
  const rejected = assert.rejects(result, { name: 'AbortError' });
  await Promise.resolve(); controller.abort(); await rejected;
  assert.equal(env.trackStops(), 1); assert.equal(env.pending(), 0);
});
test('backgrounding fails visibly rather than publishing a frozen counter video', async () => {
  const env = environment(), result = createCountedVideo(env.options);
  const rejected = assert.rejects(result, /Keep CourtStreak open/);
  await Promise.resolve(); env.document.hidden = true; env.document.dispatchEvent(new Event('visibilitychange'));
  await rejected; assert.equal(env.trackStops(), 1); assert.equal(env.pending(), 0);
});
test('a stalled source does not produce a successful share video', async () => {
  const env = environment(), result = createCountedVideo(env.options);
  const rejected = assert.rejects(result, /preparation paused/);
  await Promise.resolve(); env.tick(0, 0); env.tick(6100, 0);
  await rejected; assert.equal(env.trackStops(), 1);
});
test('encoding errors cannot publish a falsely successful video', async () => {
  const env = environment({ recordingError: true }), result = createCountedVideo(env.options);
  const rejected = assert.rejects(result, /could not prepare/);
  await Promise.resolve(); env.video.dispatchEvent(new Event('ended')); env.tick(2000, 20);
  await rejected; assert.equal(env.trackStops(), 1);
});
test('missing canvas recording leaves the original available', async () => {
  const env = environment();
  await assert.rejects(createCountedVideo({ ...env.options, canvas: {} }), /unavailable/);
  assert.equal(env.trackStops(), 0); assert.equal(env.video.src, undefined);
});
