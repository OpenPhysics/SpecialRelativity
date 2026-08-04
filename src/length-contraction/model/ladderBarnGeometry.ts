/**
 * ladderBarnGeometry.ts
 *
 * Pure geometry for the ladder-and-barn experiment: a ladder of proper length L₀
 * flying at β through a barn of proper length B, whose two doors are wired to one
 * switch and slam shut **together in the barn's frame**.
 *
 * ── The one arrangement the whole screen rests on ─────────────────────────────
 * Take the origin of the barn frame to be the event "the ladder's centre passes
 * the barn's centre". Then the barn's doors sit at x = ∓B/2 for all time, and the
 * two slams are the events
 *
 *     entrance slam  ( −B/2, 0 )        exit slam  ( +B/2, 0 )
 *
 * Their separation is Δx = B, Δct = 0. That is **spacelike for every non-zero
 * barn**, which is the fact the screen exists to make concrete: no frame's answer
 * to "which door shut first?" is the wrong one, because no signal could have
 * travelled from one slam to the other.
 *
 * Everything else is bookkeeping around those two events:
 *
 *  - in the **barn** frame the ladder is contracted to L₀/γ, so it is briefly
 *    inside with both doors shut, provided L₀/γ < B;
 *  - in the **ladder** frame the *barn* is contracted to B/γ, so the ladder never
 *    fits, and the slams are 2·γβB/2 = γβB apart — the exit door shutting and
 *    reopening while the tail is still outside, the entrance door long after the
 *    nose is out.
 *
 * Both frames are right. They disagree about which events are simultaneous, and
 * about nothing else.
 *
 * ── Conventions ───────────────────────────────────────────────────────────────
 * Natural units, c = 1: lengths in light-seconds, times in seconds. An event is a
 * `Vector2( x, ct )` in **barn-frame** coordinates, matching the rest of the sim —
 * the screen's spacetime diagram is always drawn in the barn frame, and the
 * ladder frame appears on it as a sheared mesh rather than as a second diagram.
 */

import { Vector2 } from "scenerystack/dot";
import { boostEvent, gammaOf, sanitizeBeta } from "../../common/model/lorentz.js";

/** Which observer's rulers and clocks the scene is being described with. */
export const ObservationFrame = {
  /** At rest with the barn. The ladder moves at +β and is contracted. */
  BARN: "barn",
  /** At rest with the ladder. The barn moves at −β and is contracted. */
  LADDER: "ladder",
} as const;

export type ObservationFrame = (typeof ObservationFrame)[keyof typeof ObservationFrame];

/** The experiment as configured: two proper lengths and a speed. */
export type LadderBarnSetup = {
  /** Proper length of the barn, in light-seconds. At rest in the barn frame. */
  readonly barnLength: number;
  /** Proper length of the ladder, in light-seconds. At rest in the ladder frame. */
  readonly ladderLength: number;
  /** Speed of the ladder through the barn, as a fraction of c. Positive, to the right. */
  readonly beta: number;
};

/** One object's extent along x at one instant, in the frame doing the measuring. */
export type Span = {
  readonly left: number;
  readonly right: number;
};

/** Where both objects are at one instant of some frame's time. */
export type Snapshot = {
  readonly barn: Span;
  readonly ladder: Span;
};

/** Length of a span. Always non-negative for the spans this module produces. */
export const spanLength = (span: Span): number => span.right - span.left;

/**
 * Length of a rod of proper length `properLength` as measured in a frame it moves
 * through at β: L₀/γ, the one formula on this screen.
 *
 * Note which way round it goes. A rod is *shortest* in the frames it moves fastest
 * through and longest in its own, so "the ladder is 3 ls long" and "the ladder is
 * 5 ls long" are both true statements about the same ladder, made by observers who
 * measured it differently — not a disagreement about the ladder.
 */
export const contractedLength = (properLength: number, beta: number): number => properLength / gammaOf(beta);

/**
 * Where the barn and the ladder are at time `time` on `frame`'s clock, with x
 * measured by that same frame.
 *
 * The two frames' clocks are set so that t = t′ = 0 is the single event "the
 * ladder's centre passes the barn's centre" — the one instant both frames can
 * point at without argument, which is what makes a single scene-time number
 * meaningful when the frame toggle is flipped.
 */
