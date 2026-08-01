/**
 * TwinParadoxKeyboardHelpContent.ts
 *
 * Content for the keyboard-help dialog (the "?" button in the navigation bar).
 * The only draggable object is the turn event; the rest of the screen is the
 * journey scrubber, the time controls, and two checkboxes.
 */

import {
  BasicActionsKeyboardHelpSection,
  MoveDraggableItemsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";

export class TwinParadoxKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
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
