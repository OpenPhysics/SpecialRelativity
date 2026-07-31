/**
 * specialRelativityQueryParameters.ts
 *
 * Sim-specific startup query parameters. This is the single place where every
 * sim-specific query parameter is declared and documented. Public-facing
 * parameters (intended for end users / sharing links) must set `public: true`.
 *
 * ── How to add a query parameter ──────────────────────────────────────────────
 * 1. Add an entry below with a `type`, `defaultValue`, and (if user-facing)
 *    `public: true`. Add `isValidValue` to bound numeric ranges.
 * 2. If it should also be user-editable at runtime, surface it as a preference
 *    in SpecialRelativityPreferencesModel (initialize that Property from this query parameter).
 *
 * Usage: append e.g. `?showRapidity=true&initialBeta=0.8` to the sim URL.
 */

import { logGlobal } from "scenerystack/phet-core";
import { QueryStringMachine } from "scenerystack/query-string-machine";
import { MAX_BETA } from "../common/model/lorentz.js";
import SpecialRelativityNamespace from "../SpecialRelativityNamespace.js";

const specialRelativityQueryParameters = QueryStringMachine.getAll({
  /**
   * Show the rapidity η = artanh β alongside γ. Off by default: rapidity is the
   * more useful parameter once boosts are being composed, but it is unfamiliar
   * enough that putting it on screen unasked would cost more than it teaches.
   */
  showRapidity: {
    type: "boolean",
    defaultValue: false,
    public: true,
  },

  /**
   * Start the diagram screens with the causal future and past already shaded.
   * Off by default so the light cone reads first as two lines, and only as a
   * boundary between regions once the user asks for it.
   */
  shadeLightCone: {
    type: "boolean",
    defaultValue: false,
    public: true,
  },

  /**
   * Relative velocity every screen starts at, as a fraction of c. The default of
   * 0.6 gives γ = 1.25 — visibly relativistic without collapsing the primed axes
   * onto the light cone.
   */
  initialBeta: {
    type: "number",
    defaultValue: 0.6,
    public: true,
    isValidValue: (value: number) => Number.isFinite(value) && Math.abs(value) <= MAX_BETA,
  },
});

SpecialRelativityNamespace.register("specialRelativityQueryParameters", specialRelativityQueryParameters);

// Log query parameters (for the console / PhET-iO).
logGlobal("phet.chipper.queryParameters");

export default specialRelativityQueryParameters;
