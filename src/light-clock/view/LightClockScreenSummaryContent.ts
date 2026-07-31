/**
 * LightClockScreenSummaryContent.ts
 *
 * The accessible screen summary read by screen readers (SceneryStack's
 * Interactive Description). It appears at the top of the parallel DOM and gives
 * a non-visual user a way to orient themselves and to re-read the simulation's
 * current state at any time.
 *
 * A summary has four regions:
 *   - playAreaContent       — what the play area contains
 *   - controlAreaContent    — what the controls do
 *   - currentDetailsContent — a LIVE paragraph describing current state
 *   - interactionHintContent — a short hint on how to get started
 *
 * ── Why the tick counts and not the clock times ───────────────────────────────
 * The clocks advance every frame, and a paragraph that changes every frame is
 * unusable with a screen reader — it never settles long enough to be read. The
 * live text therefore reports the *tick counts*, which change a few times a
 * second at most and are also the quantity the screen is asking the student to
 * compare. β and γ are rounded for the same reason.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { StringManager } from "../../i18n/StringManager.js";
import type { LightClockModel } from "../model/LightClockModel.js";

export class LightClockScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: LightClockModel) {
    const a11y = StringManager.getInstance().getLightClockA11yStrings();

    const currentDetails = new DerivedProperty(
      [
        a11y.currentDetailsStringProperty,
        model.relativity.betaProperty,
        model.relativity.gammaProperty,
        model.restTickCountProperty,
        model.movingTickCountProperty,
      ],
      (pattern, beta, gamma, restTicks, movingTicks) =>
        StringUtils.fillIn(pattern, {
          beta: toFixed(beta, 2),
          gamma: toFixed(gamma, 2),
          restTicks: String(restTicks),
          movingTicks: String(movingTicks),
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
