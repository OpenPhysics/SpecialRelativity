/**
 * SpacetimeEventNode.ts
 *
 * A draggable dot on the spacetime diagram, with its label. Mouse, touch, and
 * keyboard all move the same `positionProperty` through the same
 * ModelViewTransform2, so there is one code path and no chance of the two input
 * methods drifting apart.
 *
 * Add these to the diagram's `overlayLayer`, not its `plotLayer`: an event
 * dragged onto the frame edge should stay whole rather than being sliced by the
 * clip.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { Bounds2, Vector2 } from "scenerystack/dot";
import type { ModelViewTransform2 } from "scenerystack/phetcommon";
import {
  Circle,
  DragListener,
  InteractiveHighlighting,
  KeyboardDragListener,
  Node,
  Text,
  type TPaint,
} from "scenerystack/scenery";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { EVENT, FONTS } from "../../SpecialRelativityConstants.js";
import type { SpacetimeEvent } from "../model/SpacetimeEvent.js";

export type SpacetimeEventNodeOptions = {
  /** Fill of the marker; the label picks up the same color. */
  fill: TPaint;
  /** Short display label, e.g. "A". */
  labelStringProperty: TReadOnlyProperty<string>;
  /** Name announced by a screen reader. */
  accessibleName: TReadOnlyProperty<string>;
  /** Help text explaining what dragging this event does. */
  accessibleHelpText?: TReadOnlyProperty<string>;
  /** Lab-frame region the event may be dragged within. */
  dragBoundsProperty: TReadOnlyProperty<Bounds2>;
  /**
   * Optional constraint applied to every proposed position, beyond the rectangular
   * drag bounds. The Twin Paradox screen uses it to keep the turnaround inside the
   * light cone: a rectangle cannot express "must stay timelike".
   */
  mapPosition?: (point: Vector2) => Vector2;
  /** Called whenever a drag begins, so the screen can mark this event selected. */
  onPress?: () => void;
};

export class SpacetimeEventNode extends InteractiveHighlighting(Node) {
  public constructor(
    event: SpacetimeEvent,
    modelViewTransform: ModelViewTransform2,
    providedOptions: SpacetimeEventNodeOptions,
  ) {
    super({
      cursor: "pointer",
      tagName: "div",
      focusable: true,
      accessibleName: providedOptions.accessibleName,
      // Spread rather than assign: `exactOptionalPropertyTypes` rejects an
      // explicit `undefined` here, and "no help text" must mean "absent".
      ...(providedOptions.accessibleHelpText ? { accessibleHelpText: providedOptions.accessibleHelpText } : {}),
    });

    const marker = new Circle(EVENT.RADIUS, {
      fill: providedOptions.fill,
      stroke: SpecialRelativityColors.backgroundColorProperty,
      lineWidth: 1.5,
    });
    this.addChild(marker);

    const label = new Text(providedOptions.labelStringProperty, {
      font: FONTS.EVENT_LABEL,
      fill: providedOptions.fill,
      left: EVENT.LABEL_OFFSET,
      centerY: -EVENT.LABEL_OFFSET,
    });
    this.addChild(label);

    const updateTranslation = (): void => {
      this.translation = modelViewTransform.modelToViewPosition(event.positionProperty.value);
    };
    event.positionProperty.link(updateTranslation);

    // Both listeners get the same position property, transform, bounds and
    // constraint, so mouse and keyboard cannot drift apart.
    const dragListener = new DragListener({
      positionProperty: event.positionProperty,
      transform: modelViewTransform,
      dragBoundsProperty: providedOptions.dragBoundsProperty,
      ...(providedOptions.mapPosition ? { mapPosition: providedOptions.mapPosition } : {}),
      start: () => providedOptions.onPress?.(),
    });
    this.addInputListener(dragListener);

    const keyboardDragListener = new KeyboardDragListener({
      positionProperty: event.positionProperty,
      transform: modelViewTransform,
      dragBoundsProperty: providedOptions.dragBoundsProperty,
      dragSpeed: EVENT.DRAG_SPEED,
      shiftDragSpeed: EVENT.SHIFT_DRAG_SPEED,
      ...(providedOptions.mapPosition ? { mapPosition: providedOptions.mapPosition } : {}),
      start: () => providedOptions.onPress?.(),
    });
    this.addInputListener(keyboardDragListener);

    this.disposeEmitter.addListener(() => {
      event.positionProperty.unlink(updateTranslation);
      // Remove before disposing so hotkeyManager drops its reference to this node
      // (the KeyboardDragListener's hotkeys otherwise keep the disposed node
      // reachable, which the memory-leak test catches).
      this.removeInputListener(dragListener);
      this.removeInputListener(keyboardDragListener);
      dragListener.dispose();
      keyboardDragListener.dispose();
      label.dispose();
    });
  }
}
