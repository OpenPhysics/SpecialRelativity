/**
 * controlHelpers.ts
 *
 * Factories for the controls and readouts that recur on every screen, so the β
 * slider on the Light Clock screen and the β slider on the Doppler screen are
 * literally the same control rather than two that happen to look alike.
 */

import type { PhetioProperty, TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, type Range } from "scenerystack/dot";
import { HBox, type Node, Text, type TPaint } from "scenerystack/scenery";
import { NumberControl } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { FONTS } from "../../SpecialRelativityConstants.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS } from "../SpecialRelativityButtonOptions.js";

/** Width every control panel is laid out against, so panels line up down a column. */
export const CONTROL_WIDTH = 220;

export type NumberControlConfig = {
  titleProperty: TReadOnlyProperty<string>;
  valuePatternProperty: TReadOnlyProperty<string>;
  accessibleName: TReadOnlyProperty<string>;
  accessibleHelpText: TReadOnlyProperty<string>;
  decimalPlaces: number;
  delta: number;
};

/**
 * A themed NumberControl — title above, value in a box, slider below. Used for β
 * and for the emitted wavelength.
 */
export const createNumberControl = (
  property: PhetioProperty<number>,
  range: Range,
  config: NumberControlConfig,
): NumberControl =>
  new NumberControl(config.titleProperty, property, range, {
    layoutFunction: NumberControl.createLayoutFunction2({ ySpacing: 10 }),
    delta: config.delta,
    titleNodeOptions: {
      font: FONTS.CONTROL_TITLE,
      fill: SpecialRelativityColors.textColorProperty,
      maxWidth: CONTROL_WIDTH - 70,
    },
    numberDisplayOptions: {
      valuePattern: config.valuePatternProperty,
      decimalPlaces: config.decimalPlaces,
      textOptions: {
        font: FONTS.READOUT_VALUE,
        fill: SpecialRelativityColors.controlSurfaceTextColorProperty,
      },
      backgroundFill: SpecialRelativityColors.controlSurfaceColorProperty,
      backgroundStroke: SpecialRelativityColors.panelBorderColorProperty,
    },
    arrowButtonOptions: FLAT_RECTANGULAR_BUTTON_OPTIONS,
    sliderOptions: {
      trackSize: new Dimension2(CONTROL_WIDTH - 40, 4),
      thumbFill: SpecialRelativityColors.accentColorProperty,
      majorTickLength: 10,
    },
    accessibleName: config.accessibleName,
    accessibleHelpText: config.accessibleHelpText,
  });

/** A themed checkbox with its label. */
export const createCheckbox = (
  property: PhetioProperty<boolean>,
  labelProperty: TReadOnlyProperty<string>,
  accessibleName: TReadOnlyProperty<string>,
): Checkbox =>
  new Checkbox(
    property,
    new Text(labelProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.textColorProperty,
      maxWidth: CONTROL_WIDTH - 30,
    }),
    {
      checkboxColor: SpecialRelativityColors.diagramAxisColorProperty,
      checkboxColorBackground: SpecialRelativityColors.controlSurfaceColorProperty,
      accessibleName,
    },
  );

/**
 * A "label ......... value" row. The label and value are pushed to opposite ends
 * of a fixed width so a column of these reads as a table rather than as ragged
 * text, and the value can change length without shifting its neighbours.
 */
export const createReadoutRow = (
  labelProperty: TReadOnlyProperty<string>,
  valueProperty: TReadOnlyProperty<string>,
  valueFill: TPaint = SpecialRelativityColors.textColorProperty,
  width = CONTROL_WIDTH,
): Node => {
  const label = new Text(labelProperty, {
    font: FONTS.READOUT,
    fill: SpecialRelativityColors.secondaryTextColorProperty,
    maxWidth: width * 0.62,
  });
  const value = new Text(valueProperty, {
    font: FONTS.READOUT_VALUE,
    fill: valueFill,
    maxWidth: width * 0.38,
  });
  return new HBox({
    children: [label, value],
    spacing: 8,
    preferredWidth: width,
    justify: "spaceBetween",
    align: "center",
  });
};

/** A bold section heading inside a panel. */
export const createSectionHeader = (labelProperty: TReadOnlyProperty<string>): Node =>
  new Text(labelProperty, {
    font: FONTS.SECTION_HEADER,
    fill: SpecialRelativityColors.textColorProperty,
    maxWidth: CONTROL_WIDTH,
  });

/** A quieter heading for a group of rows inside a section. */
export const createSubHeader = (labelProperty: TReadOnlyProperty<string>): Node =>
  new Text(labelProperty, {
    font: FONTS.CONTROL_TITLE,
    fill: SpecialRelativityColors.secondaryTextColorProperty,
    maxWidth: CONTROL_WIDTH,
  });
