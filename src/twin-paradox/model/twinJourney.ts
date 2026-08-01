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

/**
 * One light pulse: where and when it left, and where and when it arrived. Both
 * points are lab-frame `Vector2( x, ct )`, so the segment between them is drawn
 * at 45° on the diagram — as every light ray must be.
 */
export type LightSignal = {
  readonly emit: Vector2;
  readonly receive: Vector2;
};

/**
 * Safety stop on the pulse trains. The interval is a fixed constant and the trip
 * is bounded, so this is never reached in practice; it exists so a degenerate
 * turn (interval driven to zero by a future edit) cannot spin forever.
 */
const MAX_SIGNALS = 200;

/**
 * Pulses the stay-at-home twin sends out, one every `interval` of *their own*
 * time, and where each one catches the traveller.
 *
 * An outbound pulse chases a receding target and takes t_e/(1−|β|) to land; once
 * the traveller has turned it meets them head-on instead. Both cases come out of
 * the same "the pulse moves at c, the traveller at β" bookkeeping, which is why
 * they are solved separately here rather than papered over with one formula.
 *
 * ── What this is for ──────────────────────────────────────────────────────────
 * The twin paradox is usually argued from coordinates, and a student's fair
 * objection is that coordinates are exactly the thing they have been told not to
 * trust. Pulses are not coordinates: each twin can *count* the flashes they
 * actually see. Counting them settles the argument, and it settles it the same
 * way — see the accounting checked in the tests.
 */
export const earthSignals = (turnaround: Vector2, interval: number): LightSignal[] => {
  if (interval <= 0) {
    return [];
  }

  const beta = outboundBeta(turnaround);
  const speed = Math.abs(beta);
  const turnTime = turnaround.y;
  const reunion = reunionTime(turnaround);
  const signals: LightSignal[] = [];

  for (let index = 1; index <= MAX_SIGNALS; index++) {
    const emitTime = index * interval;
    if (emitTime > reunion) {
      break;
    }

    // Chasing the outbound traveller; if that lands after the turn, the pulse
    // actually meets them on the way back instead. The turn's distance is taken
    // as speed·turnTime rather than from turnaround.x so it agrees with the
    // worldline {@link travellerAt} draws, which is built from the same β.
    const chase = emitTime / (1 - speed);
    const receiveTime = chase <= turnTime ? chase : (emitTime + 2 * speed * turnTime) / (1 + speed);

    if (receiveTime > reunion) {
      break;
    }
    signals.push({
      emit: new Vector2(0, emitTime),
      receive: travellerAt(turnaround, receiveTime).position,
    });
  }
  return signals;
};

/**
 * Pulses the travelling twin sends home, one every `interval` of *their own*
 * (proper) time, and where each one reaches Earth.
 *
 * Emission times are spaced by γ·interval in lab time — that stretch is the
 * traveller's time dilation, expressed as something the Earth twin can count
 * rather than something they must be told. Each pulse then flies straight back
 * to x = 0, taking |x| to get there.
 */
export const travellerSignals = (turnaround: Vector2, interval: number): LightSignal[] => {
  if (interval <= 0) {
    return [];
  }

  const gamma = gammaOf(outboundBeta(turnaround));
  const totalProperTime = travellerProperTime(turnaround);
  const signals: LightSignal[] = [];

  for (let index = 1; index <= MAX_SIGNALS; index++) {
    const properTime = index * interval;
    if (properTime > totalProperTime) {
      break;
    }
    const emitTime = properTime * gamma;
    const emit = travellerAt(turnaround, emitTime).position;
    signals.push({
      emit,
      receive: new Vector2(0, emitTime + Math.abs(emit.x)),
    });
  }
  return signals;
};

/** How many of `signals` have arrived by lab time `labTime`. */
export const signalsReceivedBy = (signals: readonly LightSignal[], labTime: number): number =>
  signals.filter((signal) => signal.receive.y <= labTime).length;
