# Implementation Notes - Special Relativity

Developer-facing notes for this sim. The physics itself is in [model.md](./model.md); this file
covers architecture and the decisions that are not obvious from reading the code.

## Architecture Overview

```
src/
  init.ts assert.ts splash.ts brand.ts main.ts   bootstrap chain — never reorder
  SpecialRelativityNamespace.ts                  Namespace("special-relativity"), at src/ root
  SpecialRelativityColors.ts                     ProfileColorProperty table + the sim's colour language
  SpecialRelativityConstants.ts                  grouped `as const` blocks (see "Constants layout")
  i18n/StringManager.ts, strings_{en,es,fr}.json
  preferences/                                   PreferencesModel + PreferencesNode + queryParameters
  common/
    TimeModel.ts                                 composable clock with play/pause and speed
    SpecialRelativityPanel.ts, *ButtonOptions.ts, *ScreenIcons.ts
    model/
      lorentz.ts                                 PURE kinematics — the heart of the sim
      SpecialRelativityModel.ts                  Property layer over lorentz.ts (β, γ, η, boost)
      SpacetimeEvent.ts                          one draggable event
    view/
      MinkowskiDiagramNode.ts                    the spacetime diagram
      SpacetimeEventNode.ts                      a draggable event marker
      controlHelpers.ts, chartUtils.ts
  light-clock/          model/{LightClockModel,lightClockGeometry}  view/…
  spacetime/            model/SpacetimeDiagramModel                 view/…
  twin-paradox/         model/{TwinParadoxModel,twinJourney}        view/…
  relativistic-doppler/ model/{RelativisticDopplerModel,dopplerGeometry} view/…
tests/                  one file per pure module, plus memory-leak
```

## Key design decisions

### Pure functional physics, Property layers on top

`lorentz.ts`, `lightClockGeometry.ts`, `twinJourney.ts` and `dopplerGeometry.ts` are plain functions
of plain numbers and `Vector2`s. They import from `scenerystack/dot` and nothing else — no axon, no
scenery. Everything reactive lives in the model classes that wrap them.

This is what makes the physics testable without SceneryStack, and it is where all 100 unit tests
point. It follows `CarnotHeatEngine/src/common/model/carnotCycleGeometry.ts`.

### Everything animated is a closed form of elapsed time

No screen integrates anything. The photon's height, the source's position, the traveller's location,
the set of visible wavefronts — each is computed directly from `timer.timeProperty`. Consequences:

- the animation cannot accumulate drift, however long it runs or however large a frame's `dt`;
- **step-backward works for free** — there is no history buffer to rewind, because there is no
  history;
- a large `dt` after a background tab regains focus is harmless.

This is a deliberate departure from `DopplerEffect`, which maintains a mutable wavefront array and an
emission clock. Here `wavefrontsAt( t )` simply enumerates the fronts whose emission times fall in the
visible window. If you add a screen, keep to this: it costs nothing and removes a whole class of bug.

### The shear is done in model space, never on the ChartTransform

bamboo has no skew support, and shearing a layer with `Node.matrix` would distort the strokes and the
event markers along with the geometry. Instead, every primed-frame line is computed in *unprimed*
`(x, ct)` coordinates by `simultaneityLineThrough()` / `worldlineThrough()` and handed to the ordinary
chart transform.

This is also the presentation the physics wants: one undistorted lab diagram with a second frame's
coordinate mesh laid over it, so both frames' readings of the same events can be compared directly.

### Equal scale on both axes is structural, not asserted

A spacetime diagram is only readable if one light-second of space measures the same number of pixels
as one light-second of time; otherwise the light cone tilts and every "is this inside the cone?"
judgement the sim asks for becomes a lie.

`MinkowskiDiagramNode` therefore takes a view **width** and *derives* the height from the ratio of the
coordinate ranges. There is no combination of options that can break it, and no assertion to forget.
`DIAGRAM` in the constants file has no `VIEW_HEIGHT` for exactly this reason.

### One ModelViewTransform2 alongside the ChartTransform

