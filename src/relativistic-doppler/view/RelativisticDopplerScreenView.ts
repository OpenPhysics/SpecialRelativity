/**
 * RelativisticDopplerScreenView.ts
 *
 * A light source flying past an observer, its wavefronts crowding ahead of it and
 * stretching behind, with the colour actually received and the forward beaming of
 * its brightness.
 *
 * ── Why the fronts are drawn in the emitted colour ────────────────────────────
 * A wavefront is a surface of constant phase; it does not have a colour of its
 * own. What is shifted is what a particular observer measures on reception. So
 * the fronts are drawn in the source's rest-frame colour and their *spacing*
 * carries the physics — bunched ahead, spread behind — while the received colour
 * appears where it belongs: at the observer.
 */

import { DerivedProperty, Multilink, PatternStringProperty } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { ModelViewTransform2 } from "scenerystack/phetcommon";
import { Circle, Line, Node, Path, Rectangle, Text, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode, VisibleColor } from "scenerystack/scenery-phet";
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
import { formatSignificant } from "../../common/view/chartUtils.js";
import {
  CONTROL_WIDTH,
  createCheckbox,
  createNumberControl,
  createReadoutRow,
} from "../../common/view/controlHelpers.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SpecialRelativityPreferencesModel } from "../../preferences/SpecialRelativityPreferencesModel.js";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { DOPPLER, FONTS, SCREEN_VIEW_MARGIN } from "../../SpecialRelativityConstants.js";
import { beamingLobe } from "../model/dopplerGeometry.js";
import { type RelativisticDopplerModel, WAVELENGTH_RANGE } from "../model/RelativisticDopplerModel.js";
import { RelativisticDopplerScreenSummaryContent } from "./RelativisticDopplerScreenSummaryContent.js";

/** Centre of the play area, in view coordinates. */
const PLAY_AREA_CENTER = new Vector2(330, 290);

/**
 * The region wavefronts are clipped to. Deliberately as large as the space left
 * over by the control column and the time controls: fronts grow to 9 light-seconds
 * and have to be cut somewhere, and a cut that lands near the edge of the screen
 * reads as the edge of the view, while one that lands mid-air reads as a bug.
 */
const STAGE_BOUNDS = new Bounds2(0, 34, 660, 536);

/** Half-width of the band of cos θ that counts as "transverse" for the status line. */
const TRANSVERSE_BAND = 0.08;

export class RelativisticDopplerScreenView extends ScreenView {
  public constructor(
    model: RelativisticDopplerModel,
    _preferences: SpecialRelativityPreferencesModel,
    options?: ScreenViewOptions,
  ) {
    super({
      screenSummaryContent: new RelativisticDopplerScreenSummaryContent(model),
      ...options,
    });

    const strings = StringManager.getInstance();
    const dopplerStrings = strings.getRelativisticDopplerStrings();
    const commonStrings = strings.getCommon();
    const units = strings.getUnits();
    const a11y = strings.getRelativisticDopplerA11yStrings();

    const modelViewTransform = ModelViewTransform2.createSinglePointScaleInvertedYMapping(
      Vector2.ZERO,
      PLAY_AREA_CENTER,
      DOPPLER.VIEW_SCALE,
    );

    // ── The stage ─────────────────────────────────────────────────────────────
    const trackHalfPixels = DOPPLER.TRACK_HALF_LENGTH * DOPPLER.VIEW_SCALE;
    this.addChild(
      new Line(
        PLAY_AREA_CENTER.x - trackHalfPixels,
        PLAY_AREA_CENTER.y,
        PLAY_AREA_CENTER.x + trackHalfPixels,
        PLAY_AREA_CENTER.y,
        { stroke: SpecialRelativityColors.trackColorProperty, lineWidth: 2 },
      ),
    );

    const wavefrontLayer = new Node({ clipArea: Shape.bounds(STAGE_BOUNDS) });
    wavefrontLayer.visibleProperty = model.showWavefrontsProperty;
    this.addChild(wavefrontLayer);

    const observerPosition = modelViewTransform.modelToViewPosition(new Vector2(0, -DOPPLER.OBSERVER_DISTANCE));
    const observerNode = new Circle(DOPPLER.OBSERVER_RADIUS, {
      fill: SpecialRelativityColors.observerColorProperty,
      center: observerPosition,
    });
    const observerLabel = new Text(dopplerStrings.observerStringProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.secondaryTextColorProperty,
      centerX: observerPosition.x,
      top: observerPosition.y + 14,
      maxWidth: 140,
    });

