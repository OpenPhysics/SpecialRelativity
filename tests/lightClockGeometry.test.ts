/**
 * lightClockGeometry.test.ts
 *
 * The Light Clock screen's claim is that the moving clock ticks slower by exactly
 * γ, and that this follows from the photon covering c·t in both frames rather
 * than being asserted. These tests check both halves: the γ relation between the
 * two periods, and — independently — that the zigzag path length divided by the
 * elapsed lab time really does come out to c.
 */

import { describe, expect, it } from "vitest";
import { gammaOf, MAX_BETA } from "../src/common/model/lorentz.js";
import {
  clockPosition,
  labHalfTickTime,
  lightTriangle,
  photonHeight,
  photonTrail,
  tickCount,
  tickPeriod,
  traverseStartPosition,
  traverseStartTime,
} from "../src/light-clock/model/lightClockGeometry.js";

const ARM = 1;
const HALF_TRACK = 2.1;
const BETA_SWEEP = [-MAX_BETA, -0.8, -0.3, 0, 0.3, 0.8, MAX_BETA];

describe("photon height", () => {
  it("starts at the bottom mirror and reaches the top at half a tick", () => {
    expect(photonHeight(0, ARM)).toBeCloseTo(0, 12);
    expect(photonHeight(ARM, ARM)).toBeCloseTo(ARM, 12);
    expect(photonHeight(2 * ARM, ARM)).toBeCloseTo(0, 12);
  });

  it("never leaves the gap between the mirrors", () => {
    for (let properTime = 0; properTime < 20; properTime += 0.017) {
      const height = photonHeight(properTime, ARM);
      expect(height).toBeGreaterThanOrEqual(0);
      expect(height).toBeLessThanOrEqual(ARM);
    }
  });

  it("is periodic with one tick", () => {
    for (const properTime of [0.3, 1.4, 2.7, 5.9]) {
      expect(photonHeight(properTime + tickPeriod(ARM), ARM)).toBeCloseTo(photonHeight(properTime, ARM), 12);
    }
  });

  it("handles negative proper time, so stepping backwards works", () => {
    expect(photonHeight(-0.5, ARM)).toBeCloseTo(photonHeight(1.5, ARM), 12);
  });
});

describe("tick counting", () => {
  it("counts one tick per round trip", () => {
    expect(tickCount(0, ARM)).toBe(0);
    expect(tickCount(1.99, ARM)).toBe(0);
    expect(tickCount(2, ARM)).toBe(1);
    expect(tickCount(7.5, ARM)).toBe(3);
  });

  it("makes the moving clock's count exactly the lab count divided by γ", () => {
    // The screen's headline claim, expressed as the ratio of what the two
    // counters actually display.
    for (const beta of BETA_SWEEP) {
      const gamma = gammaOf(beta);
      const labTime = 40;
      expect(tickCount(labTime / gamma, ARM)).toBe(Math.floor(labTime / gamma / tickPeriod(ARM)));
      expect(tickCount(labTime / gamma, ARM)).toBeLessThanOrEqual(tickCount(labTime, ARM));
    }
  });
});

describe("the moving clock", () => {
  it("takes γ times as long between mirror strikes", () => {
    for (const beta of BETA_SWEEP) {
      expect(labHalfTickTime(ARM, beta)).toBeCloseTo(ARM * gammaOf(beta), 12);
    }
    expect(labHalfTickTime(ARM, 0)).toBeCloseTo(ARM, 12);
  });

  it("starts at the centre of its rail and stays on it", () => {
    expect(clockPosition(0, 0.5, HALF_TRACK)).toBeCloseTo(0, 12);
    for (const beta of BETA_SWEEP) {
      for (let time = 0; time < 30; time += 0.13) {
        const position = clockPosition(time, beta, HALF_TRACK);
        expect(position).toBeGreaterThanOrEqual(-HALF_TRACK - 1e-9);
        expect(position).toBeLessThanOrEqual(HALF_TRACK + 1e-9);
      }
    }
  });

  it("does not move at all when β is zero", () => {
    for (const time of [0, 3, 17]) {
      expect(clockPosition(time, 0, HALF_TRACK)).toBe(0);
    }
  });

  it("marks each traverse as starting no later than now", () => {
    for (const beta of BETA_SWEEP.filter((b) => b !== 0)) {
      for (let time = 0.1; time < 25; time += 0.37) {
        expect(traverseStartTime(time, beta, HALF_TRACK)).toBeLessThanOrEqual(time + 1e-9);
      }
    }
  });
});