export const snapshotAt = (setup: LadderBarnSetup, frame: ObservationFrame, time: number): Snapshot => {
  const beta = sanitizeBeta(setup.beta);
  const gamma = gammaOf(beta);

  if (frame === ObservationFrame.BARN) {
    const barnHalf = setup.barnLength / 2;
    const ladderHalf = setup.ladderLength / (2 * gamma);
    const ladderCentre = beta * time;
    return {
      barn: { left: -barnHalf, right: barnHalf },
      ladder: { left: ladderCentre - ladderHalf, right: ladderCentre + ladderHalf },
    };
  }

  // In the ladder's frame the ladder stands still at its full proper length and
  // the barn sweeps past to the left, contracted.
  const barnHalf = setup.barnLength / (2 * gamma);
  const ladderHalf = setup.ladderLength / 2;
  const barnCentre = -beta * time;
  return {
    barn: { left: barnCentre - barnHalf, right: barnCentre + barnHalf },
    ladder: { left: -ladderHalf, right: ladderHalf },
  };
};

/** The entrance door's slam, in barn-frame ( x, ct ). The ladder arrives from the left. */
export const entranceSlamEvent = (setup: LadderBarnSetup): Vector2 => new Vector2(-setup.barnLength / 2, 0);

/** The exit door's slam, in barn-frame ( x, ct ). */
export const exitSlamEvent = (setup: LadderBarnSetup): Vector2 => new Vector2(setup.barnLength / 2, 0);

/** When each door slams, on `frame`'s clock. */
export type SlamTimes = {
  readonly entrance: number;
  readonly exit: number;
};

/**
 * The two slam times as `frame` reads them.
 *
 * In the barn frame they are both zero — the doors are on one switch, and that is
 * what the switch means. In the ladder frame they are ±γβB/2: the exit door slams
 * **first**, by γβB, and there is no instant on the ladder's clock at which both
 * doors are shut.
 *
 * Computed by boosting the two events rather than by writing ±γβB/2 out, so this
 * cannot drift away from {@link boostEvent}.
 */
export const slamTimes = (setup: LadderBarnSetup, frame: ObservationFrame): SlamTimes => {
  if (frame === ObservationFrame.BARN) {
    return { entrance: entranceSlamEvent(setup).y, exit: exitSlamEvent(setup).y };
  }
  const beta = sanitizeBeta(setup.beta);
  return {
    entrance: boostEvent(entranceSlamEvent(setup), beta).y,
    exit: boostEvent(exitSlamEvent(setup), beta).y,
  };
};

/** True when the ladder lies wholly between the two doors at that instant. */
export const isEntirelyInside = (snapshot: Snapshot): boolean =>
  snapshot.ladder.left >= snapshot.barn.left && snapshot.ladder.right <= snapshot.barn.right;

/**
 * Whether the ladder ever fits between the doors, as `frame` measures things.
 *
 * The barn frame compares L₀/γ with B; the ladder frame compares L₀ with B/γ. Both
 * comparisons are of two lengths measured at one instant of the frame making them,
 * which is the only way a length can be measured — and the reason the two frames
 * can answer differently without either being wrong.
 */
export const fitsIn = (setup: LadderBarnSetup, frame: ObservationFrame): boolean => {
  const gamma = gammaOf(setup.beta);
  return frame === ObservationFrame.BARN
    ? setup.ladderLength / gamma <= setup.barnLength
    : setup.ladderLength <= setup.barnLength / gamma;
};

/**
 * Half-width of the time window, on `frame`'s clock, over which the ladder and the
 * barn overlap at all — from "the near end of one reaches the far end of the
 * other" to the mirror-image moment on the way out. Symmetric about t = 0 because
 * the origin was chosen at the centres' crossing.
 *
 * Returns Infinity at β = 0, where nothing passes anything; callers bound β away
 * from zero rather than special-casing the result.
 */
export const passHalfWindow = (setup: LadderBarnSetup, frame: ObservationFrame): number => {
  const beta = Math.abs(sanitizeBeta(setup.beta));
  const gamma = gammaOf(beta);
  const combined =
    frame === ObservationFrame.BARN
      ? setup.barnLength + setup.ladderLength / gamma
      : setup.ladderLength + setup.barnLength / gamma;
  return combined / (2 * beta);
};

