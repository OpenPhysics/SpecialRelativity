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
import { toFixed, type Vector2 } from "scenerystack/dot";
import { HSeparator, Node, Text, VBox } from "scenerystack/scenery";
import { ResetAllButton } from "scenerystack/scenery-phet";
import type { ScreenViewOptions } from "scenerystack/sim";
import { ScreenView } from "scenerystack/sim";
import { RectangularPushButton } from "scenerystack/sun";
import { Animation, Easing } from "scenerystack/twixt";
import {
  HyperbolaBranch,
  hyperbolaSamples,
  intervalSquared,
  Separation,
  simultaneityLineThrough,
} from "../../common/model/lorentz.js";
import type { SpacetimeEvent } from "../../common/model/SpacetimeEvent.js";
import { BETA_RANGE } from "../../common/model/SpecialRelativityModel.js";
import {
  FLAT_RECTANGULAR_BUTTON_OPTIONS,
  FLAT_RESET_ALL_BUTTON_OPTIONS,
  LIGHT_SURFACE_TEXT_FILL,
} from "../../common/SpecialRelativityButtonOptions.js";
import { SpecialRelativityPanel } from "../../common/SpecialRelativityPanel.js";
import {
  CONTROL_WIDTH,
  createCheckbox,
  createNumberControl,
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

/** Seconds the "boost to B's frame" animation takes. */
const BOOST_ANIMATION_DURATION = 1.1;

/** Where the diagram sits, chosen to leave room for the control column. */
const DIAGRAM_LEFT = 96;
const DIAGRAM_TOP = 48;

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

    // ── The draggable events ──────────────────────────────────────────────────
    const eventANode = new SpacetimeEventNode(model.eventA, diagram.modelViewTransform, {
      fill: SpecialRelativityColors.eventAColorProperty,
      labelStringProperty: diagramStrings.eventAStringProperty,
      accessibleName: a11y.controls.eventAStringProperty,
      accessibleHelpText: a11y.controls.eventAHelpStringProperty,
      dragBoundsProperty: model.eventA.dragBoundsProperty,
      onPress: () => {
        model.selectedEventProperty.value = model.eventA;
      },
    });
    const eventBNode = new SpacetimeEventNode(model.eventB, diagram.modelViewTransform, {
      fill: SpecialRelativityColors.eventBColorProperty,
      labelStringProperty: diagramStrings.eventBStringProperty,
      accessibleName: a11y.controls.eventBStringProperty,
      accessibleHelpText: a11y.controls.eventBHelpStringProperty,
      dragBoundsProperty: model.eventB.dragBoundsProperty,
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
      maxWidth: CONTROL_WIDTH,
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
          createReadoutRow(diagramStrings.eventAStringProperty, aLabText, SpecialRelativityColors.eventAColorProperty),
          createReadoutRow(diagramStrings.eventBStringProperty, bLabText, SpecialRelativityColors.eventBColorProperty),
          createSubHeader(commonStrings.movingFrameStringProperty),
          createReadoutRow(
            diagramStrings.eventAStringProperty,
            aPrimedText,
            SpecialRelativityColors.eventAColorProperty,
          ),
          createReadoutRow(
            diagramStrings.eventBStringProperty,
            bPrimedText,
            SpecialRelativityColors.eventBColorProperty,
          ),
          new HSeparator({ stroke: SpecialRelativityColors.panelBorderColorProperty }),
          createReadoutRow(
            diagramStrings.intervalStringProperty,
            intervalText,
            SpecialRelativityColors.hyperbolaColorProperty,
          ),
          createReadoutRow(diagramStrings.separationStringProperty, separationText),
          createReadoutRow(
            diagramStrings.orderStringProperty,
            orderText,
            SpecialRelativityColors.primedAxisColorProperty,
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

    let boostAnimation: Animation | null = null;
    const boostEnabledProperty = new DerivedProperty([model.boostToBProperty], (beta) => beta !== null);
    const boostButton = new RectangularPushButton({
      ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
      content: new Text(diagramStrings.boostToBStringProperty, {
        font: FONTS.READOUT,
        fill: LIGHT_SURFACE_TEXT_FILL,
        maxWidth: CONTROL_WIDTH - 24,
      }),
      baseColor: SpecialRelativityColors.controlSurfaceColorProperty,
      // Disabled exactly when B is not timelike-separated from the origin. The
      // greyed-out button is itself the lesson: no change of frame reaches a
      // spacelike-separated event, because doing so would mean outrunning light.
      enabledProperty: boostEnabledProperty,
      listener: () => {
        const target = model.boostToBProperty.value;
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
      },
      accessibleName: a11y.controls.boostToBStringProperty,
      accessibleHelpText: a11y.controls.boostToBHelpStringProperty,
    });

    const checkboxes = [
      createCheckbox(
        model.showLightConeProperty,
        diagramStrings.showLightConeStringProperty,
        a11y.controls.showLightConeStringProperty,
      ),
      createCheckbox(
        model.shadeLightConeProperty,
        diagramStrings.shadeLightConeStringProperty,
        a11y.controls.shadeLightConeStringProperty,
      ),
      createCheckbox(
        model.showPrimedFrameProperty,
        diagramStrings.showPrimedFrameStringProperty,
        a11y.controls.showPrimedFrameStringProperty,
      ),
      createCheckbox(
        model.showPrimedGridProperty,
        diagramStrings.showPrimedGridStringProperty,
        a11y.controls.showPrimedGridStringProperty,
      ),
      createCheckbox(
        model.showSimultaneityProperty,
        diagramStrings.showSimultaneityStringProperty,
        a11y.controls.showSimultaneityStringProperty,
      ),
      createCheckbox(
        model.showHyperbolasProperty,
        diagramStrings.showHyperbolasStringProperty,
        a11y.controls.showHyperbolasStringProperty,
      ),
    ];

    // Spacing is tight on purpose: this screen carries the most controls of the
    // four, and the column has to clear the Reset All button in the corner.
    const controlPanel = new SpecialRelativityPanel(
      new VBox({
        align: "left",
        spacing: 6,
        children: [betaControl, boostButton, ...checkboxes],
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
        pdomOrder: [eventANode, eventBNode, betaControl, boostButton, ...checkboxes, resetAllButton],
      }),
    );

    this.disposeEmitter.addListener(() => {
      preferences.shadeLightConeProperty.unlink(applyShadePreference);
      hyperbolaMultilink.dispose();
      simultaneityMultilink.dispose();
      aLabText.dispose();
      bLabText.dispose();
      aPrimedText.dispose();
      bPrimedText.dispose();
      intervalText.dispose();
      separationText.dispose();
      orderText.dispose();
      verdictText.dispose();
      boostEnabledProperty.dispose();
    });
  }

  /** All resettable state lives in the model; there is nothing view-side to restore. */
  public reset(): void {
    // Intentionally empty.
  }
}
