/**
 * SpacetimeDiagramScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createSpacetimeDiagramIcon() in src/common/SpecialRelativityScreenIcons.ts.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createSpacetimeDiagramIcon } from "../common/SpecialRelativityScreenIcons.js";
import type { SpecialRelativityPreferencesModel } from "../preferences/SpecialRelativityPreferencesModel.js";
import SpecialRelativityColors from "../SpecialRelativityColors.js";
import { SpacetimeDiagramModel } from "./model/SpacetimeDiagramModel.js";
import { SpacetimeDiagramKeyboardHelpContent } from "./view/SpacetimeDiagramKeyboardHelpContent.js";
import { SpacetimeDiagramScreenView } from "./view/SpacetimeDiagramScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type SpacetimeDiagramScreenOptions = ScreenOptions & { tandem: Tandem };

export class SpacetimeDiagramScreen extends Screen<SpacetimeDiagramModel, SpacetimeDiagramScreenView> {
  public constructor(preferences: SpecialRelativityPreferencesModel, options: SpacetimeDiagramScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new SpacetimeDiagramModel(),
      // View factory — receives the model instance
      (model) =>
        new SpacetimeDiagramScreenView(model, preferences, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<SpacetimeDiagramScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: SpecialRelativityColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new SpacetimeDiagramKeyboardHelpContent(),
          homeScreenIcon: createSpacetimeDiagramIcon(),
          navigationBarIcon: createSpacetimeDiagramIcon(),
        },
        options,
      ),
    );
  }
}
