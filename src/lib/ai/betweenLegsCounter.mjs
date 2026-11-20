import { createCrossoverCounter } from './crossoverCounter.mjs';
import { geometry } from './poundCore.mjs';

export const BETWEEN_LEGS_DRILL_KEY = 'stationary-between-legs';
export const BETWEEN_LEGS_RECOVERY_REVISION = 'BETWEEN LEGS 02';
const EVIDENCE_WINDOW_SECONDS = 2.2;
const FRONT_BOUNCE_MARGIN_DIAMETERS = .28;
const BORDERLINE_BOUNCE_MARGIN_DIAMETERS = .15;
const APPROACH_SCALE_RATIO = 1.04;

function landmark(person, index) {
  const point = person?.xy?.[index];
  return person?.confidence?.[index] >= .4 && point?.length === 2 &&
    point.every(value => Number.isFinite(value) && value > 0) ? point : null;
}

function evidenceAt(row, person) {
  const [x, y, diameter] = row.measurement;
  const hips = [landmark(person, 11), landmark(person, 12)];
  const knees = [landmark(person, 13), landmark(person, 14)];
  const ankles = [landmark(person, 15), landmark(person, 16)];
  const hipCenter = hips.every(Boolean) ? (hips[0][0] + hips[1][0]) / 2 : null;
  const side = hipCenter === null ? null : (x - hipCenter) / diameter;

  // Use the lower-leg positions at the ball's height. An image-space gap is
  // supporting evidence in this selected drill. It cannot establish depth.
  let inLegGap = null;
  let ankleOffset = null;
  if (knees.every(Boolean) && ankles.every(Boolean) &&
      ankles.every((ankle, index) => ankle[1] > knees[index][1])) {
    const [left, right] = knees.map(([kx, ky], index) => {
      const [ax, ay] = ankles[index];
      const fraction = Math.max(0, Math.min(1, (y - ky) / (ay - ky)));
      return kx + (ax - kx) * fraction;
    }).sort((a, b) => a - b);
    if (right - left >= diameter * .8) {
      inLegGap = y >= Math.max(knees[0][1], knees[1][1]) - diameter * .25 &&
        x >= left + diameter * .2 && x <= right - diameter * .2;
      // A front crossover can overlap the gap horizontally. Compare the
      // ball center at the turn with the projected ankle line at that x.
      // Allow some margin for pose jitter and camera pitch.
      const [nearLeft, nearRight] = [...ankles].sort((a, b) => a[0] - b[0]);
      if (nearRight[0] - nearLeft[0] >= diameter * .8) {
        const fraction = Math.max(0, Math.min(1, (x - nearLeft[0]) / (nearRight[0] - nearLeft[0])));
        const ankleY = nearLeft[1] + (nearRight[1] - nearLeft[1]) * fraction;
        ankleOffset = (y - ankleY) / diameter;
      } else {
        inLegGap = null;
      }
    }
  }
  return { side, inLegGap, ankleOffset, diameter };
}

export class BetweenLegsCounter {
  constructor(revision, { recoverReceipt = false } = {}) {
    this.recoverReceipt = recoverReceipt;
    this.transfer = createCrossoverCounter(revision);
    this.observations = new Map();
    this.count = 0;
    this.confirmed = [];
    this.pathRejections = [];
    this.lastDecision = null;
  }

  get context() { return this.transfer.context; }
  get pending() { return this.transfer.pending; }
  get rejected() { return [...this.transfer.rejected, ...this.pathRejections]; }

  shiftPreGo(seconds) {
    this.observations = new Map([...this.observations].map(([time, sample]) => [time - seconds, sample]));
    this.transfer.pixelFloor?.shiftPreGo(seconds);
  }

  get points() { return this.transfer.points; }
  get proposalsThisFrame() { return this.transfer.proposalsThisFrame; }

  snapshot() {
    const snapshot = this.transfer.snapshot();
    return { ...snapshot, decision: this.lastDecision ?? snapshot.decision };
  }

