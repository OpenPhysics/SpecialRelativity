/**
 * dopplerGeometry.ts
 *
 * Pure geometry for a light source flying past a stationary observer.
 *
 * ── Retarded, not current, position ───────────────────────────────────────────
 * The light arriving at the observer *now* left the source some time ago, from
 * wherever the source was then. Every quantity here is therefore computed from
 * the **retarded** emission event, found by solving
 *
 *     |observer − source(t_e)| = c · (t − t_e)
 *
 * for t_e. This is not a refinement — it is the difference between right and
 * wrong. Using the source's current position instead would put the "transverse"
 * moment in the wrong place and would not reproduce the transverse redshift by γ,
 * which is the one result on this screen that has no classical counterpart.
 *
 * Geometry: the source travels along the x axis and the observer sits somewhere
 * off it, so the received direction sweeps smoothly from head-on through
 * perpendicular to straight away. The observer's position is a free parameter
 * rather than a constant: moving it changes *when* the transverse moment happens
 * and how sharply the shift swings through it, and that is a thing worth being
 * able to try.
 */

import { Vector2 } from "scenerystack/dot";
import { bolometricBeaming, dopplerFactor, gammaOf, sanitizeBeta } from "../../common/model/lorentz.js";

/**
 * Where the source begins its fly-by: at the far end of the track, so it starts
 * by approaching. A source that began beside the observer could only ever recede.
 */
export const startPosition = (beta: number, halfTrack: number): number => (beta < 0 ? halfTrack : -halfTrack);

/** Source position along the x axis at lab time `time`, in light-seconds. */
export const sourcePositionAt = (time: number, beta: number, halfTrack: number): number =>
  startPosition(beta, halfTrack) + sanitizeBeta(beta) * time;

/** How long one crossing of the track takes; Infinity for a stationary source. */
export const traverseDuration = (beta: number, halfTrack: number): number => {
  const speed = Math.abs(sanitizeBeta(beta));
  return speed === 0 ? Number.POSITIVE_INFINITY : (2 * halfTrack) / speed;
};

/**
 * Lab time at which the light now reaching the observer was emitted.
 *
 * Solving |observer − source(t_e)| = t − t_e for t_e gives a quadratic whose
 * discriminant simplifies to (x_now − x_obs)² + y_obs²/γ² — manifestly
 * non-negative, so the retarded solution always exists. The smaller root is the
 * physical one: the larger corresponds to light that would have to arrive before
 * it was emitted.
 */
export const retardedEmissionTime = (time: number, beta: number, halfTrack: number, observer: Vector2): number => {
  const b = sanitizeBeta(beta);
  const start = startPosition(b, halfTrack);
  const oneMinusBetaSquared = 1 - b * b;
  const currentX = start + b * time;
  const offset = currentX - observer.x;
  const discriminant = offset * offset + (observer.y * observer.y) / gammaOf(b) ** 2;
  return ((start - observer.x) * b + time - Math.sqrt(discriminant)) / oneMinusBetaSquared;
};

export type ReceivedSignal = {
  /** Where the source was when it emitted the light arriving now, in light-seconds. */
  readonly emissionX: number;
  /** Lab time of that emission, in seconds. */
  readonly emissionTime: number;
  /** Distance that light travelled, in light-seconds. */
  readonly travelDistance: number;
  /** Cosine of the angle between the source's velocity and the received ray. */
  readonly cosTheta: number;
  /** That angle itself, in radians, from 0 (head-on) through π/2 to π (receding). */
  readonly theta: number;
  /** Doppler factor D: observed frequency ÷ emitted frequency. */
  readonly doppler: number;
  /** Observed wavelength in nanometres, λ₀/D. */
  readonly observedWavelength: number;
  /** Brightness relative to the same source at rest, D⁴ (see {@link bolometricBeaming}). */
  readonly relativeBrightness: number;
};

/** Everything the observer measures about the light reaching them at `time`. */
export const receivedSignal = (
  time: number,
  beta: number,
  halfTrack: number,
  observer: Vector2,
  emittedWavelength: number,
): ReceivedSignal => {
  const b = sanitizeBeta(beta);
  const emissionTime = retardedEmissionTime(time, b, halfTrack, observer);
  const emissionX = sourcePositionAt(emissionTime, b, halfTrack);
  const travelDistance = Math.max(time - emissionTime, Number.EPSILON);

  // The received ray runs from (emissionX, 0) to the observer; its component
  // along the +x axis is (x_obs − emissionX)/R. Using the signed β with this
  // signed cosine means one formula covers both directions of travel.
  const cosTheta = Math.max(-1, Math.min(1, (observer.x - emissionX) / travelDistance));
  const doppler = dopplerFactor(b, cosTheta);

  return {
    emissionX,
    emissionTime,
    travelDistance,
    cosTheta,
    theta: Math.acos(cosTheta),
    doppler,
    observedWavelength: emittedWavelength / doppler,
    relativeBrightness: bolometricBeaming(b, cosTheta),
  };
};

export type Wavefront = {
  /** Where the front was emitted, along the x axis, in light-seconds. */
  readonly x: number;
  /** Its present radius, in light-seconds — simply its age, since c = 1. */
  readonly radius: number;
};

/**
 * The expanding wavefronts visible at lab time `time`.
 *
 * Derived from the emission schedule rather than accumulated in a list: front k
 * left at t = k/rate from wherever the source was then, and has been expanding at
 * c ever since. Nothing is stored between frames, so nothing can drift, and
 * stepping the clock backwards works without a history buffer.
 */
export const wavefrontsAt = (
  time: number,
  beta: number,
  halfTrack: number,
  emissionRate: number,
  maxAge: number,
): Wavefront[] => {
  const fronts: Wavefront[] = [];
  const newest = Math.floor(time * emissionRate);
  const oldest = Math.max(0, Math.ceil((time - maxAge) * emissionRate));
  for (let index = oldest; index <= newest; index++) {
    const emittedAt = index / emissionRate;
    fronts.push({
      x: sourcePositionAt(emittedAt, beta, halfTrack),
      radius: time - emittedAt,
    });
  }
  return fronts;
};

/**
 * The relativistic beaming lobe: how bright the source appears in each direction,
 * as a polar curve normalised so its peak has radius 1.
 *
 * A source that radiates evenly in its own frame does not look even from outside.
 * The forward peak sharpens as β → 1 — this is why a relativistic jet pointed at
 * you outshines an identical one pointed away by orders of magnitude.
 *
 * @returns points on the unit-peak lobe, in (x, y) with +x along the lab x axis
 */
export const beamingLobe = (beta: number, samples: number): Vector2[] => {
  const b = sanitizeBeta(beta);
  // The peak always sits along the direction of travel, so its height is the
  // head-on value for the *magnitude* of β regardless of which way it points.
  const peak = bolometricBeaming(Math.abs(b), 1);
  const points: Vector2[] = [];
  for (let index = 0; index <= samples; index++) {
    const angle = (2 * Math.PI * index) / samples;
    const radius = bolometricBeaming(b, Math.cos(angle)) / peak;
    points.push(new Vector2(radius * Math.cos(angle), radius * Math.sin(angle)));
  }
  return points;
};
