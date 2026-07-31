/**
 * RelativisticDopplerScreenSummaryContent.ts
 *
 * The accessible screen summary for the Relativistic Doppler screen.
 *
 * The received wavelength changes continuously as the source flies past, so it is
 * rounded to whole nanometres and the Doppler factor to two decimals. Anything
 * finer would rewrite the paragraph faster than a screen reader could read it.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { RelativisticDopplerModel } from "../model/RelativisticDopplerModel.js";

export class RelativisticDopplerScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: RelativisticDopplerModel) {
    const a11y = StringManager.getInstance().getRelativisticDopplerA11yStrings();

    const currentDetails = new DerivedProperty(
      [
        a11y.currentDetailsStringProperty,
        model.relativity.betaProperty,
        model.emittedWavelengthProperty,
        model.receivedSignalProperty,
      ],
      (pattern, beta, emitted, signal) =>
        StringUtils.fillIn(pattern, {
          beta: toFixed(beta, 2),
          emitted: toFixed(emitted, 0),
          observed: toFixed(signal.observedWavelength, 0),
          doppler: toFixed(signal.doppler, 2),
          brightness: toFixed(signal.relativeBrightness, 2),
        }),
    );

    super({
      playAreaContent: a11y.screenSummary.playAreaStringProperty,
      controlAreaContent: a11y.screenSummary.controlAreaStringProperty,
      currentDetailsContent: currentDetails,
      interactionHintContent: a11y.screenSummary.interactionHintStringProperty,
    });

    this.disposeEmitter.addListener(() => currentDetails.dispose());
  }
}
