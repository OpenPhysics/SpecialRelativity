/**
 * LadderBarnStageNode.ts
 *
 * The scene itself: a barn with a door at each end, and a ladder going through it,
 * drawn with the rulers and the clock of whichever frame is selected.
 *
 * ── What is a display convention here, and what is not ────────────────────────
 * The positions and the lengths are the physics, straight out of
 * {@link ladderBarnGeometry}. Exactly one thing on this node is a convention: a
 * slam is an *instant*, and an instant occupies one frame of animation, so each
 * door is drawn shut for a short window either side of its slam. Widening a point
 * into a window is the only way the moment the whole experiment turns on can be
 * seen at all — but it is worth knowing that the window is drawing, not doors.
 *
 * The measure lines under the barn and over the ladder are drawn from the same
 * spans as the objects, so the numbers cannot say one thing while the picture
 * shows another.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Line, Node, type NodeOptions, Path, Rectangle, Text } from "scenerystack/scenery";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { FONTS, LADDER_BARN } from "../../SpecialRelativityConstants.js";
import type { DoorStates } from "../model/LengthContractionModel.js";
import { type Snapshot, type Span, spanLength } from "../model/ladderBarnGeometry.js";

/** Fraction of the barn's height a *open* door stub occupies at top and bottom. */
const OPEN_DOOR_STUB = 0.22;

/** Gap in pixels between an object and the measure line that reports its length. */
const MEASURE_OFFSET = 16;

/** Half-length in pixels of the end ticks on a measure line. */
const MEASURE_TICK = 5;

export type LadderBarnStageNodeOptions = {
  /** Where both objects are, in the selected frame, right now. */
  snapshotProperty: TReadOnlyProperty<Snapshot>;
  /** Which doors are drawn shut right now. */
  doorStatesProperty: TReadOnlyProperty<DoorStates>;
  /** Whether the ladder is wholly between the doors at this instant. */
  isEntirelyInsideProperty: TReadOnlyProperty<boolean>;
  /** "Barn: 4.0 ls", already localized and formatted. */
  barnLabelProperty: TReadOnlyProperty<string>;
  /** "Ladder: 3.0 ls", already localized and formatted. */
  ladderLabelProperty: TReadOnlyProperty<string>;
  /** Extra Node options (position, …). */
  nodeOptions?: NodeOptions;
};

