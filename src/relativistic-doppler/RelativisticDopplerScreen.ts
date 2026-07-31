/**
 * RelativisticDopplerScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createRelativisticDopplerIcon() in src/common/SpecialRelativityScreenIcons.ts.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createRelativisticDopplerIcon } from "../common/SpecialRelativityScreenIcons.js";
import type { SpecialRelativityPreferencesModel } from "../preferences/SpecialRelativityPreferencesModel.js";
import SpecialRelativityColors from "../SpecialRelativityColors.js";
import { RelativisticDopplerModel } from "./model/RelativisticDopplerModel.js";
import { RelativisticDopplerKeyboardHelpContent } from "./view/RelativisticDopplerKeyboardHelpContent.js";
import { RelativisticDopplerScreenView } from "./view/RelativisticDopplerScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type RelativisticDopplerScreenOptions = ScreenOptions & { tandem: Tandem };

export class RelativisticDopplerScreen extends Screen<RelativisticDopplerModel, RelativisticDopplerScreenView> {
  public constructor(preferences: SpecialRelativityPreferencesModel, options: RelativisticDopplerScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new RelativisticDopplerModel(),
      // View factory — receives the model instance
      (model) =>
        new RelativisticDopplerScreenView(model, preferences, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<RelativisticDopplerScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: SpecialRelativityColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new RelativisticDopplerKeyboardHelpContent(),
          homeScreenIcon: createRelativisticDopplerIcon(),
          navigationBarIcon: createRelativisticDopplerIcon(),
        },
        options,
      ),
    );
  }
}