describe("the photon's zigzag", () => {
  it("collapses to nothing when the clock is not moving", () => {
    expect(photonTrail(5, 0, ARM, HALF_TRACK)).toEqual([]);
  });

  it("travels at exactly c, which is the whole point", () => {
    // Independent of every γ in the module: measure the drawn path's length and
    // divide by the elapsed time. If this were not 1, the animation would be
    // illustrating a postulate it does not obey.
    for (const beta of [0.3, 0.6, 0.9]) {
      const end = 1.9;
      const trail = photonTrail(end, beta, ARM, HALF_TRACK);
      expect(trail.length).toBeGreaterThan(1);

      let length = 0;
      for (let index = 1; index < trail.length; index++) {
        const previous = trail[index - 1];
        const current = trail[index];
        if (previous && current) {
          length += Math.hypot(current.x - previous.x, current.y - previous.y);
        }
      }

      // The first traverse begins before t = 0 and is clamped there, so the trail
      // spans exactly [0, end] and the elapsed time is `end`.
      const elapsed = end - Math.max(0, traverseStartTime(end, beta, HALF_TRACK));
      expect(elapsed).toBeCloseTo(end, 12);
      expect(length / elapsed).toBeCloseTo(1, 6);
    }
  });

  it("turns only at the mirrors", () => {
    const beta = 0.6;
    const trail = photonTrail(3 * labHalfTickTime(ARM, beta), beta, ARM, HALF_TRACK);
    // Every interior vertex sits on a mirror: height 0 or height ARM.
    for (let index = 1; index < trail.length - 1; index++) {
      const height = trail[index]?.y ?? Number.NaN;
      expect(Math.min(Math.abs(height), Math.abs(height - ARM))).toBeLessThan(1e-9);
    }
  });

  it("produces finite coordinates across the parameter extremes", () => {
    for (const beta of BETA_SWEEP) {
      for (const time of [0.001, 1, 12.5, 40]) {
        for (const point of photonTrail(time, beta, ARM, HALF_TRACK)) {
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
        }
      }
    }
  });
});

