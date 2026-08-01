/**
 * TwinParadoxModel.ts
 *
 * One draggable event — the turn — determines the entire journey: how fast the
 * travelling twin goes, how far, how long each twin's clock runs, and how much
 * Earth time the traveller skips over when they change frames.
 *
 * Unlike the other screens, β here is **derived, not chosen**. The turn's position
 * fixes the outbound speed, so there is no independent velocity slider: a trip is
 * specified by where and when you turn around, and the speed follows. That is
 * also why this screen has no SpecialRelativityModel — its β is not a free
 * parameter.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Range, Vector2 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { gammaOf } from "../../common/model/lorentz.js";
import { SpacetimeEvent } from "../../common/model/SpacetimeEvent.js";
import { TimeModel } from "../../common/TimeModel.js";
import { MAX_REUNION_TIME, TWIN } from "../../SpecialRelativityConstants.js";
import {
  earthSignals,
  JourneyLeg,
  type LightSignal,
  outboundBeta,
  reunionTime,
  signalsReceivedBy,
  simultaneityJump,
  travellerAt,
  travellerClockAt,
  travellerNow,
  travellerProperTime,
  travellerSignals,
} from "./twinJourney.js";

/** Range of the journey scrubber, in seconds of Earth time. */
export const JOURNEY_TIME_RANGE = new Range(0, MAX_REUNION_TIME);

export class TwinParadoxModel implements TModel {
  /** The single event that defines the whole trip. */
  public readonly turnaround: SpacetimeEvent;

  /**
   * Playback state — running or not, and how fast. The elapsed time itself lives
   * in {@link journeyTimeProperty} rather than in the timer, because on this
   * screen the playback clock **is** the Earth twin's clock and has to be both
   * scrubbable and bounded by the reunion. `timer.timeProperty` is unused here.
   */
  public readonly timer = new TimeModel();

  /**
   * Elapsed Earth time, in seconds — the master clock for this screen, and the
   * property the scrubber writes to.
   *
   * Calibrating playback in Earth seconds rather than in animation seconds means
   * the slider, the Earth readout and the diagram's ct axis are all the same
   * number, so scrubbing to "ct = 4" lands on the turn instead of somewhere that
   * has to be worked out. It is an accumulator, like `TimeModel.timeProperty`
   * that it replaces; everything *geometric* is still a closed form of it.
   */
  public readonly journeyTimeProperty = new NumberProperty(0, { range: JOURNEY_TIME_RANGE, units: "s" });

  /** Speed of both legs, as a fraction of c. Derived from the turn's position. */
  public readonly outboundBetaProperty: TReadOnlyProperty<number>;

  public readonly gammaProperty: TReadOnlyProperty<number>;

  /** Lab time at the reunion — and therefore the Earth twin's total elapsed time. */
  public readonly reunionTimeProperty: TReadOnlyProperty<number>;

  /** Total time on the traveller's clock for the round trip. */
  public readonly travellerTotalProperty: TReadOnlyProperty<number>;

  /** Earth time skipped over at the turn: the jump in the traveller's "now". */
  public readonly simultaneityJumpProperty: TReadOnlyProperty<number>;

  /** How far through the journey playback is, from 0 to 1. */
  public readonly journeyFractionProperty: TReadOnlyProperty<number>;

  /** Current lab time along the journey. */
  public readonly currentLabTimeProperty: TReadOnlyProperty<number>;

  /** Where the traveller currently is, in lab coordinates. */
  public readonly travellerPositionProperty: TReadOnlyProperty<Vector2>;

  /** What the Earth clock currently reads — the same as the current lab time. */
  public readonly earthClockProperty: TReadOnlyProperty<number>;

  /** What the traveller's clock currently reads. */
  public readonly travellerClockProperty: TReadOnlyProperty<number>;

  /** The moment on Earth the traveller currently calls "now". */
  public readonly travellerNowProperty: TReadOnlyProperty<number>;

