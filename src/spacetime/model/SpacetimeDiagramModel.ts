/**
 * SpacetimeDiagramModel.ts
 *
 * Two events on a spacetime diagram, a second frame moving at β, and everything
 * both frames say about the pair.
 *
 * ── What this screen is for ───────────────────────────────────────────────────
 * Two quantities are computed side by side and they behave very differently:
 *
 *   - the **interval** s² = Δx² − Δ(ct)², which every frame computes the same;
 *   - the **order** of the two events, which frames disagree about — but only
 *     when the events are spacelike separated, and therefore only when neither
 *     could have caused the other.
 *
 * That pairing is the point. Relativity does not make time order arbitrary; it
 * makes it arbitrary exactly where causality does not depend on it.
 */

import { BooleanProperty, DerivedProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Bounds2, Vector2 } from "scenerystack/dot";
import type { TModel } from "scenerystack/joist";
import {
  boostEvent,
  intervalSquared,
  MAX_BETA,
  type Separation,
  Separation as SeparationValues,
  separationOf,
} from "../../common/model/lorentz.js";
import { SpacetimeEvent } from "../../common/model/SpacetimeEvent.js";
import { SpecialRelativityModel } from "../../common/model/SpecialRelativityModel.js";
import specialRelativityQueryParameters from "../../preferences/specialRelativityQueryParameters.js";
import { DIAGRAM, LIGHTLIKE_TOLERANCE } from "../../SpecialRelativityConstants.js";

/** Which event the current frame says happened first. */
export const EventOrder = {
  A_FIRST: "aFirst",
  B_FIRST: "bFirst",
  SIMULTANEOUS: "simultaneous",
} as const;

export type EventOrder = (typeof EventOrder)[keyof typeof EventOrder];

/**
 * Half-width, in light-seconds, of the band of ct′ difference that reads as
 * simultaneous. Same reasoning as {@link LIGHTLIKE_TOLERANCE}: without a band the
 * simultaneous case is unreachable by hand and the student never sees the moment
 * the order actually turns over.
 */
const SIMULTANEITY_TOLERANCE = 0.02;

export class SpacetimeDiagramModel implements TModel {
  /** β, γ, and the boost derived from them. */
  public readonly relativity = new SpecialRelativityModel();

  public readonly eventA: SpacetimeEvent;
  public readonly eventB: SpacetimeEvent;

  /** The event the highlighted line of simultaneity is drawn through. */
  public readonly selectedEventProperty: Property<SpacetimeEvent>;

  /** Event A's coordinates as the moving frame measures them. */
  public readonly eventAPrimedProperty: TReadOnlyProperty<Vector2>;

  /** Event B's coordinates as the moving frame measures them. */
  public readonly eventBPrimedProperty: TReadOnlyProperty<Vector2>;

  /** s² between the two events. Frame-independent — that is the whole point. */
  public readonly intervalProperty: TReadOnlyProperty<number>;

  /** Timelike, lightlike, or spacelike. Also frame-independent. */
  public readonly separationProperty: TReadOnlyProperty<Separation>;

  /** Which event happens first *in the current moving frame*. This one is not invariant. */
  public readonly eventOrderProperty: TReadOnlyProperty<EventOrder>;

  /** Whether some frame would disagree about the order — true exactly when spacelike. */
  public readonly orderIsFrameDependentProperty: TReadOnlyProperty<boolean>;

  /**
   * β that puts event B at rest at the spatial origin, or null when no such frame
   * exists — which is precisely when B is not timelike-separated from the origin,
   * i.e. when reaching it would mean outrunning light.
   */
  public readonly boostToBProperty: TReadOnlyProperty<number | null>;

  public readonly showLightConeProperty = new BooleanProperty(true);
  public readonly shadeLightConeProperty: BooleanProperty;
  public readonly showPrimedFrameProperty = new BooleanProperty(true);
  public readonly showPrimedGridProperty = new BooleanProperty(false);
  public readonly showSimultaneityProperty = new BooleanProperty(true);
  public readonly showHyperbolasProperty = new BooleanProperty(false);

