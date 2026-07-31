/**
 * TwinParadoxScreenView.ts
 *
 * Both worldlines on one diagram, both clocks running, and — the reason the
 * screen exists — the traveller's line of simultaneity sweeping up the Earth
 * worldline and jumping at the turn.
 *
 * The skipped stretch of Earth time is drawn as a permanent highlighted band on
 * the Earth worldline rather than only appearing at the moment of the turn. A
 * jump that happens in one frame of animation is a jump nobody sees; leaving the
 * band on screen lets the student find the turn, drag it, and watch the band grow
 * and shrink.
 */

import { DerivedProperty, Multilink, PatternStringProperty } from "scenerystack/axon";
import { LinePlot } from "scenerystack/bamboo";
import { Range, Vector2 } from "scenerystack/dot";
import { Circle, Node, Text, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { simultaneityLineThrough } from "../../common/model/lorentz.js";
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
  createReadoutRow,
  createSectionHeader,
} from "../../common/view/controlHelpers.js";
import { MinkowskiDiagramNode } from "../../common/view/MinkowskiDiagramNode.js";
import { SpacetimeEventNode } from "../../common/view/SpacetimeEventNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SpecialRelativityPreferencesModel } from "../../preferences/SpecialRelativityPreferencesModel.js";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { DIAGRAM, EVENT, FONTS, SCREEN_VIEW_MARGIN } from "../../SpecialRelativityConstants.js";
import type { TwinParadoxModel } from "../model/TwinParadoxModel.js";
import { TwinParadoxScreenSummaryContent } from "./TwinParadoxScreenSummaryContent.js";

const DIAGRAM_LEFT = 96;
const DIAGRAM_TOP = 44;

/** Time runs from the departure to a little past the latest possible reunion. */
const CT_RANGE = new Range(0, 9);

