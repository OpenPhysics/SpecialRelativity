/**
 * LengthContractionModel.ts
 *
 * The ladder-and-barn experiment, watched from whichever of the two frames the
 * user has selected.
 *
 * ── One clock, re-read ────────────────────────────────────────────────────────
 * There is a single scene clock, {@link sceneTimeProperty}, and it is read as
 * **whichever frame is selected** — barn time ct, or ladder time ct′. That is not
 * a shortcut: the two frames' clocks are both zeroed on the event "the ladder's
 * centre passes the barn's centre", which is one event and so is something they
 * can agree about. Every other instant they label differently, and flipping the
 * frame toggle without touching the clock is precisely the experience the screen
 * is for — the number stays put and the scene rearranges itself around it.
 *
 * Everything geometric is a closed form of that one number, as everywhere else in
 * this sim: no integration, no per-frame state, and step-backward for free.
 */

import { BooleanProperty, DerivedProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Range, type Vector2 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import { gammaOf } from "../../common/model/lorentz.js";
import { TimeModel } from "../../common/TimeModel.js";
import { LADDER_BARN } from "../../SpecialRelativityConstants.js";
import {
  contractedLength,
  entranceSlamEvent,
  exitSlamEvent,
  fitsIn,
  isEntirelyInside,
  type LadderBarnSetup,
  ObservationFrame,
  type SlamTimes,
  type Snapshot,
  sceneHalfWindow,
  slamTimes,
  snapshotAt,
} from "./ladderBarnGeometry.js";

/** Speeds the ladder may be sent through the barn at. See {@link LADDER_BARN}. */
export const LADDER_BETA_RANGE = new Range(LADDER_BARN.MIN_BETA, LADDER_BARN.MAX_BETA);

/** Proper lengths the ladder may be built at, in light-seconds. */
export const LADDER_LENGTH_RANGE = new Range(LADDER_BARN.MIN_LADDER_LENGTH, LADDER_BARN.MAX_LADDER_LENGTH);

/** Which door is drawn shut right now. Both, in the barn frame, at t = 0. */
export type DoorStates = {
  readonly entranceClosed: boolean;
  readonly exitClosed: boolean;
};

export class LengthContractionModel implements TModel {
  /** Play/pause and speed. The elapsed time itself is {@link sceneTimeProperty}. */
  public readonly timer = new TimeModel(true);

  /**
   * Speed of the ladder through the barn, as a fraction of c. Positive: the
   * direction adds nothing here, and fixing it lets "entrance" and "exit" name the
   * two doors rather than having to be worked out each time.
   */
  public readonly betaProperty = new NumberProperty(LADDER_BARN.DEFAULT_BETA, { range: LADDER_BETA_RANGE });

  /** Proper length of the ladder, in light-seconds. */
  public readonly ladderLengthProperty = new NumberProperty(LADDER_BARN.LADDER_LENGTH, { range: LADDER_LENGTH_RANGE });

  /** Whose rulers and clocks the scene is described with. The screen's main control. */
  public readonly frameProperty = new Property<ObservationFrame>(ObservationFrame.BARN);

  /**
   * The current instant, in seconds on the **selected frame's** clock. Runs from
   * −sceneHalfWindow to +sceneHalfWindow and wraps, so the pass repeats without
   * anyone having to press anything.
   */
  public readonly sceneTimeProperty = new NumberProperty(0, { units: "s" });

  /** γ for the current β — the factor both contractions are by. */
  public readonly gammaProperty: TReadOnlyProperty<number>;

  /** The experiment as configured, bundled for the pure geometry functions. */
  public readonly setupProperty: TReadOnlyProperty<LadderBarnSetup>;

  /** Half-width of the time window the scene loops over, on the selected frame's clock. */
  public readonly sceneHalfWindowProperty: TReadOnlyProperty<number>;

  /** Where both objects are right now, as the selected frame measures them. */
  public readonly snapshotProperty: TReadOnlyProperty<Snapshot>;

  /** Length of the ladder as the selected frame measures it: L₀ or L₀/γ. */
  public readonly measuredLadderLengthProperty: TReadOnlyProperty<number>;

  /** Length of the barn as the selected frame measures it: B or B/γ. */
  public readonly measuredBarnLengthProperty: TReadOnlyProperty<number>;

  /** Whether the ladder is wholly between the doors at this very instant. */
  public readonly isEntirelyInsideProperty: TReadOnlyProperty<boolean>;

  /** Whether the ladder ever fits, as the selected frame measures things. */
  public readonly fitsProperty: TReadOnlyProperty<boolean>;

  /** Whether the ladder fits in the barn frame — the answer that does not depend on the toggle. */
  public readonly fitsInBarnFrameProperty: TReadOnlyProperty<boolean>;

  /** Whether the ladder fits in the ladder frame. */
  public readonly fitsInLadderFrameProperty: TReadOnlyProperty<boolean>;

  /** When each door slams, on the selected frame's clock. */
  public readonly slamTimesProperty: TReadOnlyProperty<SlamTimes>;

  /**
   * How long the selected frame says passed between the two slams: exit first is
   * positive. Zero in the barn frame by construction; γβB in the ladder frame.
   */
  public readonly slamGapProperty: TReadOnlyProperty<number>;

  /** Which doors are drawn shut right now — see {@link LADDER_BARN.DOOR_FLASH_HALF_WIDTH}. */
  public readonly doorStatesProperty: TReadOnlyProperty<DoorStates>;

  /** Whether the two world-sheets are drawn on the diagram. */
  public readonly showWorldSheetsProperty = new BooleanProperty(true);

  /**
   * Whether the selected frame's line of simultaneity — the slice the current
   * measurement is taken on — is drawn across the diagram. On by default: it is
   * the one line that explains the whole disagreement.
   */
  public readonly showSliceProperty = new BooleanProperty(true);

  /** Held so dispose() can unlink the same function object that was linked. */
  private readonly clampSceneTimeListener: (half: number) => void;

  public constructor() {
    this.gammaProperty = new DerivedProperty([this.betaProperty], (beta) => gammaOf(beta));

    this.setupProperty = new DerivedProperty([this.betaProperty, this.ladderLengthProperty], (beta, ladderLength) => ({
      barnLength: LADDER_BARN.BARN_LENGTH,
      ladderLength,
      beta,
    }));

    this.sceneHalfWindowProperty = new DerivedProperty([this.setupProperty, this.frameProperty], (setup, frame) =>
      sceneHalfWindow(setup, frame),
    );

    this.snapshotProperty = new DerivedProperty(
      [this.setupProperty, this.frameProperty, this.sceneTimeProperty],
      (setup, frame, time) => snapshotAt(setup, frame, time),
    );

    this.measuredLadderLengthProperty = new DerivedProperty([this.setupProperty, this.frameProperty], (setup, frame) =>
      frame === ObservationFrame.BARN ? contractedLength(setup.ladderLength, setup.beta) : setup.ladderLength,
    );

    this.measuredBarnLengthProperty = new DerivedProperty([this.setupProperty, this.frameProperty], (setup, frame) =>
      frame === ObservationFrame.BARN ? setup.barnLength : contractedLength(setup.barnLength, setup.beta),
    );

    this.isEntirelyInsideProperty = new DerivedProperty([this.snapshotProperty], (snapshot) =>
      isEntirelyInside(snapshot),
    );

    this.fitsInBarnFrameProperty = new DerivedProperty([this.setupProperty], (setup) =>
      fitsIn(setup, ObservationFrame.BARN),
    );
    this.fitsInLadderFrameProperty = new DerivedProperty([this.setupProperty], (setup) =>
      fitsIn(setup, ObservationFrame.LADDER),
    );
    this.fitsProperty = new DerivedProperty(
      [this.fitsInBarnFrameProperty, this.fitsInLadderFrameProperty, this.frameProperty],
      (inBarn, inLadder, frame) => (frame === ObservationFrame.BARN ? inBarn : inLadder),
    );

    this.slamTimesProperty = new DerivedProperty([this.setupProperty, this.frameProperty], (setup, frame) =>
      slamTimes(setup, frame),
    );

    this.slamGapProperty = new DerivedProperty([this.slamTimesProperty], (times) => times.entrance - times.exit);

    this.doorStatesProperty = new DerivedProperty([this.slamTimesProperty, this.sceneTimeProperty], (times, time) => ({
      entranceClosed: Math.abs(time - times.entrance) <= LADDER_BARN.DOOR_FLASH_HALF_WIDTH,
      exitClosed: Math.abs(time - times.exit) <= LADDER_BARN.DOOR_FLASH_HALF_WIDTH,
    }));

    // Changing the speed, the ladder, or the frame moves the ends of the window
    // the clock runs in; the clock is pulled back inside rather than left to sit
    // outside it, which would strand the scene off screen until the next wrap.
    this.clampSceneTimeListener = (half: number): void => this.clampSceneTime(half);
    this.sceneHalfWindowProperty.link(this.clampSceneTimeListener);
  }

  /** The two slam events in barn-frame coordinates, for the diagram. */
  public slamEvents(): { readonly entrance: Vector2; readonly exit: Vector2 } {
    const setup = this.setupProperty.value;
    return { entrance: entranceSlamEvent(setup), exit: exitSlamEvent(setup) };
  }

  /**
   * Take the scene clock to the instant a door slams, on the selected frame's
   * clock. In the barn frame both buttons land on the same instant — which is not
   * a bug to hide but the shortest statement of what "the doors are on one switch"
   * means, and what the ladder frame then disagrees with.
   */
  public goToSlam(door: "entrance" | "exit"): void {
    this.timer.isPlayingProperty.value = false;
    this.sceneTimeProperty.value = this.slamTimesProperty.value[door];
    this.clampSceneTime(this.sceneHalfWindowProperty.value);
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

  /** Move the scene clock, wrapping round the ends of the pass so it repeats. */
  private advance(seconds: number): void {
    if (seconds === 0) {
      return;
    }
    const half = this.sceneHalfWindowProperty.value;
    const span = 2 * half;
    if (!Number.isFinite(span) || span <= 0) {
      return;
    }
    // Modulo rather than a comparison, so a large dt after a background tab
    // regains focus lands in the right place instead of skipping the window.
    const offset = (((this.sceneTimeProperty.value + seconds + half) % span) + span) % span;
    this.sceneTimeProperty.value = offset - half;
  }

  /** Keep the clock inside the current window without wrapping it to the far end. */
  private clampSceneTime(half: number): void {
    if (!Number.isFinite(half)) {
      return;
    }
    this.sceneTimeProperty.value = Math.max(-half, Math.min(half, this.sceneTimeProperty.value));
  }

  public reset(): void {
    this.timer.reset();
    this.betaProperty.reset();
    this.ladderLengthProperty.reset();
    this.frameProperty.reset();
    this.sceneTimeProperty.reset();
    this.showWorldSheetsProperty.reset();
    this.showSliceProperty.reset();
  }

  public dispose(): void {
    this.sceneHalfWindowProperty.unlink(this.clampSceneTimeListener);
    this.doorStatesProperty.dispose();
    this.slamGapProperty.dispose();
    this.slamTimesProperty.dispose();
    this.fitsProperty.dispose();
    this.fitsInLadderFrameProperty.dispose();
    this.fitsInBarnFrameProperty.dispose();
    this.isEntirelyInsideProperty.dispose();
    this.measuredBarnLengthProperty.dispose();
    this.measuredLadderLengthProperty.dispose();
    this.snapshotProperty.dispose();
    this.sceneHalfWindowProperty.dispose();
    this.setupProperty.dispose();
    this.gammaProperty.dispose();
    this.showWorldSheetsProperty.dispose();
    this.showSliceProperty.dispose();
    this.sceneTimeProperty.dispose();
    this.frameProperty.dispose();
    this.ladderLengthProperty.dispose();
    this.betaProperty.dispose();
    this.timer.dispose();
  }
}
