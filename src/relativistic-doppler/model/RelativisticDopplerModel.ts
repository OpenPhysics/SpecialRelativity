/**
 * RelativisticDopplerModel.ts
 *
 * A light source flying past a stationary observer: the wavefronts it leaves
 * behind, the colour that reaches the observer, and how its brightness is beamed
 * forward.
 *
 * The fly-by restarts whenever the source reaches the end of its track, and also
 * whenever β changes — a mid-flight change of speed would make the source
 * non-inertial, and every formula in {@link dopplerGeometry} assumes it is not.
 * Restarting is the honest option; quietly computing as though nothing happened
 * is not.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { SpecialRelativityModel } from "../../common/model/SpecialRelativityModel.js";
import { TimeModel } from "../../common/TimeModel.js";
import { DOPPLER } from "../../SpecialRelativityConstants.js";
import {
  type ReceivedSignal,
  receivedSignal,
  sourcePositionAt,
  traverseDuration,
  type Wavefront,
  wavefrontsAt,
} from "./dopplerGeometry.js";

/** Emitted wavelengths the source can be tuned to, in nanometres. */
export const WAVELENGTH_RANGE = new Range(DOPPLER.MIN_WAVELENGTH_NM, DOPPLER.MAX_WAVELENGTH_NM);

export class RelativisticDopplerModel implements TModel {
  /** β of the source, and the γ that follows from it. */
  public readonly relativity = new SpecialRelativityModel();

  /** Starts running: the fly-by is the screen. */
  public readonly timer = new TimeModel(true);

  /** Wavelength the source emits in its own rest frame, in nanometres. */
  public readonly emittedWavelengthProperty = new NumberProperty(DOPPLER.DEFAULT_WAVELENGTH_NM, {
    range: WAVELENGTH_RANGE,
  });

  /** Where the source is now, along the x axis, in light-seconds. */
  public readonly sourcePositionProperty: TReadOnlyProperty<number>;

  /** The expanding fronts currently on screen. */
  public readonly wavefrontsProperty: TReadOnlyProperty<Wavefront[]>;

  /** Everything the observer measures about the light arriving right now. */
  public readonly receivedSignalProperty: TReadOnlyProperty<ReceivedSignal>;

  public readonly showWavefrontsProperty = new BooleanProperty(true);
  public readonly showBeamingProperty = new BooleanProperty(true);

  public constructor() {
    this.sourcePositionProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.betaProperty],
      (time, beta) => sourcePositionAt(time, beta, DOPPLER.TRACK_HALF_LENGTH),
    );

    this.wavefrontsProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.betaProperty],
      (time, beta) => wavefrontsAt(time, beta, DOPPLER.TRACK_HALF_LENGTH, DOPPLER.EMISSION_RATE, DOPPLER.MAX_FRONT_AGE),
    );

    this.receivedSignalProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.betaProperty, this.emittedWavelengthProperty],
      (time, beta, wavelength) =>
        receivedSignal(time, beta, DOPPLER.TRACK_HALF_LENGTH, DOPPLER.OBSERVER_DISTANCE, wavelength),
    );

    // Changing the speed starts a fresh fly-by — see the class comment.
    this.relativity.betaProperty.lazyLink(() => {
      this.timer.timeProperty.value = 0;
    });
  }

  public step(dt: number): void {
    this.timer.step(dt);
    this.restartIfFinished();
  }

  public stepForward(dt: number): void {
    this.timer.stepForward(dt);
    this.restartIfFinished();
  }

  public stepBackward(dt: number): void {
    this.timer.stepBackward(dt);
  }

  /** Send the source back to the start once it has crossed the whole track. */
  private restartIfFinished(): void {
    const duration = traverseDuration(this.relativity.betaProperty.value, DOPPLER.TRACK_HALF_LENGTH);
    if (Number.isFinite(duration) && this.timer.timeProperty.value > duration) {
      this.timer.timeProperty.value = 0;
    }
  }

  public reset(): void {
    this.relativity.reset();
    this.timer.reset();
    this.emittedWavelengthProperty.reset();
    this.showWavefrontsProperty.reset();
    this.showBeamingProperty.reset();
  }

  public dispose(): void {
    this.receivedSignalProperty.dispose();
    this.wavefrontsProperty.dispose();
    this.sourcePositionProperty.dispose();
    this.emittedWavelengthProperty.dispose();
    this.showWavefrontsProperty.dispose();
    this.showBeamingProperty.dispose();
    this.relativity.dispose();
    this.timer.dispose();
  }
}
