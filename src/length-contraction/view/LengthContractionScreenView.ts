/**
 * LengthContractionScreenView.ts
 *
 * The ladder and the barn, told twice: once as a scene you watch, and once as a
 * spacetime diagram you read.
 *
 * ── Why the diagram does not change frames when the toggle does ───────────────
 * The stage is drawn with the selected frame's rulers and clock, so flipping the
 * toggle rearranges it completely. The diagram is always drawn in **barn-frame**
 * coordinates, and flipping the toggle changes exactly one thing on it: the tilt
 * of the slice the measurement is taken on.
 *
 * That split is the argument. The events — the door slams, the ends of the ladder
 * crossing the doorways — are the same points of the same picture whichever
 * toggle position you are in; the two frames are not looking at different
 * spacetimes. All they do differently is cut it into "nows" at a different angle,
 * and the stage above is what that one difference *looks like* from inside.
 */

import { DerivedProperty, Multilink, PatternStringProperty } from "scenerystack/axon";
import { LinePlot } from "scenerystack/bamboo";
import { Range, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import { Circle, HBox, HSeparator, Node, Path, RichText, Text, VBox } from "scenerystack/scenery";
import { ResetAllButton, TimeControlNode } from "scenerystack/scenery-phet";
import { ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import {
  FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  TIME_CONTROL_SPEED_RADIO_OPTIONS,
} from "../../common/SpecialRelativityButtonOptions.js";
import { SpecialRelativityPanel } from "../../common/SpecialRelativityPanel.js";
import { DEFAULT_TIME_SPEEDS } from "../../common/TimeModel.js";
import { formatSignificant } from "../../common/view/chartUtils.js";
import {
  createCheckbox,
  createNumberControl,
  createPushButton,
  createRadioButtonGroup,
  createReadoutRow,
  createSectionHeader,
} from "../../common/view/controlHelpers.js";
import { MinkowskiDiagramNode } from "../../common/view/MinkowskiDiagramNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SpecialRelativityPreferencesModel } from "../../preferences/SpecialRelativityPreferencesModel.js";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { FONTS, LADDER_BARN, SCREEN_VIEW_MARGIN } from "../../SpecialRelativityConstants.js";
import {
  LADDER_BETA_RANGE,
  LADDER_LENGTH_RANGE,
  type LengthContractionModel,
} from "../model/LengthContractionModel.js";
import {
  barnSheet,
  barnSliceInLab,
  ladderSheet,
  ladderSliceInLab,
  ObservationFrame,
} from "../model/ladderBarnGeometry.js";
import { LadderBarnStageNode } from "./LadderBarnStageNode.js";
import { LengthContractionScreenSummaryContent } from "./LengthContractionScreenSummaryContent.js";

/** The stage sits above the diagram; this is where its ground line lands. */
const STAGE_CENTER_X = 372;
const STAGE_BASELINE_Y = 142;

/** Where the spacetime diagram's plotting area starts. */
const DIAGRAM_LEFT = 155;
const DIAGRAM_TOP = 188;

/**
 * The diagram's window on the barn frame. Wider in x than in ct because the two
 * slams sit on the x axis a whole barn apart, and the ladder's world-sheet leans
 * out past them; the ct range only has to reach the moments the slices are taken
 * at. Light rays still run at 45° — {@link MinkowskiDiagramNode} derives its
 * height from these two ranges rather than taking one.
 */
const DIAGRAM_X_RANGE = new Range(-5.5, 5.5);
const DIAGRAM_CT_RANGE = new Range(-4.5, 4.5);
const DIAGRAM_VIEW_WIDTH = 370;

const PANEL_WIDTH = 252;

/**
 * Gap between the two slams, in seconds, below which the status line reads "at
 * the same moment". The barn frame produces exactly zero, so this band exists for
 * the ladder frame at very small β, where the two slams are apart by less than the
 * readout's own two decimal places and saying which came first would be reporting
 * a difference the panel does not show.
 */
const SLAM_ORDER_TOLERANCE = 0.005;

export type LengthContractionScreenViewOptions = ScreenViewOptions;

export class LengthContractionScreenView extends ScreenView {
  public constructor(
    model: LengthContractionModel,
    preferences: SpecialRelativityPreferencesModel,
    providedOptions?: LengthContractionScreenViewOptions,
  ) {
    const options = optionize<LengthContractionScreenViewOptions, EmptySelfOptions, ScreenViewOptions>()(
      {
        screenSummaryContent: new LengthContractionScreenSummaryContent(model),
      },
      providedOptions,
    );
    super(options);

    const strings = StringManager.getInstance();
    const contractionStrings = strings.getLengthContractionStrings();
    const commonStrings = strings.getCommon();
    const units = strings.getUnits();
    const a11y = strings.getLengthContractionA11yStrings();

    // ── The stage ─────────────────────────────────────────────────────────────
    const barnStageLabel = new PatternStringProperty(
      contractionStrings.barnMeasureStringProperty,
      { value: model.measuredBarnLengthProperty },
      { decimalPlaces: 2 },
    );
    const ladderStageLabel = new PatternStringProperty(
      contractionStrings.ladderMeasureStringProperty,
      { value: model.measuredLadderLengthProperty },
      { decimalPlaces: 2 },
    );

    const stage = new LadderBarnStageNode({
      snapshotProperty: model.snapshotProperty,
      doorStatesProperty: model.doorStatesProperty,
      isEntirelyInsideProperty: model.isEntirelyInsideProperty,
      barnLabelProperty: barnStageLabel,
      ladderLabelProperty: ladderStageLabel,
      nodeOptions: { x: STAGE_CENTER_X, y: STAGE_BASELINE_Y },
    });
    this.addChild(stage);

    // ── The diagram, always in barn-frame coordinates ─────────────────────────
    // β for the shear is the ladder's speed only while the ladder frame is
    // selected; in the barn frame the primed mesh would be the barn's own axes,
    // which is the unprimed mesh already drawn.
    const diagramBetaProperty = new DerivedProperty([model.betaProperty, model.frameProperty], (beta, frame) =>
      frame === ObservationFrame.LADDER ? beta : 0,
    );
    const showPrimedFrameProperty = new DerivedProperty(
      [model.frameProperty],
      (frame) => frame === ObservationFrame.LADDER,
    );

    const diagram = new MinkowskiDiagramNode({
      betaProperty: diagramBetaProperty,
      xAxisLabelProperty: commonStrings.xAxisStringProperty,
      ctAxisLabelProperty: commonStrings.ctAxisStringProperty,
      primedXAxisLabelProperty: commonStrings.primedXAxisStringProperty,
      primedCtAxisLabelProperty: commonStrings.primedCtAxisStringProperty,
      xRange: DIAGRAM_X_RANGE,
      ctRange: DIAGRAM_CT_RANGE,
      viewWidth: DIAGRAM_VIEW_WIDTH,
      shadeLightConeProperty: preferences.shadeLightConeProperty,
      showPrimedFrameProperty: showPrimedFrameProperty,
      nodeOptions: { left: DIAGRAM_LEFT, top: DIAGRAM_TOP },
    });
    this.addChild(diagram);

    // ── The two world-sheets ──────────────────────────────────────────────────
    // The band each object's ends sweep out. Where they overlap is every event at
    // which some of the ladder is inside the barn, and the containment question
    // reduces to which slice of that overlap you take — which is the resolution,
    // drawn rather than argued.
    const barnSheetPath = new Path(null, {
      fill: SpecialRelativityColors.barnSheetFillColorProperty,
      stroke: SpecialRelativityColors.apparatusColorProperty,
      lineWidth: 1.5,
    });
    const ladderSheetPath = new Path(null, {
      fill: SpecialRelativityColors.ladderSheetFillColorProperty,
      stroke: SpecialRelativityColors.ladderColorProperty,
      lineWidth: 1.5,
    });
    const sheetLayer = new Node({
      children: [barnSheetPath, ladderSheetPath],
      visibleProperty: model.showWorldSheetsProperty,
    });
    diagram.plotLayer.addChild(sheetLayer);

    // Twice the visible ct range, so a sheet's leaning edges leave the frame
    // instead of stopping just inside it.
    const sheetExtent = 2 * DIAGRAM_CT_RANGE.max;

    /** A closed polygon through model-space corners, in the diagram's view space. */
    const polygonShape = (corners: readonly Vector2[]): Shape => {
      const shape = new Shape();
      corners.forEach((corner, index) => {
        const point = diagram.chartTransform.modelToViewPosition(corner);
        if (index === 0) {
          shape.moveToPoint(point);
        } else {
          shape.lineToPoint(point);
        }
      });
      return shape.close();
    };

    const updateSheets = (): void => {
      const setup = model.setupProperty.value;
      barnSheetPath.shape = polygonShape(barnSheet(setup, sheetExtent));
      ladderSheetPath.shape = polygonShape(ladderSheet(setup, sheetExtent));
    };
    const sheetMultilink = Multilink.multilink([model.setupProperty], updateSheets);

    // ── The slice the current measurement is taken on ─────────────────────────
    // Horizontal in the barn frame, tilted by β in the ladder frame. The two
    // heavy segments on it are the ladder and the barn as that frame measures
    // them at this instant — the same two lengths the stage above reports.
    const slicePlot = new LinePlot(diagram.chartTransform, [], {
      stroke: SpecialRelativityColors.simultaneityColorProperty,
      lineWidth: 2,
      lineDash: [7, 4],
    });
    // The barn's segment is drawn wider and underneath the ladder's, so that when
    // one measurement lies inside the other — which is the interesting case, and
    // the one the barn frame produces at t = 0 — the shorter is not simply hidden
    // by the longer. The wider stroke shows through as a border along its extent.
    const barnSlicePlot = new LinePlot(diagram.chartTransform, [], {
      stroke: SpecialRelativityColors.apparatusColorProperty,
      lineWidth: 9,
    });
    const ladderSlicePlot = new LinePlot(diagram.chartTransform, [], {
      stroke: SpecialRelativityColors.ladderColorProperty,
      lineWidth: 5,
    });
    const sliceLayer = new Node({
      children: [slicePlot, barnSlicePlot, ladderSlicePlot],
      visibleProperty: model.showSliceProperty,
    });
    diagram.plotLayer.addChild(sliceLayer);

    const updateSlice = (): void => {
      const setup = model.setupProperty.value;
      const frame = model.frameProperty.value;
      const time = model.sceneTimeProperty.value;

      const barnEnds = barnSliceInLab(setup, frame, time);
      const ladderEnds = ladderSliceInLab(setup, frame, time);
      barnSlicePlot.setDataSet(barnEnds);
      ladderSlicePlot.setDataSet(ladderEnds);

      // Extend the dashed slice right across the frame through the same two
      // points, so the tilt reads as a whole line of "now" and not as a bar.
      const [start, end] = ladderEnds;
      const direction = end.minus(start);
      const unit = direction.magnitude === 0 ? new Vector2(1, 0) : direction.normalized();
      const reach = 4 * DIAGRAM_X_RANGE.max;
      const middle = start.plus(end).timesScalar(0.5);
      slicePlot.setDataSet([middle.plus(unit.timesScalar(-reach)), middle.plus(unit.timesScalar(reach))]);
    };
    const sliceMultilink = Multilink.multilink(
      [model.setupProperty, model.frameProperty, model.sceneTimeProperty],
      updateSlice,
    );

    // ── The two door slams ────────────────────────────────────────────────────
    // Fixed points of the diagram: they do not move when the frame toggle does,
    // which is the shortest possible statement that the two frames are describing
    // the same pair of events.
    const slamMarkers = [
      new Circle(6, {
        fill: SpecialRelativityColors.eventBColorProperty,
        stroke: SpecialRelativityColors.backgroundColorProperty,
        lineWidth: 1.5,
      }),
      new Circle(6, {
        fill: SpecialRelativityColors.eventBColorProperty,
        stroke: SpecialRelativityColors.backgroundColorProperty,
        lineWidth: 1.5,
      }),
    ];
    for (const marker of slamMarkers) {
      diagram.overlayLayer.addChild(marker);
    }

    const updateSlams = (): void => {
      const { entrance, exit } = model.slamEvents();
      [entrance, exit].forEach((event, index) => {
        const marker = slamMarkers[index];
        if (marker) {
          marker.center = diagram.chartTransform.modelToViewPosition(event);
        }
      });
    };
    const slamMultilink = Multilink.multilink([model.setupProperty], updateSlams);

    // ── Readouts ──────────────────────────────────────────────────────────────
    const gammaText = new DerivedProperty([model.gammaProperty], (gamma) => formatSignificant(gamma, 3));
    const ladderLengthText = new PatternStringProperty(
      units.lightSecondsStringProperty,
      { value: model.measuredLadderLengthProperty },
      { decimalPlaces: 2 },
    );
    const barnLengthText = new PatternStringProperty(
      units.lightSecondsStringProperty,
      { value: model.measuredBarnLengthProperty },
      { decimalPlaces: 2 },
    );
    const sceneTimeText = new PatternStringProperty(
      units.secondsStringProperty,
      { value: model.sceneTimeProperty },
      { decimalPlaces: 2 },
    );
    const slamGapText = new PatternStringProperty(
      units.secondsStringProperty,
      { value: model.slamGapProperty },
      { decimalPlaces: 2 },
    );

    // "Does it fit?" is answered for the frame the toggle is on, in that frame's
    // own words, because the whole point is that both answers are correct
    // statements about the same ladder and the same barn.
    const fitsText = new DerivedProperty(
      [model.fitsProperty, contractionStrings.fitsStringProperty, contractionStrings.doesNotFitStringProperty],
      (fits, yes, no) => (fits ? yes : no),
    );

    const slamOrderText = new DerivedProperty(
      [
        model.slamGapProperty,
        contractionStrings.slamsTogetherStringProperty,
        contractionStrings.exitSlamsFirstStringProperty,
        contractionStrings.entranceSlamsFirstStringProperty,
      ],
      (gap, together, exitFirst, entranceFirst) => {
        if (Math.abs(gap) < SLAM_ORDER_TOLERANCE) {
          return together;
        }
        return gap > 0 ? exitFirst : entranceFirst;
      },
    );

    // RichText rather than Text: this sentence is longer than the panel is wide,
    // and a Text would answer maxWidth by shrinking itself to unreadable rather
    // than by wrapping.
    const verdict = new RichText(contractionStrings.verdictStringProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.secondaryTextColorProperty,
      lineWrap: PANEL_WIDTH,
    });

    const frameHeadingText = new DerivedProperty(
      [model.frameProperty, contractionStrings.barnFrameStringProperty, contractionStrings.ladderFrameStringProperty],
      (frame, barn, ladder) => (frame === ObservationFrame.BARN ? barn : ladder),
    );

    const readoutPanel = new SpecialRelativityPanel(
      new VBox({
        align: "left",
        spacing: 4,
        children: [
          createSectionHeader(frameHeadingText),
          createReadoutRow(
            contractionStrings.ladderLengthStringProperty,
            ladderLengthText,
            SpecialRelativityColors.ladderColorProperty,
            PANEL_WIDTH,
          ),
          createReadoutRow(
            contractionStrings.barnLengthStringProperty,
            barnLengthText,
            SpecialRelativityColors.apparatusColorProperty,
            PANEL_WIDTH,
          ),
          createReadoutRow(
            contractionStrings.fitsQuestionStringProperty,
            fitsText,
            SpecialRelativityColors.accentColorProperty,
            PANEL_WIDTH,
          ),
          new HSeparator({ stroke: SpecialRelativityColors.panelBorderColorProperty }),
          createReadoutRow(commonStrings.gammaStringProperty, gammaText, undefined, PANEL_WIDTH),
          createReadoutRow(contractionStrings.sceneTimeStringProperty, sceneTimeText, undefined, PANEL_WIDTH),
          createReadoutRow(
            contractionStrings.slamGapStringProperty,
            slamGapText,
            SpecialRelativityColors.eventBColorProperty,
            PANEL_WIDTH,
          ),
          new RichText(slamOrderText, {
            font: FONTS.READOUT,
            fill: SpecialRelativityColors.eventBColorProperty,
            lineWrap: PANEL_WIDTH,
          }),
          verdict,
        ],
      }),
    );

    // ── Controls ──────────────────────────────────────────────────────────────
    const frameControl = createRadioButtonGroup(
      model.frameProperty,
      [
        {
          value: ObservationFrame.BARN,
          labelProperty: contractionStrings.barnFrameStringProperty,
          accessibleName: a11y.controls.barnFrameStringProperty,
        },
        {
          value: ObservationFrame.LADDER,
          labelProperty: contractionStrings.ladderFrameStringProperty,
          accessibleName: a11y.controls.ladderFrameStringProperty,
        },
      ],
      {
        accessibleName: a11y.controls.frameStringProperty,
        accessibleHelpText: a11y.controls.frameHelpStringProperty,
        width: PANEL_WIDTH,
      },
    );

    const betaControl = createNumberControl(model.betaProperty, LADDER_BETA_RANGE, {
      titleProperty: contractionStrings.ladderSpeedStringProperty,
      valuePatternProperty: units.betaStringProperty,
      accessibleName: a11y.controls.velocityStringProperty,
      accessibleHelpText: a11y.controls.velocityHelpStringProperty,
      decimalPlaces: 2,
      delta: 0.01,
    });

    const lengthControl = createNumberControl(model.ladderLengthProperty, LADDER_LENGTH_RANGE, {
      titleProperty: contractionStrings.ladderProperLengthStringProperty,
      valuePatternProperty: units.lightSecondsStringProperty,
      accessibleName: a11y.controls.ladderLengthStringProperty,
      accessibleHelpText: a11y.controls.ladderLengthHelpStringProperty,
      decimalPlaces: 1,
      delta: LADDER_BARN.LADDER_LENGTH_DELTA,
    });

    // Two buttons that take the clock to a door slam. In the barn frame they land
    // on the same instant and nothing moves between them — which is what "both
    // doors are on one switch" means, and exactly what the ladder frame denies.
    const buttonTextWidth = PANEL_WIDTH / 2 - 26;
    const entranceSlamButton = createPushButton(contractionStrings.goToEntranceSlamStringProperty, {
      accessibleName: a11y.controls.goToEntranceSlamStringProperty,
      accessibleHelpText: a11y.controls.goToEntranceSlamHelpStringProperty,
      listener: () => model.goToSlam("entrance"),
      maxTextWidth: buttonTextWidth,
    });
    const exitSlamButton = createPushButton(contractionStrings.goToExitSlamStringProperty, {
      accessibleName: a11y.controls.goToExitSlamStringProperty,
      accessibleHelpText: a11y.controls.goToExitSlamHelpStringProperty,
      listener: () => model.goToSlam("exit"),
      maxTextWidth: buttonTextWidth,
    });
    const slamButtonRow = new HBox({
      children: [entranceSlamButton, exitSlamButton],
      spacing: 8,
      stretch: true,
    });

    const sheetsCheckbox = createCheckbox(
      model.showWorldSheetsProperty,
      contractionStrings.showWorldSheetsStringProperty,
      a11y.controls.showWorldSheetsStringProperty,
      PANEL_WIDTH,
    );
    sheetsCheckbox.accessibleHelpText = a11y.controls.showWorldSheetsHelpStringProperty;

    const sliceCheckbox = createCheckbox(
      model.showSliceProperty,
      contractionStrings.showSliceStringProperty,
      a11y.controls.showSliceStringProperty,
      PANEL_WIDTH,
    );
    sliceCheckbox.accessibleHelpText = a11y.controls.showSliceHelpStringProperty;

    const controlPanel = new SpecialRelativityPanel(
      new VBox({
        align: "left",
        spacing: 9,
        children: [frameControl, betaControl, lengthControl, slamButtonRow, sheetsCheckbox, sliceCheckbox],
      }),
    );

    const controlColumn = new VBox({
      align: "right",
      spacing: 8,
      children: [readoutPanel, controlPanel],
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + 10,
    });
    this.addChild(controlColumn);

    const takeaway = new Text(contractionStrings.takeawayStringProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.secondaryTextColorProperty,
      maxWidth: 680,
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

    // The frame selector first: it is what this screen is about, and everything
    // else is a way of varying what it selects between. Reset All last.
    this.addChild(
      new Node({
        pdomOrder: [
          frameControl,
          betaControl,
          lengthControl,
          entranceSlamButton,
          exitSlamButton,
          sheetsCheckbox,
          sliceCheckbox,
          timeControlNode,
          resetAllButton,
        ],
      }),
    );

    this.disposeEmitter.addListener(() => {
      sheetMultilink.dispose();
      sliceMultilink.dispose();
      slamMultilink.dispose();
      diagramBetaProperty.dispose();
      showPrimedFrameProperty.dispose();
      barnStageLabel.dispose();
      ladderStageLabel.dispose();
      gammaText.dispose();
      ladderLengthText.dispose();
      barnLengthText.dispose();
      sceneTimeText.dispose();
      slamGapText.dispose();
      fitsText.dispose();
      slamOrderText.dispose();
      frameHeadingText.dispose();
    });
  }

  /** All resettable state lives in the model; there is nothing view-side to restore. */
  public reset(): void {
    // Intentionally empty.
  }
}
