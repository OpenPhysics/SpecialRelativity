/**
 * LengthContractionScreenSummaryContent.ts
 *
 * The accessible screen summary for the Length Contraction screen.
 *
 * The live paragraph reports the frame in force, the two lengths that frame
 * measures, and its verdict on whether the ladder fits — all of which change only
 * when a control is touched, never while the scene animates. The scene clock is
 * deliberately left out: it changes every frame, and a paragraph that changes
 * every frame cannot be read.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { LengthContractionModel } from "../model/LengthContractionModel.js";
import { ObservationFrame } from "../model/ladderBarnGeometry.js";

export class LengthContractionScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: LengthContractionModel) {
    const strings = StringManager.getInstance();
    const a11y = strings.getLengthContractionA11yStrings();
    const contractionStrings = strings.getLengthContractionStrings();

    const currentDetails = new DerivedProperty(
      [
        a11y.currentDetailsStringProperty,
        contractionStrings.barnFrameStringProperty,
        contractionStrings.ladderFrameStringProperty,
        contractionStrings.fitsStringProperty,
        contractionStrings.doesNotFitStringProperty,
        model.frameProperty,
        model.betaProperty,
        model.gammaProperty,
        model.measuredLadderLengthProperty,
        model.measuredBarnLengthProperty,
        model.fitsProperty,
        model.slamGapProperty,
      ],
      (
        pattern,
        barnFrame,
        ladderFrame,
        fitsPhrase,
        doesNotFitPhrase,
        frame,
        beta,
        gamma,
        ladderLength,
        barnLength,
        fits,
        slamGap,
      ) =>
        StringUtils.fillIn(pattern, {
          frame: frame === ObservationFrame.BARN ? barnFrame : ladderFrame,
          beta: toFixed(beta, 2),
          gamma: toFixed(gamma, 2),
          ladder: toFixed(ladderLength, 2),
          barn: toFixed(barnLength, 2),
          verdict: fits ? fitsPhrase : doesNotFitPhrase,
          gap: toFixed(Math.abs(slamGap), 2),
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
