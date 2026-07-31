/**
 * SpecialRelativityConstants.ts
 *
 * Central repository for every named numeric constant used across the
 * simulation. Bare numbers that carry semantic meaning (sizes, margins,
 * physics defaults, ranges) belong here rather than inline in model or view
 * code, so they are named, documented, and changed in one place.
 *
 * Conventions
 * ───────────
 *  - Physics / model values use **natural units, c = 1**: distances in
 *    light-seconds (ls), times in seconds, so `ct` is also in light-seconds.
 *    See src/common/model/lorentz.ts for the full convention.
 *  - Layout / chrome values are in screen pixels.
 *  - Colour strings live in SpecialRelativityColors.ts, not here.
 *  - Constants are grouped into `as const` objects by topic rather than listed
 *    flat, because four screens' worth of names is more than one flat list keeps
 *    legible. This grouped layout is a documented variation on the fleet
 *    convention (see CLAUDE.md); the file still lives at src/ root.
 */

import SpecialRelativityNamespace from "./SpecialRelativityNamespace.js";

// ── Layout / chrome (screen pixels) ───────────────────────────────────────────

/** Margin between the screen edge and edge-anchored controls (e.g. Reset All). */
export const SCREEN_VIEW_MARGIN = 20;

/** Corner radius shared by control panels and dialogs. */
export const PANEL_CORNER_RADIUS = 6;

/** Fonts used across panels and diagrams. */
export const FONTS = {
  TICK_LABEL: "11px sans-serif",
  DIAGRAM_TITLE: "bold 13px sans-serif",
  AXIS_LABEL: "italic 13px sans-serif",
  EVENT_LABEL: "bold 13px sans-serif",
  READOUT: "13px sans-serif",
  READOUT_VALUE: "bold 13px sans-serif",
  CONTROL_TITLE: "13px sans-serif",
  SECTION_HEADER: "bold 14px sans-serif",
} as const;

// ── Minkowski diagram geometry ────────────────────────────────────────────────

/**
 * The spacetime diagram's drawing area, in screen pixels, and the coordinate
 * range it shows.
 *
 * **Only the width is given.** A light ray must render at exactly 45°, which
 * requires the same number of pixels per light-second on both axes, so
 * MinkowskiDiagramNode *derives* its view height from this width and the ratio of
 * the coordinate ranges. Making the height a second independent constant would
 * invite the two to drift apart and silently tilt the light cone.
 */
export const DIAGRAM = {
  VIEW_WIDTH: 480,
  LEFT_PADDING: 46,
  RIGHT_PADDING: 18,
  TOP_PADDING: 24,
  BOTTOM_PADDING: 34,

  /**
   * Half-width of the coordinate range shown, in light-seconds: the diagram spans
   * x, ct ∈ [−5, +5]. Chosen so light rays run corner to corner and the default
   * events sit comfortably inside the frame.
   */
  HALF_EXTENT: 5,

  /** Roughly how many gridlines/ticks to aim for per axis. */
  TARGET_DIVISIONS: 5,

  /** Samples per invariant-hyperbola branch. */
  HYPERBOLA_SAMPLES: 65,

  /**
   * Rapidity range swept when sampling a hyperbola branch. artanh(0.99) ≈ 2.65,
   * so ±3 draws each curve past the largest boost the sim allows; it then gets
   * clipped to the frame rather than stopping short inside it.
   */
  HYPERBOLA_MAX_RAPIDITY: 3,

  /** Number of primed gridlines drawn on each side of each primed axis. */
  PRIMED_GRID_LINES: 4,

  /** Spacing between primed gridlines, in light-seconds of primed coordinate. */
  PRIMED_GRID_SPACING: 1,
} as const;

/**
 * Half-width, in units of s², of the band around zero that reads as "lightlike".
 *
 * Exact lightlike separation has measure zero, so a user dragging with a mouse
 * would never once see that classification without a tolerance. At the diagram's
 * ±5 ls scale this band is a fraction of a light-second wide near the cone —
 * narrow enough to stay honest, wide enough to be reachable by hand.
 */
export const LIGHTLIKE_TOLERANCE = 0.4;

/** Draggable spacetime-event markers. */
export const EVENT = {
  RADIUS: 8,
  LABEL_OFFSET: 14,
  DRAG_SPEED: 200,
  SHIFT_DRAG_SPEED: 60,
} as const;

// ── Light Clock screen ────────────────────────────────────────────────────────

export const LIGHT_CLOCK = {
  /**
   * Distance between the mirrors, in light-seconds. One round trip of the resting
   * clock therefore takes exactly 2 s, which makes "one tick = two seconds" an
   * easy number for a student to hold onto while watching γ stretch it.
   */
  ARM_LENGTH: 1,

  /** Pixels per light-second in the clock apparatus view. */
  VIEW_SCALE: 92,

  PHOTON_RADIUS: 6,
  MIRROR_WIDTH: 74,
  MIRROR_HEIGHT: 8,

  /** Half-length of the moving clock's track, in light-seconds. */
  TRACK_HALF_LENGTH: 2.1,
} as const;

// ── Twin Paradox screen ───────────────────────────────────────────────────────

export const TWIN = {
  /** Default turnaround event ( x, ct ), in light-seconds. */
  DEFAULT_TURNAROUND_X: 3,
  DEFAULT_TURNAROUND_CT: 4,

  /**
   * Smallest allowed ratio of ct to |x| at the turnaround. Holding it strictly
   * above 1 keeps the outbound leg timelike; 1.04 corresponds to β ≈ 0.96, just
   * inside the sim's β cap, so the geometric constraint and the cap agree.
   */
  MIN_TIME_TO_SPACE_RATIO: 1.04,

  /** Seconds of real time one full journey animation takes at normal speed. */
  JOURNEY_DURATION: 12,
} as const;

// ── Relativistic Doppler screen ───────────────────────────────────────────────

export const DOPPLER = {
  /** Emitted (rest-frame) wavelength range in nanometres — the visible band. */
  MIN_WAVELENGTH_NM: 380,
  MAX_WAVELENGTH_NM: 700,
  DEFAULT_WAVELENGTH_NM: 550,

  /** Wavefronts emitted per second of lab time. */
  EMISSION_RATE: 1.2,

  /** Fronts older than this many seconds are retired. */
  MAX_FRONT_AGE: 9,

  /** Pixels per light-second in the Doppler play area. */
  VIEW_SCALE: 34,

  /** Half-length of the source's track, in light-seconds. */
  TRACK_HALF_LENGTH: 7,

  /**
   * How far the observer sits off the source's line of travel, in light-seconds.
   * Non-zero on purpose: with the observer directly on the track the angle would
   * only ever be 0 or π and the transverse case — the one worth seeing, because
   * it is redshifted with nothing receding — could never occur.
   */
  OBSERVER_DISTANCE: 2.6,

  /** Samples around the beaming lobe. */
  LOBE_SAMPLES: 121,

  /** Radius, in pixels, of the beaming lobe where relative intensity is 1. */
  LOBE_RADIUS: 44,

  SOURCE_RADIUS: 9,
  OBSERVER_RADIUS: 9,
} as const;

SpecialRelativityNamespace.register("SpecialRelativityConstants", {
  SCREEN_VIEW_MARGIN,
  PANEL_CORNER_RADIUS,
  FONTS,
  DIAGRAM,
  LIGHTLIKE_TOLERANCE,
  EVENT,
  LIGHT_CLOCK,
  TWIN,
  DOPPLER,
});