/** Fraction of extra time left either side of the pass, so it does not start mid-air. */
const SCENE_WINDOW_MARGIN = 1.08;

/**
 * Half-width of the time window the screen animates over, on `frame`'s clock:
 * wide enough for the whole pass *and* for both door slams, whichever reaches
 * further, plus a little air.
 *
 * The two are not the same bound. In the ladder's frame the slams are γβB apart
 * while the barn goes by in (L₀ + B/γ)/β, and past β ≈ 0.9 the slams are the wider
 * of the two — which is itself worth seeing, since it says the entrance door shuts
 * long after the barn has left the ladder behind.
 */
export const sceneHalfWindow = (setup: LadderBarnSetup, frame: ObservationFrame): number => {
  const { entrance, exit } = slamTimes(setup, frame);
  const reach = Math.max(passHalfWindow(setup, frame), Math.abs(entrance), Math.abs(exit));
  return reach * SCENE_WINDOW_MARGIN;
};

/**
 * The two ends of an object, at one instant of `frame`, expressed as **barn-frame**
 * events so they can be drawn on the diagram.
 *
 * This is the step the diagram is for. A "length" is two ends taken at one instant,
 * and which pairs of ends count as simultaneous is exactly what the two frames
 * disagree about — so the ladder frame's measuring stick lands on the diagram as a
 * *tilted* segment, and its shorter appearance against the barn's vertical strip is
 * the disagreement drawn rather than asserted.
 */
const sliceInLab = (
  setup: LadderBarnSetup,
  frame: ObservationFrame,
  time: number,
  span: (snapshot: Snapshot) => Span,
): [Vector2, Vector2] => {
  const { left, right } = span(snapshotAt(setup, frame, time));
  if (frame === ObservationFrame.BARN) {
    return [new Vector2(left, time), new Vector2(right, time)];
  }
  // Ladder-frame coordinates back into the barn frame: the inverse boost is the
  // boost by −β.
  const beta = sanitizeBeta(setup.beta);
  return [boostEvent(new Vector2(left, time), -beta), boostEvent(new Vector2(right, time), -beta)];
};

/** The ladder's two ends at one instant of `frame`, in barn-frame coordinates. */
export const ladderSliceInLab = (setup: LadderBarnSetup, frame: ObservationFrame, time: number): [Vector2, Vector2] =>
  sliceInLab(setup, frame, time, (snapshot) => snapshot.ladder);

/** The barn's two doors at one instant of `frame`, in barn-frame coordinates. */
export const barnSliceInLab = (setup: LadderBarnSetup, frame: ObservationFrame, time: number): [Vector2, Vector2] =>
  sliceInLab(setup, frame, time, (snapshot) => snapshot.barn);

/**
 * The four corners of the band an object's two ends sweep out over
 * ct ∈ [−extent, +extent], as a closed polygon in barn-frame coordinates.
 *
 * The barn's band is an upright strip and the ladder's is a leaning one; where they
 * cross is every event at which some part of the ladder is inside the barn. The
 * containment question is then plainly a question about which *slice* of that
 * crossing you take, which is the whole resolution in one picture.
 */
const sheetCorners = (leftAt: (ct: number) => number, rightAt: (ct: number) => number, extent: number): Vector2[] => [
  new Vector2(leftAt(-extent), -extent),
  new Vector2(rightAt(-extent), -extent),
  new Vector2(rightAt(extent), extent),
  new Vector2(leftAt(extent), extent),
];

/** The barn's world-sheet: an upright strip of width B centred on x = 0. */
export const barnSheet = (setup: LadderBarnSetup, ctExtent: number): Vector2[] => {
  const half = setup.barnLength / 2;
  return sheetCorners(
    () => -half,
    () => half,
    ctExtent,
  );
};

/** The ladder's world-sheet: a strip of barn-frame width L₀/γ leaning over by β. */
export const ladderSheet = (setup: LadderBarnSetup, ctExtent: number): Vector2[] => {
  const beta = sanitizeBeta(setup.beta);
  const half = contractedLength(setup.ladderLength, beta) / 2;
  return sheetCorners(
    (ct) => beta * ct - half,
    (ct) => beta * ct + half,
    ctExtent,
  );
};
