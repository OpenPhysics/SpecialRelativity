/**
 * SpacetimeDiagramScreenView.ts
 *
 * The Minkowski diagram, two draggable events, and the readouts that contrast
 * what changes between frames with what does not.
 *
 * ── The layout carries the argument ───────────────────────────────────────────
 * The readout panel puts the interval and the separation *above* the order, and
 * follows the order with a one-line verdict, because the intended reading is
 * top-down: these two numbers never move; this one does, and only in the case
 * where nothing causal depends on it.
 */

import { DerivedProperty, Multilink, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { LinePlot } from "scenerystack/bamboo";
import { toFixed, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Circle, GridBox, HBox, HSeparator, Node, Path, Text, VBox } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { Animation, Easing } from "scenerystack/twixt";
import {
  axisProjections,
  HyperbolaBranch,
  hyperbolaSamples,
  intervalSquared,
  Separation,
  simultaneityLineThrough,
} from "../../common/model/lorentz.js";
import type { SpacetimeEvent } from "../../common/model/SpacetimeEvent.js";
import { BETA_RANGE } from "../../common/model/SpecialRelativityModel.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../../common/SpecialRelativityButtonOptions.js";
import { SpecialRelativityPanel } from "../../common/SpecialRelativityPanel.js";
import {
  createCheckbox,
  createNumberControl,
  createPushButton,
  createReadoutRow,
  createSectionHeader,
  createSubHeader,
} from "../../common/view/controlHelpers.js";
import { MinkowskiDiagramNode } from "../../common/view/MinkowskiDiagramNode.js";
import { SpacetimeEventNode } from "../../common/view/SpacetimeEventNode.js";
import { StringManager } from "../../i18n/StringManager.js";
import type { SpecialRelativityPreferencesModel } from "../../preferences/SpecialRelativityPreferencesModel.js";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { DIAGRAM, FONTS, SCREEN_VIEW_MARGIN } from "../../SpecialRelativityConstants.js";
import { EventOrder, type SpacetimeDiagramModel } from "../model/SpacetimeDiagramModel.js";
import { SpacetimeDiagramScreenSummaryContent } from "./SpacetimeDiagramScreenSummaryContent.js";

/** Seconds a "boost to …" animation takes. */
const BOOST_ANIMATION_DURATION = 1.1;

/** Where the diagram sits, chosen to leave room for the control column. */
const DIAGRAM_LEFT = 74;
const DIAGRAM_TOP = 48;

/**
 * This screen's panels are wider than the shared CONTROL_WIDTH so the checkboxes
 * can sit two to a row. It carries the most controls of the four screens, and a
 * single column of eight of them will not clear the Reset All button.
 */
const PANEL_WIDTH = 300;

export class SpacetimeDiagramScreenView extends ScreenView {
  public constructor(
    model: SpacetimeDiagramModel,
    preferences: SpecialRelativityPreferencesModel,
    options?: ScreenViewOptions,
  ) {
    super({
      screenSummaryContent: new SpacetimeDiagramScreenSummaryContent(model),
      ...options,
    });

    const strings = StringManager.getInstance();
    const diagramStrings = strings.getSpacetimeDiagramStrings();
    const commonStrings = strings.getCommon();
    const units = strings.getUnits();
    const a11y = strings.getSpacetimeDiagramA11yStrings();

    // ── The diagram ───────────────────────────────────────────────────────────
    const diagram = new MinkowskiDiagramNode({
      betaProperty: model.relativity.betaProperty,
      xAxisLabelProperty: commonStrings.xAxisStringProperty,
      ctAxisLabelProperty: commonStrings.ctAxisStringProperty,
      primedXAxisLabelProperty: commonStrings.primedXAxisStringProperty,
      primedCtAxisLabelProperty: commonStrings.primedCtAxisStringProperty,
      showLightConeProperty: model.showLightConeProperty,
      shadeLightConeProperty: model.shadeLightConeProperty,
      showPrimedFrameProperty: model.showPrimedFrameProperty,
      showPrimedGridProperty: model.showPrimedGridProperty,
      nodeOptions: { left: DIAGRAM_LEFT, top: DIAGRAM_TOP },
    });
    this.addChild(diagram);

    // The preference sets the default; the on-screen checkbox then owns the
    // setting for the rest of the session. lazyLink, so merely opening the
    // Preferences dialog cannot overwrite a choice already made on screen.
    const applyShadePreference = (shade: boolean): void => {
      model.shadeLightConeProperty.value = shade;
    };
    preferences.shadeLightConeProperty.lazyLink(applyShadePreference);

    // ── Invariant hyperbolas, one pair of branches through each event ─────────
    const hyperbolaBranches = new Map<SpacetimeEvent, LinePlot[]>();
    for (const event of [model.eventA, model.eventB]) {
      hyperbolaBranches.set(
        event,
        [HyperbolaBranch.POSITIVE, HyperbolaBranch.NEGATIVE].map(
          () =>
            new LinePlot(diagram.chartTransform, [], {
              stroke: SpecialRelativityColors.hyperbolaColorProperty,
              lineWidth: 1.5,
            }),
        ),
      );
    }

    const hyperbolaLayer = new Node({
      children: [...hyperbolaBranches.values()].flat(),
      visibleProperty: model.showHyperbolasProperty,
    });
    diagram.plotLayer.addChild(hyperbolaLayer);

    const updateHyperbolas = (): void => {
      for (const [event, branches] of hyperbolaBranches) {
        // The hyperbola through an event is every point that some frame calls
        // the same interval from the origin, so a boost slides the event along
        // its own curve and can never carry it off one.
        const s2 = intervalSquared(event.positionProperty.value);
        branches.forEach((plot, index) => {
          plot.setDataSet(
            hyperbolaSamples(
              s2,
              DIAGRAM.HYPERBOLA_MAX_RAPIDITY,
              DIAGRAM.HYPERBOLA_SAMPLES,
              index === 0 ? HyperbolaBranch.POSITIVE : HyperbolaBranch.NEGATIVE,
            ),
          );
        });
      }
    };
    const hyperbolaMultilink = Multilink.multilink(
      [model.eventA.positionProperty, model.eventB.positionProperty],
      updateHyperbolas,
    );

    // ── The line of simultaneity through the selected event ───────────────────
    const simultaneityPlot = new LinePlot(diagram.chartTransform, [], {
      stroke: SpecialRelativityColors.simultaneityColorProperty,
      lineWidth: 2.5,
      lineDash: [7, 4],
    });
    simultaneityPlot.visibleProperty = model.showSimultaneityProperty;
    diagram.plotLayer.addChild(simultaneityPlot);

    const updateSimultaneity = (): void => {
      const event = model.selectedEventProperty.value;
      simultaneityPlot.setDataSet(
        simultaneityLineThrough(
          event.positionProperty.value,
          model.relativity.betaProperty.value,
          2 * DIAGRAM.HALF_EXTENT,
        ),
      );
    };
    const simultaneityMultilink = Multilink.multilink(
      [
        model.selectedEventProperty,
        model.eventA.positionProperty,
        model.eventB.positionProperty,
        model.relativity.betaProperty,
      ],
      updateSimultaneity,
    );

    // ── Coordinate projections onto both frames' axes ─────────────────────────
    // Reading a coordinate off a skewed mesh is the step students reliably get
    // wrong, because the rectangular habit — drop a perpendicular — is exactly
    // the wrong move. These four lines show the right one: travel parallel to the
    // *other* axis. The lab pair is drawn as well, in the lab's own grey, so the
    // comparison is on screen rather than in memory.
    const labProjections = new Path(null, {
      stroke: SpecialRelativityColors.diagramAxisColorProperty,
      lineWidth: 1.5,
      lineDash: [3, 4],
    });
    const primedProjections = new Path(null, {
      stroke: SpecialRelativityColors.simultaneityColorProperty,
      lineWidth: 2,
      lineDash: [6, 4],
    });

    // A dot at each foot. Without them the primed lines are hard to tell from the
    // primed axes they end on — which is the one distinction the whole feature
    // exists to draw, since the foot *is* the coordinate reading.
    const footMarkers = [
      { marker: new Circle(3.5, { fill: SpecialRelativityColors.diagramAxisColorProperty }), primed: false },
      { marker: new Circle(3.5, { fill: SpecialRelativityColors.diagramAxisColorProperty }), primed: false },
      { marker: new Circle(4, { fill: SpecialRelativityColors.simultaneityColorProperty }), primed: true },
      { marker: new Circle(4, { fill: SpecialRelativityColors.simultaneityColorProperty }), primed: true },
    ];

    const projectionLayer = new Node({
      children: [labProjections, primedProjections, ...footMarkers.map((foot) => foot.marker)],
      visibleProperty: model.showProjectionsProperty,
    });
    diagram.plotLayer.addChild(projectionLayer);

    const updateProjections = (): void => {
      const event = model.selectedEventProperty.value.positionProperty.value;
      const view = (point: Vector2): Vector2 => diagram.chartTransform.modelToViewPosition(point);

      const eventView = view(event);
      const onXAxis = new Vector2(event.x, 0);
      const onCtAxis = new Vector2(0, event.y);
      labProjections.shape = new Shape().moveToPoint(view(onXAxis)).lineToPoint(eventView).lineToPoint(view(onCtAxis));

      const { ontoSpaceAxis, ontoTimeAxis } = axisProjections(event, model.relativity.betaProperty.value);
      primedProjections.shape = new Shape()
        .moveToPoint(view(ontoSpaceAxis))
        .lineToPoint(eventView)
        .lineToPoint(view(ontoTimeAxis));

      [onXAxis, onCtAxis, ontoSpaceAxis, ontoTimeAxis].forEach((foot, index) => {
        const entry = footMarkers[index];
        if (entry) {
          entry.marker.center = view(foot);
        }
      });
    };
    const projectionMultilink = Multilink.multilink(
      [
        model.selectedEventProperty,
        model.eventA.positionProperty,
        model.eventB.positionProperty,
        model.relativity.betaProperty,
      ],
      updateProjections,
    );

    // ── The draggable events ──────────────────────────────────────────────────
    const eventANode = new SpacetimeEventNode(model.eventA, diagram.modelViewTransform, {
      fill: SpecialRelativityColors.eventAColorProperty,
      labelStringProperty: diagramStrings.eventAStringProperty,
      accessibleName: a11y.controls.eventAStringProperty,
      accessibleHelpText: a11y.controls.eventAHelpStringProperty,
      onPress: () => {
        model.selectedEventProperty.value = model.eventA;
      },
    });
    const eventBNode = new SpacetimeEventNode(model.eventB, diagram.modelViewTransform, {
      fill: SpecialRelativityColors.eventBColorProperty,
      labelStringProperty: diagramStrings.eventBStringProperty,
      accessibleName: a11y.controls.eventBStringProperty,
      accessibleHelpText: a11y.controls.eventBHelpStringProperty,
      onPress: () => {
        model.selectedEventProperty.value = model.eventB;
      },
    });
    diagram.overlayLayer.addChild(eventANode);
    diagram.overlayLayer.addChild(eventBNode);

    // ── Readouts ──────────────────────────────────────────────────────────────
    const coordinatePair = (property: TReadOnlyProperty<Vector2>): TReadOnlyProperty<string> =>
      new DerivedProperty([property], (position) => `${toFixed(position.x, 1)}, ${toFixed(position.y, 1)}`);

    const aLabText = coordinatePair(model.eventA.positionProperty);
    const bLabText = coordinatePair(model.eventB.positionProperty);
    const aPrimedText = coordinatePair(model.eventAPrimedProperty);
    const bPrimedText = coordinatePair(model.eventBPrimedProperty);

    const intervalText = new PatternStringProperty(
      units.lightSecondsSquaredStringProperty,
      { value: model.intervalProperty },
      { decimalPlaces: 2 },
    );

    // √|s²| with a label that switches: the same number is the proper time along
    // a timelike separation and the proper distance across a spacelike one, and
    // naming which is which is most of what makes it useful.
    const properSeparationText = new PatternStringProperty(
      units.secondsStringProperty,
      { value: model.properSeparationProperty },
      { decimalPlaces: 2 },
    );
    const properDistanceText = new PatternStringProperty(
      units.lightSecondsStringProperty,
      { value: model.properSeparationProperty },
      { decimalPlaces: 2 },
    );
    const properSeparationValueText = new DerivedProperty(
      [model.separationProperty, properSeparationText, properDistanceText],
      (separation, asTime, asDistance) => (separation === Separation.SPACELIKE ? asDistance : asTime),
    );
    const properSeparationLabelText = new DerivedProperty(
      [model.separationProperty, diagramStrings.properTimeStringProperty, diagramStrings.properDistanceStringProperty],
      (separation, properTime, properDistance) => (separation === Separation.SPACELIKE ? properDistance : properTime),
    );

    const separationText = new DerivedProperty(
      [
        model.separationProperty,
        diagramStrings.timelikeStringProperty,
        diagramStrings.lightlikeStringProperty,
        diagramStrings.spacelikeStringProperty,
      ],
      (separation, timelike, lightlike, spacelike) => {
        if (separation === Separation.TIMELIKE) {
          return timelike;
        }
        return separation === Separation.LIGHTLIKE ? lightlike : spacelike;
      },
    );

    const orderText = new DerivedProperty(
      [
        model.eventOrderProperty,
        diagramStrings.aFirstStringProperty,
        diagramStrings.bFirstStringProperty,
        diagramStrings.simultaneousStringProperty,
      ],
      (order, aFirst, bFirst, simultaneous) => {
        if (order === EventOrder.A_FIRST) {
          return aFirst;
        }
        return order === EventOrder.B_FIRST ? bFirst : simultaneous;
      },
    );

    const verdictText = new DerivedProperty(
      [
        model.orderIsFrameDependentProperty,
        diagramStrings.orderAgreedStringProperty,
        diagramStrings.orderDisputedStringProperty,
      ],
      (frameDependent, agreed, disputed) => (frameDependent ? disputed : agreed),
    );

    const verdict = new Text(verdictText, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.secondaryTextColorProperty,
      maxWidth: PANEL_WIDTH,
    });

    const readoutPanel = new SpecialRelativityPanel(
      new VBox({
        align: "left",
        spacing: 4,
        children: [
          createSectionHeader(diagramStrings.eventsHeadingStringProperty),
          // Two frames × two events. The rows are labelled with the event letters
          // and grouped under a frame heading; labelling them by frame instead
          // would leave "Lab frame" appearing twice with only colour to say which
          // row was which.
          createSubHeader(commonStrings.labFrameStringProperty),
          createReadoutRow(
            diagramStrings.eventAStringProperty,
            aLabText,
            SpecialRelativityColors.eventAColorProperty,
            PANEL_WIDTH,
          ),
          createReadoutRow(
            diagramStrings.eventBStringProperty,
            bLabText,
            SpecialRelativityColors.eventBColorProperty,
            PANEL_WIDTH,
          ),
          createSubHeader(commonStrings.movingFrameStringProperty),
          createReadoutRow(
            diagramStrings.eventAStringProperty,
            aPrimedText,
            SpecialRelativityColors.eventAColorProperty,
            PANEL_WIDTH,
          ),
          createReadoutRow(
            diagramStrings.eventBStringProperty,
            bPrimedText,
            SpecialRelativityColors.eventBColorProperty,
            PANEL_WIDTH,
          ),
          new HSeparator({ stroke: SpecialRelativityColors.panelBorderColorProperty }),
          createReadoutRow(
            diagramStrings.intervalStringProperty,
            intervalText,
            SpecialRelativityColors.hyperbolaColorProperty,
            PANEL_WIDTH,
          ),
          createReadoutRow(
            properSeparationLabelText,
            properSeparationValueText,
            SpecialRelativityColors.hyperbolaColorProperty,
            PANEL_WIDTH,
          ),
          createReadoutRow(diagramStrings.separationStringProperty, separationText, undefined, PANEL_WIDTH),
          createReadoutRow(
            diagramStrings.orderStringProperty,
            orderText,
            SpecialRelativityColors.primedAxisColorProperty,
            PANEL_WIDTH,
          ),
          verdict,
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

    // ── The two boost buttons ─────────────────────────────────────────────────
    // A matched pair, and deliberately shown as one: for any placement of A and B
    // exactly one of them is available. "Boost to B" needs a timelike separation
    // from the origin, "make them simultaneous" needs a spacelike separation
    // between the events, and the greyed-out half is as much of the lesson as the
    // live one — no change of frame reaches a spacelike-separated event, and none
    // reorders a timelike pair.
    let boostAnimation: Animation | null = null;
    const animateBetaTo = (target: number | null): void => {
      if (target === null) {
        return;
      }
      boostAnimation?.stop();
      boostAnimation = new Animation({
        property: model.relativity.betaProperty,
        to: target,
        duration: BOOST_ANIMATION_DURATION,
        easing: Easing.CUBIC_IN_OUT,
      });
      boostAnimation.start();
    };

    const buttonTextWidth = PANEL_WIDTH / 2 - 28;

    const boostEnabledProperty = new DerivedProperty([model.boostToBProperty], (beta) => beta !== null);
    const boostButton = createPushButton(diagramStrings.boostToBStringProperty, {
      accessibleName: a11y.controls.boostToBStringProperty,
      accessibleHelpText: a11y.controls.boostToBHelpStringProperty,
      enabledProperty: boostEnabledProperty,
      listener: () => animateBetaTo(model.boostToBProperty.value),
      maxTextWidth: buttonTextWidth,
    });

    const simultaneityEnabledProperty = new DerivedProperty(
      [model.boostToSimultaneityProperty],
      (beta) => beta !== null,
    );
    const simultaneityButton = createPushButton(diagramStrings.boostToSimultaneityStringProperty, {
      accessibleName: a11y.controls.boostToSimultaneityStringProperty,
      accessibleHelpText: a11y.controls.boostToSimultaneityHelpStringProperty,
      enabledProperty: simultaneityEnabledProperty,
      listener: () => animateBetaTo(model.boostToSimultaneityProperty.value),
      maxTextWidth: buttonTextWidth,
    });

    const buttonRow = new HBox({ children: [boostButton, simultaneityButton], spacing: 8, stretch: true });

    const checkboxWidth = PANEL_WIDTH / 2 - 4;
    const checkboxes = [
      createCheckbox(
        model.showLightConeProperty,
        diagramStrings.showLightConeStringProperty,
        a11y.controls.showLightConeStringProperty,
        checkboxWidth,
      ),
      createCheckbox(
        model.shadeLightConeProperty,
        diagramStrings.shadeLightConeStringProperty,
        a11y.controls.shadeLightConeStringProperty,
        checkboxWidth,
      ),
      createCheckbox(
        model.showPrimedFrameProperty,
        diagramStrings.showPrimedFrameStringProperty,
        a11y.controls.showPrimedFrameStringProperty,
        checkboxWidth,
      ),
      createCheckbox(
        model.showPrimedGridProperty,
        diagramStrings.showPrimedGridStringProperty,
        a11y.controls.showPrimedGridStringProperty,
        checkboxWidth,
      ),
      createCheckbox(
        model.showSimultaneityProperty,
        diagramStrings.showSimultaneityStringProperty,
        a11y.controls.showSimultaneityStringProperty,
        checkboxWidth,
      ),
      createCheckbox(
        model.showHyperbolasProperty,
        diagramStrings.showHyperbolasStringProperty,
        a11y.controls.showHyperbolasStringProperty,
        checkboxWidth,
      ),
      createCheckbox(
        model.showProjectionsProperty,
        diagramStrings.showProjectionsStringProperty,
        a11y.controls.showProjectionsStringProperty,
        checkboxWidth,
      ),
    ];

    // Two to a row: this screen carries the most controls of the four, and a
    // single column of seven checkboxes does not clear the Reset All button.
    const checkboxGrid = new GridBox({
      autoColumns: 2,
      xSpacing: 8,
      ySpacing: 6,
      xAlign: "left",
      children: checkboxes,
    });

    const controlPanel = new SpecialRelativityPanel(
      new VBox({
        align: "left",
        spacing: 10,
        children: [betaControl, buttonRow, checkboxGrid],
      }),
    );

    const controlColumn = new VBox({
      align: "right",
      spacing: 8,
      children: [readoutPanel, controlPanel],
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      top: this.layoutBounds.minY + 12,
    });
    this.addChild(controlColumn);

    const resetAllButton = new ResetAllButton({
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput();
        boostAnimation?.stop();
        model.reset();
        this.reset();
      },
      right: this.layoutBounds.maxX - SCREEN_VIEW_MARGIN,
      bottom: this.layoutBounds.maxY - SCREEN_VIEW_MARGIN,
    });
    this.addChild(resetAllButton);

    // Events first: they are what the screen is about, and a keyboard user
    // should reach them before the display toggles. Reset All last.
    this.addChild(
      new Node({
        pdomOrder: [
          eventANode,
          eventBNode,
          betaControl,
          boostButton,
          simultaneityButton,
          ...checkboxes,
          resetAllButton,
        ],
      }),
    );

    this.disposeEmitter.addListener(() => {
      preferences.shadeLightConeProperty.unlink(applyShadePreference);
      hyperbolaMultilink.dispose();
      simultaneityMultilink.dispose();
      projectionMultilink.dispose();
      aLabText.dispose();
      bLabText.dispose();
      aPrimedText.dispose();
      bPrimedText.dispose();
      intervalText.dispose();
      properSeparationValueText.dispose();
      properSeparationLabelText.dispose();
      properSeparationText.dispose();
      properDistanceText.dispose();
      separationText.dispose();
      orderText.dispose();
      verdictText.dispose();
      boostEnabledProperty.dispose();
      simultaneityEnabledProperty.dispose();
    });
  }

  /** All resettable state lives in the model; there is nothing view-side to restore. */
  public reset(): void {
    // Intentionally empty.
  }
}
