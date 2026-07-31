/**
 * TimeModel.ts
 *
 * A reusable, composable timing model for simulations that need play/pause,
 * a playback-speed setting, and elapsed-time tracking. Compose it into your
 * screen model rather than extending it.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // In YourModel.ts
 *   import { TimeModel } from "../../common/TimeModel.js";
 *
 *   export class YourModel implements TModel {
 *     public readonly timer = new TimeModel();
 *
 *     public step( dt: number ): void {
 *       this.timer.step( dt );
 *       // use this.timer.timeProperty.value for physics calculations
 *     }
 *
 *     public reset(): void {
 *       this.timer.reset();
 *       // reset other state …
 *     }
 *   }
 *
 * ── View wiring ───────────────────────────────────────────────────────────────
 *
 *   SceneryStack ships a TimeControlNode that binds directly to isPlayingProperty
 *   and — when given a timeSpeedProperty — draws the speed radio buttons too:
 *
 *   const timeControl = new TimeControlNode( model.timer.isPlayingProperty, {
 *     timeSpeedProperty: model.timer.timeSpeedProperty,
 *     timeSpeeds: DEFAULT_TIME_SPEEDS,
 *     ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
 *     playPauseStepButtonOptions: {
 *       ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
 *       stepForwardButtonOptions: { listener: () => model.stepForward( 1 / 60 ) },
 *     },
 *   });
 *
 * ── Start paused vs. playing ──────────────────────────────────────────────────
 *
 *   new TimeModel()           // starts paused  (most physics sims)
 *   new TimeModel( true )     // starts playing  (continuous animations)
 */

import { BooleanProperty, EnumerationProperty, NumberProperty } from "scenerystack/axon";
import { TimeSpeed } from "scenerystack/scenery-phet";

/**
 * Playback-rate multiplier applied to dt for each {@link TimeSpeed}. The built-in
 * TimeControlNode only toggles the speed state; the model still has to honor it,
 * so {@link TimeModel.scaledDt} applies the current entry here. Slow is 0.25× so a
 * light clock at β near 1, whose ticks crowd together by a factor of γ, can still
 * be watched one bounce at a time.
 */
const TIME_SPEED_SCALE = new Map<TimeSpeed, number>([
  [TimeSpeed.SLOW, 0.25],
  [TimeSpeed.NORMAL, 1],
  [TimeSpeed.FAST, 2],
]);

/**
 * Speeds offered by the built-in TimeControlNode across the sim, in display
 * order (top to bottom in the vertical radio group). Spread into both
 * {@link TimeModel}'s `timeSpeedProperty.validValues` and TimeControlNode's
 * `timeSpeeds` option so the model and the radio group always agree.
 */
export const DEFAULT_TIME_SPEEDS = [TimeSpeed.FAST, TimeSpeed.NORMAL, TimeSpeed.SLOW];

export class TimeModel {
  /** Whether the simulation clock is running. Bind to TimeControlNode. */
  public readonly isPlayingProperty: BooleanProperty;

  /** Elapsed simulation time in seconds. Resets to 0 on reset(). */
  public readonly timeProperty: NumberProperty;

  /**
   * Current playback speed. Bind to TimeControlNode's `timeSpeedProperty` to get
   * its built-in speed radio buttons; {@link TimeModel.scaledDt} applies the
   * matching entry in {@link TIME_SPEED_SCALE}.
   */
  public readonly timeSpeedProperty: EnumerationProperty<TimeSpeed>;

  public constructor(initiallyPlaying = false) {
    this.isPlayingProperty = new BooleanProperty(initiallyPlaying);
    this.timeProperty = new NumberProperty(0, { units: "s" });
    this.timeSpeedProperty = new EnumerationProperty(TimeSpeed.NORMAL, {
      validValues: DEFAULT_TIME_SPEEDS,
    });
  }

  /**
   * `dt` scaled by the current playback speed, or 0 while paused. Screen models
   * pass this on to whatever they animate so one speed setting governs the clock
   * and the physics together.
   */
  public scaledDt(dt: number): number {
    if (!this.isPlayingProperty.value) {
      return 0;
    }
    return dt * (TIME_SPEED_SCALE.get(this.timeSpeedProperty.value) ?? 1);
  }

  /**
   * Advance the simulation clock by dt seconds, scaled by the current speed.
   * Call this from your model's step() method.
   */
  public step(dt: number): void {
    this.timeProperty.value += this.scaledDt(dt);
  }

  /**
   * Advance the clock by dt seconds whether or not it is running. This is what a
   * step-forward button needs: it is pressed precisely when the sim is paused,
   * so {@link TimeModel.step} would ignore it.
   */
  public stepForward(dt: number): void {
    this.timeProperty.value += dt;
  }

  /**
   * Rewind the clock by dt seconds whether or not it is running — the symmetric
   * counterpart to {@link stepForward}. Every animation in this sim is a closed
   * form of `timeProperty` rather than an integration, so running the clock
   * backwards needs no extra state; it is clamped at 0 because none of the
   * screens define a "before the experiment started" state.
   */
  public stepBackward(dt: number): void {
    this.timeProperty.value = Math.max(0, this.timeProperty.value - dt);
  }

  /** Resets clock and playback state to their initial values. */
  public reset(): void {
    this.isPlayingProperty.reset();
    this.timeProperty.reset();
    this.timeSpeedProperty.reset();
  }

  /** Call when the model is no longer needed to free AXON listeners. */
  public dispose(): void {
    this.isPlayingProperty.dispose();
    this.timeProperty.dispose();
    this.timeSpeedProperty.dispose();
  }
}
