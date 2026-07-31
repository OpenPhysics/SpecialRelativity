/**
 * TwinParadoxScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createTwinParadoxIcon() in src/common/SpecialRelativityScreenIcons.ts.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createTwinParadoxIcon } from "../common/SpecialRelativityScreenIcons.js";
import type { SpecialRelativityPreferencesModel } from "../preferences/SpecialRelativityPreferencesModel.js";
import SpecialRelativityColors from "../SpecialRelativityColors.js";
import { TwinParadoxModel } from "./model/TwinParadoxModel.js";
import { TwinParadoxKeyboardHelpContent } from "./view/TwinParadoxKeyboardHelpContent.js";
import { TwinParadoxScreenView } from "./view/TwinParadoxScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type TwinParadoxScreenOptions = ScreenOptions & { tandem: Tandem };

export class TwinParadoxScreen extends Screen<TwinParadoxModel, TwinParadoxScreenView> {
  public constructor(preferences: SpecialRelativityPreferencesModel, options: TwinParadoxScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new TwinParadoxModel(),
      // View factory — receives the model instance
      (model) =>
        new TwinParadoxScreenView(model, preferences, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<TwinParadoxScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: SpecialRelativityColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new TwinParadoxKeyboardHelpContent(),
          homeScreenIcon: createTwinParadoxIcon(),
          navigationBarIcon: createTwinParadoxIcon(),
        },
        options,
      ),
    );
  }
}
