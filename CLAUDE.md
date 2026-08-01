# CLAUDE.md — Special Relativity

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenPhysics/.github/CLAUDE.md](https://github.com/OpenPhysics/.github/blob/main/CLAUDE.md).

## Project

A four-screen simulation of flat-spacetime special relativity: **Light Clock**, **Spacetime
Diagram**, **Twin Paradox**, **Relativistic Doppler**. Original work, not a PhET or NAAP port.
Forked from `SceneryStackTemplate` on 31 Jul 2026.

Read [`doc/model.md`](doc/model.md) before changing anything physical, and
[`doc/implementation-notes.md`](doc/implementation-notes.md) before changing anything structural.

## The three conventions that govern everything

1. **Natural units, c = 1.** Distance in light-seconds, time in seconds, so `ct` is also in
   light-seconds and light rays are always at 45°. No code multiplies or divides by c; if you find
   yourself wanting to, something upstream is wrong.
2. **An event is `Vector2( x, ct )`** — space in `.x`, time in `.y`. This matches the diagram
   (x across, ct up) so points can go straight to a bamboo `ChartTransform`.
3. **s² = x² − (ct)²**, signature (+,−): spacelike separations are positive.

## Key files

| File | Purpose |
|---|---|
| `src/common/model/lorentz.ts` | **The heart of the sim.** Pure kinematics: γ, rapidity, boost matrix, interval, causal classification, hyperbolas, simultaneity lines, axis projections, the rest and simultaneity frames of a pair, proper time, velocity addition, Doppler, aberration, beaming |
| `src/common/model/SpecialRelativityModel.ts` | Property layer over `lorentz.ts` (β, γ, η, boost matrix). Each screen model owns its own instance — nothing is shared live between screens |
| `src/common/model/SpacetimeEvent.ts` | One draggable event: position + drag bounds |
| `src/common/view/MinkowskiDiagramNode.ts` | The spacetime diagram: bamboo frame, light cone, sheared primed axes and grid |
| `src/common/view/DraggableMarkerNode.ts` | Draggable labelled dot (mouse + keyboard through one transform) |
| `src/common/view/SpacetimeEventNode.ts` | The above, bound to a `SpacetimeEvent` so position and bounds cannot be mismatched |
| `src/common/view/controlHelpers.ts` | `createNumberControl` / `createCheckbox` / `createReadoutRow` — the controls every screen shares |
| `src/common/TimeModel.ts` | Composable clock: play/pause, speed, `scaledDt`, step forward/back |
| `src/SpecialRelativityColors.ts` | `ProfileColorProperty` table **and the sim's colour language** — read its header before adding a colour |
| `src/SpecialRelativityConstants.ts` | Grouped `as const` blocks (`DIAGRAM`, `EVENT`, `LIGHT_CLOCK`, `TWIN`, `DOPPLER`, `FONTS`) |
| `src/light-clock/model/lightClockGeometry.ts` | Photon height, tick counts, the zigzag trail, the light-travel triangle |
| `src/twin-paradox/model/twinJourney.ts` | Both worldlines, proper times, the simultaneity jump, the pulses the twins exchange |
| `src/relativistic-doppler/model/dopplerGeometry.ts` | Retarded emission solve (for an arbitrary observer position), received signal, wavefronts, beaming lobe |

## Quirks worth knowing before you edit

- **Everything animated is a closed form of one accumulating clock.** Nothing else carries state
  between frames. This is why step-backward works with no history buffer and why the animation cannot
  drift. Keep it that way. (The clock is `timer.timeProperty` on three screens; the Twin Paradox
  screen's is `journeyTimeProperty`, in Earth seconds — see below.)
- **The primed-frame shear happens in model space, never on the `ChartTransform`.** bamboo has no
  skew; every primed line is computed in unprimed `(x, ct)` and handed to the ordinary transform.
- **`MinkowskiDiagramNode` derives its view height** from its width and the coordinate ranges, so
  equal pixels-per-light-second is structural rather than asserted. `DIAGRAM` has no `VIEW_HEIGHT`
  on purpose — do not add one.
- **`plotLayer` is clipped, `overlayLayer` is not.** Curves go in the first, event markers in the
  second, so an event dragged onto the frame edge is not sliced in half.
- **Tolerance bands are a model-layer concern.** `separationOf()` defaults to exact; only the model
  passes `LIGHTLIKE_TOLERANCE`. Do not push tolerance into `lorentz.ts` — the tests rely on exactness.
- **`simultaneityJump` uses signed `x`, not `|x|`.** Since β = x/ct, the product β·x is x²/ct and the
  jump is forward whichever way the traveller went. Using `|x|` reports a backwards jump for a
  leftward trip; this was a real bug the tests caught.
- **`TwinParadoxModel.earthClockProperty` is an alias** for `currentLabTimeProperty`, so only one of
  them is disposed. Do not "fix" it.
- **The Twin Paradox screen has no `SpecialRelativityModel`** — its β is derived from the turn's
  position, not chosen. Adding a velocity slider there would create two sources of truth.
- **The Twin Paradox screen ignores `timer.timeProperty`.** Its clock is `journeyTimeProperty`, in
  seconds of *Earth* time, so the scrubber, the ct axis and the Earth readout are one number; the
  `TimeModel` is kept only for play/pause and speed. The scrubber's reachable end follows the turn
  through `NumberControl`'s `enabledRangeProperty` — clamping the Property inside its own listener is
  reentrant and axon rejects it.
- **`DraggableMarkerNode` removes its drag listeners before disposing them**, or `hotkeyManager` keeps
  the disposed node reachable and `tests/memory-leak.test.ts` fails. This is why every draggable in
  the sim goes through that one node.
- **Never ask `clockPosition()` for the position at a rail wrap.** `traverseStartTime()` returns
  exactly that instant, and `β·t_wrap` rounds onto either side of the modulo — the answer can flip to
  the far end of the rail. Use `traverseStartPosition()`, which returns the rail end exactly. This was
  a real bug in `photonTrail`, caught by the light-clock triangle's structural test.
- **The Doppler screen uses the retarded emission event**, not the source's current position. That is
  what makes the transverse redshift come out at exactly γ — from wherever the observer is standing.
- **Beaming is D⁴** (bolometric flux). D³ and D² are also correct, for other measured quantities; the
  choice is documented in `lorentz.ts` and `doc/model.md`. Change it only together with the docs.

## Accessibility

Standard fleet pattern. Per-screen a11y strings live under `a11y.<screenKey>` in each locale JSON and
are reached via `StringManager.get<Screen>A11yStrings()`. Every screen has a `*ScreenSummaryContent`
with a **live** `currentDetailsContent`, a wrapper `Node` carrying `pdomOrder` (Reset All last), and a
`*KeyboardHelpContent`.

Live summary text is deliberately coarse — tick counts rather than clock readings, values rounded to
one or two decimals — because a paragraph that changes every frame cannot be read by a screen reader.
Full convention: [Baton/ACCESSIBILITY.md](https://github.com/OpenPhysics/Baton/blob/main/ACCESSIBILITY.md).

## Compliance carve-outs

- **Grouped constants.** `SpecialRelativityConstants.ts` uses topical `as const` objects rather than a
  flat list of exports. Four screens' worth of names is more than one flat list keeps legible; Baton
  CONVENTIONS §2 permits this variation, and the file still lives at `src/` root as required.

## Testing

`npm test` — Vitest, `happy-dom`, `--expose-gc`. 129 tests across six files.

| Path | Purpose |
|---|---|
| `tests/lorentz.test.ts` | Kinematics: γ, boosts, invariance, causal structure, velocity addition, Doppler, aberration, beaming |
| `tests/lightClockGeometry.test.ts` | Photon path, tick counts, and the independent "the photon travels at c" check |
| `tests/twinJourney.test.ts` | Proper times and the Earth-time accounting identity at the turn |
| `tests/dopplerGeometry.test.ts` | The retarded solve, the three Doppler limits, wavefronts, the beaming lobe |
| `tests/TimeModel.test.ts` | The shared clock |
| `tests/memory-leak.test.ts` | WeakRef + `forceGC` dispose regression for every disposable model |

House style is three layers per module: hand-computed values; **independent structural checks** that
the implementation cannot pass by restating its own formula; and a sweep over the parameter extremes.
Layer 2 is where the value is — add to it when adding physics.

## Commands

```bash
npm run fix && npm run lint && npm run check && npm run build && npm test
npm run test:fuzz:quick
bash ../Baton/scripts/check-repo-compliance.sh SpecialRelativity   # from the workspace root
```

Query parameters: `?initialBeta=0.8`, `?showRapidity=true`, `?shadeLightCone=true`.

## PWA

After `npm run build`, the sim is installable offline via Workbox (`dist/manifest.webmanifest`).

## Ideas for a fifth screen

Length contraction is the one standard topic this sim deliberately avoids — every screen is arranged
so that it does not enter. A "ladder and barn" screen would reuse `MinkowskiDiagramNode` and
`lorentz.ts` almost unchanged.