  /**
   * Velocity of the frame the traveller is *currently* riding in: +β outbound,
   * −β inbound. This is the quantity that changes discontinuously at the turn,
   * and it is what tilts their line of simultaneity the other way.
   */
  public readonly currentLegBetaProperty: TReadOnlyProperty<number>;

  /** Pulses the Earth twin sends, one per second of their own time. */
  public readonly earthSignalsProperty: TReadOnlyProperty<LightSignal[]>;

  /** Pulses the travelling twin sends, one per second of their own time. */
  public readonly travellerSignalsProperty: TReadOnlyProperty<LightSignal[]>;

  /** How many Earth pulses the traveller has seen so far. */
  public readonly signalsSeenByTravellerProperty: TReadOnlyProperty<number>;

  /** How many traveller pulses the Earth twin has seen so far. */
  public readonly signalsSeenByEarthProperty: TReadOnlyProperty<number>;

  public readonly showSimultaneityProperty = new BooleanProperty(true);

  /**
   * Whether the twins' light pulses are drawn. Off by default: the simultaneity
   * line is the screen's first argument and the pulses are its cross-check, and
   * both at once is a busy diagram.
   */
  public readonly showSignalsProperty = new BooleanProperty(false);

  public constructor() {
    const bounds = new Bounds2(
      -TWIN.MAX_TURNAROUND_X,
      TWIN.MIN_TURNAROUND_CT,
      TWIN.MAX_TURNAROUND_X,
      TWIN.MAX_TURNAROUND_CT,
    );
    this.turnaround = new SpacetimeEvent(
      "turnaround",
      new Vector2(TWIN.DEFAULT_TURNAROUND_X, TWIN.DEFAULT_TURNAROUND_CT),
      bounds,
    );

    this.outboundBetaProperty = new DerivedProperty([this.turnaround.positionProperty], (position) =>
      outboundBeta(position),
    );
    this.gammaProperty = new DerivedProperty([this.outboundBetaProperty], (beta) => gammaOf(beta));
    this.reunionTimeProperty = new DerivedProperty([this.turnaround.positionProperty], (position) =>
      reunionTime(position),
    );
    this.travellerTotalProperty = new DerivedProperty([this.turnaround.positionProperty], (position) =>
      travellerProperTime(position),
    );
    this.simultaneityJumpProperty = new DerivedProperty([this.turnaround.positionProperty], (position) =>
      simultaneityJump(position),
    );

    // Dragging the turn can shorten the trip under a clock that has already run
    // past the new reunion, so the journey time is clamped rather than trusted.
    this.currentLabTimeProperty = new DerivedProperty(
      [this.journeyTimeProperty, this.reunionTimeProperty],
      (journeyTime, reunion) => Math.max(0, Math.min(journeyTime, reunion)),
    );

    this.journeyFractionProperty = new DerivedProperty(
      [this.currentLabTimeProperty, this.reunionTimeProperty],
      (labTime, reunion) => (reunion === 0 ? 0 : labTime / reunion),
    );

    this.travellerPositionProperty = new DerivedProperty(
      [this.turnaround.positionProperty, this.currentLabTimeProperty],
      (turnaround, labTime) => travellerAt(turnaround, labTime).position,
    );

    this.earthClockProperty = this.currentLabTimeProperty;

    this.travellerClockProperty = new DerivedProperty(
      [this.turnaround.positionProperty, this.currentLabTimeProperty],
      (turnaround, labTime) => travellerClockAt(turnaround, labTime),
    );

    this.travellerNowProperty = new DerivedProperty(
      [this.turnaround.positionProperty, this.currentLabTimeProperty],
      (turnaround, labTime) => travellerNow(turnaround, labTime),
    );

    this.currentLegBetaProperty = new DerivedProperty(
      [this.turnaround.positionProperty, this.currentLabTimeProperty, this.outboundBetaProperty],
      (turnaround, labTime, beta) => (travellerAt(turnaround, labTime).leg === JourneyLeg.OUTBOUND ? beta : -beta),
    );

    this.earthSignalsProperty = new DerivedProperty([this.turnaround.positionProperty], (turnaround) =>
      earthSignals(turnaround, TWIN.SIGNAL_INTERVAL),
    );
    this.travellerSignalsProperty = new DerivedProperty([this.turnaround.positionProperty], (turnaround) =>
      travellerSignals(turnaround, TWIN.SIGNAL_INTERVAL),
    );

    this.signalsSeenByTravellerProperty = new DerivedProperty(
      [this.earthSignalsProperty, this.currentLabTimeProperty],
      (signals, labTime) => signalsReceivedBy(signals, labTime),
    );
    this.signalsSeenByEarthProperty = new DerivedProperty(
      [this.travellerSignalsProperty, this.currentLabTimeProperty],
      (signals, labTime) => signalsReceivedBy(signals, labTime),
    );

    // Pressing play once the twins are back together replays the trip rather
    // than doing nothing, which is what a play button that cannot advance
    // otherwise looks like.
    this.timer.isPlayingProperty.lazyLink((isPlaying) => {
      if (isPlaying && this.journeyTimeProperty.value >= this.reunionTimeProperty.value) {
        this.journeyTimeProperty.value = 0;
      }
    });
  }

