/**
 * ladderBarnGeometry.test.ts
 *
 * The Length Contraction screen makes three claims, and each gets its own layer
 * of checks:
 *
 *   1. each object is measured shorter by exactly γ in the frame it moves through;
 *   2. the two frames disagree about whether the ladder fits, and the region of
 *      the parameter space where they disagree is exactly B/γ² < L₀/γ < B;
 *   3. the disagreement is *only* about simultaneity — the two door slams are one
 *      pair of events, spacelike separated, and every frame agrees on the events
 *      themselves and on the interval between them.
 *
 * Layer 2 is the one that earns its keep: the fitting verdicts are re-derived here
 * from the snapshots the view actually draws, rather than by restating
 * {@link fitsIn}'s own comparison, and the frames' door-slam times are checked
 * against an independent Lorentz transform of the slam events.
 */

import type { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { boostEvent, gammaOf, intervalSquared, Separation, separationOf } from "../src/common/model/lorentz.js";
import {
  barnSheet,
  barnSliceInLab,
  contractedLength,
  entranceSlamEvent,
  exitSlamEvent,
  fitsIn,
  isEntirelyInside,
  type LadderBarnSetup,
  ladderSheet,
  ladderSliceInLab,
  ObservationFrame,
  passHalfWindow,
  sceneHalfWindow,
  slamTimes,
  snapshotAt,
  spanLength,
} from "../src/length-contraction/model/ladderBarnGeometry.js";

/** The screen's default configuration: γ = 5/3, so 5 ls contracts to exactly 3. */
const DEFAULT_SETUP: LadderBarnSetup = { barnLength: 4, ladderLength: 5, beta: 0.8 };

/** A sweep across the reachable parameter space, including both fitting regimes. */
const SETUPS: LadderBarnSetup[] = [
  DEFAULT_SETUP,
  { barnLength: 4, ladderLength: 2, beta: 0.1 },
  { barnLength: 4, ladderLength: 2, beta: 0.95 },
  { barnLength: 4, ladderLength: 8, beta: 0.95 },
  { barnLength: 4, ladderLength: 8, beta: 0.5 },
  { barnLength: 4, ladderLength: 5, beta: 0.6 },
];

const FRAMES = [ObservationFrame.BARN, ObservationFrame.LADDER] as const;

describe("contraction", () => {
  it("matches the hand-computed default case", () => {
    // γ( 0.8 ) = 5/3, so the 5 ls ladder is measured at 3 ls and the 4 ls barn at 2.4.
    expect(contractedLength(5, 0.8)).toBeCloseTo(3, 12);
    expect(contractedLength(4, 0.8)).toBeCloseTo(2.4, 12);
  });

  it("leaves a rest length alone and never lengthens one", () => {
    for (const setup of SETUPS) {
      expect(contractedLength(setup.ladderLength, 0)).toBeCloseTo(setup.ladderLength, 12);
      expect(contractedLength(setup.ladderLength, setup.beta)).toBeLessThanOrEqual(setup.ladderLength);
    }
  });

  it("gives each frame the other object's length divided by γ", () => {
    for (const setup of SETUPS) {
      const gamma = gammaOf(setup.beta);
      const inBarn = snapshotAt(setup, ObservationFrame.BARN, 0);
      const inLadder = snapshotAt(setup, ObservationFrame.LADDER, 0);

      expect(spanLength(inBarn.barn)).toBeCloseTo(setup.barnLength, 12);
      expect(spanLength(inBarn.ladder)).toBeCloseTo(setup.ladderLength / gamma, 12);
      expect(spanLength(inLadder.ladder)).toBeCloseTo(setup.ladderLength, 12);
      expect(spanLength(inLadder.barn)).toBeCloseTo(setup.barnLength / gamma, 12);
    }
  });

  it("holds each object's measured length fixed as the scene runs", () => {
    for (const setup of SETUPS) {
      for (const frame of FRAMES) {
        const half = sceneHalfWindow(setup, frame);
        const first = snapshotAt(setup, frame, -half);
        for (const time of [-half / 2, 0, half / 3, half]) {
          const later = snapshotAt(setup, frame, time);
          expect(spanLength(later.barn)).toBeCloseTo(spanLength(first.barn), 10);
          expect(spanLength(later.ladder)).toBeCloseTo(spanLength(first.ladder), 10);
        }
      }
    }
  });
});

describe("the two frames' verdicts", () => {
  /**
   * Independent check on {@link fitsIn}: walk the frame's own snapshots across the
   * whole pass and ask whether the ladder is ever wholly between the doors. This
   * cannot pass by restating fitsIn's comparison — it only knows where the four
   * ends are.
   */
  const everInsideBySampling = (setup: LadderBarnSetup, frame: ObservationFrame): boolean => {
    const half = passHalfWindow(setup, frame);
    const samples = 4001;
    for (let index = 0; index < samples; index++) {
      const time = -half + (2 * half * index) / (samples - 1);
      if (isEntirelyInside(snapshotAt(setup, frame, time))) {
        return true;
      }
    }
    return false;
  };

  it("agrees with a sweep of the actual snapshots", () => {
    for (const setup of SETUPS) {
      for (const frame of FRAMES) {
        expect(everInsideBySampling(setup, frame)).toBe(fitsIn(setup, frame));
      }
    }
  });

  it("puts the paradox exactly where the algebra says it is", () => {
    // Both frames' verdicts differ precisely when B/γ² < L₀/γ < B — the barn frame
    // sees the ladder fit and the ladder frame does not.
    for (const setup of SETUPS) {
      const gamma = gammaOf(setup.beta);
      const contracted = setup.ladderLength / gamma;
      const disagree =
        contracted <= setup.barnLength && contracted > setup.barnLength / (gamma * gamma) + Number.EPSILON;
      expect(fitsIn(setup, ObservationFrame.BARN) && !fitsIn(setup, ObservationFrame.LADDER)).toBe(disagree);
    }
  });

  it("has the default configuration land in the paradox regime", () => {
    expect(fitsIn(DEFAULT_SETUP, ObservationFrame.BARN)).toBe(true);
    expect(fitsIn(DEFAULT_SETUP, ObservationFrame.LADDER)).toBe(false);
  });

  it("never lets the ladder frame say yes while the barn frame says no", () => {
    // The ladder is at its longest in its own frame and the barn at its shortest,
    // so if it fits for the ladder it fits for everybody.
    for (const setup of SETUPS) {
      if (fitsIn(setup, ObservationFrame.LADDER)) {
        expect(fitsIn(setup, ObservationFrame.BARN)).toBe(true);
      }
    }
  });
});

describe("the door slams", () => {
  it("places them a barn apart at the same barn-frame instant", () => {
    for (const setup of SETUPS) {
      const entrance = entranceSlamEvent(setup);
      const exit = exitSlamEvent(setup);
      expect(exit.x - entrance.x).toBeCloseTo(setup.barnLength, 12);
      expect(entrance.y).toBe(0);
      expect(exit.y).toBe(0);
    }
  });

  it("separates them spacelike, whatever the setup", () => {
    for (const setup of SETUPS) {
      expect(separationOf(entranceSlamEvent(setup), exitSlamEvent(setup))).toBe(Separation.SPACELIKE);
    }
  });

  it("gives every frame the same interval between them", () => {
    for (const setup of SETUPS) {
      const displacement = exitSlamEvent(setup).minus(entranceSlamEvent(setup));
      const boosted = boostEvent(exitSlamEvent(setup), setup.beta).minus(
        boostEvent(entranceSlamEvent(setup), setup.beta),
      );
      expect(intervalSquared(boosted)).toBeCloseTo(intervalSquared(displacement), 10);
      expect(intervalSquared(displacement)).toBeCloseTo(setup.barnLength ** 2, 12);
    }
  });

  it("times them together in the barn frame and γβB apart in the ladder frame", () => {
    for (const setup of SETUPS) {
      const inBarn = slamTimes(setup, ObservationFrame.BARN);
      expect(inBarn.entrance).toBe(0);
      expect(inBarn.exit).toBe(0);

      // The closed form, checked against the boost the module actually applies.
      const inLadder = slamTimes(setup, ObservationFrame.LADDER);
      const expectedGap = gammaOf(setup.beta) * setup.beta * setup.barnLength;
      expect(inLadder.entrance - inLadder.exit).toBeCloseTo(expectedGap, 10);
      expect(inLadder.exit).toBeLessThan(inLadder.entrance);
    }
  });

  it("has the exit door shut while the nose is still inside, whenever the barn frame says it fits", () => {
    // The ladder frame's account has to be consistent too: no door may ever shut
    // through the ladder. This is the check that the resolution is a resolution
    // and not just two incompatible stories.
    for (const setup of SETUPS.filter((candidate) => fitsIn(candidate, ObservationFrame.BARN))) {
      const times = slamTimes(setup, ObservationFrame.LADDER);
      const atExitSlam = snapshotAt(setup, ObservationFrame.LADDER, times.exit);
      const atEntranceSlam = snapshotAt(setup, ObservationFrame.LADDER, times.entrance);
      // The exit door is at the barn's right edge; the ladder's nose must not be
      // past it. Likewise the tail must already be past the entrance door.
      expect(atExitSlam.ladder.right).toBeLessThanOrEqual(atExitSlam.barn.right + 1e-9);
      expect(atEntranceSlam.ladder.left).toBeGreaterThanOrEqual(atEntranceSlam.barn.left - 1e-9);
    }
  });
});

describe("slices in lab coordinates", () => {
  it("reproduces the barn frame's own snapshot unchanged", () => {
    for (const setup of SETUPS) {
      for (const time of [-1.3, 0, 2.4]) {
        const [left, right] = ladderSliceInLab(setup, ObservationFrame.BARN, time);
        const snapshot = snapshotAt(setup, ObservationFrame.BARN, time);
        expect(left.x).toBeCloseTo(snapshot.ladder.left, 12);
        expect(right.x).toBeCloseTo(snapshot.ladder.right, 12);
        expect(left.y).toBe(time);
        expect(right.y).toBe(time);
      }
    }
  });

  it("puts a ladder-frame slice on a line of slope β, not a horizontal one", () => {
    for (const setup of SETUPS) {
      for (const time of [-1.3, 0, 2.4]) {
        const [left, right] = ladderSliceInLab(setup, ObservationFrame.LADDER, time);
        // Constant t′ means ct = βx: the slice tilts by exactly β on the diagram.
        expect((right.y - left.y) / (right.x - left.x)).toBeCloseTo(setup.beta, 10);
      }
    }
  });

  it("boosts back to the length the measuring frame reported", () => {
    // Independent of snapshotAt's own arithmetic: take the two lab-frame ends of
    // the slice, transform them into the ladder frame, and measure there.
    for (const setup of SETUPS) {
      const [left, right] = ladderSliceInLab(setup, ObservationFrame.LADDER, 1.1);
      const leftPrimed = boostEvent(left, setup.beta);
      const rightPrimed = boostEvent(right, setup.beta);
      expect(rightPrimed.y - leftPrimed.y).toBeCloseTo(0, 10);
      expect(rightPrimed.x - leftPrimed.x).toBeCloseTo(setup.ladderLength, 10);
    }
  });

  it("keeps the barn's doors on their worldlines whichever frame slices them", () => {
    for (const setup of SETUPS) {
      for (const frame of FRAMES) {
        const [left, right] = barnSliceInLab(setup, frame, 0.7);
        expect(left.x).toBeCloseTo(-setup.barnLength / 2, 10);
        expect(right.x).toBeCloseTo(setup.barnLength / 2, 10);
      }
    }
  });
});

describe("world sheets", () => {
  it("gives the barn an upright strip of its own proper width", () => {
    for (const setup of SETUPS) {
      const corners = barnSheet(setup, 5);
      expect(corners).toHaveLength(4);
      for (const corner of corners) {
        expect(Math.abs(corner.x)).toBeCloseTo(setup.barnLength / 2, 12);
      }
    }
  });

  it("leans the ladder's strip over by exactly β and narrows it by γ", () => {
    for (const setup of SETUPS) {
      const [bottomLeft, bottomRight, topRight, topLeft] = ladderSheet(setup, 5) as [
        Vector2,
        Vector2,
        Vector2,
        Vector2,
      ];
      expect(bottomRight.x - bottomLeft.x).toBeCloseTo(setup.ladderLength / gammaOf(setup.beta), 10);
      expect(topRight.x - topLeft.x).toBeCloseTo(setup.ladderLength / gammaOf(setup.beta), 10);
      expect((topLeft.x - bottomLeft.x) / (topLeft.y - bottomLeft.y)).toBeCloseTo(setup.beta, 10);
    }
  });
});

describe("the scene window", () => {
  it("brackets the whole pass and both slams", () => {
    for (const setup of SETUPS) {
      for (const frame of FRAMES) {
        const half = sceneHalfWindow(setup, frame);
        const times = slamTimes(setup, frame);
        expect(half).toBeGreaterThanOrEqual(passHalfWindow(setup, frame));
        expect(half).toBeGreaterThanOrEqual(Math.abs(times.entrance));
        expect(half).toBeGreaterThanOrEqual(Math.abs(times.exit));
        expect(Number.isFinite(half)).toBe(true);
      }
    }
  });

  it("has the objects clear of each other at both ends of the pass", () => {
    for (const setup of SETUPS) {
      for (const frame of FRAMES) {
        const half = passHalfWindow(setup, frame);
        for (const time of [-half, half]) {
          const { barn, ladder } = snapshotAt(setup, frame, time);
          const overlap = Math.min(barn.right, ladder.right) - Math.max(barn.left, ladder.left);
          expect(overlap).toBeCloseTo(0, 9);
        }
      }
    }
  });
});
