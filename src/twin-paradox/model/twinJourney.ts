/**
 * twinJourney.ts
 *
 * Pure geometry for the out-and-back trip: two inertial legs meeting at a turn.
 *
 * The whole screen rests on one asymmetry. The stay-at-home twin's worldline is a
 * single straight line; the traveller's is two straight lines with a corner. Both
 * run between the same pair of events, so any difference in elapsed time is a
 * property of the *paths* and not of the endpoints — which is why there is no
 * paradox to resolve, only a corner to notice.
 */

import { Vector2 } from "scenerystack/dot";
import { gammaOf, sanitizeBeta } from "../../common/model/lorentz.js";

/** Which leg of the journey a moment belongs to. */
export const JourneyLeg = {
  OUTBOUND: "outbound",
  INBOUND: "inbound",
} as const;

export type JourneyLeg = (typeof JourneyLeg)[keyof typeof JourneyLeg];

/**
 * Speed of the outbound leg for a turn at `turnaround`, as a fraction of c.
 * Returns 0 for a degenerate turn at ct = 0, which the drag constraint prevents
 * but which a reset or a query parameter could still produce.
 */
export const outboundBeta = (turnaround: Vector2): number =>
  turnaround.y === 0 ? 0 : sanitizeBeta(turnaround.x / turnaround.y);

/** Lab time at which the twins are reunited: twice the time to the turn. */
export const reunionTime = (turnaround: Vector2): number => 2 * turnaround.y;

/**
 * Proper time the travelling twin accumulates over the whole trip.
 * Each leg contributes √(Δct² − Δx²), and the two legs are mirror images.
 */
export const travellerProperTime = (turnaround: Vector2): number =>
  2 * Math.sqrt(Math.max(0, turnaround.y * turnaround.y - turnaround.x * turnaround.x));

/** Where the traveller is at lab time `labTime`, and which leg they are on. */
export const travellerAt = (turnaround: Vector2, labTime: number): { position: Vector2; leg: JourneyLeg } => {
  const outbound = labTime <= turnaround.y;
  const x = outbound
    ? outboundBeta(turnaround) * labTime
    : turnaround.x - outboundBeta(turnaround) * (labTime - turnaround.y);
  return {
    position: new Vector2(x, labTime),
    leg: outbound ? JourneyLeg.OUTBOUND : JourneyLeg.INBOUND,
  };
};

/**
 * The moment on the stay-at-home twin's worldline (x = 0) that the traveller
 * currently calls "now" — where their line of simultaneity crosses it.
 *
 * On the outbound leg the traveller's frame moves at +β and on the inbound leg at
 * −β, so this quantity is **discontinuous at the turn**: it jumps forward by
 * 2·β·x_turn the instant the traveller changes frames. Nothing physical happens
 * to the Earth clock at that moment; what changes is which slice of spacetime the
 * traveller is calling simultaneous. That jump is the resolution of the paradox,
 * and {@link simultaneityJump} is its size.
 */
export const travellerNow = (turnaround: Vector2, labTime: number): number => {
  const { position, leg } = travellerAt(turnaround, labTime);
  const beta = outboundBeta(turnaround);
  const legBeta = leg === JourneyLeg.OUTBOUND ? beta : -beta;
  return position.y - legBeta * position.x;
};

/**
 * Earth time skipped over at the turn: 2·β·x_turn.
 *
 * Together with the two legs it accounts for the whole of the Earth twin's
 * elapsed time — see the accounting identity checked in the tests, which is the
 * precise sense in which "the traveller never sees those years pass" is true
 * without any of them going missing.
 *
 * Note the **signed** x rather than |x|: since β = x/ct, the product β·x is x²/ct
 * and so the jump is forward in time whichever direction the traveller went.
 * Using |x| here would make an outbound trip to the left report a jump backwards.
 */
export const simultaneityJump = (turnaround: Vector2): number => 2 * outboundBeta(turnaround) * turnaround.x;

/** Time on the traveller's own clock at lab time `labTime`: t/γ throughout, since |β| is constant. */
export const travellerClockAt = (turnaround: Vector2, labTime: number): number =>
  labTime / gammaOf(outboundBeta(turnaround));
