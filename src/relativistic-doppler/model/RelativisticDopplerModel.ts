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

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Range, Vector2, Vector2Property } from "scenerystack/dot";
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

  /**
   * Where the observer stands, in light-seconds. Draggable, because where you
   * stand is half the experiment: move along the track and the transverse moment
   * moves with you; move away from it and the whole approach-to-recede swing
   * stretches out and gentles, because the angle changes more slowly. Standing
   * close makes the swing violent — the same physics, sampled differently.
   */
  public readonly observerPositionProperty: Vector2Property;

  /** Region the observer may be dragged within. */
  public readonly observerBoundsProperty: Property<Bounds2>;

  /** Where the source is now, along the x axis, in light-seconds. */
  public readonly sourcePositionProperty: TReadOnlyProperty<number>;

  /** The expanding fronts currently on screen. */
  public readonly wavefrontsProperty: TReadOnlyProperty<Wavefront[]>;

  /** Everything the observer measures about the light arriving right now. */
  public readonly receivedSignalProperty: TReadOnlyProperty<ReceivedSignal>;

  public readonly showWavefrontsProperty = new BooleanProperty(true);
  public readonly showBeamingProperty = new BooleanProperty(true);

  /**
   * Whether the retarded emission point and the ray from it are drawn. Off by
   * default, and the most quietly surprising thing on the screen when it is on:
   * the source you are watching is never where the light you are seeing came
   * from.
   */
  public readonly showLightRayProperty = new BooleanProperty(false);

  public constructor() {
    this.observerPositionProperty = new Vector2Property(new Vector2(DOPPLER.OBSERVER_X, -DOPPLER.OBSERVER_DISTANCE));
    this.observerBoundsProperty = new Property(
      new Bounds2(
        -DOPPLER.OBSERVER_MAX_X,
        -DOPPLER.OBSERVER_MAX_DISTANCE,
        DOPPLER.OBSERVER_MAX_X,
        -DOPPLER.OBSERVER_MIN_DISTANCE,
      ),
    );

    this.sourcePositionProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.betaProperty],
      (time, beta) => sourcePositionAt(time, beta, DOPPLER.TRACK_HALF_LENGTH),
    );

    this.wavefrontsProperty = new DerivedProperty(
      [this.timer.timeProperty, this.relativity.betaProperty],
      (time, beta) => wavefrontsAt(time, beta, DOPPLER.TRACK_HALF_LENGTH, DOPPLER.EMISSION_RATE, DOPPLER.MAX_FRONT_AGE),
    );

    this.receivedSignalProperty = new DerivedProperty(
      [
        this.timer.timeProperty,
        this.relativity.betaProperty,
        this.emittedWavelengthProperty,
        this.observerPositionProperty,
      ],
      (time, beta, wavelength, observer) => receivedSignal(time, beta, DOPPLER.TRACK_HALF_LENGTH, observer, wavelength),
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
    this.observerPositionProperty.reset();
    this.showWavefrontsProperty.reset();
    this.showBeamingProperty.reset();
    this.showLightRayProperty.reset();
  }

  public dispose(): void {
    this.receivedSignalProperty.dispose();
    this.wavefrontsProperty.dispose();
    this.sourcePositionProperty.dispose();
    this.emittedWavelengthProperty.dispose();
    this.observerPositionProperty.dispose();
    this.observerBoundsProperty.dispose();
    this.showWavefrontsProperty.dispose();
    this.showBeamingProperty.dispose();
    this.showLightRayProperty.dispose();
    this.relativity.dispose();
    this.timer.dispose();
  }
}
