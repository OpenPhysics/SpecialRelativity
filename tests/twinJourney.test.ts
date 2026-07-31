/**
 * twinJourney.test.ts
 *
 * The Twin Paradox screen makes two claims, and each gets its own check:
 *
 *   1. the travelling twin's clock reads the Earth clock divided by γ;
 *   2. the Earth time the traveller "never sees" is not missing — the two legs
 *      plus the jump at the turn account for every second of it.
 *
 * The second is the accounting identity that turns the paradox from a puzzle into
 * arithmetic, and it is checked independently of the formula that produces the
 * jump: the two legs' contributions are read off `travellerNow` at the ends of
 * each leg, and the jump is what is left over.
 */

import { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { gammaOf } from "../src/common/model/lorentz.js";
import {
  JourneyLeg,
  outboundBeta,
  reunionTime,
  simultaneityJump,
  travellerAt,
  travellerClockAt,
  travellerNow,
  travellerProperTime,
} from "../src/twin-paradox/model/twinJourney.js";

/** Turns spanning slow, the sim default, and close to the light cone. */
const TURNS = [new Vector2(1, 4), new Vector2(3, 4), new Vector2(2, 2.1), new Vector2(-3, 4), new Vector2(4, 4.2)];

describe("trip parameters", () => {
  it("reads the outbound speed straight off the turn", () => {
    expect(outboundBeta(new Vector2(3, 4))).toBeCloseTo(0.75, 12);
    expect(outboundBeta(new Vector2(-3, 4))).toBeCloseTo(-0.75, 12);
  });

  it("returns zero speed rather than dividing by zero at ct = 0", () => {
    expect(outboundBeta(new Vector2(2, 0))).toBe(0);
  });

  it("reunites the twins at twice the time of the turn", () => {
    for (const turn of TURNS) {
      expect(reunionTime(turn)).toBeCloseTo(2 * turn.y, 12);
    }
  });

  it("gives the traveller the Earth time divided by γ", () => {
    for (const turn of TURNS) {
      const gamma = gammaOf(outboundBeta(turn));
      expect(travellerProperTime(turn)).toBeCloseTo(reunionTime(turn) / gamma, 10);
    }
  });

  it("matches the hand-computed 3-4-5 case", () => {
    // Turn at ( 3, 4 ): each leg is √(4² − 3²) = √7, so the round trip is 2√7 ≈ 5.29
    // against the Earth twin's 8.
    expect(travellerProperTime(new Vector2(3, 4))).toBeCloseTo(2 * Math.sqrt(7), 12);
    expect(reunionTime(new Vector2(3, 4))).toBe(8);
  });

  it("always leaves the traveller younger", () => {
    for (const turn of TURNS) {
      expect(travellerProperTime(turn)).toBeLessThan(reunionTime(turn));
    }
  });
});

describe("the traveller's path", () => {
  it("leaves from, turns at, and returns to the right events", () => {
    for (const turn of TURNS) {
      expect(travellerAt(turn, 0).position.x).toBeCloseTo(0, 12);
      expect(travellerAt(turn, turn.y).position.x).toBeCloseTo(turn.x, 12);
      expect(travellerAt(turn, reunionTime(turn)).position.x).toBeCloseTo(0, 12);
    }
  });

  it("labels the legs on either side of the turn", () => {
    const turn = new Vector2(3, 4);
    expect(travellerAt(turn, 2).leg).toBe(JourneyLeg.OUTBOUND);
    expect(travellerAt(turn, 6).leg).toBe(JourneyLeg.INBOUND);
  });

  it("runs the traveller's clock at a steady 1/γ throughout", () => {
    for (const turn of TURNS) {
      const gamma = gammaOf(outboundBeta(turn));
      for (const labTime of [0, 1, turn.y, turn.y + 1, reunionTime(turn)]) {
        expect(travellerClockAt(turn, labTime)).toBeCloseTo(labTime / gamma, 10);
      }
    }
  });
});

describe("the jump in the traveller's now", () => {
  it("is continuous within each leg but not across the turn", () => {
    const turn = new Vector2(3, 4);
    // Two samples 0.01 s apart on the same leg move the traveller's "now" by a
    // small amount…
    const withinLeg = Math.abs(travellerNow(turn, 3.99) - travellerNow(turn, 3.98));
    expect(withinLeg).toBeLessThan(0.05);
    // …while two samples 0.01 s apart straddling the turn move it by the jump.
    const acrossTurn = Math.abs(travellerNow(turn, 4.005) - travellerNow(turn, 3.995));
    expect(acrossTurn).toBeGreaterThan(0.9 * simultaneityJump(turn));
  });

  it("accounts for every second of the Earth twin's elapsed time", () => {
    // The identity that dissolves the paradox. Nothing here reuses the closed
    // form for the jump: the legs' contributions come from travellerNow at the
    // ends of each leg, and the jump is measured as the gap between them.
    for (const turn of TURNS) {
      const reunion = reunionTime(turn);
      const outboundEnd = travellerNow(turn, turn.y);
      const inboundStart = travellerNow(turn, turn.y + 1e-9);
      const inboundEnd = travellerNow(turn, reunion);

      const outboundContribution = outboundEnd - travellerNow(turn, 0);
      const jump = inboundStart - outboundEnd;
      const inboundContribution = inboundEnd - inboundStart;

      expect(outboundContribution + jump + inboundContribution).toBeCloseTo(reunion, 6);
    }
  });

  it("has the size the closed form predicts", () => {
    for (const turn of TURNS) {
      const measured = travellerNow(turn, turn.y + 1e-9) - travellerNow(turn, turn.y);
      expect(measured).toBeCloseTo(simultaneityJump(turn), 6);
    }
  });

  it("vanishes only when the traveller never goes anywhere", () => {
    expect(simultaneityJump(new Vector2(0, 4))).toBeCloseTo(0, 12);
    for (const turn of TURNS) {
      expect(simultaneityJump(turn)).toBeGreaterThan(0);
    }
  });

  it("starts and ends agreeing with the Earth clock", () => {
    // At the departure and the reunion the twins are in the same place, so there
    // is nothing for them to disagree about.
    for (const turn of TURNS) {
      expect(travellerNow(turn, 0)).toBeCloseTo(0, 12);
      expect(travellerNow(turn, reunionTime(turn))).toBeCloseTo(reunionTime(turn), 10);
    }
  });
});
