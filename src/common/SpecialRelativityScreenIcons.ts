/**
 * SpecialRelativityScreenIcons.ts
 *
 * Programmatic home-screen / navigation-bar icons for each screen.
 * Drawn on the standard PhET 548 × 373 canvas using SpecialRelativityColors.
 *
 * Each icon is the one shape that screen is about, reduced until nothing is left
 * but that shape: a bouncing photon, a sheared pair of axes, a path with a
 * corner in it, a source with its wavefronts bunched ahead.
 */
import { Shape } from "scenerystack/kite";
import { Circle, Line, Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import SpecialRelativityColors from "../SpecialRelativityColors.js";

const W = 548;
const H = 373;

function background(): Rectangle {
  return new Rectangle(0, 0, W, H, { fill: SpecialRelativityColors.backgroundColorProperty });
}

function iconFrom(content: Node): ScreenIcon {
  return new ScreenIcon(content, {
    maxIconWidthProportion: 1,
    maxIconHeightProportion: 1,
    fill: SpecialRelativityColors.backgroundColorProperty,
  });
}

/** Path helper: a polyline through the given view points. */
function polyline(points: readonly number[][]): Shape {
  const shape = new Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) {
      shape.moveTo(x ?? 0, y ?? 0);
    } else {
      shape.lineTo(x ?? 0, y ?? 0);
    }
  });
  return shape;
}

/** Two mirrors with a photon zigzagging between them. */
export function createLightClockIcon(): ScreenIcon {
  const top = 90;
  const bottom = 283;
  return iconFrom(
    new Node({
      children: [
        background(),
        new Rectangle(150, top - 9, 250, 18, {
          fill: SpecialRelativityColors.apparatusColorProperty,
          cornerRadius: 4,
        }),
        new Rectangle(150, bottom - 9, 250, 18, {
          fill: SpecialRelativityColors.apparatusColorProperty,
          cornerRadius: 4,
        }),
        new Path(
          polyline([
            [165, bottom],
            [260, top],
            [355, bottom],
          ]),
          { stroke: SpecialRelativityColors.photonColorProperty, lineWidth: 7 },
        ),
        new Circle(16, { fill: SpecialRelativityColors.photonColorProperty, centerX: 260, centerY: top }),
      ],
    }),
  );
}

/** The light cone with a pair of sheared primed axes inside it. */
export function createSpacetimeDiagramIcon(): ScreenIcon {
  const cx = 274;
  const cy = 186;
  const reach = 165;
  const beta = 0.55;
  return iconFrom(
    new Node({
      children: [
        background(),
        new Line(cx - reach, cy + reach, cx + reach, cy - reach, {
          stroke: SpecialRelativityColors.lightConeColorProperty,
          lineWidth: 6,
        }),
        new Line(cx - reach, cy - reach, cx + reach, cy + reach, {
          stroke: SpecialRelativityColors.lightConeColorProperty,
          lineWidth: 6,
        }),
        // The ct′ axis leans towards the cone by β; the x′ axis leans up to meet it.
        new Line(cx - beta * reach, cy + reach, cx + beta * reach, cy - reach, {
          stroke: SpecialRelativityColors.primedAxisColorProperty,
          lineWidth: 9,
        }),
        new Line(cx - reach, cy + beta * reach, cx + reach, cy - beta * reach, {
          stroke: SpecialRelativityColors.primedAxisColorProperty,
          lineWidth: 9,
        }),
        new Circle(15, { fill: SpecialRelativityColors.eventBColorProperty, centerX: cx + 96, centerY: cy - 58 }),
      ],
    }),
  );
}

/**
 * A barn with a door at each end and a ladder inside it, drawn against the ghost
 * of the same ladder at its uncontracted length — the whole screen in one picture:
 * the ladder that fits is the same ladder as the one that does not.
 */
export function createLengthContractionIcon(): ScreenIcon {
  const baseline = 268;
  const barnTop = 118;
  const barnLeft = 158;
  const barnRight = 390;
  const ladderY = (baseline + barnTop) / 2;
  return iconFrom(
    new Node({
      children: [
        background(),
        // The ladder at rest — longer than the barn, and shown only as an outline
        // because it is the length nobody in this picture measures.
        new Rectangle(120, ladderY - 17, 340, 34, {
          stroke: SpecialRelativityColors.secondaryTextColorProperty,
          lineWidth: 4,
          lineDash: [14, 10],
        }),
        new Path(
          polyline([
            [barnLeft, baseline],
            [barnLeft, barnTop],
            [barnRight, barnTop],
            [barnRight, baseline],
          ]),
          { stroke: SpecialRelativityColors.apparatusColorProperty, lineWidth: 11 },
        ),
        new Rectangle(barnLeft + 22, ladderY - 15, barnRight - barnLeft - 44, 30, {
          fill: SpecialRelativityColors.ladderColorProperty,
        }),
        // Both doors shut at once: the barn frame's version of the story.
        new Rectangle(barnLeft - 9, barnTop, 18, baseline - barnTop, {
          fill: SpecialRelativityColors.eventBColorProperty,
        }),
        new Rectangle(barnRight - 9, barnTop, 18, baseline - barnTop, {
          fill: SpecialRelativityColors.eventBColorProperty,
        }),
      ],
    }),
  );
}

/** One straight worldline and one with a corner, from the same start to the same end. */
export function createTwinParadoxIcon(): ScreenIcon {
  const startY = 320;
  const endY = 56;
  const midY = 188;
  return iconFrom(
    new Node({
      children: [
        background(),
        new Line(214, startY, 214, endY, {
          stroke: SpecialRelativityColors.coordinateTimeColorProperty,
          lineWidth: 10,
        }),
        new Path(
          polyline([
            [214, startY],
            [370, midY],
            [214, endY],
          ]),
          { stroke: SpecialRelativityColors.properTimeColorProperty, lineWidth: 10 },
        ),
        new Circle(17, { fill: SpecialRelativityColors.eventBColorProperty, centerX: 370, centerY: midY }),
      ],
    }),
  );
}

/** A source with its wavefronts crowded ahead of it and stretched behind. */
export function createRelativisticDopplerIcon(): ScreenIcon {
  const cy = 186;
  // Centres drift right while radii grow left-to-right: the signature of a source
  // outrunning its own earlier wavefronts.
  const fronts = [
    { x: 150, radius: 148 },
    { x: 214, radius: 106 },
    { x: 272, radius: 68 },
    { x: 322, radius: 34 },
  ];
  return iconFrom(
    new Node({
      children: [
        background(),
        ...fronts.map(
          (front) =>
            new Circle(front.radius, {
              stroke: SpecialRelativityColors.photonColorProperty,
              lineWidth: 5,
              centerX: front.x,
              centerY: cy,
            }),
        ),
        new Circle(18, { fill: SpecialRelativityColors.eventAColorProperty, centerX: 356, centerY: cy }),
      ],
    }),
  );
}
