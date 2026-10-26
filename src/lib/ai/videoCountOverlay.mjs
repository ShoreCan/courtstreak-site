export const VIDEO_OVERLAY_REVISION = 'VIDEO 01';
export const RESULT_CARD_SECONDS = 2;

// Display changes use acceptance time, never an estimated earlier bounce time.
export class DisplayedCountTimeline {
  constructor() { this.startedAt = null; this.changes = []; }
  start(at) { this.startedAt = at; this.changes = [{ time: 0, count: 0 }]; }
  record(count, at) {
    if (this.startedAt === null || !Number.isInteger(count) || count < 0) return;
    if (this.changes.at(-1)?.count === count) return;
    this.changes.push({ time: Math.max(0, at - this.startedAt), count });
  }
  snapshot() { return this.changes.map(change => ({ ...change })); }
}

export function countAtTime(changes, time) {
  let count = 0, changedAt = -Infinity, delta = 0;
  for (const change of changes) {
    if (change.time > time) break;
    delta = change.count - count; count = change.count; changedAt = change.time;
  }
  return { count, pulse: delta > 0 && time - changedAt < .28, delta };
}

export function shareVideoLayout(width, height) {
  if (!(width > 0 && height > 0)) throw new Error('The recorded video has no picture.');
  const scale = Math.min(1, 720 / Math.min(width, height), 1280 / Math.max(width, height));
  const even = value => Math.max(2, Math.round(value / 2) * 2);
  const pictureWidth = even(width * scale), pictureHeight = even(height * scale);
  const unit = Math.min(pictureWidth, pictureHeight) / 720;
  const top = even(78 * unit), bottom = even(132 * unit);
  return { width: pictureWidth, height: pictureHeight + top + bottom,
    picture: { x: 0, y: top, width: pictureWidth, height: pictureHeight }, top, bottom, unit };
}

const navy = '#101e31', orange = '#ffa46b', white = '#f5f7fb', muted = '#a5b6cb';
export function drawCameraPicture(ctx,source,picture){
  const p=picture;
  if(typeof source.draw==='function')source.draw(ctx,p.x,p.y,p.width,p.height);
  else ctx.drawImage(source,p.x,p.y,p.width,p.height);
}
function text(ctx, value, x, y, size, weight = 600, color = white, align = 'left') {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(String(value), x, y);
}

// Add bands around the whole camera picture; leave the ball/hands/floor visible.
export function drawCountedVideo(ctx, source, layout, { time = 0, changes = [], finalCount = 0,
  duration = 20, completed = true, result = false } = {}) {
  const { width: w, height: h, picture: p, unit: u, top } = layout;
  const pad = 26 * u, cx = w / 2;
  ctx.save(); ctx.fillStyle = navy; ctx.fillRect(0, 0, w, h);
  drawCameraPicture(ctx,source,p);
  if (result) {
    ctx.fillStyle = 'rgba(10,22,39,.94)'; ctx.fillRect(0, 0, w, h);
    const cy = h / 2;
    text(ctx, 'COURTSTREAK', cx, cy - 155 * u, 26 * u, 800, orange, 'center');
    text(ctx, completed ? 'ROUND COMPLETE' : 'INCOMPLETE ATTEMPT', cx, cy - 95 * u, 17 * u, 700, muted, 'center');
    text(ctx, finalCount, cx, cy + 45 * u, 136 * u, 800, white, 'center');
    text(ctx, completed ? 'DETECTED REPS' : 'PARTIAL COUNT', cx, cy + 84 * u, 20 * u, 700, orange, 'center');
    text(ctx, 'Right-Hand Pound', cx, cy + 144 * u, 24 * u, 600, white, 'center');
    text(ctx, completed ? '20-second round · Final count after review' : 'Stopped early · Final partial count',
      cx, cy + 177 * u, 15 * u, 500, muted, 'center');
    ctx.restore(); return;
  }
  text(ctx, 'COURTSTREAK', pad, 32 * u, 23 * u, 800);
  text(ctx, 'RIGHT-HAND POUND', pad, 58 * u, 12 * u, 600, muted);
  const seconds = Math.max(0, Math.ceil(duration - time));
  text(ctx, `00:${String(seconds).padStart(2, '0')}`, w - pad, 35 * u, 30 * u, 700, white, 'right');
  text(ctx, 'SECONDS LEFT', w - pad, 57 * u, 10 * u, 600, muted, 'right');
  ctx.fillStyle = '#25374e'; ctx.fillRect(0, top - 2 * u, w, 2 * u);
  const state = countAtTime(changes, time), base = p.y + p.height;
  text(ctx, state.count, pad, base + 86 * u, 80 * u, 800, state.pulse ? '#ffffff' : orange);
  text(ctx, 'DETECTED REPS', pad, base + 112 * u, 12 * u, 700, muted);
  if (state.pulse) text(ctx, `+${state.delta}`, w - pad, base + 54 * u, 22 * u, 700, orange, 'right');
  text(ctx, completed ? '20-SECOND ROUND' : 'PARTIAL ATTEMPT', w - pad, base + 88 * u, 13 * u, 700, white, 'right');
  text(ctx, 'Counted by CourtStreak', w - pad, base + 111 * u, 12 * u, 500, muted, 'right');
  ctx.fillStyle = orange; ctx.fillRect(0, h - 4 * u, w * Math.min(1, Math.max(0, time / duration)), 4 * u);
  ctx.restore();
}
