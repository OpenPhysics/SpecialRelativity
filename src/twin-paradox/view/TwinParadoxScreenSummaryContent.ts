/**
 * TwinParadoxScreenSummaryContent.ts
 *
 * The accessible screen summary for the Twin Paradox screen.
 *
 * The live paragraph describes the trip as configured — where the turn is, how
 * fast that makes the traveller go, and what each clock reads **at the reunion**.
 * Reporting the totals rather than the running values keeps the text stable while
 * the journey animates; a paragraph that changed every frame could not be read.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { TwinParadoxModel } from "../model/TwinParadoxModel.js";

export class TwinParadoxScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: TwinParadoxModel) {
    const a11y = StringManager.getInstance().getTwinParadoxA11yStrings();

    const currentDetails = new DerivedProperty(
      [
        a11y.currentDetailsStringProperty,
        model.turnaround.positionProperty,
        model.outboundBetaProperty,
        model.gammaProperty,
        model.reunionTimeProperty,
        model.travellerTotalProperty,
      ],
      (pattern, turnaround, beta, gamma, reunion, travellerTotal) =>
        StringUtils.fillIn(pattern, {
          x: toFixed(turnaround.x, 1),
          ct: toFixed(turnaround.y, 1),
          beta: toFixed(beta, 2),
          gamma: toFixed(gamma, 2),
          earth: toFixed(reunion, 2),
          traveller: toFixed(travellerTotal, 2),
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