  public constructor() {
    const bounds = new Bounds2(-DIAGRAM.HALF_EXTENT, -DIAGRAM.HALF_EXTENT, DIAGRAM.HALF_EXTENT, DIAGRAM.HALF_EXTENT);

    // Opening positions are deliberately spacelike separated (Δx = 5, Δct = 1):
    // the screen's central surprise is available on arrival, without the user
    // having to first discover that it needs a particular arrangement.
    this.eventA = new SpacetimeEvent("eventA", new Vector2(-2, 1), bounds);
    this.eventB = new SpacetimeEvent("eventB", new Vector2(3, 2), bounds);

    this.selectedEventProperty = new Property<SpacetimeEvent>(this.eventB);

    this.shadeLightConeProperty = new BooleanProperty(specialRelativityQueryParameters.shadeLightCone);

    this.eventAPrimedProperty = new DerivedProperty(
      [this.eventA.positionProperty, this.relativity.betaProperty],
      (position, beta) => boostEvent(position, beta),
    );
    this.eventBPrimedProperty = new DerivedProperty(
      [this.eventB.positionProperty, this.relativity.betaProperty],
      (position, beta) => boostEvent(position, beta),
    );

    this.intervalProperty = new DerivedProperty([this.eventA.positionProperty, this.eventB.positionProperty], (a, b) =>
      intervalSquared(b.minus(a)),
    );

    this.separationProperty = new DerivedProperty(
      [this.eventA.positionProperty, this.eventB.positionProperty],
      (a, b) => separationOf(a, b, LIGHTLIKE_TOLERANCE),
    );

    this.eventOrderProperty = new DerivedProperty(
      [this.eventAPrimedProperty, this.eventBPrimedProperty],
      (aPrimed, bPrimed) => {
        const difference = bPrimed.y - aPrimed.y;
        if (Math.abs(difference) <= SIMULTANEITY_TOLERANCE) {
          return EventOrder.SIMULTANEOUS;
        }
        return difference > 0 ? EventOrder.A_FIRST : EventOrder.B_FIRST;
      },
    );

    this.orderIsFrameDependentProperty = new DerivedProperty(
      [this.separationProperty],
      (separation) => separation === SeparationValues.SPACELIKE,
    );

    this.boostToBProperty = new DerivedProperty([this.eventB.positionProperty], (position) => {
      if (position.y === 0) {
        return null;
      }
      const beta = position.x / position.y;
      return Math.abs(beta) <= MAX_BETA ? beta : null;
    });
  }

  /** Nothing on this screen advances with time; the diagram is a static picture. */
  public step(_dt: number): void {
    // Intentionally empty.
  }

  public reset(): void {
    this.relativity.reset();
    this.eventA.reset();
    this.eventB.reset();
    this.selectedEventProperty.reset();
    this.showLightConeProperty.reset();
    this.shadeLightConeProperty.reset();
    this.showPrimedFrameProperty.reset();
    this.showPrimedGridProperty.reset();
    this.showSimultaneityProperty.reset();
    this.showHyperbolasProperty.reset();
  }

  public dispose(): void {
    this.boostToBProperty.dispose();
    this.orderIsFrameDependentProperty.dispose();
    this.eventOrderProperty.dispose();
    this.separationProperty.dispose();
    this.intervalProperty.dispose();
    this.eventBPrimedProperty.dispose();
    this.eventAPrimedProperty.dispose();
    this.selectedEventProperty.dispose();
    this.showLightConeProperty.dispose();
    this.shadeLightConeProperty.dispose();
    this.showPrimedFrameProperty.dispose();
    this.showPrimedGridProperty.dispose();
    this.showSimultaneityProperty.dispose();
    this.showHyperbolasProperty.dispose();
    this.eventA.dispose();
    this.eventB.dispose();
    this.relativity.dispose();
  }
}