  receivingBall(person, now, observations) {
    const flight = this.transfer.flight;
    const floor = flight?.floor;
    if (!floor || now - floor.time > .46 || now - flight.lastSeen > .25 ||
        this.observations.get(floor.time)?.inLegGap !== true) return null;

    const fromLeft = flight.source.owner.hand === 'left';
    const target = landmark(person, fromLeft ? 10 : 9);
    const source = landmark(person, fromLeft ? 9 : 10);
    if (!target) return null;

    const [floorX, floorY, floorSize] = floor.measurement;
    const direction = Math.sign(target[0] - floorX);
    if (Math.abs(target[0] - floorX) < floorSize * .4) return null;
    let receipt = null;
    for (const { candidateIndex, reason } of observations?.decisions ?? []) {
      if (reason !== 'size_ratio') continue;
      const candidate = observations.balls?.[candidateIndex];
      if (!(candidate?.score >= .08)) continue;
      const { center, diameter } = geometry(candidate);
      const [x, y] = center;
      const [left, top, right, bottom] = candidate.box;
      const aspect = (right - left) / (bottom - top);
      if (aspect < .72 || aspect > 1.4 || diameter < Math.max(floorSize * .72, flight.diameter * .65) ||
          diameter > Math.min(floorSize * 1.2, flight.diameter * 1.5) ||
          (x - floorX) * direction < floorSize * .35 || floorY - y < floorSize * .5) continue;

      const wristDistance = Math.hypot(x - target[0], y - target[1]);
      if (wristDistance > diameter * 1.05 ||
          source && Math.hypot(x - source[0], y - source[1]) - wristDistance < diameter * .25) continue;
      if (receipt && Math.hypot(x - receipt[0], y - receipt[1]) > floorSize * .45) return null;
      receipt ??= [x, y, diameter];
    }
    return receipt;
  }

  update(proposals, measurement, person, now, deadline, observations) {
    const previousFrame = this.transfer.frame;
    // Use a detector proposal only as receipt evidence for this bounce.
    // The shared identity track and the observed-floor requirement stay intact.
    const receipt = this.recoverReceipt && !measurement ? this.receivingBall(person, now, observations) : null;
    const transfers = this.transfer.update(proposals, measurement ?? receipt, person, now, deadline, observations);
    if (this.transfer.frame === previousFrame) return [];
    this.lastDecision = null;

    const row = this.transfer.context.at(-1);
    // Floor-only observations may support the underlying turn, but the
    // projected gap still needs a ball location and paired pose at that time.
    if (row.measurement) this.observations.set(row.time, evidenceAt(row, person));
    for (const time of this.observations.keys()) {
      if (time >= now - EVIDENCE_WINDOW_SECONDS) break;
      this.observations.delete(time);
    }

    return transfers.flatMap(transfer => {
      const release = this.observations.get(transfer.release_time_seconds);
      const floor = this.observations.get(transfer.floor_contact_time_seconds);
      const receipt = this.observations.get(transfer.event_timestamp_exact);
      const startSide = release?.side;
      const endSide = receipt?.side;
      const changedSides = Number.isFinite(startSide) && Number.isFinite(endSide) &&
        Math.abs(startSide) >= .25 && Math.abs(endSide) >= .25 && startSide * endSide < 0;

      // A sparse frame can catch the ball just before or after the lowest
      // point. For borderline ankle geometry, size growth toward the receipt
      // can corroborate that the ball bounced in front of the player's feet.
      const growsTowardReceipt = receipt && release && floor &&
        receipt.diameter >= release.diameter * APPROACH_SCALE_RATIO && receipt.diameter >= floor.diameter;
      const frontBounce = Number.isFinite(floor?.ankleOffset) &&
        (floor.ankleOffset > FRONT_BOUNCE_MARGIN_DIAMETERS ||
          (floor.ankleOffset > BORDERLINE_BOUNCE_MARGIN_DIAMETERS && growsTowardReceipt));
      if (!changedSides || floor?.inLegGap !== true || frontBounce) {
        const reason = floor?.inLegGap === false ? 'outside_leg_gap'
          : frontBounce ? 'projected_bounce_in_front_of_feet' : 'unclear_leg_path';
        this.lastDecision = reason;
        this.pathRejections.push({ ...transfer, count: null, control_status: reason });
        return [];
      }
      const event = {
        ...transfer,
        count: ++this.count,
        validation_path: 'between_legs',
        leg_path_evidence: 'observed_floor_turn_aligned_with_projected_leg_gap',
      };
      this.lastDecision = 'controlled_between_legs';
      this.confirmed.push(event);
      return [event];
    });
  }
}
