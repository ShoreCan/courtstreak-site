import { createCrossoverCounter } from './crossoverCounter.mjs';
import { geometry } from './poundCore.mjs';

export const BETWEEN_LEGS_DRILL_KEY = 'stationary-between-legs';
export const BETWEEN_LEGS_RECOVERY_REVISION = 'BETWEEN LEGS 02';
export const BETWEEN_LEGS_PROPORTIONS_REVISION = 'BETWEEN LEGS 03';
export const BETWEEN_LEGS_OCCLUSION_REVISION = 'BETWEEN LEGS 04';
export const BETWEEN_LEGS_CONTINUITY_REVISION = 'BETWEEN LEGS 05';
export function betweenLegsOptions(revision) {
  const recoverContinuity = revision === BETWEEN_LEGS_CONTINUITY_REVISION;
  const recoverOcclusions = revision === BETWEEN_LEGS_OCCLUSION_REVISION || recoverContinuity;
  return {
    recoverReceipt: recoverOcclusions || [BETWEEN_LEGS_RECOVERY_REVISION, BETWEEN_LEGS_PROPORTIONS_REVISION].includes(revision),
    adaptiveStance: recoverOcclusions || revision === BETWEEN_LEGS_PROPORTIONS_REVISION,
    recoverFloor: recoverOcclusions,
    recoverFastRedirect: recoverOcclusions,
    recoverContinuity,
  };
}
const EVIDENCE_WINDOW_SECONDS = 2.2;
const FRONT_BOUNCE_MARGIN_DIAMETERS = .28;
const BORDERLINE_BOUNCE_MARGIN_DIAMETERS = .15;
const APPROACH_SCALE_RATIO = 1.04;

function landmark(person, index) {
  const point = person?.xy?.[index];
  return person?.confidence?.[index] >= .4 && point?.length === 2 &&
    point.every(value => Number.isFinite(value) && value > 0) ? point : null;
}

