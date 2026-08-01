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
  earthSignals,
  JourneyLeg,
  outboundBeta,
  reunionTime,
  signalsReceivedBy,
  simultaneityJump,
  travellerAt,
  travellerClockAt,
  travellerNow,
  travellerProperTime,
  travellerSignals,
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

describe("the light signals the twins exchange", () => {
  const INTERVAL = 1;

  it("sends one pulse per second of the sender's own time", () => {
    for (const turn of TURNS) {
      // Earth's schedule is lab time; the traveller's is proper time, so their
      // emissions are spread by γ in lab time — the dilation, made countable.
      const earth = earthSignals(turn, INTERVAL);
      earth.forEach((signal, index) => {
        expect(signal.emit.x).toBe(0);
        expect(signal.emit.y).toBeCloseTo((index + 1) * INTERVAL, 10);
      });

      const gamma = gammaOf(outboundBeta(turn));
      travellerSignals(turn, INTERVAL).forEach((signal, index) => {
        expect(signal.emit.y).toBeCloseTo((index + 1) * INTERVAL * gamma, 10);
      });
    }
  });

  it("moves every pulse at exactly c", () => {
    // The independent check. Each segment is asserted to be a light ray by the
    // only test that means anything: |Δx| = Δct.
    for (const turn of TURNS) {
      for (const signal of [...earthSignals(turn, INTERVAL), ...travellerSignals(turn, INTERVAL)]) {
        const dx = signal.receive.x - signal.emit.x;
        const dct = signal.receive.y - signal.emit.y;
        expect(dct).toBeGreaterThanOrEqual(0);
        expect(Math.abs(dx)).toBeCloseTo(dct, 10);
      }
    }
  });

  it("delivers each pulse to a point on the receiver's worldline", () => {
    for (const turn of TURNS) {
      for (const signal of earthSignals(turn, INTERVAL)) {
        // Landed on the traveller: the reception event must be where the
        // traveller is at that moment.
        const traveller = travellerAt(turn, signal.receive.y).position;
        expect(signal.receive.x).toBeCloseTo(traveller.x, 9);
      }
      for (const signal of travellerSignals(turn, INTERVAL)) {
        // Landed on Earth, which never leaves x = 0.
        expect(signal.receive.x).toBe(0);
        expect(signal.emit.x).toBeCloseTo(travellerAt(turn, signal.emit.y).position.x, 10);
      }
    }
  });

  it("lets each twin see the other's whole clock by the reunion", () => {
    // This is the resolution of the paradox stated in flashes rather than in
    // coordinates, and it is the reason the pulses are worth drawing. By the
    // reunion the traveller has seen *every* pulse Earth sent — one per Earth
    // second, all of them — while Earth has seen only the traveller's fewer
    // ones. Neither twin has to be told whose clock ran slow; they counted.
    for (const turn of TURNS) {
      const reunion = reunionTime(turn);
      const properTime = travellerProperTime(turn);

      const earth = earthSignals(turn, INTERVAL);
      const traveller = travellerSignals(turn, INTERVAL);

      expect(signalsReceivedBy(earth, reunion + 1e-9)).toBe(Math.floor(reunion / INTERVAL + 1e-9));
      expect(signalsReceivedBy(traveller, reunion + 1e-9)).toBe(Math.floor(properTime / INTERVAL + 1e-9));

      // …and the traveller therefore sees more flashes than they send, which is
      // the same statement as "the Earth clock ran ahead".
      if (properTime < reunion - INTERVAL) {
        expect(earth.length).toBeGreaterThan(traveller.length);
      }
    }
  });

  it("stretches the outbound gaps and crowds the inbound ones", () => {
    // The Doppler signature of the trip: pulses arriving while the traveller
    // recedes are spaced by more than the interval, and those arriving on the
    // way back by less. Nothing computes a Doppler factor here — the spacing
    // falls out of the geometry.
    // A slower trip, so that several pulses land before the turn as well as
    // after it — at the default speed the traveller outruns all but one.
    const turn = new Vector2(1, 4);
    const signals = earthSignals(turn, INTERVAL);
    const gaps = signals.slice(1).map((signal, index) => {
      const previous = signals[index] as (typeof signals)[number];
      return signal.receive.y - previous.receive.y;
    });
    const receivedOnLeg = (index: number, leg: JourneyLeg): boolean => {
      const signal = signals[index + 1] as (typeof signals)[number];
      return travellerAt(turn, signal.receive.y).leg === leg;
    };
    const outbound = gaps.filter((_, index) => receivedOnLeg(index, JourneyLeg.OUTBOUND));
    const inbound = gaps.filter((_, index) => receivedOnLeg(index, JourneyLeg.INBOUND));
    expect(outbound.length).toBeGreaterThan(0);
    expect(inbound.length).toBeGreaterThan(0);
    for (const gap of outbound) {
      expect(gap).toBeGreaterThan(INTERVAL);
    }
    for (const gap of inbound) {
      expect(gap).toBeLessThan(INTERVAL);
    }
  });

  it("counts only the pulses that have arrived", () => {
    const turn = new Vector2(3, 4);
    const signals = earthSignals(turn, INTERVAL);
    expect(signalsReceivedBy(signals, 0)).toBe(0);
    expect(signalsReceivedBy(signals, reunionTime(turn) + 1)).toBe(signals.length);
    for (const signal of signals) {
      expect(signalsReceivedBy(signals, signal.receive.y)).toBeGreaterThan(0);
    }
  });

  it("returns nothing for a degenerate interval", () => {
    expect(earthSignals(new Vector2(3, 4), 0)).toEqual([]);
    expect(travellerSignals(new Vector2(3, 4), -1)).toEqual([]);
  });
});
