/**
 * SpacetimeDiagramScreenSummaryContent.ts
 *
 * The accessible screen summary for the Spacetime Diagram screen.
 *
 * The live paragraph reports both events' lab coordinates, the invariant they
 * share, and which one the current frame puts first — the same three facts the
 * visual readout panel shows, in the same order, so a screen-reader user and a
 * sighted user are being told the same story.
 */
import { DerivedProperty } from "scenerystack/axon";
import { toFixed } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { ScreenSummaryContent } from "scenerystack/sim";
import { Separation } from "../../common/model/lorentz.js";
import { StringManager } from "../../i18n/StringManager.js";
import { EventOrder, type SpacetimeDiagramModel } from "../model/SpacetimeDiagramModel.js";

export class SpacetimeDiagramScreenSummaryContent extends ScreenSummaryContent {
  public constructor(model: SpacetimeDiagramModel) {
    const strings = StringManager.getInstance();
    const a11y = strings.getSpacetimeDiagramA11yStrings();
    const diagramStrings = strings.getSpacetimeDiagramStrings();

    const currentDetails = new DerivedProperty(
      [
        a11y.currentDetailsStringProperty,
        model.eventA.positionProperty,
        model.eventB.positionProperty,
        model.separationProperty,
        model.intervalProperty,
        model.relativity.betaProperty,
        model.eventOrderProperty,
        diagramStrings.timelikeStringProperty,
        diagramStrings.lightlikeStringProperty,
        diagramStrings.spacelikeStringProperty,
        diagramStrings.aFirstStringProperty,
        diagramStrings.bFirstStringProperty,
        diagramStrings.simultaneousStringProperty,
      ],
      (
        pattern,
        a,
        b,
        separation,
        interval,
        beta,
        order,
        timelike,
        lightlike,
        spacelike,
        aFirst,
        bFirst,
        simultaneous,
      ) => {
        let separationWord = spacelike;
        if (separation === Separation.TIMELIKE) {
          separationWord = timelike;
        } else if (separation === Separation.LIGHTLIKE) {
          separationWord = lightlike;
        }

        let orderPhrase = simultaneous;
        if (order === EventOrder.A_FIRST) {
          orderPhrase = aFirst;
        } else if (order === EventOrder.B_FIRST) {
          orderPhrase = bFirst;
        }

        return StringUtils.fillIn(pattern, {
          ax: toFixed(a.x, 1),
          act: toFixed(a.y, 1),
          bx: toFixed(b.x, 1),
          bct: toFixed(b.y, 1),
          // The separation reads as a common noun mid-sentence, so it is
          // lowercased; the order phrase starts with an event *letter* and must
          // not be, or "B is first" is announced as "b is first".
          separation: separationWord.toLowerCase(),
          interval: toFixed(interval, 2),
          beta: toFixed(beta, 2),
          order: orderPhrase,
        });
      },
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