function evidenceAt(row, person, adaptiveStance) {
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
    const opening = right - left;
    const inset = adaptiveStance ? Math.min(diameter * .2, opening * .2) : diameter * .2;
    if (adaptiveStance ? opening > 0 : opening >= diameter * .8) {
      inLegGap = (adaptiveStance || y >= Math.max(knees[0][1], knees[1][1]) - diameter * .25) &&
        x >= left + inset && x <= right - inset;
      // A front crossover can overlap the gap horizontally. Compare the
      // ball center at the turn with the projected ankle line at that x.
      // Allow some margin for pose jitter and camera pitch.
      const [nearLeft, nearRight] = [...ankles].sort((a, b) => a[0] - b[0]);
      if (nearRight[0] - nearLeft[0] >= (adaptiveStance ? Number.EPSILON : diameter * .8)) {
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
  constructor(revision, { recoverReceipt = false, adaptiveStance = false, recoverFloor = false, recoverFastRedirect = false, recoverContinuity = false } = {}) {
    this.recoverReceipt = recoverReceipt;
    this.adaptiveStance = adaptiveStance;
    this.recoverFloor = recoverFloor;
    this.recoverContinuity = recoverContinuity;
    this.floorCandidate = null;
    this.transfer = createCrossoverCounter(revision, { fastRedirect: recoverFastRedirect });
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
      const background = this.recoverContinuity && reason === 'background_memory';
      if (reason !== 'size_ratio' && !background) continue;
      const candidate = observations.balls?.[candidateIndex];
      if (!(candidate?.score >= (background ? .40 : .08))) continue;
      const { center, diameter } = geometry(candidate);
      const [x, y] = center;
      const [left, top, right, bottom] = candidate.box;
      const aspect = (right - left) / (bottom - top);
      if (aspect < .72 || aspect > 1.4 || diameter < Math.max(floorSize * .72, flight.diameter * .65) ||
          diameter > Math.min(floorSize * 1.2, flight.diameter * 1.5) ||
          (x - floorX) * direction < floorSize * .35 || floorY - y < floorSize * .5) continue;

      const wristDistance = Math.hypot(x - target[0], y - target[1]);
      if (wristDistance > diameter * (background ? .85 : 1.05) ||
          source && Math.hypot(x - source[0], y - source[1]) - wristDistance < diameter * .25) continue;
      if (receipt && Math.hypot(x - receipt[0], y - receipt[1]) > floorSize * .45) return null;
      receipt ??= [x, y, diameter];
    }
    return receipt;
  }

  floorBall(measurement, person, now, observations) {
    const flight = this.transfer.flight;
    const source = flight?.source ?? this.transfer.held;
    const last = flight?.last ?? source;
    if (!source || !last?.measurement || now - source.time > .34 || now - last.time > .19) return null;

    const decisions = observations?.decisions ?? [];
    const selected = observations?.selected;
    if (measurement && (!selected || selected.score >= .12)) return null;

    const [startX, startY, diameter] = source.measurement;
    const target = landmark(person, source.owner.hand === 'left' ? 10 : 9);
    const hips = [landmark(person, 11), landmark(person, 12)];
    const targetX = target?.[0] ?? (hips.every(Boolean) ? (hips[0][0] + hips[1][0]) / 2 : null);
    if (targetX === null || Math.abs(targetX - startX) < diameter) return null;
    const direction = Math.sign(targetX - startX);
    let floorBall = null;
    for (const { candidateIndex, reason } of decisions) {
      if (reason !== 'background_memory') continue;
      const ball = observations.balls?.[candidateIndex];
      if (!(ball?.score >= .45)) continue;
      const { center: [x, y], diameter: size } = geometry(ball);
      const [left, top, right, bottom] = ball.box;
      const aspect = (right - left) / (bottom - top);
      const replacesPartial = measurement && measurement[2] < size * .75 &&
        Math.hypot(x - measurement[0], y - measurement[1]) < size * .65;
      if (aspect < .72 || aspect > 1.4 || size < diameter * .75 || size > diameter * 1.35 ||
          (x - startX) * direction < diameter * .55 ||
          (x - targetX) * direction > diameter * .5 ||
          y - startY < diameter * .9 || y - last.measurement[1] < diameter * .22 ||
          measurement && y - measurement[1] < diameter * .5 && !replacesPartial) continue;
      const candidate = [x, y, size];
      const { inLegGap, ankleOffset } = evidenceAt({ measurement: candidate }, person, this.adaptiveStance);
      if (!inLegGap || !Number.isFinite(ankleOffset) || ankleOffset < -.95 ||
          ankleOffset > FRONT_BOUNCE_MARGIN_DIAMETERS) continue;
      if (floorBall) return null;
      floorBall = { measurement: candidate, direction, time: now };
    }
    return floorBall;
  }

  observeAscent(measurement, observations) {
    const { measurement: [floorX, floorY, floorSize], direction } = this.floorCandidate;
    const followsTurn = candidate => {
      const [x, y, size] = candidate;
      const dx = (x - floorX) * direction;
      const rise = floorY - y;
      return size >= floorSize * .7 && size <= floorSize * 1.35 &&
        dx >= floorSize * -.12 && rise >= floorSize * .18 &&
        Math.hypot(dx, rise) <= floorSize * 2.3;
    };
    if (measurement && followsTurn(measurement)) return measurement;
    let ascent = null;
    for (const { candidateIndex, reason } of observations?.decisions ?? []) {
      if (reason !== 'jump_from_last' && reason !== 'prediction_envelope') continue;
      const ball = observations.balls?.[candidateIndex];
      if (!(ball?.score >= .17)) continue;
      const { center, diameter } = geometry(ball);
      const [left, top, right, bottom] = ball.box;
      const aspect = (right - left) / (bottom - top);
      const candidate = [...center, diameter];
      if (aspect < .72 || aspect > 1.4 || !followsTurn(candidate)) continue;
      if (ascent) return null;
      ascent = candidate;
    }
    return ascent;
  }

  ascentFloorScale(input, floor, flight, now, observations) {
    const sample = this.observations.get(floor?.time);
    if (!input || !flight || !floor || !sample?.inLegGap || now <= floor.time || now - floor.time > .40 ||
        !(observations?.selected?.score >= .04)) return null;
    const [x, y, diameter] = input;
    const [floorX, floorY, floorDiameter] = floor.measurement;
    const direction = Math.sign(floorX - flight.source.measurement[0]);
    if (diameter >= flight.diameter * .65 || diameter < floorDiameter * .72 ||
        (x - floorX) * direction < floorDiameter * .15 || floorY - y < floorDiameter * .25 ||
        y > flight.last.measurement[1] + floorDiameter * .12 ||
        Math.hypot(x - floorX, y - floorY) > floorDiameter * 3) return null;
    return floorDiameter;
  }

  update(proposals, measurement, person, now, deadline, observations) {
    const previousFrame = this.transfer.frame;
    // Use a detector proposal only as receipt evidence for this bounce.
    // The shared identity track and the observed-floor requirement stay intact.
    const receipt = this.recoverReceipt && !measurement ? this.receivingBall(person, now, observations) : null;
    // A rejected floor proposal is provisional until a second observation
    // shows upward motion on the same path. Neither box enters ball identity.
    let input = measurement ?? receipt;
    if (this.floorCandidate) {
      const pending = this.floorCandidate;
      if (this.transfer.flight?.peak.time === pending.time) {
        input = now - pending.time <= .19 ? this.observeAscent(input, observations) : null;
      } else {
        this.floorCandidate = null;
      }
    }
    if (this.recoverFloor && now >= 0 && now < deadline && !this.floorCandidate && !this.transfer.flight?.floor) {
      this.floorCandidate = this.floorBall(measurement, person, now, observations);
      if (this.floorCandidate) input = this.floorCandidate.measurement;
    }
    const flight = this.transfer.flight;
    // A release box can look larger as the hand passes in front of the
    // body. Compare a rising sample to the observed ball at the floor
    // only while it follows that same path, using the real box unchanged.
    const pendingFloor = this.floorCandidate && flight?.peak.time === this.floorCandidate.time ? flight.peak : null;
    const floor = flight?.floor ?? pendingFloor;
    const floorScale = this.recoverContinuity && input === measurement &&
      this.ascentFloorScale(input, floor, flight, now, observations);
    const recoveredFloor = this.floorCandidate?.time === now;
    const transfers = this.transfer.update(proposals, input, person, now, deadline,
      floorScale ? {...observations, observedAscentFloorScale: floorScale} : observations);
    if (this.floorCandidate &&
        (this.transfer.flight?.floor || this.transfer.flight?.peak.time !== this.floorCandidate.time)) {
      this.floorCandidate = null;
    }
    if (this.transfer.frame === previousFrame) return [];
    this.lastDecision = null;

    const row = this.transfer.context.at(-1);
    // Floor-only observations may support the underlying turn, but the
    // projected gap still needs a ball location and paired pose at that time.
    if (row.measurement) {
      const evidence = evidenceAt(row, person, this.adaptiveStance);
      if (recoveredFloor) evidence.recoveredFloor = true;
      this.observations.set(row.time, evidence);
    }
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
        (this.adaptiveStance || (Math.abs(startSide) >= .25 && Math.abs(endSide) >= .25)) && startSide * endSide < 0;

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
        ...(floor.recoveredFloor ? {floor_evidence: 'motion_verified_background_candidate'} : {}),
        leg_path_evidence: 'observed_floor_turn_aligned_with_projected_leg_gap',
      };
      this.lastDecision = 'controlled_between_legs';
      this.confirmed.push(event);
      return [event];
    });
  }
}
