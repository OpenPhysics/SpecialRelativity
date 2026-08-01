/**
 * SpacetimeEventNode.ts
 *
 * A draggable dot on the spacetime diagram, with its label — a
 * {@link DraggableMarkerNode} bound to a {@link SpacetimeEvent}, which is the only
 * thing it adds: the model object knows its own drag bounds, so callers cannot
 * pair one event's position with another's constraint.
 *
 * Add these to the diagram's `overlayLayer`, not its `plotLayer`: an event
 * dragged onto the frame edge should stay whole rather than being sliced by the
 * clip.
 */

import { combineOptions } from "scenerystack/phet-core";
import type { ModelViewTransform2 } from "scenerystack/phetcommon";
import type { SpacetimeEvent } from "../model/SpacetimeEvent.js";
import { DraggableMarkerNode, type DraggableMarkerNodeOptions } from "./DraggableMarkerNode.js";

/** Everything {@link DraggableMarkerNode} takes except the bounds, which the event supplies. */
export type SpacetimeEventNodeOptions = Omit<DraggableMarkerNodeOptions, "dragBoundsProperty">;

export class SpacetimeEventNode extends DraggableMarkerNode {
  public constructor(
    event: SpacetimeEvent,
    modelViewTransform: ModelViewTransform2,
    providedOptions: SpacetimeEventNodeOptions,
  ) {
    super(
      event.positionProperty,
      modelViewTransform,
      combineOptions<DraggableMarkerNodeOptions>(providedOptions, {
        dragBoundsProperty: event.dragBoundsProperty,
      }),
    );
  }
}
