/**
 * RelativisticDopplerKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 * The source flies itself, but the *observer* is draggable — where they stand
 * decides the angle every measurement on this screen is made at — so the
 * draggable-items section comes first, as it does on the two diagram screens.
 */

import {
  BasicActionsKeyboardHelpSection,
  MoveDraggableItemsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class RelativisticDopplerKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    super(
      [
        new MoveDraggableItemsKeyboardHelpSection(),
        new SliderControlsKeyboardHelpSection(),
        new TimeControlsKeyboardHelpSection(),
      ],
      [new BasicActionsKeyboardHelpSection({ withCheckboxContent: true })],
    );
  }
}
