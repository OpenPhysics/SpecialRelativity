/**
 * SpecialRelativityColors.ts
 *
 * Defines all dynamic colors for the simulation using ProfileColorProperty.
 *
 * Each color has two profiles:
 *   - "default"   — used in standard (dark) mode
 *   - "projector" — used when the user enables Projector Mode in Preferences
 *
 * SceneryStack switches profiles automatically; no manual toggling is needed.
 *
 * ── The sim's color language ──────────────────────────────────────────────────
 * One idea, one hue, on every screen it appears:
 *
 *   neutral gray   the lab frame — its axes, its gridlines, its clock
 *   cyan           the primed (moving) frame — its axes, gridlines, simultaneity
 *   yellow         light itself — the light cone, photons, wavefronts
 *   violet         invariant hyperbolas: the structure every frame agrees on
 *   green          proper time — the travelling twin's clock, the moving clock
 *   orange / red   the draggable events A and B, and the turnaround
 *
 * A student who learns "cyan means the other observer" on the Spacetime Diagram
 * screen should not have to relearn it on the Twin Paradox screen.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 * Import SpecialRelativityColors and pass properties directly to Node's fillProperty or
 * strokeProperty options:
 *
 *   import SpecialRelativityColors from "../../SpecialRelativityColors.js";
 *
 *   new Rectangle( 0, 0, 100, 50, {
 *     fillProperty: SpecialRelativityColors.backgroundColorProperty,
 *   });
 *
 * ── How to add a color ────────────────────────────────────────────────────────
 * Add a new ProfileColorProperty entry to the SpecialRelativityColors object below.
 * Always provide both "default" and "projector" values.
 */
import { ProfileColorProperty } from "scenerystack/scenery";
import SpecialRelativityNamespace from "./SpecialRelativityNamespace.js";

const SpecialRelativityColors = {
  /**
   * Background color for the simulation screen.
   * Deep navy in default mode; white in projector mode.
   */
  backgroundColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "background", {
    default: "#1a1a2e",
    projector: "#ffffff",
  }),

  /**
   * Primary accent color for highlights, selected items, and key UI elements.
   * Sky blue in default mode; dark navy in projector mode.
   */
  accentColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "accent", {
    default: "#4fc3f7",
    projector: "#1a1a2e",
  }),

  /**
   * Background fill for control panels and dialogs.
   * Deep blue in default mode; light gray in projector mode.
   */
  panelBackgroundColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "panelBackground", {
    default: "#16213e",
    projector: "#f5f5f5",
  }),

  /**
   * Border/stroke color for control panels and dialogs.
   * Teal-navy in default mode; medium gray in projector mode.
   */
  panelBorderColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "panelBorder", {
    default: "#0f3460",
    projector: "#999999",
  }),

  /**
   * Text color for labels, readouts, and general UI text.
   * Near-white in default mode; near-black in projector mode.
   */
  textColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "text", {
    default: "#e0e0e0",
    projector: "#1a1a1a",
  }),

  /** Muted text for units, hints, and secondary readout labels. */
  secondaryTextColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "secondaryText", {
    default: "#9aa5c4",
    projector: "#5a5a5a",
  }),

  // ── Spacetime diagram frame ──────────────────────────────────────────────────

  /** Fill inside the diagram's plotting rectangle. */
  diagramBackgroundColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "diagramBackground", {
    default: "#10182c",
    projector: "#fafafa",
  }),

  /** Lab-frame axes, the diagram border, and tick marks. */
  diagramAxisColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "diagramAxis", {
    default: "#c5cbe0",
    projector: "#37474f",
  }),

  /** Lab-frame gridlines — present but never competing with the physics. */
  diagramGridColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "diagramGrid", {
    default: "#2c3a5c",
    projector: "#dcdcdc",
  }),

  // ── Light (yellow) ───────────────────────────────────────────────────────────

  /** The light cone through the origin, and photon worldlines generally. */
  lightConeColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "lightCone", {
    default: "#ffee58",
    projector: "#f9a825",
  }),

  /** Shading of the causal future and past inside the cone. */
  lightConeFillColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "lightConeFill", {
    default: "rgba(255,238,88,0.10)",
    projector: "rgba(249,168,37,0.13)",
  }),

  /** A photon in the light clock, and the wavefronts on the Doppler screen. */
  photonColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "photon", {
    default: "#fff59d",
    projector: "#f57f17",
  }),

  // ── The primed (moving) frame (cyan) ─────────────────────────────────────────

  /** The x′ and ct′ axes. */
  primedAxisColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "primedAxis", {
    default: "#4dd0e1",
    projector: "#00838f",
  }),

  /** Primed gridlines: lines of constant t′ and constant x′. */
  primedGridColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "primedGrid", {
    default: "#2e6b78",
    projector: "#9fd8de",
  }),

  /** The highlighted line of simultaneity through the selected event. */
  simultaneityColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "simultaneity", {
    default: "#80deea",
    projector: "#006064",
  }),

  // ── Invariants (violet) ──────────────────────────────────────────────────────

  /** Curves of constant interval — the geometry every frame agrees on. */
  hyperbolaColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "hyperbola", {
    default: "#ce93d8",
    projector: "#6a1b9a",
  }),

  // ── Proper time (green) ──────────────────────────────────────────────────────

  /** The travelling twin's clock, and the moving light clock's tick count. */
  properTimeColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "properTime", {
    default: "#81c784",
    projector: "#2e7d32",
  }),

  /** The stay-at-home twin's worldline and clock — the lab-frame reference. */
  coordinateTimeColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "coordinateTime", {
    default: "#e0e0e0",
    projector: "#37474f",
  }),

  // ── Events and objects (warm) ────────────────────────────────────────────────

  /** Event A, and the source on the Doppler screen. */
  eventAColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "eventA", {
    default: "#ffb74d",
    projector: "#e65100",
  }),

  /** Event B, and the turnaround event on the Twin Paradox screen. */
  eventBColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "eventB", {
    default: "#ef5350",
    projector: "#c62828",
  }),

  /** The observer marker on the Doppler screen. */
  observerColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "observer", {
    default: "#b0bec5",
    projector: "#455a64",
  }),

  /** Rails and guides an object is constrained to slide along. */
  trackColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "track", {
    default: "#3d4a6b",
    projector: "#bdbdbd",
  }),

  /** Apparatus: light-clock mirrors and their supporting frame. */
  apparatusColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "apparatus", {
    default: "#90a4ae",
    projector: "#546e7a",
  }),

  /**
   * Stand-in colours for light that has been shifted out of the visible band.
   * Deliberately dark and desaturated rather than an arbitrary visible hue: the
   * point is that the observer would see *nothing*, and the swatch should read
   * that way while still pointing to which end it fell off.
   */
  infraredColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "infrared", {
    default: "#4a1414",
    projector: "#7a2a2a",
  }),

  ultravioletColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "ultraviolet", {
    default: "#2d1a4a",
    projector: "#4a2f7a",
  }),

  /** Fill of the relativistic-beaming lobe on the Doppler screen. */
  beamingFillColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "beamingFill", {
    default: "rgba(255,183,77,0.22)",
    projector: "rgba(230,81,0,0.18)",
  }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark. Same values in default and projector mode,
  // but defined here so every color lives in one themeable place.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(SpecialRelativityNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),
};

export default SpecialRelativityColors;