  /**
   * Keeps the turn inside the light cone. A rectangle cannot express "timelike",
   * so dragging past the cone slides the turn along it rather than stopping dead
   * — which reads as a wall the trip cannot cross, and is exactly what it is.
   */
  public constrainTurnaround(point: Vector2): Vector2 {
    const clamped = this.turnaround.dragBoundsProperty.value.closestPointTo(point);
    const maxAbsX = clamped.y / TWIN.MIN_TIME_TO_SPACE_RATIO;
    return new Vector2(Math.max(-maxAbsX, Math.min(maxAbsX, clamped.x)), clamped.y);
  }

  public step(dt: number): void {
    this.advance(this.timer.scaledDt(dt));
  }

  public stepForward(dt: number): void {
    this.advance(dt);
  }

  public stepBackward(dt: number): void {
    this.advance(-dt);
  }

  /**
   * Move the journey clock, stopping it dead at the reunion. Playback pauses
   * there rather than running on: once the twins are standing together there is
   * nothing left for the screen to show, and a clock still counting would suggest
   * otherwise.
   */
  private advance(seconds: number): void {
    const reunion = this.reunionTimeProperty.value;
    const next = this.journeyTimeProperty.value + seconds;
    if (next >= reunion) {
      this.journeyTimeProperty.value = reunion;
      this.timer.isPlayingProperty.value = false;
    } else {
      this.journeyTimeProperty.value = Math.max(0, next);
    }
  }

  public reset(): void {
    this.turnaround.reset();
    this.timer.reset();
    this.journeyTimeProperty.reset();
    this.showSimultaneityProperty.reset();
    this.showSignalsProperty.reset();
  }

  public dispose(): void {
    this.signalsSeenByEarthProperty.dispose();
    this.signalsSeenByTravellerProperty.dispose();
    this.travellerSignalsProperty.dispose();
    this.earthSignalsProperty.dispose();
    this.currentLegBetaProperty.dispose();
    this.travellerNowProperty.dispose();
    this.travellerClockProperty.dispose();
    this.travellerPositionProperty.dispose();
    this.currentLabTimeProperty.dispose();
    this.journeyFractionProperty.dispose();
    this.simultaneityJumpProperty.dispose();
    this.travellerTotalProperty.dispose();
    this.reunionTimeProperty.dispose();
    this.gammaProperty.dispose();
    this.outboundBetaProperty.dispose();
    this.showSimultaneityProperty.dispose();
    this.showSignalsProperty.dispose();
    this.journeyTimeProperty.dispose();
    this.turnaround.dispose();
    this.timer.dispose();
  }
}
