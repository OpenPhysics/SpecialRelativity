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

import { BooleanProperty, DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector2 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { SpecialRelativityModel } from "../../common/model/SpecialRelativityModel.js";
import { TimeModel } from "../../common/TimeModel.js";
import { LIGHT_CLOCK } from "../../SpecialRelativityConstants.js";
import { clockPosition, photonHeight, photonTrail, tickCount, tickPeriod } from "./lightClockGeometry.js";

export class LightClockModel implements TModel {
  /** β, γ, and the boost derived from them. */
  public readonly relativity = new SpecialRelativityModel();

  /**
   * The lab clock. Starts running: a light clock that is not ticking has nothing
   * to say, and the first thing this screen should show is the two photons
   * falling out of step.
   */
  public readonly timer = new TimeModel(true);

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

  /** Whether the zigzag path is drawn. On by default — it is the point of the screen. */
  public readonly showPhotonTrailProperty = new BooleanProperty(true);

  public constructor() {
    const armLength = LIGHT_CLOCK.ARM_LENGTH;

    this.labTimeProperty = this.timer.timeProperty;

    this.properTimeProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.gammaProperty],
      (time, gamma) => time / gamma,
    );

    this.restTickCountProperty = new DerivedProperty([this.timer.timeProperty], (time) => tickCount(time, armLength));

    this.movingTickCountProperty = new DerivedProperty([this.properTimeProperty], (properTime) =>
      tickCount(properTime, armLength),
    );

    this.restPhotonHeightProperty = new DerivedProperty([this.timer.timeProperty], (time) =>
      photonHeight(time, armLength),
    );

    this.movingPhotonHeightProperty = new DerivedProperty([this.properTimeProperty], (properTime) =>
      photonHeight(properTime, armLength),
    );

    this.movingClockPositionProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.betaProperty],
      (time, beta) => clockPosition(time, beta, LIGHT_CLOCK.TRACK_HALF_LENGTH),
    );

    this.photonTrailProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.betaProperty],
      (time, beta) => photonTrail(time, beta, armLength, LIGHT_CLOCK.TRACK_HALF_LENGTH),
    );
  }

  /** Proper seconds per tick — the same for both clocks, because they are identical. */
  public get secondsPerTick(): number {
    return tickPeriod(LIGHT_CLOCK.ARM_LENGTH);
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
    this.showPhotonTrailProperty.reset();
  }

  public dispose(): void {
    this.showPhotonTrailProperty.dispose();
    this.photonTrailProperty.dispose();
    this.movingClockPositionProperty.dispose();
    this.movingPhotonHeightProperty.dispose();
    this.restPhotonHeightProperty.dispose();
    this.movingTickCountProperty.dispose();
    this.restTickCountProperty.dispose();
    this.properTimeProperty.dispose();
    this.relativity.dispose();
    this.timer.dispose();
  }
}
