/**
 * dopplerGeometry.test.ts
 *
 * The Doppler screen's correctness rests on using the *retarded* emission event
 * rather than the source's current position. These tests check that solve
 * directly — by confirming the light-travel-time condition it was derived from —
 * and then check that the resulting observations reproduce the three standard
 * limits: head-on blueshift, straight-away redshift, and the transverse redshift
 * by exactly γ.
 */

import { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { dopplerFactor, gammaOf, MAX_BETA } from "../src/common/model/lorentz.js";
import {
  beamingLobe,
  receivedSignal,
  retardedEmissionTime,
  sourcePositionAt,
  startPosition,
  traverseDuration,
  wavefrontsAt,
} from "../src/relativistic-doppler/model/dopplerGeometry.js";

const HALF_TRACK = 7;
const OBSERVER_DISTANCE = 2.6;
const OBSERVER = new Vector2(0, -OBSERVER_DISTANCE);
const WAVELENGTH = 550;
const BETA_SWEEP = [-MAX_BETA, -0.9, -0.5, 0, 0.5, 0.9, MAX_BETA];

/** Every observer placement the screen allows, corners included. */
const OBSERVER_SWEEP = [OBSERVER, new Vector2(0, -1.5), new Vector2(4, -2.6), new Vector2(-6, -6.5)];

/** Distance from the source's position at `time` to `observer`. */
const distanceToObserver = (time: number, beta: number, observer = OBSERVER): number =>
  Math.hypot(sourcePositionAt(time, beta, HALF_TRACK) - observer.x, observer.y);

describe("the source's flight", () => {
  it("starts at the far end so that it begins by approaching", () => {
    expect(startPosition(0.5, HALF_TRACK)).toBe(-HALF_TRACK);
    expect(startPosition(-0.5, HALF_TRACK)).toBe(HALF_TRACK);
  });

  it("crosses the whole track in the expected time", () => {
    expect(traverseDuration(0.5, HALF_TRACK)).toBeCloseTo(28, 12);
    expect(traverseDuration(-0.5, HALF_TRACK)).toBeCloseTo(28, 12);
    expect(traverseDuration(0, HALF_TRACK)).toBe(Number.POSITIVE_INFINITY);
  });

  it("arrives at the far end exactly when the traverse ends", () => {
    for (const beta of BETA_SWEEP.filter((b) => b !== 0)) {
      const end = sourcePositionAt(traverseDuration(beta, HALF_TRACK), beta, HALF_TRACK);
      expect(Math.abs(end)).toBeCloseTo(HALF_TRACK, 10);
    }
  });
});

describe("the retarded emission event", () => {
  it("satisfies the light-travel-time condition it was derived from", () => {
    // The real check: |observer − source(t_e)| must equal c·(t − t_e). This is
    // the equation, not the solution, so agreement is independent evidence that
    // the quadratic was solved correctly.
    for (const beta of BETA_SWEEP) {
      for (const time of [0.5, 3, 9, 20]) {
        const emissionTime = retardedEmissionTime(time, beta, HALF_TRACK, OBSERVER);
        expect(distanceToObserver(emissionTime, beta)).toBeCloseTo(time - emissionTime, 9);
      }
    }
  });

  it("picks the root in the past", () => {
    for (const beta of BETA_SWEEP) {
      for (const time of [0.5, 3, 9, 20]) {
        expect(retardedEmissionTime(time, beta, HALF_TRACK, OBSERVER)).toBeLessThan(time);
      }
    }
  });

  it("reduces to a plain light-travel delay for a stationary source", () => {
    const delay = Math.hypot(HALF_TRACK, OBSERVER_DISTANCE);
    expect(retardedEmissionTime(10, 0, HALF_TRACK, OBSERVER)).toBeCloseTo(10 - delay, 10);
  });

  it("still satisfies that condition wherever the observer stands", () => {
    // Same independent check as above, swept over the whole draggable region:
    // the solve is general in the observer's position, not special to x = 0.
    for (const observer of OBSERVER_SWEEP) {
      for (const beta of BETA_SWEEP) {
        for (const time of [0.5, 3, 9, 20]) {
          const emissionTime = retardedEmissionTime(time, beta, HALF_TRACK, observer);
          expect(distanceToObserver(emissionTime, beta, observer)).toBeCloseTo(time - emissionTime, 9);
          expect(emissionTime).toBeLessThan(time);
        }
      }
    }
  });
});

describe("what the observer measures", () => {
  it("blueshifts an approaching source and redshifts a receding one", () => {
    const approaching = receivedSignal(1, 0.6, HALF_TRACK, OBSERVER, WAVELENGTH);
    expect(approaching.cosTheta).toBeGreaterThan(0);
    expect(approaching.doppler).toBeGreaterThan(1);
    expect(approaching.observedWavelength).toBeLessThan(WAVELENGTH);

    // Late in the traverse the source is well past the observer.
    const receding = receivedSignal(traverseDuration(0.6, HALF_TRACK) - 1, 0.6, HALF_TRACK, OBSERVER, WAVELENGTH);
    expect(receding.cosTheta).toBeLessThan(0);
    expect(receding.doppler).toBeLessThan(1);
    expect(receding.observedWavelength).toBeGreaterThan(WAVELENGTH);
  });

  it("redshifts by exactly γ when the light left from straight across", () => {
    // The transverse Doppler effect: at the moment the *received* ray is
    // perpendicular to the motion, nothing is approaching or receding, and the
    // shift is pure time dilation. This is the result with no classical analogue,
    // and getting it right is the reason the retarded position is used at all.
    for (const beta of [0.3, 0.6, 0.9]) {
      // The light emitted from x = 0 arrives one observer-distance later.
      const emissionTime = (0 - startPosition(beta, HALF_TRACK)) / beta;
      const arrivalTime = emissionTime + OBSERVER_DISTANCE;
      const signal = receivedSignal(arrivalTime, beta, HALF_TRACK, OBSERVER, WAVELENGTH);

      expect(signal.emissionX).toBeCloseTo(0, 8);
      expect(signal.cosTheta).toBeCloseTo(0, 8);
      expect(signal.doppler).toBeCloseTo(1 / gammaOf(beta), 8);
      expect(signal.observedWavelength).toBeCloseTo(WAVELENGTH * gammaOf(beta), 6);
    }
  });

  it("shifts nothing at all when the source is at rest", () => {
    const signal = receivedSignal(12, 0, HALF_TRACK, OBSERVER, WAVELENGTH);
    expect(signal.doppler).toBeCloseTo(1, 12);
    expect(signal.observedWavelength).toBeCloseTo(WAVELENGTH, 12);
    expect(signal.relativeBrightness).toBeCloseTo(1, 12);
  });

  it("agrees with the bare Doppler formula given its own direction cosine", () => {
    for (const beta of BETA_SWEEP) {
      for (const time of [1, 5, 14]) {
        const signal = receivedSignal(time, beta, HALF_TRACK, OBSERVER, WAVELENGTH);
        expect(signal.doppler).toBeCloseTo(dopplerFactor(beta, signal.cosTheta), 12);
        expect(signal.relativeBrightness).toBeCloseTo(signal.doppler ** 4, 8);
      }
    }
  });

  it("puts the transverse moment wherever the observer is standing", () => {
    // Moving the observer along the track moves the moment of the transverse
    // redshift with them — it happens when the *emission* was straight across
    // from where they stand, not when the source passes some fixed point. The
    // shift is still exactly 1/γ, because that factor is time dilation and has
    // nothing to do with geometry.
    for (const observerX of [-3, 0, 2.5]) {
      const observer = new Vector2(observerX, -OBSERVER_DISTANCE);
      for (const beta of [0.3, 0.6, 0.9]) {
        const emissionTime = (observerX - startPosition(beta, HALF_TRACK)) / beta;
        const signal = receivedSignal(emissionTime + OBSERVER_DISTANCE, beta, HALF_TRACK, observer, WAVELENGTH);
        expect(signal.emissionX).toBeCloseTo(observerX, 8);
        expect(signal.cosTheta).toBeCloseTo(0, 8);
        expect(signal.theta).toBeCloseTo(Math.PI / 2, 8);
        expect(signal.doppler).toBeCloseTo(1 / gammaOf(beta), 8);
      }
    }
  });

  it("reports an angle that is the arccosine of its own direction cosine", () => {
    for (const observer of OBSERVER_SWEEP) {
      for (const beta of BETA_SWEEP) {
        for (const time of [1, 5, 14]) {
          const signal = receivedSignal(time, beta, HALF_TRACK, observer, WAVELENGTH);
          expect(Math.cos(signal.theta)).toBeCloseTo(signal.cosTheta, 12);
          expect(signal.theta).toBeGreaterThanOrEqual(0);
          expect(signal.theta).toBeLessThanOrEqual(Math.PI);
        }
      }
    }
  });

  it("stays finite across the parameter extremes", () => {
    for (const beta of BETA_SWEEP) {
      for (const time of [0, 0.01, 5, 40]) {
        const signal = receivedSignal(time, beta, HALF_TRACK, OBSERVER, WAVELENGTH);
        expect(Number.isFinite(signal.doppler)).toBe(true);
        expect(Number.isFinite(signal.observedWavelength)).toBe(true);
        expect(Number.isFinite(signal.relativeBrightness)).toBe(true);
        expect(signal.doppler).toBeGreaterThan(0);
      }
    }
  });
});

describe("wavefronts", () => {
  it("emits at the requested rate", () => {
    const fronts = wavefrontsAt(10, 0.5, HALF_TRACK, 1.2, 100);
    expect(fronts.length).toBe(Math.floor(10 * 1.2) + 1);
  });

  it("retires fronts older than the maximum age", () => {
    const fronts = wavefrontsAt(30, 0.5, HALF_TRACK, 1.2, 9);
    for (const front of fronts) {
      expect(front.radius).toBeLessThanOrEqual(9 + 1e-9);
      expect(front.radius).toBeGreaterThanOrEqual(0);
    }
  });

  it("expands each front at exactly c from where it was emitted", () => {
    const time = 8;
    const beta = 0.7;
    for (const front of wavefrontsAt(time, beta, HALF_TRACK, 1.2, 100)) {
      // radius = elapsed time since emission, and the centre is where the source
      // was then — light does not get dragged along by its source.
      const emittedAt = time - front.radius;
      expect(front.x).toBeCloseTo(sourcePositionAt(emittedAt, beta, HALF_TRACK), 10);
    }
  });

  it("bunches fronts ahead of a moving source and spreads them behind", () => {
    const beta = 0.6;
    const fronts = wavefrontsAt(10, beta, HALF_TRACK, 1.2, 100);
    const leadingEdges = fronts.map((front) => front.x + front.radius);
    const trailingEdges = fronts.map((front) => front.x - front.radius);
    const spread = (values: number[]): number => Math.max(...values) - Math.min(...values);
    expect(spread(leadingEdges)).toBeLessThan(spread(trailingEdges));
  });
});

describe("the beaming lobe", () => {
  it("is a circle of radius 1 for a source at rest", () => {
    for (const point of beamingLobe(0, 24)) {
      expect(point.magnitude).toBeCloseTo(1, 10);
    }
  });

  it("peaks at exactly 1 and never exceeds it", () => {
    for (const beta of BETA_SWEEP) {
      const radii = beamingLobe(beta, 180).map((point) => point.magnitude);
      expect(Math.max(...radii)).toBeCloseTo(1, 8);
      for (const radius of radii) {
        expect(radius).toBeLessThanOrEqual(1 + 1e-9);
        expect(radius).toBeGreaterThan(0);
      }
    }
  });

  it("points the peak the way the source is going", () => {
    const forwardPeak = beamingLobe(0.8, 180).reduce((best, point) =>
      point.magnitude > best.magnitude ? point : best,
    );
    expect(forwardPeak.x).toBeGreaterThan(0);
    const backwardPeak = beamingLobe(-0.8, 180).reduce((best, point) =>
      point.magnitude > best.magnitude ? point : best,
    );
    expect(backwardPeak.x).toBeLessThan(0);
  });

  it("narrows as the source approaches c", () => {
    // Fraction of directions receiving at least a tenth of the peak brightness.
    const forwardFraction = (beta: number): number => {
      const radii = beamingLobe(beta, 360).map((point) => point.magnitude);
      return radii.filter((radius) => radius > 0.1).length / radii.length;
    };
    expect(forwardFraction(0.95)).toBeLessThan(forwardFraction(0.5));
  });
});
