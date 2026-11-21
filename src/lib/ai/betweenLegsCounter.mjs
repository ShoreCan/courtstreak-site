import { createCrossoverCounter } from './crossoverCounter.mjs';
import { geometry } from './poundCore.mjs';

export const BETWEEN_LEGS_DRILL_KEY = 'stationary-between-legs';
export const BETWEEN_LEGS_RECOVERY_REVISION = 'BETWEEN LEGS 02';
export const BETWEEN_LEGS_PROPORTIONS_REVISION = 'BETWEEN LEGS 03';
export const BETWEEN_LEGS_OCCLUSION_REVISION = 'BETWEEN LEGS 04';
export const BETWEEN_LEGS_CONTINUITY_REVISION = 'BETWEEN LEGS 05';
export const BETWEEN_LEGS_REDIRECT_REVISION = 'BETWEEN LEGS 06';
export const BETWEEN_LEGS_CATCH_REVISION = 'BETWEEN LEGS 07';
export const BETWEEN_LEGS_FLOOR_POSE_REVISION = 'BETWEEN LEGS 08';
export const BETWEEN_LEGS_FAST_TURN_REVISION = 'BETWEEN LEGS 09';
export function betweenLegsOptions(revision) {
  const recoverFastTurns = revision === BETWEEN_LEGS_FAST_TURN_REVISION;
  const bridgeFloor = recoverFastTurns || revision === BETWEEN_LEGS_FLOOR_POSE_REVISION;
  const protectCatch = bridgeFloor || revision === BETWEEN_LEGS_CATCH_REVISION;
  const recoverRedirect = protectCatch || revision === BETWEEN_LEGS_REDIRECT_REVISION;
  const recoverContinuity = recoverRedirect || revision === BETWEEN_LEGS_CONTINUITY_REVISION;
  const recoverOcclusions = revision === BETWEEN_LEGS_OCCLUSION_REVISION || recoverContinuity;
  return {
    recoverReceipt: recoverOcclusions || [BETWEEN_LEGS_RECOVERY_REVISION, BETWEEN_LEGS_PROPORTIONS_REVISION].includes(revision),
    adaptiveStance: recoverOcclusions || revision === BETWEEN_LEGS_PROPORTIONS_REVISION,
    recoverFloor: recoverOcclusions,
    recoverFastRedirect: recoverOcclusions,
    recoverContinuity,
    recoverRedirect,
    protectCatch,
    bridgeFloor,
    recoverFastTurns,
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
  constructor(revision, { recoverReceipt = false, adaptiveStance = false, recoverFloor = false, recoverFastRedirect = false, recoverContinuity = false, recoverRedirect = false, protectCatch = false, bridgeFloor = false, recoverFastTurns = false } = {}) {
    this.recoverReceipt = recoverReceipt;
    this.adaptiveStance = adaptiveStance;
    this.recoverFloor = recoverFloor;
    this.recoverContinuity = recoverContinuity;
    this.recoverRedirect = recoverRedirect;
    this.protectCatch = protectCatch;
    this.bridgeFloor = bridgeFloor;
    this.recoverFastTurns = recoverFastTurns;
    this.lastFloorPose = null;
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
    if (this.lastFloorPose) this.lastFloorPose.time -= seconds;
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

  redirectBall(person, now, observations) {
    const flight = this.transfer.flight;
    const floor = flight?.floor;
    const catchRow = flight?.receiving.at(-1);
    if (!floor || !catchRow || catchRow.owner.distance > .45 || now - catchRow.time > .22 ||
        now - floor.time > .58 || !this.observations.get(floor.time)?.inLegGap ||
        !(this.observations.get(catchRow.time)?.detectorScore >= .12)) return null;

    const [fx, fy, diameter] = floor.measurement;
    const [x, y] = catchRow.measurement;
    const direction = Math.sign(x - fx);
    if (Math.abs(x - fx) < diameter || fy - y < diameter ||
        !flight.receiving.slice(0, -1).some(row => row.owner.distance <= 1.15 &&
          row.time >= catchRow.time - .20 &&
          (x - row.measurement[0]) * direction >= diameter * .2 &&
          row.measurement[1] > y + diameter * .2)) return null;

    // A real proposal at the floor can be rejected by the identity tracker
    // when the ball moves inward quickly after the catch. Use it only for
    // this verified bounce-to-wrist-to-redirect sequence.
    let redirect = null;
    for (const {candidateIndex, reason} of observations?.decisions ?? []) {
      const ball = observations.balls?.[candidateIndex];
      if (reason !== 'jump_from_last' || !(ball?.score >= .10)) continue;
      const {center: [bx, by], diameter: size} = geometry(ball);
      const [left, top, right, bottom] = ball.box;
      const aspect = (right - left) / (bottom - top);
      if (aspect < .72 || aspect > 1.4 || size < diameter * .75 || size > diameter * 1.4 ||
          (x - bx) * direction < diameter * 1.3 || (fx - bx) * direction < -diameter * .5 ||
          by - y < diameter * 1.5) continue;
      const measurement = [bx, by, size];
      const {inLegGap, ankleOffset} = evidenceAt({measurement}, person, this.adaptiveStance);
      if (!inLegGap || !Number.isFinite(ankleOffset) || ankleOffset < -.5 ||
          ankleOffset > BORDERLINE_BOUNCE_MARGIN_DIAMETERS) continue;
      if (redirect) return null;
      redirect = {measurement, catchRow};
    }
    return redirect;
  }

  weakFloorJump(measurement, person, now, selected) {
    const flight = this.transfer.flight;
    const floor = flight?.floor;
    const last = flight?.last;
    if (!measurement || !floor || !last?.measurement || !(selected?.score < .02) ||
        last.time <= floor.time || now - last.time > .19 || now - floor.time > .42) return false;
    const [x, y, size] = measurement;
    const [floorX, floorY, diameter] = floor.measurement;
    const [lastX, lastY] = last.measurement;
    const direction = Math.sign(floorX - flight.source.measurement[0]);
    const ankleY = Math.max(landmark(person, 15)?.[1] ?? Infinity, landmark(person, 16)?.[1] ?? Infinity);
    const receivingWrist = landmark(person, flight.source.owner.hand === 'left' ? 10 : 9);
    const reversesAcrossFloor = (lastX - x) * direction > diameter * 1.5 &&
      (floorX - x) * direction > diameter * .6;
    const jumpsBelowWrist = receivingWrist && y - lastY > diameter * .65 &&
      Math.hypot(x - lastX, y - lastY) > diameter * 1.45 &&
      y - receivingWrist[1] > diameter * 1.25;
    // Immediately after a verified turn, a strong rising observation can
    // precede a very weak jump below the original turn and far to the side.
    // Treat that isolated box as missing and still wait for a real receipt.
    if (this.recoverFastTurns && selected.score <= .005 &&
        this.observations.get(floor.time)?.inLegGap &&
        this.observations.get(last.time)?.detectorScore >= .2 &&
        now - last.time <= .075 && now - floor.time <= .095 &&
        floorY - lastY >= diameter * .35 && (lastX - floorX) * direction > 0 &&
        y >= floorY + diameter * .25 && y - lastY >= diameter * .75 &&
        Math.hypot(x - lastX, y - lastY) >= diameter * 1.35 &&
        y + size * .5 >= ankleY - diameter * .65) return true;

    // The prior observations must show a rise toward the receiving side.
    // A weak far-side jump near the floor adds no evidence of a new bounce.
    return (lastX - floorX) * direction > diameter * .3 && floorY - lastY > diameter * .45 &&
      (reversesAcrossFloor || jumpsBelowWrist) &&
      y - lastY > diameter * .4 && y + size * .5 >= ankleY - diameter * .65;
  }

  bridgeFloorPose(input, person, now, selected) {
    const before = this.lastFloorPose;
    const flight = this.transfer.flight;
    const peak = flight?.peak;
    if (!input || !peak || peak.feetY !== null || flight.floor || !before ||
        peak.time <= flight.source.time || peak.time < before.time ||
        peak.time - before.time > .10 || now - peak.time > .10 || !(selected?.score >= .12)) return;

    const diameter = peak.measurement[2];
    if (peak.measurement[1] - input[1] < diameter * .25) return;

    const legIndices = [13, 14, 15, 16];
    if (!legIndices.every(index => {
      const a = landmark(before.person, index), b = landmark(person, index);
      const limit = this.recoverFastTurns && index < 15 &&
        this.observations.get(peak.time)?.detectorScore >= .5 ? .5 : .35;
      return a && b && Math.hypot(a[0] - b[0], a[1] - b[1]) <= diameter * limit;
    })) return;

    // Both real poses must agree on the leg gap and floor for the observed
    // ball turn. Never fill in wrist observations or missing ball positions.
    const prior = evidenceAt(peak, before.person, this.adaptiveStance);
    const after = evidenceAt(peak, person, this.adaptiveStance);
    if (![prior, after].every(evidence => evidence.inLegGap &&
        Number.isFinite(evidence.ankleOffset) && evidence.ankleOffset >= -.5 &&
        evidence.ankleOffset <= BORDERLINE_BOUNCE_MARGIN_DIAMETERS)) return;

    peak.feetY = Math.max(person.xy[15][1], person.xy[16][1]);
    this.observations.set(peak.time, {...after, bridgedFloorPose: true});
  }

  update(proposals, measurement, person, now, deadline, observations) {
    const previousFrame = this.transfer.frame;
    // Use a detector proposal only as receipt evidence for this bounce.
    // The shared identity track and the observed-floor requirement stay intact.
    const receipt = this.recoverReceipt && !measurement ? this.receivingBall(person, now, observations) : null;
    // A rejected floor proposal is provisional until a second observation
    // shows upward motion on the same path. Neither box enters ball identity.
    const redirect = this.recoverRedirect && !measurement && !receipt && now < deadline
      ? this.redirectBall(person, now, observations) : null;
    let input = measurement ?? receipt ?? redirect?.measurement ?? null;
    if (this.protectCatch && this.weakFloorJump(input, person, now, observations?.selected)) input = null;
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
    if (this.bridgeFloor) {
      if (input === measurement) this.bridgeFloorPose(input, person, now, observations?.selected);
      if (now >= 0 && landmark(person, 15) && landmark(person, 16)) this.lastFloorPose = {time: now, person};
    }
    const transfers = this.transfer.update(proposals, input, person, now, deadline,
      floorScale || redirect ? {...observations, observedAscentFloorScale: floorScale || undefined,
        verifiedRedirect: redirect?.catchRow} : observations);
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
      if (this.recoverRedirect && input === measurement) evidence.detectorScore = observations?.selected?.score;
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
        ...(floor.bridgedFloorPose ? {floor_evidence: 'observed_turn_with_bracketing_leg_pose'} : {}),
        leg_path_evidence: 'observed_floor_turn_aligned_with_projected_leg_gap',
      };
      this.lastDecision = 'controlled_between_legs';
      this.confirmed.push(event);
      return [event];
    });
  }
}
