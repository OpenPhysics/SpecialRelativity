/**
 * SpecialRelativityModel.ts
 *
 * The reactive layer over {@link lorentz}: one boost parameter and everything
 * derived from it. This is the piece of state every screen has in common — a
 * relative velocity β between the lab frame and a second inertial frame.
 *
 * **Each screen model constructs its own instance.** Nothing is shared live
 * between screens (the fleet pattern — see doc/implementation-notes.md), so
 * changing β on the Spacetime Diagram screen does not disturb the Light Clock.
 */

import { DerivedProperty, NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import type { Matrix3 } from "scenerystack/dot";
import { Range } from "scenerystack/dot";
import specialRelativityQueryParameters from "../../preferences/specialRelativityQueryParameters.js";
import { boostMatrix, gammaOf, MAX_BETA, rapidityOf } from "./lorentz.js";

/** Allowed β values. Symmetric so the primed frame can move either way. */
export const BETA_RANGE = new Range(-MAX_BETA, MAX_BETA);

export class SpecialRelativityModel {
  /** Velocity of the primed frame relative to the lab frame, as a fraction of c. */
  public readonly betaProperty: NumberProperty;

  /** Lorentz factor γ = 1/√(1 − β²) — the time-dilation and length-contraction factor. */
  public readonly gammaProperty: TReadOnlyProperty<number>;

  /** Rapidity η = artanh β. Exposed for readouts and for the rapidity-slider preference. */
  public readonly rapidityProperty: TReadOnlyProperty<number>;

  /** The boost taking lab coordinates (x, ct) to primed coordinates. */
  public readonly boostMatrixProperty: TReadOnlyProperty<Matrix3>;

  public constructor(initialBeta: number = specialRelativityQueryParameters.initialBeta) {
    this.betaProperty = new NumberProperty(initialBeta, { range: BETA_RANGE });
    this.gammaProperty = new DerivedProperty([this.betaProperty], (beta) => gammaOf(beta));
    this.rapidityProperty = new DerivedProperty([this.betaProperty], (beta) => rapidityOf(beta));
    this.boostMatrixProperty = new DerivedProperty([this.betaProperty], (beta) => boostMatrix(beta));
  }

  public reset(): void {
    this.betaProperty.reset();
  }

  public dispose(): void {
    // Derived properties first — they hold listeners on betaProperty.
    this.boostMatrixProperty.dispose();
    this.rapidityProperty.dispose();
    this.gammaProperty.dispose();
    this.betaProperty.dispose();
  }
}
