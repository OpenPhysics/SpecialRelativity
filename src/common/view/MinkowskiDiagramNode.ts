/**
 * MinkowskiDiagramNode.ts
 *
 * The spacetime diagram shared by the Spacetime Diagram and Twin Paradox screens:
 * a bamboo chart frame in lab coordinates (x across, ct up), with the light cone,
 * the sheared primed axes, the primed gridlines, and layers for whatever the
 * screen draws on top.
 *
 * ── Why light rays are guaranteed to render at 45° ────────────────────────────
 * A spacetime diagram is only readable if one light-second of space measures the
 * same number of pixels as one light-second of time — otherwise the light cone
 * tilts and every "is this inside the cone?" judgement the sim asks the student to
 * make becomes a lie. Rather than set the width and height independently and
 * assert that they agree, this node takes a view *width* and derives the height
 * from the ratio of the coordinate ranges. Equal scale is then structural: there
 * is no combination of options that can break it.
 *
 * ── Why the shear is done in model space ──────────────────────────────────────
 * bamboo has no skew support, and reaching for `Node.matrix` to shear a layer
 * would distort the strokes and the event markers along with the geometry. So
 * every primed-frame line is computed in *unprimed* (x, ct) coordinates by
 * {@link simultaneityLineThrough} / {@link worldlineThrough} and handed to the
 * ordinary chart transform. This is also the presentation the physics wants: one
 * undistorted lab diagram with a second frame's coordinate mesh laid over it, so
 * both frames' readings of the same events can be compared directly.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import {
  AxisLine,
  ChartRectangle,
  ChartTransform,
  GridLineSet,
  LinePlot,
  TickLabelSet,
  TickMarkSet,
} from "scenerystack/bamboo";
import { Bounds2, Range, Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { combineOptions, Orientation } from "scenerystack/phet-core";
import { ModelViewTransform2 } from "scenerystack/phetcommon";
import { Node, type NodeOptions, Path, RichText, Text } from "scenerystack/scenery";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { DIAGRAM, FONTS } from "../../SpecialRelativityConstants.js";
import { boostEvent, simultaneityLineThrough, worldlineThrough } from "../model/lorentz.js";
import { decimalPlacesForStep, formatTickValue, niceStep } from "./chartUtils.js";

type MinkowskiDiagramNodeSelfOptions = {
  /** Velocity of the primed frame, as a fraction of c. Drives the shear. */
  betaProperty: TReadOnlyProperty<number>;
  /** Horizontal axis label, e.g. "x (light-seconds)". */
  xAxisLabelProperty: TReadOnlyProperty<string>;
  /** Vertical axis label, e.g. "ct (light-seconds)". */
  ctAxisLabelProperty: TReadOnlyProperty<string>;
  /** Label drawn at the end of the x′ axis. */
  primedXAxisLabelProperty: TReadOnlyProperty<string>;
  /** Label drawn at the end of the ct′ axis. */
  primedCtAxisLabelProperty: TReadOnlyProperty<string>;
  /** Lab-frame x range shown. Defaults to ±DIAGRAM.HALF_EXTENT. */
  xRange?: Range;
  /** Lab-frame ct range shown. Defaults to ±DIAGRAM.HALF_EXTENT. */
  ctRange?: Range;
  /** Plotting-area width in pixels; the height follows from the ranges. */
  viewWidth?: number;
  /** Whether the light cone is drawn. Always-on if omitted. */
  showLightConeProperty?: TReadOnlyProperty<boolean>;
  /** Whether the causal future and past are shaded. Off if omitted. */
  shadeLightConeProperty?: TReadOnlyProperty<boolean>;
  /** Whether the primed axes and their gridlines are drawn. Always-on if omitted. */
  showPrimedFrameProperty?: TReadOnlyProperty<boolean>;
  /**
   * Whether the primed *gridlines* (as distinct from the primed axes) are drawn.
   * **Off if omitted** — unlike the axes, the full mesh is dense enough to compete
   * with whatever the screen is actually plotting, so it is opt-in.
   */
  showPrimedGridProperty?: TReadOnlyProperty<boolean>;
  /** Extra Node options (position, visibility, …). */
  nodeOptions?: NodeOptions;
};

export type MinkowskiDiagramNodeOptions = MinkowskiDiagramNodeSelfOptions;

export class MinkowskiDiagramNode extends Node {
  /** Maps lab-frame (x, ct) in light-seconds to pixels inside the plotting area. */
  public readonly chartTransform: ChartTransform;