export class TwinParadoxScreenView extends ScreenView {
  public constructor(
    model: TwinParadoxModel,
    preferences: SpecialRelativityPreferencesModel,
    options?: ScreenViewOptions,
  ) {
    super({
      screenSummaryContent: new TwinParadoxScreenSummaryContent(model),
      ...options,
    });

    const strings = StringManager.getInstance();
    const twinStrings = strings.getTwinParadoxStrings();
    const commonStrings = strings.getCommon();
    const units = strings.getUnits();
    const a11y = strings.getTwinParadoxA11yStrings();

    // ── The diagram ───────────────────────────────────────────────────────────
    // The primed frame here is the traveller's *current* frame, so the sheared
    // axes flip over at the turn along with everything else.
    const diagram = new MinkowskiDiagramNode({
      betaProperty: model.currentLegBetaProperty,
      xAxisLabelProperty: commonStrings.xAxisStringProperty,
      ctAxisLabelProperty: commonStrings.ctAxisStringProperty,
      primedXAxisLabelProperty: commonStrings.primedXAxisStringProperty,
      primedCtAxisLabelProperty: commonStrings.primedCtAxisStringProperty,
      ctRange: CT_RANGE,
      shadeLightConeProperty: preferences.shadeLightConeProperty,
      showPrimedFrameProperty: model.showSimultaneityProperty,
      nodeOptions: { left: DIAGRAM_LEFT, top: DIAGRAM_TOP },
    });
    this.addChild(diagram);

    // ── The two worldlines ────────────────────────────────────────────────────
    const earthWorldline = new LinePlot(diagram.chartTransform, [], {
      stroke: SpecialRelativityColors.coordinateTimeColorProperty,
      lineWidth: 3,
    });
    const travellerWorldline = new LinePlot(diagram.chartTransform, [], {
      stroke: SpecialRelativityColors.properTimeColorProperty,
      lineWidth: 3,
    });

    // The stretch of Earth time the traveller's "now" skips over at the turn.
    const skippedBand = new LinePlot(diagram.chartTransform, [], {
      stroke: SpecialRelativityColors.eventBColorProperty,
      lineWidth: 8,
      opacity: 0.55,
    });
    skippedBand.visibleProperty = model.showSimultaneityProperty;

    const nowLine = new LinePlot(diagram.chartTransform, [], {
      stroke: SpecialRelativityColors.simultaneityColorProperty,
      lineWidth: 2.5,
      lineDash: [7, 4],
    });
    nowLine.visibleProperty = model.showSimultaneityProperty;

    diagram.plotLayer.addChild(skippedBand);
    diagram.plotLayer.addChild(earthWorldline);
    diagram.plotLayer.addChild(travellerWorldline);
    diagram.plotLayer.addChild(nowLine);

    const travellerMarker = new Circle(EVENT.RADIUS - 2, {
      fill: SpecialRelativityColors.properTimeColorProperty,
      stroke: SpecialRelativityColors.backgroundColorProperty,
      lineWidth: 1.5,
    });
    diagram.plotLayer.addChild(travellerMarker);

    const updateWorldlines = (): void => {
      const turn = model.turnaround.positionProperty.value;
      const reunion = model.reunionTimeProperty.value;
      earthWorldline.setDataSet([new Vector2(0, 0), new Vector2(0, reunion)]);
      travellerWorldline.setDataSet([new Vector2(0, 0), turn, new Vector2(0, reunion)]);

      const beta = model.outboundBetaProperty.value;
      const halfJump = beta * turn.x;
      skippedBand.setDataSet([new Vector2(0, turn.y - halfJump), new Vector2(0, turn.y + halfJump)]);
    };
    const worldlineMultilink = Multilink.multilink([model.turnaround.positionProperty], updateWorldlines);

    const updateTraveller = (): void => {
      const position = model.travellerPositionProperty.value;
      travellerMarker.translation = diagram.chartTransform.modelToViewPosition(position);
      nowLine.setDataSet(
        simultaneityLineThrough(position, model.currentLegBetaProperty.value, 2 * DIAGRAM.HALF_EXTENT),
      );
    };
    const travellerMultilink = Multilink.multilink(
      [model.travellerPositionProperty, model.currentLegBetaProperty],
      updateTraveller,
    );

    // ── The draggable turn ────────────────────────────────────────────────────
    const turnaroundNode = new SpacetimeEventNode(model.turnaround, diagram.modelViewTransform, {
      fill: SpecialRelativityColors.eventBColorProperty,
      labelStringProperty: twinStrings.turnaroundStringProperty,
      accessibleName: a11y.controls.turnaroundStringProperty,
      accessibleHelpText: a11y.controls.turnaroundHelpStringProperty,
      dragBoundsProperty: model.turnaround.dragBoundsProperty,
      mapPosition: (point) => model.constrainTurnaround(point),
    });
    diagram.overlayLayer.addChild(turnaroundNode);

    // ── Readouts ──────────────────────────────────────────────────────────────
    const betaText = new PatternStringProperty(
      units.betaStringProperty,
      { value: model.outboundBetaProperty },
      { decimalPlaces: 2 },
    );
    const gammaText = new DerivedProperty([model.gammaProperty], (gamma) => formatSignificant(gamma, 3));
    const earthClockText = new PatternStringProperty(
      units.secondsStringProperty,
      { value: model.earthClockProperty },
      { decimalPlaces: 2 },
    );
    const travellerClockText = new PatternStringProperty(
      units.secondsStringProperty,
      { value: model.travellerClockProperty },
      { decimalPlaces: 2 },
    );
    const differenceProperty = new DerivedProperty(
      [model.earthClockProperty, model.travellerClockProperty],
      (earth, traveller) => earth - traveller,
    );
    const differenceText = new PatternStringProperty(
      units.secondsStringProperty,
      { value: differenceProperty },
      { decimalPlaces: 2 },
    );
    const skippedText = new PatternStringProperty(
      units.secondsStringProperty,
      { value: model.simultaneityJumpProperty },
      { decimalPlaces: 2 },
    );

    const readoutPanel = new SpecialRelativityPanel(
      new VBox({
        align: "left",
        spacing: 5,
        children: [
          createSectionHeader(twinStrings.outboundSpeedStringProperty),
          createReadoutRow(commonStrings.velocityStringProperty, betaText, SpecialRelativityColors.accentColorProperty),
          createReadoutRow(commonStrings.gammaStringProperty, gammaText, SpecialRelativityColors.accentColorProperty),
          createReadoutRow(
            twinStrings.earthClockStringProperty,
            earthClockText,
            SpecialRelativityColors.coordinateTimeColorProperty,
          ),
          createReadoutRow(
            twinStrings.travellerClockStringProperty,
            travellerClockText,
            SpecialRelativityColors.properTimeColorProperty,
          ),
          createReadoutRow(twinStrings.differenceStringProperty, differenceText),
          createReadoutRow(
            twinStrings.skippedLabelStringProperty,
            skippedText,
            SpecialRelativityColors.eventBColorProperty,
          ),
        ],
      }),
    );

    const simultaneityCheckbox = createCheckbox(
      model.showSimultaneityProperty,
      twinStrings.showSimultaneityStringProperty,
      a11y.controls.showSimultaneityStringProperty,
    );
    simultaneityCheckbox.accessibleHelpText = a11y.controls.showSimultaneityHelpStringProperty;

    const controlPanel = new SpecialRelativityPanel(
      new VBox({
        align: "left",
        spacing: 10,
        children: [
          simultaneityCheckbox,
          new Text(twinStrings.dragHintStringProperty, {
            font: FONTS.READOUT,
            fill: SpecialRelativityColors.secondaryTextColorProperty,
            maxWidth: CONTROL_WIDTH,
          }),
        ],
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

    const takeaway = new Text(twinStrings.takeawayStringProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.secondaryTextColorProperty,
      maxWidth: 660,
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
      centerX: diagram.centerX,
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
        pdomOrder: [turnaroundNode, simultaneityCheckbox, timeControlNode, resetAllButton],
      }),
    );

    this.disposeEmitter.addListener(() => {
      worldlineMultilink.dispose();
      travellerMultilink.dispose();
      betaText.dispose();
      gammaText.dispose();
      earthClockText.dispose();
      travellerClockText.dispose();
      differenceText.dispose();
      differenceProperty.dispose();
      skippedText.dispose();
    });
  }

  /** All resettable state lives in the model; there is nothing view-side to restore. */
  public reset(): void {
    // Intentionally empty.
  }
}
