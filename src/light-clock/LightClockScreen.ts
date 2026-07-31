/**
 * LightClockScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts. Its home-screen and navigation-bar
 * icons come from createLightClockIcon() in src/common/SpecialRelativityScreenIcons.ts.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createLightClockIcon } from "../common/SpecialRelativityScreenIcons.js";
import type { SpecialRelativityPreferencesModel } from "../preferences/SpecialRelativityPreferencesModel.js";
import SpecialRelativityColors from "../SpecialRelativityColors.js";
import { LightClockModel } from "./model/LightClockModel.js";
import { LightClockKeyboardHelpContent } from "./view/LightClockKeyboardHelpContent.js";
import { LightClockScreenView } from "./view/LightClockScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type LightClockScreenOptions = ScreenOptions & { tandem: Tandem };

export class LightClockScreen extends Screen<LightClockModel, LightClockScreenView> {
  public constructor(preferences: SpecialRelativityPreferencesModel, options: LightClockScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new LightClockModel(),
      // View factory — receives the model instance
      (model) =>
        new LightClockScreenView(model, preferences, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<LightClockScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: SpecialRelativityColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new LightClockKeyboardHelpContent(),
          homeScreenIcon: createLightClockIcon(),
          navigationBarIcon: createLightClockIcon(),
        },
        options,
      ),
    );
  }
}