  /**
   * The same mapping as {@link chartTransform}, in the form the standard drag
   * listeners want. `DragListener` and `KeyboardDragListener` take a
   * ModelViewTransform2 and a positionProperty and handle the rest themselves, so
   * exposing this is what lets draggable events use the fleet's ordinary drag
   * pattern instead of hand-converting pointer coordinates.
   */
  public readonly modelViewTransform: ModelViewTransform2;

  /**
   * Where screens add curves — worldlines, hyperbolas, simultaneity lines.
   * **Clipped** to the plotting area, so a curve running off the edge is cut
   * cleanly at the frame.
   */
  public readonly plotLayer: Node;

  /**
   * Where screens add markers and labels that must NOT be clipped: draggable
   * event dots sitting on the frame edge, readouts that overhang it.
   */
  public readonly overlayLayer: Node;

  private readonly xRange: Range;
  private readonly ctRange: Range;

  public constructor(providedOptions: MinkowskiDiagramNodeOptions) {
    const options = combineOptions<MinkowskiDiagramNodeOptions>(
      {
        xRange: new Range(-DIAGRAM.HALF_EXTENT, DIAGRAM.HALF_EXTENT),
        ctRange: new Range(-DIAGRAM.HALF_EXTENT, DIAGRAM.HALF_EXTENT),
        viewWidth: DIAGRAM.VIEW_WIDTH,
      },
      providedOptions,
    );
    const xRange = options.xRange ?? new Range(-DIAGRAM.HALF_EXTENT, DIAGRAM.HALF_EXTENT);
    const ctRange = options.ctRange ?? new Range(-DIAGRAM.HALF_EXTENT, DIAGRAM.HALF_EXTENT);
    const viewWidth = options.viewWidth ?? DIAGRAM.VIEW_WIDTH;

    // Equal pixels per light-second on both axes — see the header note.
    const viewHeight = (viewWidth * ctRange.getLength()) / xRange.getLength();

    super();

    this.xRange = xRange;
    this.ctRange = ctRange;

    this.chartTransform = new ChartTransform({
      viewWidth,
      viewHeight,
      modelXRange: xRange,
      modelYRange: ctRange,
    });

    // Deliberately built from the same four numbers as the ChartTransform above,
    // so the two mappings cannot disagree: bamboo's default linear ranging *is*
    // an inverted-Y rectangle mapping.
    this.modelViewTransform = ModelViewTransform2.createRectangleInvertedYMapping(
      new Bounds2(xRange.min, ctRange.min, xRange.max, ctRange.max),
      new Bounds2(0, 0, viewWidth, viewHeight),
    );

    const chartRectangle = new ChartRectangle(this.chartTransform, {
      fill: SpecialRelativityColors.diagramBackgroundColorProperty,
      stroke: SpecialRelativityColors.diagramAxisColorProperty,
      lineWidth: 1,
    });

    // ── Lab-frame grid, ticks, and axes ──────────────────────────────────────
    const xSpacing = niceStep(xRange.getLength(), DIAGRAM.TARGET_DIVISIONS);
    const ctSpacing = niceStep(ctRange.getLength(), DIAGRAM.TARGET_DIVISIONS);
    const xDecimals = decimalPlacesForStep(xSpacing);
    const ctDecimals = decimalPlacesForStep(ctSpacing);

    const gridLines = [
      new GridLineSet(this.chartTransform, Orientation.HORIZONTAL, xSpacing, {
        stroke: SpecialRelativityColors.diagramGridColorProperty,
      }),
      new GridLineSet(this.chartTransform, Orientation.VERTICAL, ctSpacing, {
        stroke: SpecialRelativityColors.diagramGridColorProperty,
      }),
    ];

    const tickMarks = [
      new TickMarkSet(this.chartTransform, Orientation.HORIZONTAL, xSpacing, {
        edge: "min",
        stroke: SpecialRelativityColors.diagramAxisColorProperty,
        extent: 5,
      }),
      new TickMarkSet(this.chartTransform, Orientation.VERTICAL, ctSpacing, {
        edge: "min",
        stroke: SpecialRelativityColors.diagramAxisColorProperty,
        extent: 5,
      }),
    ];

    const tickLabels = [
      new TickLabelSet(this.chartTransform, Orientation.HORIZONTAL, xSpacing, {
        edge: "min",
        extent: 5,
        createLabel: (value: number) =>
          new Text(formatTickValue(value, xDecimals), {
            font: FONTS.TICK_LABEL,
            fill: SpecialRelativityColors.textColorProperty,
          }),
      }),
      new TickLabelSet(this.chartTransform, Orientation.VERTICAL, ctSpacing, {
        edge: "min",
        extent: 5,
        createLabel: (value: number) =>
          new Text(formatTickValue(value, ctDecimals), {
            font: FONTS.TICK_LABEL,
            fill: SpecialRelativityColors.textColorProperty,
          }),
      }),
    ];

    const axisLines = [
      new AxisLine(this.chartTransform, Orientation.HORIZONTAL, {
        stroke: SpecialRelativityColors.diagramAxisColorProperty,
        lineWidth: 1.5,
      }),
      new AxisLine(this.chartTransform, Orientation.VERTICAL, {
        stroke: SpecialRelativityColors.diagramAxisColorProperty,
        lineWidth: 1.5,
      }),
    ];

    // ── Light cone ───────────────────────────────────────────────────────────
    // Fixed geometry: ct = ±x through the origin, and the triangular causal
    // future and past those two rays bound. Neither depends on β — that they do
    // not is the whole content of the second postulate.
    const coneReach = Math.max(Math.abs(xRange.min), xRange.max, Math.abs(ctRange.min), ctRange.max);

    const coneShading = new Path(this.causalRegionShape(coneReach), {
      fill: SpecialRelativityColors.lightConeFillColorProperty,
    });
    if (options.shadeLightConeProperty) {
      coneShading.visibleProperty = options.shadeLightConeProperty;
    } else {
      coneShading.visible = false;
    }

    const lightCone = new Node({
      children: [
        new LinePlot(this.chartTransform, [new Vector2(-coneReach, -coneReach), new Vector2(coneReach, coneReach)], {
          stroke: SpecialRelativityColors.lightConeColorProperty,
          lineWidth: 2,
        }),
        new LinePlot(this.chartTransform, [new Vector2(-coneReach, coneReach), new Vector2(coneReach, -coneReach)], {
          stroke: SpecialRelativityColors.lightConeColorProperty,
          lineWidth: 2,
        }),
      ],
    });
    if (options.showLightConeProperty) {
      lightCone.visibleProperty = options.showLightConeProperty;
    }

    // ── Primed frame: axes and gridlines ─────────────────────────────────────
    const lineExtent = coneReach * 2;

    const primedCtAxis = new LinePlot(this.chartTransform, [], {
      stroke: SpecialRelativityColors.primedAxisColorProperty,
      lineWidth: 2.5,
    });
    const primedXAxis = new LinePlot(this.chartTransform, [], {
      stroke: SpecialRelativityColors.primedAxisColorProperty,
      lineWidth: 2.5,
    });

    // One plot per gridline, created up front with its primed-coordinate offset
    // baked in and merely re-pointed on every β change — a fixed set of nodes
    // animates far more cheaply than rebuilding the mesh each frame.
    const primedGridLines: { plot: LinePlot; primedOffset: Vector2 }[] = [];
    for (let step = 1; step <= DIAGRAM.PRIMED_GRID_LINES; step++) {
      const offset = step * DIAGRAM.PRIMED_GRID_SPACING;
      for (const sign of [1, -1]) {
        // A line of constant t′ = ±offset, and a line of constant x′ = ±offset.
        for (const primedOffset of [new Vector2(0, sign * offset), new Vector2(sign * offset, 0)]) {
          primedGridLines.push({
            plot: new LinePlot(this.chartTransform, [], {
              stroke: SpecialRelativityColors.primedGridColorProperty,
              lineWidth: 1,
            }),
            primedOffset,
          });
        }
      }
    }

    const primedGrid = new Node({ children: primedGridLines.map((line) => line.plot) });
    if (options.showPrimedGridProperty) {
      primedGrid.visibleProperty = options.showPrimedGridProperty;
    } else {
      primedGrid.visible = false;
    }

    const primedCtAxisLabel = new RichText(options.primedCtAxisLabelProperty, {
      font: FONTS.AXIS_LABEL,
      fill: SpecialRelativityColors.primedAxisColorProperty,
    });
    const primedXAxisLabel = new RichText(options.primedXAxisLabelProperty, {
      font: FONTS.AXIS_LABEL,
      fill: SpecialRelativityColors.primedAxisColorProperty,
    });

    const primedFrame = new Node({ children: [primedGrid, primedCtAxis, primedXAxis] });
    const primedLabels = new Node({ children: [primedCtAxisLabel, primedXAxisLabel] });
    if (options.showPrimedFrameProperty) {
      primedFrame.visibleProperty = options.showPrimedFrameProperty;
      primedLabels.visibleProperty = options.showPrimedFrameProperty;
    }

    this.plotLayer = new Node();
    this.overlayLayer = new Node();

    // Everything that can run off the edge of the coordinate range lives inside
    // the clip; labels that are meant to sit just outside it do not.
    const clippedContent = new Node({
      clipArea: chartRectangle.getShape(),
      children: [coneShading, primedFrame, lightCone, this.plotLayer, primedLabels],
    });

    const chartGroup = new Node({
      children: [
        chartRectangle,
        ...gridLines,
        ...axisLines,
        ...tickMarks,
        ...tickLabels,
        clippedContent,
        this.overlayLayer,
      ],
      x: DIAGRAM.LEFT_PADDING,
      y: DIAGRAM.TOP_PADDING,
    });
    this.addChild(chartGroup);

    const xAxisLabel = new RichText(options.xAxisLabelProperty, {
      font: FONTS.DIAGRAM_TITLE,
      fill: SpecialRelativityColors.secondaryTextColorProperty,
      maxWidth: viewWidth,
      centerX: chartGroup.x + viewWidth / 2,
      top: chartGroup.y + viewHeight + DIAGRAM.BOTTOM_PADDING - 22,
    });
    this.addChild(xAxisLabel);

    const ctAxisLabel = new RichText(options.ctAxisLabelProperty, {
      font: FONTS.DIAGRAM_TITLE,
      fill: SpecialRelativityColors.secondaryTextColorProperty,
      maxWidth: viewHeight,
      rotation: -Math.PI / 2,
      centerY: chartGroup.y + viewHeight / 2,
      left: 2,
    });
    this.addChild(ctAxisLabel);

    // Reserve the right-hand padding so sibling layout sees a stable width even
    // when the last x tick label is short.
    this.addChild(
      new Node({
        localBounds: chartRectangle.bounds.shiftedXY(chartGroup.x, chartGroup.y).dilatedX(DIAGRAM.RIGHT_PADDING),
      }),
    );

    const updatePrimedFrame = (beta: number): void => {
      primedCtAxis.setDataSet(worldlineThrough(Vector2.ZERO, beta, lineExtent));
      primedXAxis.setDataSet(simultaneityLineThrough(Vector2.ZERO, beta, lineExtent));

      for (const { plot, primedOffset } of primedGridLines) {
        // Each gridline is pinned to a point with fixed primed coordinates; the
        // inverse boost puts that point back into lab coordinates, and the line
        // drawn through it runs parallel to whichever primed axis it belongs to.
        const anchor = boostEvent(primedOffset, -beta);
        plot.setDataSet(
          primedOffset.x === 0
            ? simultaneityLineThrough(anchor, beta, lineExtent)
            : worldlineThrough(anchor, beta, lineExtent),
        );
      }

      // Park each primed-axis label where its axis leaves the frame.
      const ctAxisEnd = this.chartTransform.modelToViewPosition(new Vector2(beta * ctRange.max, ctRange.max));
      primedCtAxisLabel.centerX = ctAxisEnd.x + (beta >= 0 ? 12 : -12);
      primedCtAxisLabel.top = ctAxisEnd.y + 4;

      const xAxisEnd = this.chartTransform.modelToViewPosition(new Vector2(xRange.max, beta * xRange.max));
      primedXAxisLabel.right = xAxisEnd.x - 6;
      primedXAxisLabel.bottom = xAxisEnd.y - 6;
    };

    const primedFrameMultilink = Multilink.multilink([options.betaProperty], updatePrimedFrame);

    this.disposeEmitter.addListener(() => {
      primedFrameMultilink.dispose();
    });

    this.mutate(options.nodeOptions);
  }

  /** Model→view for lab-frame events; screens use it to place their own nodes. */
  public modelToView(event: Vector2): Vector2 {
    return this.chartTransform.modelToViewPosition(event);
  }

  /** View→model, for converting a pointer position back into an event. */
  public viewToModel(point: Vector2): Vector2 {
    return this.chartTransform.viewToModelPosition(point);
  }

  /** The lab-frame region the diagram shows — the natural drag bounds for events. */
  public get modelBounds(): Bounds2 {
    return new Bounds2(this.xRange.min, this.ctRange.min, this.xRange.max, this.ctRange.max);
  }

  /**
   * The two triangles bounded by the light rays through the origin: the set of
   * events that can be reached from, or can reach, the origin.
   */
  private causalRegionShape(reach: number): Shape {
    const shape = new Shape();
    for (const sign of [1, -1]) {
      const apex = this.chartTransform.modelToViewPosition(Vector2.ZERO);
      const left = this.chartTransform.modelToViewPosition(new Vector2(-reach, sign * reach));
      const right = this.chartTransform.modelToViewPosition(new Vector2(reach, sign * reach));
      shape.moveToPoint(apex).lineToPoint(left).lineToPoint(right).close();
    }
    return shape;
  }
}
