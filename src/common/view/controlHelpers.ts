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
import { Checkbox, RectangularPushButton, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import SpecialRelativityColors from "../../SpecialRelativityColors.js";
import { FONTS } from "../../SpecialRelativityConstants.js";
import { FLAT_RECTANGULAR_BUTTON_OPTIONS, LIGHT_SURFACE_TEXT_FILL } from "../SpecialRelativityButtonOptions.js";

/** Width every control panel is laid out against, so panels line up down a column. */
export const CONTROL_WIDTH = 220;

export type NumberControlConfig = {
  titleProperty: TReadOnlyProperty<string>;
  valuePatternProperty: TReadOnlyProperty<string>;
  accessibleName: TReadOnlyProperty<string>;
  accessibleHelpText: TReadOnlyProperty<string>;
  decimalPlaces: number;
  delta: number;
  /**
   * A sub-range of `range` the value is currently allowed into, when that
   * depends on something else in the model. The track still shows the full range
   * — the Twin Paradox journey scrubber uses this so the slider is calibrated
   * once, in Earth seconds, while the reachable end of it moves with the trip.
   */
  enabledRangeProperty?: TReadOnlyProperty<Range>;
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
    // Spread rather than assign: `exactOptionalPropertyTypes` rejects an explicit
    // undefined, and "no sub-range" must mean "absent".
    ...(config.enabledRangeProperty ? { enabledRangeProperty: config.enabledRangeProperty } : {}),
  });

/** A themed checkbox with its label. */
export const createCheckbox = (
  property: PhetioProperty<boolean>,
  labelProperty: TReadOnlyProperty<string>,
  accessibleName: TReadOnlyProperty<string>,
  width = CONTROL_WIDTH,
): Checkbox =>
  new Checkbox(
    property,
    new Text(labelProperty, {
      font: FONTS.READOUT,
      fill: SpecialRelativityColors.textColorProperty,
      maxWidth: width - 30,
    }),
    {
      checkboxColor: SpecialRelativityColors.textColorProperty,
      checkboxColorBackground: SpecialRelativityColors.panelBackgroundColorProperty,
      accessibleName,
    },
  );

/**
 * A themed flat push button carrying a text label. The "boost to …" pair on the
 * Spacetime Diagram screen and the "go to this slam" pair on the Length
 * Contraction screen are built by this one factory rather than configured four
 * times.
 *
 * `enabledProperty` is optional: the boost buttons grey each other out because
 * exactly one of them is reachable at a time, but a button that is always
 * available should not have to invent an always-true Property to say so.
 */
export const createPushButton = (
  labelProperty: TReadOnlyProperty<string>,
  config: {
    accessibleName: TReadOnlyProperty<string>;
    accessibleHelpText: TReadOnlyProperty<string>;
    enabledProperty?: TReadOnlyProperty<boolean>;
    listener: () => void;
    maxTextWidth?: number;
  },
): RectangularPushButton =>
  new RectangularPushButton({
    ...FLAT_RECTANGULAR_BUTTON_OPTIONS,
    content: new Text(labelProperty, {
      font: FONTS.READOUT,
      fill: LIGHT_SURFACE_TEXT_FILL,
      maxWidth: config.maxTextWidth ?? CONTROL_WIDTH - 24,
    }),
    baseColor: SpecialRelativityColors.controlSurfaceColorProperty,
    // Spread rather than assign: `exactOptionalPropertyTypes` rejects an explicit
    // undefined, and "always enabled" must mean "absent".
    ...(config.enabledProperty ? { enabledProperty: config.enabledProperty } : {}),
    listener: config.listener,
    accessibleName: config.accessibleName,
    accessibleHelpText: config.accessibleHelpText,
  });

/**
 * A themed vertical group of radio buttons — the control for a choice between
 * named alternatives rather than a value on a scale.
 *
 * The Length Contraction screen's frame selector is the sim's only one, and it is
 * a radio group rather than a checkbox or a switch on purpose: "barn frame" and
 * "ladder frame" are two peers, and neither is the off state of the other.
 */
export const createRadioButtonGroup = <T>(
  property: PhetioProperty<T>,
  items: readonly { value: T; labelProperty: TReadOnlyProperty<string>; accessibleName: TReadOnlyProperty<string> }[],
  config: {
    accessibleName: TReadOnlyProperty<string>;
    accessibleHelpText: TReadOnlyProperty<string>;
    width?: number;
  },
): VerticalAquaRadioButtonGroup<T> =>
  new VerticalAquaRadioButtonGroup<T>(
    property,
    items.map((item) => ({
      value: item.value,
      createNode: () =>
        new Text(item.labelProperty, {
          font: FONTS.READOUT,
          fill: SpecialRelativityColors.textColorProperty,
          maxWidth: (config.width ?? CONTROL_WIDTH) - 40,
        }),
      options: { accessibleName: item.accessibleName },
    })),
    {
      spacing: 7,
      align: "left",
      radioButtonOptions: {
        selectedColor: SpecialRelativityColors.accentColorProperty,
        deselectedColor: SpecialRelativityColors.controlSurfaceColorProperty,
        stroke: SpecialRelativityColors.diagramAxisColorProperty,
      },
      accessibleName: config.accessibleName,
      accessibleHelpText: config.accessibleHelpText,
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
