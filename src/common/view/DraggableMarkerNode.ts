/**
 * DraggableMarkerNode.ts
 *
 * A labelled dot the user can pick up and move. Mouse, touch, and keyboard all
 * move the same `positionProperty` through the same ModelViewTransform2, so there
 * is one code path and no chance of the two input methods drifting apart.
 *
 * This is the machinery only — no opinion about what the point *means*.
 * {@link SpacetimeEventNode} wraps it for events on a spacetime diagram; the
 * Relativistic Doppler screen uses it directly for the observer, whose position
 * is a place in space rather than an event in spacetime.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { Bounds2, Vector2, Vector2Property } from "scenerystack/dot";
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

export type DraggableMarkerNodeOptions = {
  /** Fill of the marker; the label picks up the same color. */
  fill: TPaint;
  /** Short display label, e.g. "A". */
  labelStringProperty: TReadOnlyProperty<string>;
  /** Name announced by a screen reader. */
  accessibleName: TReadOnlyProperty<string>;
  /** Help text explaining what dragging this marker does. */
  accessibleHelpText?: TReadOnlyProperty<string>;
  /** Model-space region the marker may be dragged within. */
  dragBoundsProperty: TReadOnlyProperty<Bounds2>;
  /** Marker radius in pixels. Defaults to the shared event radius. */
  radius?: number;
  /**
   * Optional constraint applied to every proposed position, beyond the
   * rectangular drag bounds. The Twin Paradox screen uses it to keep the
   * turnaround inside the light cone: a rectangle cannot express "must stay
   * timelike".
   */
  mapPosition?: (point: Vector2) => Vector2;
  /** Called whenever a drag begins, so the screen can mark this marker selected. */
  onPress?: () => void;
};

export class DraggableMarkerNode extends InteractiveHighlighting(Node) {
  public constructor(
    positionProperty: Vector2Property,
    modelViewTransform: ModelViewTransform2,
    providedOptions: DraggableMarkerNodeOptions,
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

    const marker = new Circle(providedOptions.radius ?? EVENT.RADIUS, {
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
      this.translation = modelViewTransform.modelToViewPosition(positionProperty.value);
    };
    positionProperty.link(updateTranslation);

    // Both listeners get the same position property, transform, bounds and
    // constraint, so mouse and keyboard cannot drift apart.
    const dragListener = new DragListener({
      positionProperty: positionProperty,
      transform: modelViewTransform,
      dragBoundsProperty: providedOptions.dragBoundsProperty,
      ...(providedOptions.mapPosition ? { mapPosition: providedOptions.mapPosition } : {}),
      start: () => providedOptions.onPress?.(),
    });
    this.addInputListener(dragListener);

    const keyboardDragListener = new KeyboardDragListener({
      positionProperty: positionProperty,
      transform: modelViewTransform,
      dragBoundsProperty: providedOptions.dragBoundsProperty,
      dragSpeed: EVENT.DRAG_SPEED,
      shiftDragSpeed: EVENT.SHIFT_DRAG_SPEED,
      ...(providedOptions.mapPosition ? { mapPosition: providedOptions.mapPosition } : {}),
      start: () => providedOptions.onPress?.(),
    });
    this.addInputListener(keyboardDragListener);

    this.disposeEmitter.addListener(() => {
      positionProperty.unlink(updateTranslation);
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
