# Special Relativity

[![CI](https://github.com/OpenPhysics/SpecialRelativity/actions/workflows/ci.yml/badge.svg)](https://github.com/OpenPhysics/SpecialRelativity/actions/workflows/ci.yml)

An interactive simulation of flat-spacetime relativity — a moving light clock, a live Minkowski
diagram, the ladder-and-barn paradox, the twin paradox, and the relativistic Doppler effect — built
with
[SceneryStack](https://scenerystack.org/), Vite 8, TypeScript 6, and Biome 2.

## Features

- **Light Clock** — a light clock at rest beside one gliding past at an adjustable β, with the
  photon's zigzag drawn and the two tick counts drifting apart by exactly γ
- **Spacetime Diagram** — drag two events on a Minkowski diagram while a velocity slider shears the
  primed axes live; light cone, lines of simultaneity, invariant hyperbolas, and a readout that
  contrasts the invariant interval with the frame-dependent order of events
- **Length Contraction** — a ladder flying through a barn whose two doors slam together, watched
  from the barn's frame and then from the ladder's; the same two slams, one pair of events, and two
  frames that answer "did it fit?" differently because they slice spacetime into "nows" at
  different angles
- **Twin Paradox** — place the turnaround event and watch both worldlines, both clocks, and the
  jump in the traveller's "now" that resolves the paradox
- **Relativistic Doppler** — a source flying past an observer, with wavefronts, the received colour
  computed from the retarded emission event, the transverse redshift by γ, and forward beaming
- Natural units (c = 1) throughout, so light rays are always at 45°
- English, Spanish, and French localization via `StringManager`
- Full keyboard access, screen-reader summaries, and default/projector colour profiles
- Progressive Web App (installable, offline-capable)
- 151 unit tests over the pure physics modules, plus a memory-leak suite

## Quick Start

```bash
npm install
npm run icons    # generate PNG icons from public/icons/icon.svg
npm start        # dev server → http://localhost:5173
```

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run build:single` | Build a single self-contained `dist/index.html` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest unit tests (includes memory-leak suite) |
| `npm run test:fuzz` | Playwright input fuzz smoke (`?fuzz`, default 15s) |
| `npm run test:fuzz:quick` | Shorter fuzz smoke (10s) |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run clean` | Remove `dist/` |

Query parameters: `?initialBeta=0.8`, `?showRapidity=true`, `?shadeLightCone=true`.

New sims start at `version: "0.0.0"` in `package.json`. Bump only when cutting a release (for example `npm version patch` and a matching git tag). Keep `name` in kebab-case; it is separate from the SceneryStack sim identifier in `src/init.ts`.

## Tech Stack

| Tool | Version | Purpose |
|---|---|---|
| [SceneryStack](https://scenerystack.org/) | ^3.0.0 | Simulation framework |
| [Vite](https://vitejs.dev/) | ^8 | Build tool + dev server |
| [TypeScript](https://www.typescriptlang.org/) | ^6 | Type-safe JavaScript |
| [Biome](https://biomejs.dev/) | ^2.5 | Linting + formatting |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | ^1 | PWA + service worker |

## License

GNU Affero General Public License v3.0 — see [OpenPhysics org license](https://github.com/OpenPhysics/.github/blob/main/LICENSE).

## Contributing

See [OpenPhysics contributing guidelines](https://github.com/OpenPhysics/.github/blob/main/CONTRIBUTING.md).
Report bugs via GitHub Issues; use org issue templates.
