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
 * Where the clock sits at the instant its current traverse began.
 *
 * This exists because {@link traverseStartTime} returns the instant of a *wrap*,
 * and at exactly that instant the clock's position is ambiguous — it is leaving
 * one end of the rail and arriving at the other. Asking {@link clockPosition} is
 * not merely ambiguous but unreliable: `β · t_wrap` is a computed quantity, so
 * rounding decides which side of the modulo it lands on and the answer can flip
 * to the far end of the rail. Callers that need the position at that instant get
 * the exact rail end instead, which is what it is.
 *
 * Before the first wrap the traverse begins at the clock's starting point, the
 * centre of the rail.
 */
export const traverseStartPosition = (time: number, beta: number, halfTrack: number): number => {
  const b = sanitizeBeta(beta);
  if (b === 0 || traverseStartTime(time, b, halfTrack) <= 0) {
    return 0;
  }
  return b > 0 ? -halfTrack : halfTrack;
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

  // The first vertex sits exactly on a wrap, so its x comes from the rail rather
  // than from the modulo — see {@link traverseStartPosition}.
  const trail: Vector2[] = [
    new Vector2(traverseStartPosition(time, b, halfTrack), photonHeight(startTime / gamma, armLength)),
  ];

  // Mirror strikes happen at whole multiples of the lab half-tick.
  const firstStrike = Math.ceil(startTime / halfTick);
  const lastStrike = Math.floor(time / halfTick);
  for (let strike = firstStrike; strike <= lastStrike; strike++) {
    trail.push(at(strike * halfTick));
  }

  trail.push(at(time));
  return trail;
};

/**
 * The right triangle the moving photon is currently walking around — the picture
 * the whole screen argues from, drawn rather than asserted.
 *
 * Over the lab time Δt since the last mirror strike the clock has slid βΔt along
 * the rail and the photon has climbed Δt/γ across it, while the photon itself has
 * covered Δt — because it travels at c, which is the postulate. Those three
 * numbers are the legs and hypotenuse of a right triangle, and
 *
 *     (Δt)² = (βΔt)² + (Δt/γ)²
 *
 * is the whole derivation of time dilation with nothing left over.
 */
export type LightTriangle = {
  /** The mirror strike (or start of this traverse) the current leg began at. */
  readonly start: Vector2;
  /** The right-angle corner, directly across the rail from the photon. */
  readonly corner: Vector2;
  /** Where the photon is now. */
  readonly photon: Vector2;
  /** Length of the along-the-rail leg, βΔt. */
  readonly clockDistance: number;
  /** Length of the across-the-rail leg, Δt/γ. */
  readonly transverse: number;
  /** Length of the hypotenuse, Δt — the distance the photon actually flew. */
  readonly lightDistance: number;
};

/**
 * The triangle for the leg of the zigzag currently in progress, in lab
 * coordinates `Vector2( x, height )`.
 *
 * Returns null when there is no triangle to draw: a clock at rest (the photon
 * goes straight up, and the triangle has collapsed), or a moment that coincides
 * with a mirror strike (the triangle has zero width).
 *
 * The leg is clipped to the current traverse of the finite rail for the same
 * reason {@link photonTrail} is — a triangle spanning a wrap-around would have a
 * base the clock never travelled.
 */
export const lightTriangle = (
  time: number,
  beta: number,
  armLength: number,
  halfTrack: number,
): LightTriangle | null => {
  const b = sanitizeBeta(beta);
  if (b === 0 || time <= 0) {
    return null;
  }

  const halfTick = labHalfTickTime(armLength, b);
  const traverseStart = Math.max(0, traverseStartTime(time, b, halfTrack));
  const legStart = Math.max(Math.floor(time / halfTick) * halfTick, traverseStart);
  const elapsed = time - legStart;
  if (elapsed <= 0) {
    return null;
  }

  const gamma = gammaOf(b);
  const photon = new Vector2(clockPosition(time, b, halfTrack), photonHeight(time / gamma, armLength));

  // The leg's other end is found by walking back along the clock's own motion
  // rather than by asking clockPosition again. Both give the same point, but this
  // way the base of the triangle is βΔt *by construction* — and when the leg
  // begins exactly on a wrap, it is the only one of the two that can be trusted
  // (see {@link traverseStartPosition}).
  const start = new Vector2(photon.x - b * elapsed, photonHeight(legStart / gamma, armLength));

  return {
    start,
    corner: new Vector2(photon.x, start.y),
    photon,
    clockDistance: Math.abs(b) * elapsed,
    transverse: elapsed / gamma,
    lightDistance: elapsed,
  };
};
