/**
 * chartUtils.ts
 *
 * Small pure helpers shared by the spacetime diagrams and the numeric readouts.
 * They pick a "nice" tick spacing for an arbitrary value range, work out how many
 * decimal places the labels then need, and format values for display.
 *
 * Bamboo's `GridLineSet` / `TickMarkSet` / `TickLabelSet` all take a model-space
 * spacing and lay ticks at `origin + n·spacing`; these helpers choose that spacing
 * and the matching label formatting.
 */

import { toFixed } from "scenerystack/dot";

/**
 * Pick a "nice" step (1, 2, or 5 × 10ⁿ) that yields roughly `targetDivisions`
 * segments across `rangeSpan`. The standard "nice numbers" algorithm, so ticks
 * land on round values (0, 1, 2 … rather than 0.7, 1.4 …).
 */
export const niceStep = (rangeSpan: number, targetDivisions = 5): number => {
  const safeSpan = Number.isFinite(rangeSpan) && rangeSpan > 0 ? rangeSpan : 1;
  const raw = safeSpan / targetDivisions;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  let coefficient: number;
  if (normalized < 1.5) {
    coefficient = 1;
  } else if (normalized < 3) {
    coefficient = 2;
  } else if (normalized < 7) {
    coefficient = 5;
  } else {
    coefficient = 10;
  }
  return coefficient * magnitude;
};

/** Number of decimal places a tick label needs so it lines up with its step. */
export const decimalPlacesForStep = (step: number): number => {
  if (step <= 0 || !Number.isFinite(step)) {
    return 0;
  }
  return Math.min(4, Math.max(0, -Math.floor(Math.log10(step))));
};

/** Format a tick or readout value to a fixed number of decimals (dot's stable toFixed). */
export const formatTickValue = (value: number, decimalPlaces: number): string => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  // -0 formats as "-0", which reads as an error rather than as zero.
  return toFixed(value === 0 ? 0 : value, decimalPlaces);
};

/**
 * Format to `digits` significant figures, dropping trailing zeros. Used for γ,
 * which is 1.00 at rest and over 7 at the top of the β range.
 */
export const formatSignificant = (value: number, digits = 3): string => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return String(Number(value.toPrecision(digits)));
};
