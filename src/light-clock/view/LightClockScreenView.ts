/**
 * LightClockScreenView.ts
 *
 * Two light clocks stacked in the play area — one at rest, one gliding past —
 * with the readouts that let a student check the ratio of their tick counts
 * against γ.
 *
 * The moving clock runs along a finite rail and wraps around at the end. That is
 * a display convention worth being explicit about: the clock never turns around,
 * because a clock that turned around would stop being inertial and this screen's
 * whole argument assumes it is not. Turning around is the Twin Paradox screen's
 * business.
 */

import { DerivedProperty, PatternStringProperty } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { HSeparator, Line, Node, Path, Text, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { BETA_RANGE } from "../../common/model/SpecialRelativityModel.js";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/SpecialRelativityButtonOptions.js";
import { SpecialRelativityPanel } from "../../common/SpecialRelativityPanel.js";
import { DEFAULT_TIME_SPEEDS } from "../../common/TimeModel.js";
import { formatSignificant, formatTickValue } from "../../common/view/chartUtils.js";
import { createCheckbox, createNumberControl, createReadoutRow } from "../../common/view/controlHelpers.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SpecialRelativityPreferencesModel } from "../../preferences/SpecialRelativityPreferencesModel.js";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { FONTS, LIGHT_CLOCK, SCREEN_VIEW_MARGIN } from "../../SpecialRelativityConstants.js";
import { ARM_LENGTH_RANGE, type LightClockModel } from "../model/LightClockModel.js";
import type { LightTriangle } from "../model/lightClockGeometry.js";
import { LightClockApparatusNode } from "./LightClockApparatusNode.js";
import { LightClockScreenSummaryContent } from "./LightClockScreenSummaryContent.js";

/** Centre of the clock column, and the baseline each clock's bottom mirror sits on. */
const CLOCK_COLUMN_X = 300;
const REST_CLOCK_BASELINE_Y = 250;
const MOVING_CLOCK_BASELINE_Y = 470;

export class LightClockScreenView extends ScreenView {
  public constructor(
    model: LightClockModel,
    preferences: SpecialRelativityPreferencesModel,
    options?: ScreenViewOptions,
  ) {
    super({
      screenSummaryContent: new LightClockScreenSummaryContent(model),
      ...options,
    });

    const strings = StringManager.getInstance();
    const clockStrings = strings.getLightClockStrings();
    const commonStrings = strings.getCommon();
    const units = strings.getUnits();
    const a11y = strings.getLightClockA11yStrings();

    // ── The resting clock ─────────────────────────────────────────────────────
    const restClock = new LightClockApparatusNode(
      model.restPhotonHeightProperty,
      model.armLengthProperty,
      clockStrings.restClockStringProperty,
    );
    restClock.x = CLOCK_COLUMN_X;
    restClock.y = REST_CLOCK_BASELINE_Y;
    this.addChild(restClock);

    // ── The moving clock, its rail, and the photon's zigzag ───────────────────
    const railHalfPixels = LIGHT_CLOCK.TRACK_HALF_LENGTH * LIGHT_CLOCK.VIEW_SCALE;
    this.addChild(
      new Line(
        CLOCK_COLUMN_X - railHalfPixels,
        MOVING_CLOCK_BASELINE_Y,
        CLOCK_COLUMN_X + railHalfPixels,
        MOVING_CLOCK_BASELINE_Y,
        { stroke: SpecialRelativityColors.trackColorProperty, lineWidth: 2 },
      ),
    );

    const trailPath = new Path(null, {
      stroke: SpecialRelativityColors.photonColorProperty,
      lineWidth: 1.5,
      lineDash: [4, 3],
      opacity: 0.85,
    });
    trailPath.visibleProperty = model.showPhotonTrailProperty;
    this.addChild(trailPath);

    // ── The light-travel triangle ─────────────────────────────────────────────
    // Drawn beneath the apparatus so the mirrors and the photon stay legible on
    // top of it. The two legs are dashed and the hypotenuse — the path the photon
    // actually flew — is solid and in the photon's own colour, because it is the
    // side the argument is about.
    const triangleLegs = new Path(null, {
      stroke: SpecialRelativityColors.apparatusColorProperty,
      lineWidth: 1.5,
      lineDash: [5, 4],
    });
    const triangleHypotenuse = new Path(null, {
      stroke: SpecialRelativityColors.photonColorProperty,
      lineWidth: 2.5,
    });
    const triangleLayer = new Node({ children: [triangleLegs, triangleHypotenuse] });
    triangleLayer.visibleProperty = model.showTriangleProperty;
    this.addChild(triangleLayer);

    const movingClock = new LightClockApparatusNode(
      model.movingPhotonHeightProperty,
      model.armLengthProperty,
      clockStrings.movingClockStringProperty,
    );
    movingClock.y = MOVING_CLOCK_BASELINE_Y;
    this.addChild(movingClock);

    const updateMovingClock = (position: number): void => {
      movingClock.x = CLOCK_COLUMN_X + position * LIGHT_CLOCK.VIEW_SCALE;
    };
    model.movingClockPositionProperty.link(updateMovingClock);

    const updateTrail = (trail: Vector2[]): void => {
      if (trail.length < 2) {
        trailPath.shape = null;
        return;
      }
      const shape = new Shape();
      trail.forEach((point, index) => {
        const viewX = CLOCK_COLUMN_X + point.x * LIGHT_CLOCK.VIEW_SCALE;
        const viewY = MOVING_CLOCK_BASELINE_Y - point.y * LIGHT_CLOCK.VIEW_SCALE;
        if (index === 0) {
          shape.moveTo(viewX, viewY);
        } else {
          shape.lineTo(viewX, viewY);
        }
      });
      trailPath.shape = shape;
    };
    model.photonTrailProperty.link(updateTrail);

    const toView = (point: Vector2): Vector2 =>
      new Vector2(
        CLOCK_COLUMN_X + point.x * LIGHT_CLOCK.VIEW_SCALE,
        MOVING_CLOCK_BASELINE_Y - point.y * LIGHT_CLOCK.VIEW_SCALE,
      );

    const updateTriangle = (triangle: LightTriangle | null): void => {
      if (triangle === null) {
        triangleLegs.shape = null;
        triangleHypotenuse.shape = null;
        return;
      }
      const start = toView(triangle.start);
      const corner = toView(triangle.corner);
      const photon = toView(triangle.photon);
      triangleLegs.shape = new Shape().moveToPoint(start).lineToPoint(corner).lineToPoint(photon);
      triangleHypotenuse.shape = new Shape().moveToPoint(start).lineToPoint(photon);
    };
    model.lightTriangleProperty.link(updateTriangle);

    // ── Readouts ──────────────────────────────────────────────────────────────
    const labTimeText = new PatternStringProperty(
      units.secondsStringProperty,
      { value: model.labTimeProperty },
      { decimalPlaces: 1 },
    );
    const properTimeText = new PatternStringProperty(
      units.secondsStringProperty,
      { value: model.properTimeProperty },
      { decimalPlaces: 1 },
    );
    const gammaText = new DerivedProperty([model.relativity.gammaProperty], (gamma) => formatSignificant(gamma, 3));
    const rapidityText = new DerivedProperty([model.relativity.rapidityProperty], (rapidity) =>
      formatTickValue(rapidity, 3),
    );
    const restTicksText = new DerivedProperty([model.restTickCountProperty], (ticks) => formatTickValue(ticks, 0));
    const movingTicksText = new DerivedProperty([model.movingTickCountProperty], (ticks) => formatTickValue(ticks, 0));

    // The two tick periods side by side: 2L on the clock's own worldline, and the
    // γ-stretched 2γL the lab measures. Their ratio is γ exactly, whatever the
    // mirror separation is set to — which is the point of making it adjustable.
    const restPeriodText = new PatternStringProperty(
      units.secondsStringProperty,
      { value: model.tickPeriodProperty },
      { decimalPlaces: 2 },
    );
    const labPeriodProperty = new DerivedProperty(
      [model.tickPeriodProperty, model.relativity.gammaProperty],
      (period, gamma) => period * gamma,
    );
    const labPeriodText = new PatternStringProperty(
      units.secondsStringProperty,
      { value: labPeriodProperty },
      { decimalPlaces: 2 },
    );

    const rapidityRow = createReadoutRow(
      commonStrings.rapidityStringProperty,
      rapidityText,
      SpecialRelativityColors.accentColorProperty,
    );
    rapidityRow.visibleProperty = preferences.showRapidityProperty;

    const readoutPanel = new SpecialRelativityPanel(
      new VBox({
        align: "left",
        spacing: 6,
        children: [
          createReadoutRow(commonStrings.gammaStringProperty, gammaText, SpecialRelativityColors.accentColorProperty),
          rapidityRow,
          createReadoutRow(
            clockStrings.labTimeStringProperty,
            labTimeText,
            SpecialRelativityColors.coordinateTimeColorProperty,
          ),
          createReadoutRow(
            clockStrings.properTimeStringProperty,
            properTimeText,
            SpecialRelativityColors.properTimeColorProperty,
          ),
          createReadoutRow(
            clockStrings.restTicksStringProperty,
            restTicksText,
            SpecialRelativityColors.coordinateTimeColorProperty,
          ),
          createReadoutRow(
            clockStrings.movingTicksStringProperty,
            movingTicksText,
            SpecialRelativityColors.properTimeColorProperty,
          ),
          new HSeparator({ stroke: SpecialRelativityColors.panelBorderColorProperty }),
          createReadoutRow(
            clockStrings.restPeriodStringProperty,
            restPeriodText,
            SpecialRelativityColors.properTimeColorProperty,
          ),
          createReadoutRow(
            clockStrings.labPeriodStringProperty,
            labPeriodText,
            SpecialRelativityColors.coordinateTimeColorProperty,
          ),
        ],
      }),
    );

    // ── Controls ──────────────────────────────────────────────────────────────
    const betaControl = createNumberControl(model.relativity.betaProperty, BETA_RANGE, {
      titleProperty: commonStrings.velocityStringProperty,
      valuePatternProperty: units.betaStringProperty,
      accessibleName: a11y.controls.velocityStringProperty,
      accessibleHelpText: a11y.controls.velocityHelpStringProperty,
      decimalPlaces: 2,
      delta: 0.01,
    });

    const armControl = createNumberControl(model.armLengthProperty, ARM_LENGTH_RANGE, {
      titleProperty: clockStrings.mirrorSeparationStringProperty,
      valuePatternProperty: units.lightSecondsStringProperty,
      accessibleName: a11y.controls.mirrorSeparationStringProperty,
      accessibleHelpText: a11y.controls.mirrorSeparationHelpStringProperty,
      decimalPlaces: 1,
      delta: LIGHT_CLOCK.ARM_LENGTH_DELTA,
    });

    const trailCheckbox = createCheckbox(
      model.showPhotonTrailProperty,
      clockStrings.showTrailStringProperty,
      a11y.controls.showTrailStringProperty,
    );
    trailCheckbox.accessibleHelpText = a11y.controls.showTrailHelpStringProperty;

    const triangleCheckbox = createCheckbox(
      model.showTriangleProperty,
      clockStrings.showTriangleStringProperty,
      a11y.controls.showTriangleStringProperty,
    );
    triangleCheckbox.accessibleHelpText = a11y.controls.showTriangleHelpStringProperty;

    const controlPanel = new SpecialRelativityPanel(
      new VBox({
        align: "left",
        spacing: 12,
        children: [betaControl, armControl, trailCheckbox, triangleCheckbox],
      }),
    );

    const controlColumn = new VBox({
      align: "right",
      spacing: 12,
      children: [readoutPanel, controlPanel],
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + SCREEN_VIEW_MARGIN + 40,
    });
    this.addChild(controlColumn);

    // ── The one-sentence point of the screen ──────────────────────────────────
    const takeaway = new Text(clockStrings.takeawayStringProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.secondaryTextColorProperty,
      maxWidth: 640,
      left: this.layoutBounds.minX + SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + SCREEN_VIEW_MARGIN,
    });
    this.addChild(takeaway);

    // ── Time controls ─────────────────────────────────────────────────────────
    const timeControlNode = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timer.timeSpeedProperty,
      timeSpeeds: DEFAULT_TIME_SPEEDS,
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        includeStepBackwardButton: true,
        stepForwardButtonOptions: { listener: () => model.stepForward(1 / 60) },
        stepBackwardButtonOptions: { listener: () => model.stepBackward(1 / 60) },
      },
      centerX: CLOCK_COLUMN_X,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(timeControlNode);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput();
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    // Deterministic traversal order, independent of z-order. Reset All last.
    this.addChild(
      new Node({
        pdomOrder: [betaControl, armControl, trailCheckbox, triangleCheckbox, timeControlNode, resetAllButton],
      }),
    );

    this.disposeEmitter.addListener(() => {
      model.movingClockPositionProperty.unlink(updateMovingClock);
      model.photonTrailProperty.unlink(updateTrail);
      model.lightTriangleProperty.unlink(updateTriangle);
      labTimeText.dispose();
      properTimeText.dispose();
      gammaText.dispose();
      rapidityText.dispose();
      restTicksText.dispose();
      movingTicksText.dispose();
      restPeriodText.dispose();
      labPeriodText.dispose();
      labPeriodProperty.dispose();
    });
  }

  /** All resettable state lives in the model; there is nothing view-side to restore. */
  public reset(): void {
    // Intentionally empty.
  }
}
