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

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Circle, Line, Node, Rectangle, Text } from "scenerystack/scenery";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { FONTS, LIGHT_CLOCK } from "../../SpecialRelativityConstants.js";

export class LightClockApparatusNode extends Node {
  public constructor(photonHeightProperty: TReadOnlyProperty<number>, labelProperty: TReadOnlyProperty<string>) {
    super();

    const armPixels = LIGHT_CLOCK.ARM_LENGTH * LIGHT_CLOCK.VIEW_SCALE;
    const halfWidth = LIGHT_CLOCK.MIRROR_WIDTH / 2;

    // Scenery's y axis points down, so "up" between the mirrors is negative y.
    for (const y of [0, -armPixels]) {
      this.addChild(
        new Rectangle(
          -halfWidth,
          y - LIGHT_CLOCK.MIRROR_HEIGHT / 2,
          LIGHT_CLOCK.MIRROR_WIDTH,
          LIGHT_CLOCK.MIRROR_HEIGHT,
          {
            fill: SpecialRelativityColors.apparatusColorProperty,
            cornerRadius: 2,
          },
        ),
      );
    }

    for (const x of [-halfWidth, halfWidth]) {
      this.addChild(
        new Line(x, 0, x, -armPixels, {
          stroke: SpecialRelativityColors.trackColorProperty,
          lineWidth: 1,
          lineDash: [3, 3],
        }),
      );
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

    const updatePhoton = (height: number): void => {
      photon.centerY = -height * LIGHT_CLOCK.VIEW_SCALE;
    };
    photonHeightProperty.link(updatePhoton);

    this.disposeEmitter.addListener(() => {
      photonHeightProperty.unlink(updatePhoton);
      label.dispose();
    });
  }
}