    const beamingPath = new Path(null, {
      fill: SpecialRelativityColors.beamingFillColorProperty,
      stroke: SpecialRelativityColors.eventAColorProperty,
      lineWidth: 1.5,
    });
    beamingPath.visibleProperty = model.showBeamingProperty;
    this.addChild(beamingPath);

    const sourceNode = new Circle(DOPPLER.SOURCE_RADIUS, {
      fill: SpecialRelativityColors.eventAColorProperty,
      centerY: PLAY_AREA_CENTER.y,
    });
    const sourceLabel = new Text(dopplerStrings.sourceStringProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.secondaryTextColorProperty,
      maxWidth: 140,
    });
    this.addChild(sourceNode);
    this.addChild(sourceLabel);
    this.addChild(observerNode);
    this.addChild(observerLabel);

    // ── Wavefronts ────────────────────────────────────────────────────────────
    const frontPool: Circle[] = [];
    const updateWavefronts = (): void => {
      const fronts = model.wavefrontsProperty.value;
      const emitted = model.emittedWavelengthProperty.value;
      const color = VisibleColor.wavelengthToColor(emitted);

      while (frontPool.length < fronts.length) {
        const circle = new Circle(1, { fill: null, lineWidth: 1.5 });
        frontPool.push(circle);
        wavefrontLayer.addChild(circle);
      }

      frontPool.forEach((circle, index) => {
        const front = fronts[index];
        if (!front) {
          circle.visible = false;
          return;
        }
        circle.visible = true;
        circle.stroke = color;
        circle.center = modelViewTransform.modelToViewPosition(new Vector2(front.x, 0));
        circle.radius = Math.max(0.5, front.radius * DOPPLER.VIEW_SCALE);
        // Older fronts fade, so the newest ones — the ones whose spacing is being
        // set right now — stay the most legible.
        circle.opacity = Math.max(0.08, 0.75 * (1 - front.radius / DOPPLER.MAX_FRONT_AGE));
      });
    };
    const wavefrontMultilink = Multilink.multilink(
      [model.wavefrontsProperty, model.emittedWavelengthProperty],
      updateWavefronts,
    );

    // ── Source position and beaming lobe ──────────────────────────────────────
    const updateSource = (): void => {
      const position = modelViewTransform.modelToViewPosition(new Vector2(model.sourcePositionProperty.value, 0));
      sourceNode.center = position;
      sourceLabel.centerX = position.x;
      sourceLabel.bottom = position.y - 14;

      const lobe = beamingLobe(model.relativity.betaProperty.value, DOPPLER.LOBE_SAMPLES);
      const shape = new Shape();
      lobe.forEach((point, index) => {
        // The lobe is a polar curve around the source; y is negated because the
        // view's y axis points down while the model's points up.
        const x = position.x + point.x * DOPPLER.LOBE_RADIUS;
        const y = position.y - point.y * DOPPLER.LOBE_RADIUS;
        if (index === 0) {
          shape.moveTo(x, y);
        } else {
          shape.lineTo(x, y);
        }
      });
      beamingPath.shape = shape.close();
    };
    const sourceMultilink = Multilink.multilink(
      [model.sourcePositionProperty, model.relativity.betaProperty],
      updateSource,
    );

    // ── Received colour ───────────────────────────────────────────────────────
    const swatch = new Rectangle(0, 0, 54, 26, {
      cornerRadius: 4,
      stroke: SpecialRelativityColors.panelBorderColorProperty,
      lineWidth: 1,
    });
    const updateSwatch = (): void => {
      const observed = model.receivedSignalProperty.value.observedWavelength;
      swatch.fill = VisibleColor.wavelengthToColor(observed, {
        irColor: SpecialRelativityColors.infraredColorProperty.value,
        uvColor: SpecialRelativityColors.ultravioletColorProperty.value,
      });
    };
    model.receivedSignalProperty.link(updateSwatch);

    // ── Readouts ──────────────────────────────────────────────────────────────
    const observedWavelengthProperty = new DerivedProperty(
      [model.receivedSignalProperty],
      (signal) => signal.observedWavelength,
    );
    const observedText = new PatternStringProperty(
      units.nanometersStringProperty,
      { value: observedWavelengthProperty },
      { decimalPlaces: 0 },
    );
    const emittedText = new PatternStringProperty(
      units.nanometersStringProperty,
      { value: model.emittedWavelengthProperty },
      { decimalPlaces: 0 },
    );
    const dopplerText = new DerivedProperty([model.receivedSignalProperty], (signal) =>
      formatSignificant(signal.doppler, 3),
    );
    const brightnessText = new DerivedProperty([model.receivedSignalProperty], (signal) =>
      formatSignificant(signal.relativeBrightness, 3),
    );
    const gammaText = new DerivedProperty([model.relativity.gammaProperty], (gamma) => formatSignificant(gamma, 3));

    const statusText = new DerivedProperty(
      [
        model.receivedSignalProperty,
        dopplerStrings.approachingStringProperty,
        dopplerStrings.transverseStringProperty,
        dopplerStrings.recedingStringProperty,
        dopplerStrings.outsideVisibleStringProperty,
      ],
      (signal, approaching, transverse, receding, outsideVisible) => {
        let phrase = transverse;
        if (signal.cosTheta > TRANSVERSE_BAND) {
          phrase = approaching;
        } else if (signal.cosTheta < -TRANSVERSE_BAND) {
          phrase = receding;
        }
        return VisibleColor.isVisibleWavelength(Math.round(signal.observedWavelength))
          ? phrase
          : `${phrase} — ${outsideVisible}`;
      },
    );

    const readoutPanel = new SpecialRelativityPanel(
      new VBox({
        align: "left",
        spacing: 6,
        children: [
          swatch,
          createReadoutRow(dopplerStrings.emittedWavelengthStringProperty, emittedText),
          createReadoutRow(
            dopplerStrings.observedWavelengthStringProperty,
            observedText,
            SpecialRelativityColors.accentColorProperty,
          ),
          createReadoutRow(dopplerStrings.dopplerFactorStringProperty, dopplerText),
          createReadoutRow(dopplerStrings.relativeBrightnessStringProperty, brightnessText),
          createReadoutRow(commonStrings.gammaStringProperty, gammaText),
          new Text(statusText, {
            font: FONTS.READOUT,
            fill: SpecialRelativityColors.secondaryTextColorProperty,
            maxWidth: CONTROL_WIDTH,
          }),
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

    const wavelengthControl = createNumberControl(model.emittedWavelengthProperty, WAVELENGTH_RANGE, {
      titleProperty: dopplerStrings.emittedWavelengthStringProperty,
      valuePatternProperty: units.nanometersStringProperty,
      accessibleName: a11y.controls.wavelengthStringProperty,
      accessibleHelpText: a11y.controls.wavelengthHelpStringProperty,
      decimalPlaces: 0,
      delta: 5,
    });

    const wavefrontCheckbox = createCheckbox(
      model.showWavefrontsProperty,
      dopplerStrings.showWavefrontsStringProperty,
      a11y.controls.showWavefrontsStringProperty,
    );
    const beamingCheckbox = createCheckbox(
      model.showBeamingProperty,
      dopplerStrings.showBeamingStringProperty,
      a11y.controls.showBeamingStringProperty,
    );

    const controlPanel = new SpecialRelativityPanel(
      new VBox({
        align: "left",
        spacing: 12,
        children: [betaControl, wavelengthControl, wavefrontCheckbox, beamingCheckbox],
      }),
    );

    const controlColumn = new VBox({
      align: "right",
      spacing: 10,
      children: [readoutPanel, controlPanel],
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + SCREEN_VIEW_MARGIN,
    });
    this.addChild(controlColumn);

    const takeaway = new Text(dopplerStrings.takeawayStringProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.secondaryTextColorProperty,
      maxWidth: 620,
      left: this.layoutBounds.minX + SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + 8,
    });
    this.addChild(takeaway);

    const timeControlNode = new TimeControlNode(model.timer.isPlayingProperty, {
      timeSpeedProperty: model.timer.timeSpeedProperty,
      timeSpeeds: DEFAULT_TIME_SPEEDS,
      ...TIME_CONTROL_SPEED_RADIO_OPTIONS,
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        includeStepBackwardButton: true,
        stepForwardButtonOptions: { listener: () => model.stepForward(1 / 30) },
        stepBackwardButtonOptions: { listener: () => model.stepBackward(1 / 30) },
      },
      centerX: PLAY_AREA_CENTER.x,
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

    this.addChild(
      new Node({
        pdomOrder: [
          betaControl,
          wavelengthControl,
          wavefrontCheckbox,
          beamingCheckbox,
          timeControlNode,
          resetAllButton,
        ],
      }),
    );

    this.disposeEmitter.addListener(() => {
      wavefrontMultilink.dispose();
      sourceMultilink.dispose();
      model.receivedSignalProperty.unlink(updateSwatch);
      observedWavelengthProperty.dispose();
      observedText.dispose();
      emittedText.dispose();
      dopplerText.dispose();
      brightnessText.dispose();
      gammaText.dispose();
      statusText.dispose();
    });
  }

  /** All resettable state lives in the model; there is nothing view-side to restore. */
  public reset(): void {
    // Intentionally empty.
  }
}