export class LadderBarnStageNode extends Node {
  public constructor(providedOptions: LadderBarnStageNodeOptions) {
    super();

    const scale = LADDER_BARN.STAGE_VIEW_SCALE;
    const halfWidth = LADDER_BARN.STAGE_HALF_EXTENT * scale;
    const height = LADDER_BARN.BARN_HEIGHT;

    /** Model x in light-seconds to view x in pixels, with 0 at the stage's centre. */
    const viewX = (x: number): number => x * scale;

    // ── The ground the barn stands on ─────────────────────────────────────────
    const ground = new Line(-halfWidth, 0, halfWidth, 0, {
      stroke: SpecialRelativityColors.trackColorProperty,
      lineWidth: 2,
    });

    // ── The barn: floor, roof, and a door at each end ─────────────────────────
    // The roof and floor are redrawn on every frame rather than positioned once,
    // because in the ladder's frame the barn is the thing that moves.
    const barnShell = new Path(null, {
      stroke: SpecialRelativityColors.apparatusColorProperty,
      lineWidth: 2.5,
    });

    /**
     * One door. The open state is two stubs with a gap between them — something a
     * ladder can pass through — and the closed state is a solid panel across the
     * whole opening, in the events colour the rest of the sim uses for the moments
     * that matter.
     */
    const createDoor = (): { node: Node; setState: (x: number, closed: boolean) => void } => {
      const stubHeight = height * OPEN_DOOR_STUB;
      const topStub = new Rectangle(0, 0, LADDER_BARN.DOOR_WIDTH, stubHeight, {
        fill: SpecialRelativityColors.apparatusColorProperty,
      });
      const bottomStub = new Rectangle(0, 0, LADDER_BARN.DOOR_WIDTH, stubHeight, {
        fill: SpecialRelativityColors.apparatusColorProperty,
      });
      const panel = new Rectangle(0, 0, LADDER_BARN.DOOR_WIDTH, height, {
        fill: SpecialRelativityColors.eventBColorProperty,
      });
      const node = new Node({ children: [topStub, bottomStub, panel] });

      const setState = (x: number, closed: boolean): void => {
        const left = viewX(x) - LADDER_BARN.DOOR_WIDTH / 2;
        topStub.setRect(left, -height, LADDER_BARN.DOOR_WIDTH, stubHeight);
        bottomStub.setRect(left, -stubHeight, LADDER_BARN.DOOR_WIDTH, stubHeight);
        panel.setRect(left, -height, LADDER_BARN.DOOR_WIDTH, height);
        panel.visible = closed;
        topStub.visible = !closed;
        bottomStub.visible = !closed;
      };

      return { node, setState };
    };

    const entranceDoor = createDoor();
    const exitDoor = createDoor();

    // ── The ladder: two rails and a set of rungs ──────────────────────────────
    const ladderPath = new Path(null, {
      stroke: SpecialRelativityColors.ladderColorProperty,
      lineWidth: 3,
    });

    // A wash across the barn's opening while the ladder is wholly inside it. In
    // the barn frame this comes on for a stretch around t = 0; in the ladder frame
    // it never comes on at all, and its never coming on is the answer to the
    // screen's question.
    const insideHighlight = new Rectangle(0, 0, 1, 1, {
      fill: SpecialRelativityColors.beamingFillColorProperty,
    });

    // ── Measure lines ─────────────────────────────────────────────────────────
    const barnMeasure = new Path(null, {
      stroke: SpecialRelativityColors.apparatusColorProperty,
      lineWidth: 1.5,
    });
    const ladderMeasure = new Path(null, {
      stroke: SpecialRelativityColors.ladderColorProperty,
      lineWidth: 1.5,
    });
    const barnLabel = new Text(providedOptions.barnLabelProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.apparatusColorProperty,
      maxWidth: 220,
    });
    const ladderLabel = new Text(providedOptions.ladderLabelProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.ladderColorProperty,
      maxWidth: 220,
    });

    /** A ⊢——⊣ bracket spanning `span` at view height `y`. */
    const measureShape = (span: Span, y: number): Shape =>
      new Shape()
        .moveTo(viewX(span.left), y - MEASURE_TICK)
        .lineTo(viewX(span.left), y + MEASURE_TICK)
        .moveTo(viewX(span.left), y)
        .lineTo(viewX(span.right), y)
        .moveTo(viewX(span.right), y - MEASURE_TICK)
        .lineTo(viewX(span.right), y + MEASURE_TICK);

    const stage = new Node({
      children: [
        ground,
        insideHighlight,
        barnShell,
        entranceDoor.node,
        exitDoor.node,
        ladderPath,
        barnMeasure,
        ladderMeasure,
        barnLabel,
        ladderLabel,
      ],
      // Clipped so an object leaving the window is cut at the edge of the stage
      // rather than sprawling across the control panel.
      clipArea: Shape.bounds(new Bounds2(-halfWidth, -height - 46, halfWidth, MEASURE_OFFSET + 24)),
    });
    this.addChild(stage);

    const update = (): void => {
      const { barn, ladder } = providedOptions.snapshotProperty.value;
      const doors = providedOptions.doorStatesProperty.value;

      barnShell.shape = new Shape()
        .moveTo(viewX(barn.left), 0)
        .lineTo(viewX(barn.left), -height)
        .lineTo(viewX(barn.right), -height)
        .lineTo(viewX(barn.right), 0);

      entranceDoor.setState(barn.left, doors.entranceClosed);
      exitDoor.setState(barn.right, doors.exitClosed);

      const rungTop = -height / 2 - LADDER_BARN.LADDER_HEIGHT / 2;
      const rungBottom = -height / 2 + LADDER_BARN.LADDER_HEIGHT / 2;
      const shape = new Shape()
        .moveTo(viewX(ladder.left), rungTop)
        .lineTo(viewX(ladder.right), rungTop)
        .moveTo(viewX(ladder.left), rungBottom)
        .lineTo(viewX(ladder.right), rungBottom);
      for (let index = 0; index <= LADDER_BARN.LADDER_RUNGS; index++) {
        const x = ladder.left + (spanLength(ladder) * index) / LADDER_BARN.LADDER_RUNGS;
        shape.moveTo(viewX(x), rungTop).lineTo(viewX(x), rungBottom);
      }
      ladderPath.shape = shape;

      insideHighlight.visible = providedOptions.isEntirelyInsideProperty.value;
      insideHighlight.setRect(viewX(barn.left), -height, spanLength(barn) * scale, height);

      barnMeasure.shape = measureShape(barn, MEASURE_OFFSET);
      barnLabel.centerX = viewX((barn.left + barn.right) / 2);
      barnLabel.top = MEASURE_OFFSET + MEASURE_TICK + 3;

      ladderMeasure.shape = measureShape(ladder, -height - MEASURE_OFFSET);
      ladderLabel.centerX = viewX((ladder.left + ladder.right) / 2);
      ladderLabel.bottom = -height - MEASURE_OFFSET - MEASURE_TICK - 3;
    };

    const updateMultilink = Multilink.multilink(
      [providedOptions.snapshotProperty, providedOptions.doorStatesProperty, providedOptions.isEntirelyInsideProperty],
      update,
    );

    this.disposeEmitter.addListener(() => {
      updateMultilink.dispose();
      barnLabel.dispose();
      ladderLabel.dispose();
    });

    this.mutate(providedOptions.nodeOptions);
  }
}
