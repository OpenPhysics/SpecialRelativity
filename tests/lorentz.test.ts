/**
 * lorentz.test.ts
 *
 * Tests for the sim's core kinematics module.
 *
 * Three layers, following the fleet's house style:
 *   1. values computed by hand from the closed form (γ at β = 3/5, the 3-4-5
 *      right triangle of relativity);
 *   2. *independent* structural checks — invariance of the interval under a
 *      boost, a round trip through boost and inverse, additivity of rapidity —
 *      none of which the implementation could pass by restating its own formula;
 *   3. a sweep over the extremes of the allowed parameter space for finiteness.
 */

import { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import {
  aberrationCos,
  axisProjections,
  betaOfRapidity,
  bolometricBeaming,
  boostEvent,
  boostMatrix,
  dopplerFactor,
  gammaOf,
  hyperbolaSamples,
  intervalSquared,
  MAX_BETA,
  properSeparation,
  properTimeAlong,
  rapidityOf,
  restFrameBeta,
  Separation,
  sanitizeBeta,
  separationOf,
  simultaneityBeta,
  simultaneityLineThrough,
  velocityAddition,
  worldlineThrough,
} from "../src/common/model/lorentz.js";

/** β values spanning the allowed range, including both signs and both extremes. */
const BETA_SWEEP = [-MAX_BETA, -0.9, -0.6, -0.1, 0, 0.1, 0.6, 0.9, MAX_BETA];

describe("gamma and rapidity", () => {
  it("γ = 1 at rest", () => {
    expect(gammaOf(0)).toBe(1);
  });

  it("γ = 5/4 at β = 3/5 (the 3-4-5 triangle)", () => {
    expect(gammaOf(0.6)).toBeCloseTo(1.25, 12);
  });

  it("γ is even in β", () => {
    for (const beta of BETA_SWEEP) {
      expect(gammaOf(beta)).toBeCloseTo(gammaOf(-beta), 12);
    }
  });

  it("γ ≥ 1 and finite across the whole allowed range", () => {
    for (const beta of BETA_SWEEP) {
      const gamma = gammaOf(beta);
      expect(Number.isFinite(gamma)).toBe(true);
      expect(gamma).toBeGreaterThanOrEqual(1);
    }
  });

  it("rapidity round-trips through β", () => {
    for (const beta of BETA_SWEEP) {
      expect(betaOfRapidity(rapidityOf(beta))).toBeCloseTo(beta, 12);
    }
  });

  it("sanitizeBeta clamps out-of-range and non-finite input", () => {
    expect(sanitizeBeta(2)).toBe(MAX_BETA);
    expect(sanitizeBeta(-2)).toBe(-MAX_BETA);
    expect(sanitizeBeta(Number.NaN)).toBe(0);
    expect(sanitizeBeta(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("the boost", () => {
  it("is the identity at β = 0", () => {
    const event = new Vector2(3, 2);
    expect(boostEvent(event, 0).equalsEpsilon(event, 1e-12)).toBe(true);
  });

  it("moves an event to the expected coordinates (hand-computed)", () => {
    // β = 0.6, γ = 1.25. Event ( x, ct ) = ( 2, 1 ):
    //   x′  = 1.25 · ( 2 − 0.6 · 1 ) = 1.75
    //   ct′ = 1.25 · ( 1 − 0.6 · 2 ) = −0.25
    const primed = boostEvent(new Vector2(2, 1), 0.6);
    expect(primed.x).toBeCloseTo(1.75, 12);
    expect(primed.y).toBeCloseTo(-0.25, 12);
  });

  it("composes with its inverse to give back the original event", () => {
    const event = new Vector2(-1.7, 3.3);
    for (const beta of BETA_SWEEP) {
      const round = boostEvent(boostEvent(event, beta), -beta);
      expect(round.x).toBeCloseTo(event.x, 10);
      expect(round.y).toBeCloseTo(event.y, 10);
    }
  });

  it("has unit determinant — a boost preserves spacetime volume", () => {
    for (const beta of BETA_SWEEP) {
      const m = boostMatrix(beta);
      expect(m.m00() * m.m11() - m.m01() * m.m10()).toBeCloseTo(1, 12);
    }
  });

  it("leaves the invariant interval unchanged", () => {
    // The check that matters: s² is computed from the boosted coordinates with a
    // formula that knows nothing about β, so agreement is real evidence.
    const displacements = [new Vector2(4, 1), new Vector2(1, 4), new Vector2(2, 2), new Vector2(-3.5, 0.5)];
    for (const displacement of displacements) {
      const rest = intervalSquared(displacement);
      for (const beta of BETA_SWEEP) {
        expect(intervalSquared(boostEvent(displacement, beta))).toBeCloseTo(rest, 10);
      }
    }
  });

  it("composes: boosting twice equals one boost at the combined velocity", () => {
    const event = new Vector2(2.5, -1.5);
    const first = 0.4;
    const second = 0.5;
    const twice = boostEvent(boostEvent(event, first), second);
    const once = boostEvent(event, velocityAddition(first, second));
    expect(twice.x).toBeCloseTo(once.x, 10);
    expect(twice.y).toBeCloseTo(once.y, 10);
  });
});

describe("causal structure", () => {
  it("classifies the three cases", () => {
    const origin = Vector2.ZERO;
    expect(separationOf(origin, new Vector2(1, 4))).toBe(Separation.TIMELIKE);
    expect(separationOf(origin, new Vector2(4, 1))).toBe(Separation.SPACELIKE);
    expect(separationOf(origin, new Vector2(3, 3))).toBe(Separation.LIGHTLIKE);
  });

  it("uses the tolerance band only when asked", () => {
    const nearlyLightlike = new Vector2(3, 3.02);
    expect(separationOf(Vector2.ZERO, nearlyLightlike)).toBe(Separation.TIMELIKE);
    expect(separationOf(Vector2.ZERO, nearlyLightlike, 0.4)).toBe(Separation.LIGHTLIKE);
  });

  it("keeps the classification frame-independent", () => {
    const pairs: [Vector2, Vector2][] = [
      [new Vector2(-2, 1), new Vector2(3, 2)],
      [new Vector2(0, 0), new Vector2(0.5, 3)],
    ];
    for (const [from, to] of pairs) {
      const rest = separationOf(from, to);
      for (const beta of BETA_SWEEP) {
        expect(separationOf(boostEvent(from, beta), boostEvent(to, beta))).toBe(rest);
      }
    }
  });

  it("lets a spacelike pair change order, and never a timelike one", () => {
    const timeOrder = (a: Vector2, b: Vector2, beta: number): number =>
      Math.sign(boostEvent(b, beta).y - boostEvent(a, beta).y);

    const spacelikeA = new Vector2(-2, 1);
    const spacelikeB = new Vector2(3, 2);
    const orders = new Set(BETA_SWEEP.map((beta) => timeOrder(spacelikeA, spacelikeB, beta)));
    expect(orders.size).toBeGreaterThan(1);

    const timelikeA = new Vector2(0, 0);
    const timelikeB = new Vector2(1, 4);
    for (const beta of BETA_SWEEP) {
      expect(timeOrder(timelikeA, timelikeB, beta)).toBe(1);
    }
  });

  it("flips a spacelike pair's order exactly at β = Δct/Δx", () => {
    const a = new Vector2(-2, 1);
    const b = new Vector2(3, 2);
    const critical = (b.y - a.y) / (b.x - a.x); // 1/5
    const before = boostEvent(b, critical - 0.05).y - boostEvent(a, critical - 0.05).y;
    const after = boostEvent(b, critical + 0.05).y - boostEvent(a, critical + 0.05).y;
    expect(Math.sign(before)).toBe(1);
    expect(Math.sign(after)).toBe(-1);
    const at = boostEvent(b, critical).y - boostEvent(a, critical).y;
    expect(at).toBeCloseTo(0, 12);
  });
});

describe("velocity addition", () => {
  it("reduces to the everyday sum when both speeds are small", () => {
    expect(velocityAddition(0.001, 0.002)).toBeCloseTo(0.003, 6);
  });

  it("never reaches c", () => {
    expect(Math.abs(velocityAddition(MAX_BETA, MAX_BETA))).toBeLessThan(1);
    for (const first of BETA_SWEEP) {
      for (const second of BETA_SWEEP) {
        expect(Math.abs(velocityAddition(first, second))).toBeLessThan(1);
      }
    }
  });

  it("is equivalent to adding rapidities", () => {
    // The reason rapidity is worth showing at all: β does not add, η does.
    const combined = velocityAddition(0.4, 0.5);
    expect(rapidityOf(combined)).toBeCloseTo(rapidityOf(0.4) + rapidityOf(0.5), 10);
  });
});

describe("lines and curves", () => {
  it("draws the simultaneity line with slope β through its event", () => {
    const event = new Vector2(1, 2);
    const [start, end] = simultaneityLineThrough(event, 0.5, 4);
    expect((end.y - start.y) / (end.x - start.x)).toBeCloseTo(0.5, 12);
    // The line passes through the event it was built from.
    expect(0.5 * event.x + (event.y - 0.5 * event.x)).toBeCloseTo(event.y, 12);
  });

  it("draws a horizontal simultaneity line and a vertical worldline at rest", () => {
    const [simStart, simEnd] = simultaneityLineThrough(new Vector2(1, 2), 0, 4);
    expect(simStart.y).toBeCloseTo(simEnd.y, 12);
    const [lineStart, lineEnd] = worldlineThrough(new Vector2(1, 2), 0, 4);
    expect(lineStart.x).toBeCloseTo(lineEnd.x, 12);
  });

  it("makes the primed axes mirror images about the light cone", () => {
    const beta = 0.6;
    const [ctStart, ctEnd] = worldlineThrough(Vector2.ZERO, beta, 4);
    const [xStart, xEnd] = simultaneityLineThrough(Vector2.ZERO, beta, 4);
    const ctSlope = (ctEnd.y - ctStart.y) / (ctEnd.x - ctStart.x);
    const xSlope = (xEnd.y - xStart.y) / (xEnd.x - xStart.x);
    // One has slope 1/β and the other β; their product is 1, which is exactly the
    // statement that they close symmetrically on the 45° light cone.
    expect(ctSlope * xSlope).toBeCloseTo(1, 12);
  });

  it("puts every hyperbola sample at the same interval from the origin", () => {
    for (const s2 of [4, -4, 0.25, -9]) {
      const points = hyperbolaSamples(s2, 2.5, 21);
      expect(points.length).toBe(21);
      for (const point of points) {
        expect(intervalSquared(point)).toBeCloseTo(s2, 8);
      }
    }
  });

  it("returns nothing for the degenerate s² = 0 hyperbola", () => {
    expect(hyperbolaSamples(0, 2, 21)).toEqual([]);
  });

  it("maps a boost to a slide along the hyperbola", () => {
    const event = new Vector2(3, 1);
    for (const beta of BETA_SWEEP) {
      expect(intervalSquared(boostEvent(event, beta))).toBeCloseTo(intervalSquared(event), 10);
    }
  });
});

describe("proper time", () => {
  it("equals the coordinate time for something at rest", () => {
    expect(properTimeAlong([new Vector2(0, 0), new Vector2(0, 5)])).toBeCloseTo(5, 12);
  });

  it("is shorter along a bent path than a straight one between the same events", () => {
    const straight = properTimeAlong([new Vector2(0, 0), new Vector2(0, 8)]);
    const bent = properTimeAlong([new Vector2(0, 0), new Vector2(3, 4), new Vector2(0, 8)]);
    expect(bent).toBeLessThan(straight);
    // 2·√(4² − 3²) = 2√7
    expect(bent).toBeCloseTo(2 * Math.sqrt(7), 12);
  });

  it("is itself invariant under a boost", () => {
    const path = [new Vector2(0, 0), new Vector2(3, 4), new Vector2(0, 8)];
    const rest = properTimeAlong(path);
    for (const beta of BETA_SWEEP) {
      expect(properTimeAlong(path.map((point) => boostEvent(point, beta)))).toBeCloseTo(rest, 10);
    }
  });

  it("contributes nothing for a spacelike segment rather than returning NaN", () => {
    expect(properTimeAlong([new Vector2(0, 0), new Vector2(5, 1)])).toBe(0);
  });
});

describe("Doppler and beaming", () => {
  it("reduces to the longitudinal formulas head-on and straight away", () => {
    for (const beta of [0.2, 0.6, 0.9]) {
      expect(dopplerFactor(beta, 1)).toBeCloseTo(Math.sqrt((1 + beta) / (1 - beta)), 10);
      expect(dopplerFactor(beta, -1)).toBeCloseTo(Math.sqrt((1 - beta) / (1 + beta)), 10);
    }
  });

  it("gives a pure 1/γ redshift transversely", () => {
    // The result with no classical counterpart: nothing is approaching or
    // receding, yet the light is still redshifted — by exactly γ.
    for (const beta of BETA_SWEEP) {
      expect(dopplerFactor(beta, 0)).toBeCloseTo(1 / gammaOf(beta), 12);
    }
  });

  it("has approach and recession cancel exactly", () => {
    for (const beta of [0.3, 0.7, MAX_BETA]) {
      expect(dopplerFactor(beta, 1) * dopplerFactor(beta, -1)).toBeCloseTo(1, 10);
    }
  });

  it("is unshifted at rest, from every direction", () => {
    for (const cosTheta of [-1, -0.5, 0, 0.5, 1]) {
      expect(dopplerFactor(0, cosTheta)).toBeCloseTo(1, 12);
    }
  });

  it("round-trips aberration under β → −β", () => {
    for (const beta of BETA_SWEEP) {
      for (const cosTheta of [-0.9, -0.3, 0, 0.3, 0.9]) {
        expect(aberrationCos(aberrationCos(cosTheta, beta), -beta)).toBeCloseTo(cosTheta, 10);
      }
    }
  });

  it("keeps aberrated direction cosines inside [−1, 1]", () => {
    for (const beta of BETA_SWEEP) {
      for (const cosTheta of [-1, -0.5, 0, 0.5, 1]) {
        const aberrated = aberrationCos(cosTheta, beta);
        expect(aberrated).toBeGreaterThanOrEqual(-1 - 1e-12);
        expect(aberrated).toBeLessThanOrEqual(1 + 1e-12);
      }
    }
  });

  it("beams brightness forward as the fourth power of D", () => {
    for (const beta of [0.4, 0.8]) {
      expect(bolometricBeaming(beta, 1)).toBeCloseTo(dopplerFactor(beta, 1) ** 4, 8);
      expect(bolometricBeaming(beta, 1)).toBeGreaterThan(bolometricBeaming(beta, -1));
    }
    expect(bolometricBeaming(0, 0.3)).toBeCloseTo(1, 12);
  });

  it("stays finite everywhere in the allowed parameter space", () => {
    for (const beta of BETA_SWEEP) {
      for (const cosTheta of [-1, -0.5, 0, 0.5, 1]) {
        expect(Number.isFinite(dopplerFactor(beta, cosTheta))).toBe(true);
        expect(Number.isFinite(bolometricBeaming(beta, cosTheta))).toBe(true);
      }
    }
  });
});

describe("proper separation", () => {
  it("is the proper time along a timelike separation", () => {
    // The 3-4-5 case: s² = 9 − 16 = −7, and a clock carried between the two
    // events reads √7 — the same number properTimeAlong() produces for the path.
    const from = new Vector2(0, 0);
    const to = new Vector2(3, 4);
    expect(properSeparation(intervalSquared(to.minus(from)))).toBeCloseTo(Math.sqrt(7), 12);
    expect(properSeparation(intervalSquared(to.minus(from)))).toBeCloseTo(properTimeAlong([from, to]), 12);
  });

  it("is the proper distance across a spacelike separation", () => {
    // A spacelike pair measured in the frame that calls them simultaneous: boost
    // to that frame and the remaining Δx must be the proper distance. This is an
    // independent check — it goes through the boost rather than through √|s²|.
    const from = new Vector2(0, 0);
    const to = new Vector2(5, 1);
    const beta = simultaneityBeta(from, to);
    expect(beta).not.toBeNull();
    const separated = boostEvent(to, beta as number).minus(boostEvent(from, beta as number));
    expect(Math.abs(separated.y)).toBeCloseTo(0, 10);
    expect(Math.abs(separated.x)).toBeCloseTo(properSeparation(intervalSquared(to.minus(from))), 10);
  });

  it("is invariant, because the interval it comes from is", () => {
    const from = new Vector2(-2, 1);
    const to = new Vector2(3, 2);
    const rest = properSeparation(intervalSquared(to.minus(from)));
    for (const beta of BETA_SWEEP) {
      const boosted = boostEvent(to, beta).minus(boostEvent(from, beta));
      expect(properSeparation(intervalSquared(boosted))).toBeCloseTo(rest, 10);
    }
  });
});

describe("the two special frames of a pair of events", () => {
  it("finds the frame a timelike pair shares a place in, and no other", () => {
    // The defining property, checked rather than restated: after the boost the
    // two events must have the same x′.
    const from = new Vector2(0, 0);
    const to = new Vector2(3, 4);
    const beta = restFrameBeta(from, to);
    expect(beta).toBeCloseTo(0.75, 12);
    const separated = boostEvent(to, beta as number).minus(boostEvent(from, beta as number));
    expect(separated.x).toBeCloseTo(0, 10);

    // A spacelike pair has no such frame, and neither does a simultaneous one.
    expect(restFrameBeta(from, new Vector2(5, 1))).toBeNull();
    expect(restFrameBeta(from, new Vector2(2, 0))).toBeNull();
  });

  it("finds the frame a spacelike pair is simultaneous in, and no other", () => {
    const from = new Vector2(0, 0);
    const to = new Vector2(4, 3);
    const beta = simultaneityBeta(from, to);
    expect(beta).toBeCloseTo(0.75, 12);
    const separated = boostEvent(to, beta as number).minus(boostEvent(from, beta as number));
    expect(separated.y).toBeCloseTo(0, 10);

    expect(simultaneityBeta(from, new Vector2(3, 4))).toBeNull();
    expect(simultaneityBeta(from, new Vector2(0, 2))).toBeNull();
  });

  it("offers exactly one of the two for every pair the sim can reach", () => {
    // The complementarity the paired buttons on the Spacetime Diagram screen
    // rest on: a timelike pair has a rest frame and no simultaneous frame, a
    // spacelike pair the other way round. (Only pairs comfortably clear of the
    // light cone are swept — right on it neither frame exists, which is the
    // third case and the reason "exactly one" is stated for reachable pairs.)
    const origin = new Vector2(0, 0);
    for (const x of [-4, -1.5, 0, 1.5, 4]) {
      for (const ct of [-4, -1.5, 1.5, 4]) {
        const to = new Vector2(x, ct);
        if (Math.abs(Math.abs(x) - Math.abs(ct)) < 0.5) {
          continue;
        }
        const timelike = separationOf(origin, to) === Separation.TIMELIKE;
        expect(restFrameBeta(origin, to) !== null).toBe(timelike);
        expect(simultaneityBeta(origin, to) !== null).toBe(!timelike);
      }
    }
  });
});

describe("coordinate projections onto the primed axes", () => {
  it("lands on the points whose primed coordinates the event actually has", () => {
    // The independent check: the foot on the x′ axis must be the inverse boost of
    // ( x′, 0 ), and the foot on the ct′ axis the inverse boost of ( 0, ct′ ).
    // Neither is how axisProjections computes them, so agreement is evidence
    // rather than restatement.
    for (const beta of BETA_SWEEP) {
      for (const event of [new Vector2(3, 2), new Vector2(-2, 1), new Vector2(0, 0), new Vector2(4, -3)]) {
        const primed = boostEvent(event, beta);
        const { ontoSpaceAxis, ontoTimeAxis } = axisProjections(event, beta);
        expect(ontoSpaceAxis.x).toBeCloseTo(boostEvent(new Vector2(primed.x, 0), -beta).x, 10);
        expect(ontoSpaceAxis.y).toBeCloseTo(boostEvent(new Vector2(primed.x, 0), -beta).y, 10);
        expect(ontoTimeAxis.x).toBeCloseTo(boostEvent(new Vector2(0, primed.y), -beta).x, 10);
        expect(ontoTimeAxis.y).toBeCloseTo(boostEvent(new Vector2(0, primed.y), -beta).y, 10);
      }
    }
  });

  it("puts each foot on the axis it is named for", () => {
    // The x′ axis is ct = βx and the ct′ axis is x = β·ct; a foot that is not on
    // its axis is not a coordinate reading of anything.
    for (const beta of BETA_SWEEP) {
      const { ontoSpaceAxis, ontoTimeAxis } = axisProjections(new Vector2(3, 2), beta);
      expect(ontoSpaceAxis.y).toBeCloseTo(beta * ontoSpaceAxis.x, 10);
      expect(ontoTimeAxis.x).toBeCloseTo(beta * ontoTimeAxis.y, 10);
    }
  });

  it("collapses to dropping perpendiculars at β = 0", () => {
    const { ontoSpaceAxis, ontoTimeAxis } = axisProjections(new Vector2(3, 2), 0);
    expect(ontoSpaceAxis.x).toBeCloseTo(3, 12);
    expect(ontoSpaceAxis.y).toBeCloseTo(0, 12);
    expect(ontoTimeAxis.x).toBeCloseTo(0, 12);
    expect(ontoTimeAxis.y).toBeCloseTo(2, 12);
  });

  it("travels parallel to the other axis to get there", () => {
    // The whole point: you reach the x′ axis along ct′ (direction β,1) and the
    // ct′ axis along x′ (direction 1,β). Check the displacement's direction, not
    // its length.
    for (const beta of [-0.8, -0.3, 0.3, 0.8]) {
      const event = new Vector2(3, 2);
      const { ontoSpaceAxis, ontoTimeAxis } = axisProjections(event, beta);
      const towardSpaceAxis = ontoSpaceAxis.minus(event);
      const towardTimeAxis = ontoTimeAxis.minus(event);
      expect(towardSpaceAxis.x).toBeCloseTo(beta * towardSpaceAxis.y, 10);
      expect(towardTimeAxis.y).toBeCloseTo(beta * towardTimeAxis.x, 10);
    }
  });
});