describe("the light-travel triangle", () => {
  it("closes: the legs and the hypotenuse satisfy Pythagoras", () => {
    // The whole derivation of time dilation is this one identity, so it is the
    // first thing to check — and checking it is not restating the code, which
    // builds the three lengths from β, γ and Δt separately.
    for (const beta of BETA_SWEEP.filter((b) => b !== 0)) {
      for (const time of [0.37, 1.4, 3.9, 12.6]) {
        const triangle = lightTriangle(time, beta, ARM, HALF_TRACK);
        if (triangle === null) {
          continue;
        }
        expect(triangle.clockDistance ** 2 + triangle.transverse ** 2).toBeCloseTo(triangle.lightDistance ** 2, 10);
      }
    }
  });

  it("has legs that match the corners it draws", () => {
    // The lengths and the geometry are computed by different routes — one from
    // β and γ, the other from clockPosition and photonHeight — so agreement says
    // the picture is the picture of the numbers.
    for (const beta of BETA_SWEEP.filter((b) => b !== 0)) {
      for (const time of [0.37, 1.4, 3.9, 12.6]) {
        const triangle = lightTriangle(time, beta, ARM, HALF_TRACK);
        if (triangle === null) {
          continue;
        }
        expect(Math.abs(triangle.corner.x - triangle.start.x)).toBeCloseTo(triangle.clockDistance, 10);
        expect(Math.abs(triangle.photon.y - triangle.corner.y)).toBeCloseTo(triangle.transverse, 10);
        expect(triangle.corner.y).toBeCloseTo(triangle.start.y, 12);
        expect(triangle.corner.x).toBeCloseTo(triangle.photon.x, 12);
      }
    }
  });

  it("puts its hypotenuse on the photon's actual path", () => {
    // The photon corner must be the same point the trail's last vertex is: the
    // triangle is a reading of the zigzag, not a second drawing of it.
    for (const beta of [-0.8, -0.3, 0.3, 0.8]) {
      for (const time of [0.37, 1.4, 3.9]) {
        const triangle = lightTriangle(time, beta, ARM, HALF_TRACK);
        const trail = photonTrail(time, beta, ARM, HALF_TRACK);
        if (triangle === null || trail.length === 0) {
          continue;
        }
        const last = trail[trail.length - 1] as (typeof trail)[number];
        expect(triangle.photon.x).toBeCloseTo(last.x, 10);
        expect(triangle.photon.y).toBeCloseTo(last.y, 10);
      }
    }
  });

  it("grows from nothing at each mirror strike", () => {
    // Just after a strike the triangle is tiny; just before the next, it spans a
    // whole half-tick. The lengths are therefore bounded by that half-tick.
    const beta = 0.6;
    const halfTick = labHalfTickTime(ARM, beta);
    for (const fraction of [0.01, 0.3, 0.7, 0.99]) {
      const triangle = lightTriangle(3 * halfTick + fraction * halfTick, beta, ARM, HALF_TRACK);
      expect(triangle).not.toBeNull();
      expect((triangle as NonNullable<typeof triangle>).lightDistance).toBeCloseTo(fraction * halfTick, 8);
    }
  });

  it("has no triangle to draw for a clock at rest, or before the clock starts", () => {
    expect(lightTriangle(4, 0, ARM, HALF_TRACK)).toBeNull();
    expect(lightTriangle(0, 0.6, ARM, HALF_TRACK)).toBeNull();
    expect(lightTriangle(-1, 0.6, ARM, HALF_TRACK)).toBeNull();
  });

  it("never straddles a wrap of the rail", () => {
    // Regression: a leg beginning exactly on a wrap once reported a base the
    // whole width of the rail, because β·t_wrap rounded onto the far side of the
    // modulo. The base can never exceed what the clock covers in one half-tick.
    for (const beta of BETA_SWEEP.filter((b) => b !== 0)) {
      const halfTick = labHalfTickTime(ARM, beta);
      for (let step = 0; step < 400; step++) {
        const time = step * 0.05;
        const triangle = lightTriangle(time, beta, ARM, HALF_TRACK);
        if (triangle === null) {
          continue;
        }
        const base = Math.abs(triangle.corner.x - triangle.start.x);
        expect(base).toBeCloseTo(triangle.clockDistance, 10);
        expect(base).toBeLessThanOrEqual(Math.abs(beta) * halfTick + 1e-9);
        expect(Math.abs(triangle.start.x)).toBeLessThanOrEqual(HALF_TRACK + 1e-9);
      }
    }
  });

  it("stays finite across the parameter extremes", () => {
    for (const beta of BETA_SWEEP) {
      for (const arm of [0.5, 1, 1.6]) {
        for (const time of [0.05, 2, 25]) {
          const triangle = lightTriangle(time, beta, arm, HALF_TRACK);
          if (triangle === null) {
            continue;
          }
          expect(Number.isFinite(triangle.lightDistance)).toBe(true);
          expect(Number.isFinite(triangle.clockDistance)).toBe(true);
          expect(Number.isFinite(triangle.transverse)).toBe(true);
          expect(triangle.transverse).toBeLessThanOrEqual(arm + 1e-9);
        }
      }
    }
  });
});

describe("the start of a traverse", () => {
  it("is the rail end the clock is coming from, once it has wrapped at all", () => {
    // Position at a wrap is ambiguous by nature — the clock is leaving one end
    // and arriving at the other — so this reports the arriving end exactly,
    // instead of letting rounding pick.
    expect(traverseStartPosition(0.5, 0.8, HALF_TRACK)).toBe(0);
    expect(traverseStartPosition(0.5, -0.8, HALF_TRACK)).toBe(0);
    expect(traverseStartPosition(20, 0.8, HALF_TRACK)).toBe(-HALF_TRACK);
    expect(traverseStartPosition(20, -0.8, HALF_TRACK)).toBe(HALF_TRACK);
    expect(traverseStartPosition(20, 0, HALF_TRACK)).toBe(0);
  });

  it("agrees with the trail's first vertex, and keeps it on the rail", () => {
    for (const beta of BETA_SWEEP.filter((b) => b !== 0)) {
      for (let step = 1; step < 300; step++) {
        const time = step * 0.07;
        const trail = photonTrail(time, beta, ARM, HALF_TRACK);
        const first = trail[0];
        if (first === undefined) {
          continue;
        }
        expect(first.x).toBeCloseTo(traverseStartPosition(time, beta, HALF_TRACK), 10);
        expect(Math.abs(first.x)).toBeLessThanOrEqual(HALF_TRACK + 1e-9);
      }
    }
  });
});
