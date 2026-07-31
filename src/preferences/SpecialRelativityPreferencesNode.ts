/**
 * SpecialRelativityPreferencesNode.ts
 *
 * Custom preferences UI shown in Preferences → Simulation. Controls are bound
 * to SpecialRelativityPreferencesModel Properties (whose initial values come from
 * specialRelativityQueryParameters).
 */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import type { Tandem } from "scenerystack/tandem";
import { StringManager } from "../i18n/StringManager.js";
import SpecialRelativityColors from "../SpecialRelativityColors.js";
import SpecialRelativityNamespace from "../SpecialRelativityNamespace.js";
import type { SpecialRelativityPreferencesModel } from "./SpecialRelativityPreferencesModel.js";

export class SpecialRelativityPreferencesNode extends VBox {
  public constructor(preferencesModel: SpecialRelativityPreferencesModel, tandem?: Tandem) {
    const prefStrings = StringManager.getInstance().getPreferences();

    // The Preferences dialog is always white, so use the dark "light control surface"
    // colors (readable on white in both default and projector profiles), not textColorProperty
    // (which is near-white in default mode and would be invisible on the white dialog).
    const header = new Text(prefStrings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: SpecialRelativityColors.controlSurfaceTextColorProperty,
    });

    // Each toggle carries a sentence of explanation beneath it: both of these
    // change what a diagram *means*, not just how it looks, so a bare label
    // would leave the user guessing what they had switched on.
    const describedCheckbox = (
      property: typeof preferencesModel.showRapidityProperty,
      labelProperty: typeof prefStrings.showRapidityStringProperty,
      descriptionProperty: typeof prefStrings.showRapidityDescriptionStringProperty,
      tandemName: string,
    ): VBox =>
      new VBox({
        align: "left",
        spacing: 4,
        children: [
          new Checkbox(
            property,
            new Text(labelProperty, {
              font: new PhetFont(14),
              fill: SpecialRelativityColors.controlSurfaceTextColorProperty,
            }),
            {
              checkboxColor: SpecialRelativityColors.controlSurfaceTextColorProperty,
              checkboxColorBackground: SpecialRelativityColors.controlSurfaceColorProperty,
              spacing: 8,
              accessibleName: labelProperty,
              accessibleHelpText: descriptionProperty,
              ...(tandem && { tandem: tandem.createTandem(tandemName) }),
            },
          ),
          new Text(descriptionProperty, {
            font: new PhetFont(12),
            fill: SpecialRelativityColors.controlSurfaceTextColorProperty,
            opacity: 0.75,
            maxWidth: 420,
          }),
        ],
      });

    super({
      align: "left",
      spacing: 14,
      children: [
        header,
        describedCheckbox(
          preferencesModel.showRapidityProperty,
          prefStrings.showRapidityStringProperty,
          prefStrings.showRapidityDescriptionStringProperty,
          "showRapidityCheckbox",
        ),
        describedCheckbox(
          preferencesModel.shadeLightConeProperty,
          prefStrings.shadeLightConeStringProperty,
          prefStrings.shadeLightConeDescriptionStringProperty,
          "shadeLightConeCheckbox",
        ),
      ],
    });
  }
}

SpecialRelativityNamespace.register("SpecialRelativityPreferencesNode", SpecialRelativityPreferencesNode);
