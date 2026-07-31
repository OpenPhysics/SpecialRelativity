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
  photonHeight,
  photonTrail,
  tickCount,
  tickPeriod,
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
