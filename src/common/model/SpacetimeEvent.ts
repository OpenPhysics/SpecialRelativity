/**
 * SpacetimeEvent.ts
 *
 * One point in spacetime that the user can pick up and move — a flash, a
 * collision, a clock reading. Position is stored as `Vector2( x, ct )` in the lab
 * frame; primed coordinates are always derived from it rather than stored, so
 * there is exactly one source of truth when β changes.
 *
 * Shaped after the fleet's canonical draggable model object
 * (Resonance's MeasurementLineModel): a position Property, a bounds Property for
 * the drag constraint, and reset/dispose.
 */

import { Property } from "scenerystack/axon";
import { type Bounds2, type Vector2, Vector2Property } from "scenerystack/dot";

export class SpacetimeEvent {
  /** Lab-frame coordinates ( x, ct ), both in light-seconds. */
  public readonly positionProperty: Vector2Property;

  /** Region the event may be dragged within, in lab-frame model coordinates. */
  public readonly dragBoundsProperty: Property<Bounds2>;

  /**
   * Stable identifier ("eventA", "eventB", …). The view looks the display label
   * up from this so the model never holds translated text.
   */
  public readonly id: string;

  public constructor(id: string, initialPosition: Vector2, dragBounds: Bounds2) {
    this.id = id;
    this.positionProperty = new Vector2Property(initialPosition);
    this.dragBoundsProperty = new Property(dragBounds);
  }

  /** Lab-frame x coordinate, in light-seconds. */
  public get x(): number {
    return this.positionProperty.value.x;
  }

  /** Lab-frame time coordinate ct, in light-seconds. */
  public get ct(): number {
    return this.positionProperty.value.y;
  }

  public reset(): void {
    this.positionProperty.reset();
  }

  public dispose(): void {
    this.positionProperty.dispose();
    this.dragBoundsProperty.dispose();
  }
}
