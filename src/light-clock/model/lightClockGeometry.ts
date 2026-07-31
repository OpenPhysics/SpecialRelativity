/**
 * lightClockGeometry.ts
 *
 * Pure geometry for a light clock: a photon bouncing between two mirrors held a
 * fixed distance apart, perpendicular to the direction of motion.
 *
 * Everything here is a closed form of elapsed time rather than an integration.
 * That is deliberate — it keeps the animation free of accumulated drift no matter
 * how long it runs or how large a frame's dt is, and it makes stepping the clock
 * *backwards* work with no extra machinery.
 *
 * ── The one piece of physics ──────────────────────────────────────────────────
 * The mirrors are separated by L **across** the direction of motion, and lengths
 * across the motion are not contracted. So in the clock's own frame the photon
 * covers L each way and one round trip takes 2L (with c = 1). In the lab frame
 * the same photon has to cover the hypotenuse of a triangle whose other leg is
 * the distance the clock itself moved, so
 *
 *     (one-way lab time)² = L² + (β · one-way lab time)²   ⟹   t = γL
 *
 * The photon's speed is c in both frames — that is the postulate, not a result —
 * and time dilation is the *consequence* forced by it. This module exists so the
 * Light Clock screen can show that triangle rather than assert the factor γ.
 */

import { Vector2 } from "scenerystack/dot";
import { gammaOf, sanitizeBeta } from "../../common/model/lorentz.js";

/** Proper time for one complete round trip — one "tick" — of a clock with arm L. */
export const tickPeriod = (armLength: number): number => 2 * armLength;

/**
 * Height of the photon between the mirrors, given the elapsed time **on the
 * clock's own worldline**. A triangle wave: 0 → L → 0 over one tick.
 */
export const photonHeight = (properTime: number, armLength: number): number => {
  const period = tickPeriod(armLength);
  const phase = ((properTime % period) + period) % period;
  return phase <= armLength ? phase : period - phase;
};

/** Completed round trips a clock has counted after `properTime` on its own clock. */
export const tickCount = (properTime: number, armLength: number): number =>
  Math.max(0, Math.floor(properTime / tickPeriod(armLength)));

/**
 * Lab time between successive mirror strikes for a clock moving at β — the
 * γ-stretched half-tick. At β = 0 this is just the arm length.
 */
export const labHalfTickTime = (armLength: number, beta: number): number => armLength * gammaOf(beta);

/**
 * Where the moving clock sits along its rail at lab time `time`.
 *
 * The rail is finite, so the clock wraps around to the far end when it runs off
 * the near one. That is a presentational convention, not physics: the clock is
 * inertial throughout and never turns around — if it did, this screen would be
 * the Twin Paradox screen. It starts at the centre so both directions of travel
 * have room.
 */
export const clockPosition = (time: number, beta: number, halfTrack: number): number => {
  const b = sanitizeBeta(beta);
  if (b === 0) {
    return 0;
  }
  const span = 2 * halfTrack;
  const raw = b * time;
  return ((((raw + halfTrack) % span) + span) % span) - halfTrack;
};

/**
 * Lab time at which the clock's current traverse of the rail began — the moment
 * of the most recent wrap. The photon trail is drawn from here, so it never
 * stretches across a wrap and back.
 *
 * Distance is measured with |β| so the arithmetic works the same in both
 * directions of travel; the result may be negative during the first pass, which
 * callers clamp against 0.
 */
export const traverseStartTime = (time: number, beta: number, halfTrack: number): number => {
  const speed = Math.abs(sanitizeBeta(beta));
  if (speed === 0) {
    return 0;
  }
  const span = 2 * halfTrack;
  const traverseIndex = Math.floor((speed * time + halfTrack) / span);
  return (traverseIndex * span - halfTrack) / speed;
};

/**
 * The photon's zigzag path through the lab frame over the clock's current
 * traverse of the rail, as `Vector2( x, height )` in light-seconds.
 *
 * The vertices are the mirror strikes, which is *exact* — between two strikes the
 * photon travels in a straight line, so there is nothing a denser sampling would
 * capture. An empty result means the clock is not moving and the path has
 * collapsed onto a vertical line, which the view draws differently anyway.
 */
export const photonTrail = (time: number, beta: number, armLength: number, halfTrack: number): Vector2[] => {
  const b = sanitizeBeta(beta);
  if (b === 0 || time <= 0) {
    return [];
  }

  const startTime = Math.max(0, traverseStartTime(time, b, halfTrack));
  const halfTick = labHalfTickTime(armLength, b);
  const gamma = gammaOf(b);

  const at = (labTime: number): Vector2 =>
    new Vector2(clockPosition(labTime, b, halfTrack), photonHeight(labTime / gamma, armLength));

  const trail: Vector2[] = [at(startTime)];

  // Mirror strikes happen at whole multiples of the lab half-tick.
  const firstStrike = Math.ceil(startTime / halfTick);
  const lastStrike = Math.floor(time / halfTick);
  for (let strike = firstStrike; strike <= lastStrike; strike++) {
    trail.push(at(strike * halfTick));
  }

  trail.push(at(time));
  return trail;
};