`MinkowskiDiagramNode` exposes a `ModelViewTransform2` built from the same four numbers as its
`ChartTransform` (bamboo's default linear ranging *is* an inverted-Y rectangle mapping). That lets
draggable events use the fleet's ordinary `DragListener` + `KeyboardDragListener` +
`positionProperty` + `dragBoundsProperty` pattern instead of hand-converting pointer coordinates.

### Clipped `plotLayer` vs unclipped `overlayLayer`

Curves — worldlines, hyperbolas, simultaneity lines — go in `plotLayer` and are cut cleanly at the
frame. Event markers go in `overlayLayer`, so an event dragged to the edge stays whole instead of
being sliced in half. Pattern borrowed from `CarnotHeatEngine`'s `CycleDiagramNode`.

### Tolerance bands for measure-zero cases

Two classifications are exactly reachable only on a set of measure zero, so a user dragging with a
mouse would never see them:

- `LIGHTLIKE_TOLERANCE` (0.4 ls²) — the band around s² = 0 that reads as "lightlike";
- `SIMULTANEITY_TOLERANCE` (0.02 ls) in `SpacetimeDiagramModel` — the band of Δct′ that reads as
  "simultaneous".

Both default to **zero** in the pure functions, so the tests check exact behaviour; only the model
layer passes a positive value. Do not push the tolerance into `lorentz.ts`.

### The Twin Paradox screen has no `SpecialRelativityModel`

Its β is *derived* from the turn's position, not chosen. A trip is specified by where and when you
turn around, and the speed follows. Adding a velocity slider there would create two sources of truth
for the same number.

### Preferences are passed positionally into each Screen

`main.ts` builds one `SpecialRelativityPreferencesModel` and passes it as the first constructor
argument to every `Screen`, which forwards it to the `ScreenView`. Matches `CarnotHeatEngine`; the
template has no such plumbing.

`shadeLightCone` is a *default*, not a live binding: the preference is `lazyLink`ed into the model
property, so opening the Preferences dialog and changing nothing cannot overwrite a choice already
made with the on-screen checkbox.

### Deviations from the original plan, and why

- **Wavefronts are derived, not accumulated.** The plan called for porting `DopplerEffect`'s
  `WaveGenerator` emission loop. Deriving them from the emission schedule is strictly simpler and
  drift-free — see above.
- **No preset scenarios on the Doppler screen.** The plan called for a `Scenario` enumeration in the
  `DopplerEffect` style. Because the source flies continuously past the observer, the approach →
  transverse → recede sequence happens on its own; presets would have selected states the user
  already passes through.
- **The Doppler screen's fronts are drawn in the emitted colour.** A wavefront is a surface of
  constant phase and has no colour of its own; what is shifted is what a particular observer measures
  on reception. So the fronts carry the physics through their *spacing* and the received colour
  appears at the observer, where it belongs.

## Model / view design

Models implement `TModel` (`step`, `reset`), plus `dispose()` and — where the screen has time
controls — `stepForward`/`stepBackward`. No model imports from a `view/` folder.

Views link to model Properties and never hold derived state of their own. `reset()` on every
`ScreenView` is intentionally empty: all resettable state lives in the model.

Visibility toggles (`showLightConeProperty`, `showPhotonTrailProperty`, …) live in the **model**, per
PhET convention, so `reset()` covers them and the screen summary can describe them.

## Disposal conventions

Every `DerivedProperty`, `Multilink`, `PatternStringProperty` and listener created in a constructor is
disposed in the matching `dispose()` or `disposeEmitter` listener. Two specifics worth knowing:

- `SpacetimeEventNode` **removes** its drag listeners before disposing them: `hotkeyManager` otherwise
  keeps a reference to the disposed node alive, which `tests/memory-leak.test.ts` catches.
- `TwinParadoxModel.earthClockProperty` is an alias for `currentLabTimeProperty`, so only one of them
  is disposed. Do not "fix" this by disposing both.

## Constants layout

`SpecialRelativityConstants.ts` groups constants into topical `as const` objects (`DIAGRAM`, `EVENT`,
`LIGHT_CLOCK`, `TWIN`, `DOPPLER`, `FONTS`) rather than listing them flat. Four screens' worth of names
is more than one flat list keeps legible. This is a documented variation on the fleet convention
(Baton CONVENTIONS §2 permits it); the file still lives at `src/` root, as required.

## Testing

`npm test` runs Vitest over `tests/`, environment `happy-dom`, with `--expose-gc` for the memory-leak
suite. 100 tests across six files.

The house style is three layers per physics module:

1. **hand-computed values** — γ = 5/4 at β = 3/5, the 3-4-5 twin trip giving 2√7;
2. **independent structural checks** that the implementation cannot pass by restating its own formula
   — interval invariance under boost, boost∘inverse round trips, the light-travel-time condition the
   retarded solve was derived from, path length ÷ elapsed time = c for the photon zigzag, and the
   Earth-time accounting identity at the turn;
3. **a sweep over the extremes** of the allowed parameter space for finiteness and sign.

Layer 2 is where the value is. When `simultaneityJump()` was first written with `|x|` instead of the
signed `x`, the accounting identity still passed (it measures the jump rather than computing it) and
the closed-form comparison failed — which is exactly the split those two tests exist to produce.

`npm run test:fuzz:quick` runs the Playwright input fuzzer for 10 seconds against a built sim.
