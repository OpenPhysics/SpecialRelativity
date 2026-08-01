/**
 * LightClockModel.ts
 *
 * Two identical light clocks, one at rest in the lab and one gliding past at β.
 * The lab clock is the reference; the moving one is the same apparatus seen from
 * a frame it happens not to be at rest in.
 *
 * Everything the view draws is derived from a single number — the lab time on
 * `timer.timeProperty` — through the closed forms in {@link lightClockGeometry}.
 * There is no integration and no per-frame state, so the animation cannot drift
 * and the step-backward button needs no special handling.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Range, type Vector2 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { SpecialRelativityModel } from "../../common/model/SpecialRelativityModel.js";
import { TimeModel } from "../../common/TimeModel.js";
import { LIGHT_CLOCK } from "../../SpecialRelativityConstants.js";
import {
  clockPosition,
  type LightTriangle,
  lightTriangle,
  photonHeight,
  photonTrail,
  tickCount,
  tickPeriod,
} from "./lightClockGeometry.js";

/** How far apart the mirrors may be set, in light-seconds. */
export const ARM_LENGTH_RANGE = new Range(LIGHT_CLOCK.MIN_ARM_LENGTH, LIGHT_CLOCK.MAX_ARM_LENGTH);

export class LightClockModel implements TModel {
  /** β, γ, and the boost derived from them. */
  public readonly relativity = new SpecialRelativityModel();

  /**
   * The lab clock. Starts running: a light clock that is not ticking has nothing
   * to say, and the first thing this screen should show is the two photons
   * falling out of step.
   */
  public readonly timer = new TimeModel(true);

  /**
   * Distance between the mirrors, in light-seconds — the same for both clocks,
   * because they are the same apparatus. Adjustable so a student can check that
   * the *ratio* of the tick counts is γ whatever the separation is.
   */
  public readonly armLengthProperty = new NumberProperty(LIGHT_CLOCK.ARM_LENGTH, { range: ARM_LENGTH_RANGE });

  /** Lab (coordinate) time in seconds. The stationary clock reads this directly. */
  public readonly labTimeProperty: TReadOnlyProperty<number>;

  /** Time elapsed on the moving clock's own worldline: t/γ. */
  public readonly properTimeProperty: TReadOnlyProperty<number>;

  /** Completed round trips counted by the stationary clock. */
  public readonly restTickCountProperty: TReadOnlyProperty<number>;

  /** Completed round trips counted by the moving clock — never the larger number. */
  public readonly movingTickCountProperty: TReadOnlyProperty<number>;

  /** Photon height between the stationary clock's mirrors, in light-seconds. */
  public readonly restPhotonHeightProperty: TReadOnlyProperty<number>;

  /** Photon height between the moving clock's mirrors, in light-seconds. */
  public readonly movingPhotonHeightProperty: TReadOnlyProperty<number>;

  /** Position of the moving clock along its rail, in light-seconds from centre. */
  public readonly movingClockPositionProperty: TReadOnlyProperty<number>;

  /** The moving photon's zigzag through the lab frame over the current traverse. */
  public readonly photonTrailProperty: TReadOnlyProperty<Vector2[]>;

  /**
   * The right triangle the moving photon is currently walking around, or null
   * when there is none to draw (a clock at rest, or an instant that lands exactly
   * on a mirror strike).
   */
  public readonly lightTriangleProperty: TReadOnlyProperty<LightTriangle | null>;

  /** Proper seconds per tick: 2L, the same for both clocks because they are identical. */
  public readonly tickPeriodProperty: TReadOnlyProperty<number>;

  /** Whether the zigzag path is drawn. On by default — it is the point of the screen. */
  public readonly showPhotonTrailProperty = new BooleanProperty(true);

  /**
   * Whether the light-travel triangle is drawn. Off by default: it is the second
   * thing to look at, once the zigzag itself has registered.
   */
  public readonly showTriangleProperty = new BooleanProperty(false);

  public constructor() {
    this.labTimeProperty = this.timer.timeProperty;

    this.properTimeProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.gammaProperty],
      (time, gamma) => time / gamma,
    );

    this.tickPeriodProperty = new DerivedProperty([this.armLengthProperty], (armLength) => tickPeriod(armLength));

    this.restTickCountProperty = new DerivedProperty([this.timer.timeProperty, this.armLengthProperty], (time, arm) =>
      tickCount(time, arm),
    );

    this.movingTickCountProperty = new DerivedProperty(
      [this.properTimeProperty, this.armLengthProperty],
      (properTime, arm) => tickCount(properTime, arm),
    );

    this.restPhotonHeightProperty = new DerivedProperty(
      [this.timer.timeProperty, this.armLengthProperty],
      (time, arm) => photonHeight(time, arm),
    );

    this.movingPhotonHeightProperty = new DerivedProperty(
      [this.properTimeProperty, this.armLengthProperty],
      (properTime, arm) => photonHeight(properTime, arm),
    );

    this.movingClockPositionProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.betaProperty],
      (time, beta) => clockPosition(time, beta, LIGHT_CLOCK.TRACK_HALF_LENGTH),
    );

    this.photonTrailProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.betaProperty, this.armLengthProperty],
      (time, beta, arm) => photonTrail(time, beta, arm, LIGHT_CLOCK.TRACK_HALF_LENGTH),
    );

    this.lightTriangleProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.betaProperty, this.armLengthProperty],
      (time, beta, arm) => lightTriangle(time, beta, arm, LIGHT_CLOCK.TRACK_HALF_LENGTH),
    );
  }

  public step(dt: number): void {
    this.timer.step(dt);
  }

  /** Advance one frame while paused (the step-forward button). */
  public stepForward(dt: number): void {
    this.timer.stepForward(dt);
  }

  /** Rewind one frame while paused (the step-backward button). */
  public stepBackward(dt: number): void {
    this.timer.stepBackward(dt);
  }

  public reset(): void {
    this.relativity.reset();
    this.timer.reset();
    this.armLengthProperty.reset();
    this.showPhotonTrailProperty.reset();
    this.showTriangleProperty.reset();
  }

  public dispose(): void {
    this.showPhotonTrailProperty.dispose();
    this.showTriangleProperty.dispose();
    this.tickPeriodProperty.dispose();
    this.lightTriangleProperty.dispose();
    this.photonTrailProperty.dispose();
    this.movingClockPositionProperty.dispose();
    this.movingPhotonHeightProperty.dispose();
    this.restPhotonHeightProperty.dispose();
    this.movingTickCountProperty.dispose();
    this.restTickCountProperty.dispose();
    this.properTimeProperty.dispose();
    this.armLengthProperty.dispose();
    this.relativity.dispose();
    this.timer.dispose();
  }
}
