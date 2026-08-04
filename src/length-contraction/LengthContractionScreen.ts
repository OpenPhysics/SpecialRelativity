/**
 * LengthContractionScreen.ts
 *
 * The top-level Screen component. It wires together the model and view
 * factories and passes screen-level options (name, background color, tandem)
 * to the parent Screen class.
 *
 * Registered in the screens array in src/main.ts, third of five: the resolution of
 * the ladder-and-barn puzzle is relativity of simultaneity, so this screen comes
 * after the Spacetime Diagram screen that introduces it. Its home-screen and
 * navigation-bar icons come from createLengthContractionIcon() in
 * src/common/SpecialRelativityScreenIcons.ts.
 */
import { type EmptySelfOptions, optionize } from "scenerystack/phet-core";
import type { ScreenOptions } from "scenerystack/sim";
import { Screen } from "scenerystack/sim";
import type { Tandem } from "scenerystack/tandem";
import { createLengthContractionIcon } from "../common/SpecialRelativityScreenIcons.js";
import type { SpecialRelativityPreferencesModel } from "../preferences/SpecialRelativityPreferencesModel.js";
import SpecialRelativityColors from "../SpecialRelativityColors.js";
import { LengthContractionModel } from "./model/LengthContractionModel.js";
import { LengthContractionKeyboardHelpContent } from "./view/LengthContractionKeyboardHelpContent.js";
import { LengthContractionScreenView } from "./view/LengthContractionScreenView.js";

// Require tandem to be explicit — accidental omission would break PhET-iO.
type LengthContractionScreenOptions = ScreenOptions & { tandem: Tandem };

export class LengthContractionScreen extends Screen<LengthContractionModel, LengthContractionScreenView> {
  public constructor(preferences: SpecialRelativityPreferencesModel, options: LengthContractionScreenOptions) {
    super(
      // Model factory — called once when the screen is first shown
      () => new LengthContractionModel(),
      // View factory — receives the model instance
      (model) =>
        new LengthContractionScreenView(model, preferences, {
          tandem: options.tandem.createTandem("view"),
        }),
      optionize<LengthContractionScreenOptions, EmptySelfOptions, ScreenOptions>()(
        {
          backgroundColorProperty: SpecialRelativityColors.backgroundColorProperty,
          createKeyboardHelpNode: () => new LengthContractionKeyboardHelpContent(),
          homeScreenIcon: createLengthContractionIcon(),
          navigationBarIcon: createLengthContractionIcon(),
        },
        options,
      ),
    );
  }
}
