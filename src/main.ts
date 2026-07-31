/**
 * main.ts
 *
 * Entry point for the simulation. Initializes SceneryStack, creates the
 * screens, and starts the main event loop.
 *
 * !! CRITICAL IMPORT ORDER !!
 * brand.js MUST be the first import. Each module imports the next, so the import nesting is
 *
 *   main → brand → splash → assert → init
 *
 * and therefore the actual EXECUTION order (deepest import runs first) is the reverse:
 *
 *   init → assert → splash → brand → main
 *
 * SceneryStack requires this exact load order. Never reorder these imports.
 */

// brand.js MUST be first; importing it runs the whole chain (init→assert→splash→brand) before main.
import "./brand.js";

import { onReadyToLaunch, PreferencesModel, Sim } from "scenerystack/sim";
import { Tandem } from "scenerystack/tandem";
import { StringManager } from "./i18n/StringManager.js";
import { LightClockScreen } from "./light-clock/LightClockScreen.js";
import { SpecialRelativityPreferencesModel } from "./preferences/SpecialRelativityPreferencesModel.js";
import { SpecialRelativityPreferencesNode } from "./preferences/SpecialRelativityPreferencesNode.js";
import { RelativisticDopplerScreen } from "./relativistic-doppler/RelativisticDopplerScreen.js";
import SpecialRelativityColors from "./SpecialRelativityColors.js";
import { SpacetimeDiagramScreen } from "./spacetime/SpacetimeDiagramScreen.js";
import { TwinParadoxScreen } from "./twin-paradox/TwinParadoxScreen.js";

onReadyToLaunch(() => {
  const stringManager = StringManager.getInstance();

  // Simulation-specific preferences; initial values come from specialRelativityQueryParameters.
  const simPreferences = new SpecialRelativityPreferencesModel(Tandem.ROOT.createTandem("preferences"));

  const screens = [
    new LightClockScreen(simPreferences, {
      name: stringManager.getScreenNames().lightClockStringProperty,
      tandem: Tandem.ROOT.createTandem("lightClockScreen"),
      backgroundColorProperty: SpecialRelativityColors.backgroundColorProperty,
    }),
    new SpacetimeDiagramScreen(simPreferences, {
      name: stringManager.getScreenNames().spacetimeStringProperty,
      tandem: Tandem.ROOT.createTandem("spacetimeScreen"),
      backgroundColorProperty: SpecialRelativityColors.backgroundColorProperty,
    }),
    new TwinParadoxScreen(simPreferences, {
      name: stringManager.getScreenNames().twinParadoxStringProperty,
      tandem: Tandem.ROOT.createTandem("twinParadoxScreen"),
      backgroundColorProperty: SpecialRelativityColors.backgroundColorProperty,
    }),
    new RelativisticDopplerScreen(simPreferences, {
      name: stringManager.getScreenNames().relativisticDopplerStringProperty,
      tandem: Tandem.ROOT.createTandem("relativisticDopplerScreen"),
      backgroundColorProperty: SpecialRelativityColors.backgroundColorProperty,
    }),
  ];

  const sim = new Sim(stringManager.getTitleStringProperty(), screens, {
    preferencesModel: new PreferencesModel({
      visualOptions: {
        // Adds a "Projector Mode" toggle in Preferences → Visual
        supportsProjectorMode: true,
        // Enables keyboard-navigation highlight outlines
        supportsInteractiveHighlights: true,
      },
      simulationOptions: {
        customPreferences: [
          {
            createContent: (tandem: Tandem) => new SpecialRelativityPreferencesNode(simPreferences, tandem),
          },
        ],
      },
      localizationOptions: {
        // Adds a language picker in Preferences → Language
        supportsDynamicLocale: true,
      },
    }),

    // Optional: fill in credits shown in Help → About
    credits: {
      leadDesign: "",
      softwareDevelopment: "",
      team: "",
      qualityAssurance: "",
    },
  });

  sim.start();
});
