/**
 * LightClockApparatusNode.ts
 *
 * The clock itself: two parallel mirrors with a photon bouncing between them.
 * The node's origin is the centre of the bottom mirror, so a caller can position
 * the whole apparatus by setting its translation and the photon will follow.
 *
 * The mirrors are drawn the same size for the resting and the moving clock, and
 * that is physically right rather than a shortcut: the separation is *across* the
 * direction of motion, and transverse lengths are not contracted. Sidestepping
 * length contraction is exactly why the light clock is built this way — it
 * isolates time dilation instead of tangling it with a second effect.
 */

import { Multilink, type TReadOnlyProperty } from "scenerystack/axon";
import { Circle, Line, Node, Rectangle, Text } from "scenerystack/scenery";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { FONTS, LIGHT_CLOCK } from "../../SpecialRelativityConstants.js";

export class LightClockApparatusNode extends Node {
  public constructor(
    photonHeightProperty: TReadOnlyProperty<number>,
    armLengthProperty: TReadOnlyProperty<number>,
    labelProperty: TReadOnlyProperty<string>,
  ) {
    super();

    const halfWidth = LIGHT_CLOCK.MIRROR_WIDTH / 2;

    // Scenery's y axis points down, so "up" between the mirrors is negative y.
    const bottomMirror = new Rectangle(0, 0, 0, 0, {
      fill: SpecialRelativityColors.apparatusColorProperty,
      cornerRadius: 2,
    });
    const topMirror = new Rectangle(0, 0, 0, 0, {
      fill: SpecialRelativityColors.apparatusColorProperty,
      cornerRadius: 2,
    });
    this.addChild(bottomMirror);
    this.addChild(topMirror);

    const posts = [-halfWidth, halfWidth].map(
      (x) =>
        new Line(x, 0, x, 0, {
          stroke: SpecialRelativityColors.trackColorProperty,
          lineWidth: 1,
          lineDash: [3, 3],
        }),
    );
    for (const post of posts) {
      this.addChild(post);
    }

    const photon = new Circle(LIGHT_CLOCK.PHOTON_RADIUS, {
      fill: SpecialRelativityColors.photonColorProperty,
    });
    this.addChild(photon);

    const label = new Text(labelProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.secondaryTextColorProperty,
      centerX: 0,
      top: 12,
      maxWidth: 200,
    });
    this.addChild(label);

    // The mirrors are drawn the same width whatever the separation, and the
    // separation is the same for the resting and the moving clock. Both are
    // physically right rather than shortcuts: this length is *across* the motion,
    // and transverse lengths are not contracted.
    const update = (height: number, armLength: number): void => {
      const armPixels = armLength * LIGHT_CLOCK.VIEW_SCALE;
      bottomMirror.setRect(
        -halfWidth,
        -LIGHT_CLOCK.MIRROR_HEIGHT / 2,
        LIGHT_CLOCK.MIRROR_WIDTH,
        LIGHT_CLOCK.MIRROR_HEIGHT,
      );
      topMirror.setRect(
        -halfWidth,
        -armPixels - LIGHT_CLOCK.MIRROR_HEIGHT / 2,
        LIGHT_CLOCK.MIRROR_WIDTH,
        LIGHT_CLOCK.MIRROR_HEIGHT,
      );
      for (const post of posts) {
        post.setY2(-armPixels);
      }
      photon.centerY = -height * LIGHT_CLOCK.VIEW_SCALE;
    };
    const updateMultilink = Multilink.multilink([photonHeightProperty, armLengthProperty], update);

    this.disposeEmitter.addListener(() => {
      updateMultilink.dispose();
      label.dispose();
    });
  }
}
