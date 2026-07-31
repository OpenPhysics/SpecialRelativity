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

import { BooleanProperty, DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { gammaOf } from "../../common/model/lorentz.js";
import { SpacetimeEvent } from "../../common/model/SpacetimeEvent.js";
import { TimeModel } from "../../common/TimeModel.js";
import { TWIN } from "../../SpecialRelativityConstants.js";
import {
  JourneyLeg,
  outboundBeta,
  reunionTime,
  simultaneityJump,
  travellerAt,
  travellerClockAt,
  travellerNow,
  travellerProperTime,
} from "./twinJourney.js";

/** Furthest the turn may be dragged, in light-seconds. */
const TURNAROUND_MAX_X = 4.2;
const TURNAROUND_MIN_CT = 0.6;
const TURNAROUND_MAX_CT = 4.4;

export class TwinParadoxModel implements TModel {
  /** The single event that defines the whole trip. */
  public readonly turnaround: SpacetimeEvent;

  /** Journey playback clock. Starts paused so the geometry can be set up first. */
  public readonly timer = new TimeModel();

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

  public readonly showSimultaneityProperty = new BooleanProperty(true);

  public constructor() {
    const bounds = new Bounds2(-TURNAROUND_MAX_X, TURNAROUND_MIN_CT, TURNAROUND_MAX_X, TURNAROUND_MAX_CT);
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

    this.journeyFractionProperty = new DerivedProperty([this.timer.timeProperty], (time) =>
      Math.max(0, Math.min(1, time / TWIN.JOURNEY_DURATION)),
    );

    this.currentLabTimeProperty = new DerivedProperty(
      [this.journeyFractionProperty, this.reunionTimeProperty],
      (fraction, reunion) => fraction * reunion,
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
    this.timer.step(dt);
  }

  public stepForward(dt: number): void {
    this.timer.stepForward(dt);
  }

  public stepBackward(dt: number): void {
    this.timer.stepBackward(dt);
  }

  public reset(): void {
    this.turnaround.reset();
    this.timer.reset();
    this.showSimultaneityProperty.reset();
  }

  public dispose(): void {
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
    this.turnaround.dispose();
    this.timer.dispose();
  }
}
