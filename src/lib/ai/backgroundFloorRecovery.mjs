import {poundHandConflict} from './poundHandEvidence.mjs';

const closeToRightHand = row => row?.measurement && row.handDistance != null &&
 row.handDistance <= 1.1 && (row.otherHandDistance == null || row.otherHandDistance - row.handDistance >= .2);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// This proof uses a rejected box only as a floor observation. It never feeds
// that box back into identity selection, wrist evidence, or floor learning.
export class BackgroundFloorRecovery {
 constructor() {
  this.pending = null;
 }

 update(context, observations, diameter, deadline) {
  const row = context.at(-1);
  if (!row || row.time < 0 || !(diameter > 0)) return [];
  const d = diameter;
  const pending = this.pending;
  if (pending) {
   const {floor, source, receipts} = pending;
   const ball = row.measurement;
   if (row.time - floor.time > .48 || row.time > deadline + .15) {
    this.pending = null;
   } else if (ball && row.time > floor.time) {
    // A later descent ends this cycle, even if the first receipt was missed.
    if (floor.y - pending.high >= d * .7 && ball[1] - pending.high >= d * .25) {
     this.pending = null;
    } else {
     pending.high = Math.min(pending.high, ball[1]);
     const y = ball[1];
     const conflict = poundHandConflict({
      event_timestamp_exact: floor.time, bottom_center_y: floor.y, ball_scale_pixels: d,
     }, context);
     if (conflict) {
      this.pending = null;
     } else if (closeToRightHand(row) && floor.y - y >= d * .9 && Math.abs(ball[0] - floor.x) <= d * 1.2) {
      const controlled = receipts.some(prior => {
       const dt = row.time - prior.time;
       const offset = r => r.measurement.slice(0, 2).map((v, i) => v - r.hands.right[i]);
       return dt >= .018 && dt <= .16 && prior.hands?.right && row.hands?.right &&
        distance(prior.measurement, ball) <= d * .6 && distance(offset(prior), offset(row)) <= d * .3;
      });
      if (controlled) {
       this.pending = null;
       return [{
        event_frame: floor.frame, event_timestamp_exact: floor.time, event_time_seconds: floor.time,
        floor_contact_time_seconds: floor.time, release_time_seconds: source.time,
        from_hand: 'right', to_hand: 'right', validation_path: 'background_overlap_floor',
        control_evidence: 'observed_hand_control', floor_evidence: 'observed_ball_and_feet',
       }];
      }
      receipts.push(row);
     }
    }
   }
  }

  if (this.pending || row.time >= deadline || row.feetY == null || !observations) return [];
  const recent = context.slice(0, -1).filter(r => r.measurement && row.time - r.time <= .32);
  const [before, last] = recent.slice(-2);
  if (!before || !last || row.time - last.time > .17 || last.time - before.time > .13 ||
      last.measurement[1] - before.measurement[1] < d * .12) return [];
  const source = recent.findLast(closeToRightHand);
  if (!source) return [];
  const floors = observations.decisions.flatMap(decision => {
   if (decision.reason !== 'background_memory') return [];
   const c = observations.balls[decision.candidateIndex];
   if (!c?.box || c.score < .12) return [];
   const [x1, y1, x2, y2] = c.box;
   const width = x2 - x1, height = y2 - y1;
   const size = Math.sqrt(width * height);
   const x = (x1 + x2) / 2, y = (y1 + y2) / 2;
   const dy = y - last.measurement[1];
   if (size < d * .85 || size > d * 1.3 || width / height < .7 || width / height > 1.6 ||
       Math.abs(x - last.measurement[0]) > d * .55 || dy < d * .6 || dy > d * 3.3 ||
       y - source.measurement[1] < d * 1.1 ||
       y2 < row.feetY - d * .3 || y2 > row.feetY + d * 1.25) return [];
   return [{x, y, frame: row.frame, time: row.time}];
  });
  if (floors.length === 1) {
   const floor = floors[0];
   // Do not override a competing selected ball at the floor.
   if (row.measurement && Math.abs(row.measurement[1] - floor.y) <= d * .7) return [];
   this.pending = {floor, source, receipts: [], high: floor.y};
  }
  return [];
 }
}
