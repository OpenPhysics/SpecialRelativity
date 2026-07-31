/**
 * SpecialRelativityPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in specialRelativityQueryParameters.
 *
 * One instance is built in main.ts and passed positionally into every Screen, so
 * a preference set once applies across all four screens.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import SpecialRelativityNamespace from "../SpecialRelativityNamespace.js";
import specialRelativityQueryParameters from "./specialRelativityQueryParameters.js";

export class SpecialRelativityPreferencesModel {
  /** Whether readouts show the rapidity η = artanh β beside γ. */
  public readonly showRapidityProperty: BooleanProperty;

  /** Whether the diagram screens start with the causal future and past shaded. */
  public readonly shadeLightConeProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.showRapidityProperty = new BooleanProperty(
      specialRelativityQueryParameters.showRapidity,
      tandem ? { tandem: tandem.createTandem("showRapidityProperty") } : undefined,
    );
    this.shadeLightConeProperty = new BooleanProperty(
      specialRelativityQueryParameters.shadeLightCone,
      tandem ? { tandem: tandem.createTandem("shadeLightConeProperty") } : undefined,
    );
  }

  public reset(): void {
    this.showRapidityProperty.reset();
    this.shadeLightConeProperty.reset();
  }
}

SpecialRelativityNamespace.register("SpecialRelativityPreferencesModel", SpecialRelativityPreferencesModel);
