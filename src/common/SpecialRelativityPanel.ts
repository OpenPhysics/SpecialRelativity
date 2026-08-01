/**
 * SpecialRelativityPanel.ts
 *
 * A pre-themed Panel that automatically uses SpecialRelativityColors for background and
 * border. Use this for all control panels and info boxes in the sim so that
 * default / projector mode switching is handled automatically.
 *
 * ── Basic usage ───────────────────────────────────────────────────────────────
 *
 *   import { SpecialRelativityPanel } from "../../common/SpecialRelativityPanel.js";
 *   import { VBox, Text } from "scenerystack/scenery";
 *
 *   const content = new VBox({
 *     children: [ new Text("label"), slider ],
 *     spacing: 8,
 *   });
 *   const panel = new SpecialRelativityPanel(content);
 *
 * ── Overriding defaults ───────────────────────────────────────────────────────
 *
 *   // Wider margins, sharper corners, custom stroke
 *   const panel = new SpecialRelativityPanel(content, { xMargin: 20, cornerRadius: 0 });
 *
 *   // Transparent background (decorative border only)
 *   const panel = new SpecialRelativityPanel(content, { fill: "transparent" });
 */

import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { Node } from "scenerystack/scenery";
import { Panel, type PanelOptions } from "scenerystack/sun";
import SpecialRelativityColors from "../SpecialRelativityColors.js";
import { PANEL_CORNER_RADIUS } from "../SpecialRelativityConstants.js";

export type SpecialRelativityPanelOptions = PanelOptions;

export class SpecialRelativityPanel extends Panel {
  public constructor(content: Node, providedOptions?: SpecialRelativityPanelOptions) {
    const options = optionize<SpecialRelativityPanelOptions, EmptySelfOptions, PanelOptions>()(
      {
        fill: SpecialRelativityColors.panelBackgroundColorProperty,
        stroke: SpecialRelativityColors.panelBorderColorProperty,
        cornerRadius: PANEL_CORNER_RADIUS,
        xMargin: 12,
        yMargin: 10,
      },
      providedOptions,
    );
    super(content, options);
  }
}
