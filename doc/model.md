# Model - Special Relativity

This document describes the model (the underlying physics, math, and behavior) for the simulation, in
terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

Special Relativity has four screens, each built on one idea:

| Screen | The idea |
|---|---|
| **Light Clock** | If light travels at c for everyone, a moving clock must tick slower — by γ. |
| **Spacetime Diagram** | The interval between two events is the same for everyone; their *order* need not be. |
| **Twin Paradox** | Elapsed time depends on the path, not just on its endpoints. |
| **Relativistic Doppler** | The colour and brightness of a moving source depend on how it moves — including sideways. |

Key ideas a student should take away:

- **The speed of light is the input, not the output.** Every result here is forced by assuming that
  one photon covers the same distance per unit time for every inertial observer.
- **γ = 1/√(1 − β²) is one number doing many jobs** — time dilation, the tilt of the primed axes,
  the transverse redshift.
- **Some quantities are invariant and some are not.** The interval, the causal classification of a
  pair of events, and each clock's own elapsed time are the same for everybody. Coordinates,
  simultaneity, and the order of spacelike-separated events are not.
- **Relativity does not make time order arbitrary.** It makes it frame-dependent exactly where no
  causal influence could connect the events — never where one could.

## Quantities and units

**The simulation works in natural units with c = 1.** Distances are in light-seconds (ls) and times
in seconds, so the time coordinate `ct` is also measured in light-seconds and a light ray always has
slope ±1 on a spacetime diagram. Nothing in the code multiplies or divides by c.

| Quantity | Symbol | Units | Notes |
|---|---|---|---|
| Position | x | light-seconds | Horizontal on every diagram |
| Time coordinate | ct | light-seconds | Vertical on every diagram; numerically the elapsed time in seconds |
| Relative velocity | β = v/c | dimensionless | The primary control; capped at ±0.99 |
| Lorentz factor | γ = 1/√(1 − β²) | dimensionless | 1 at rest, ≈ 7.09 at the cap |
| Rapidity | η = artanh β | dimensionless | Optional readout; adds under successive boosts, where β does not |
| Invariant interval | s² = x² − (ct)² | ls² | Violet on the diagrams |
| Proper time | τ | seconds | Time on a clock carried along a given worldline; green throughout the sim |
| Wavelength | λ | nanometres | Relativistic Doppler screen only |

Two sign conventions are worth stating because both appear in textbooks:

- **s² = x² − (ct)²**, so spacelike separations are positive. Chosen so the sign of s² matches the
  sign of the quantity the diagram draws as a horizontal distance.
- **β is the velocity of the primed frame relative to the lab frame**, positive to the right.

## Screens

### Light Clock

Two identical clocks, each a pair of mirrors a distance L apart with a photon bouncing between them.
The mirror separation is **across** the direction of motion, which is the whole reason a light clock
is built this way: transverse lengths are not contracted, so the arrangement isolates time dilation
instead of tangling it with a second effect.

In the clock's own frame the photon covers L each way, so one round trip — one "tick" — takes

```
τ_tick = 2L / c = 2L        (natural units)
```

In the lab frame the moving clock's photon must cover the hypotenuse of a triangle whose other leg is
how far the clock itself moved in that time:

```
(c·t_half)² = L² + (β·c·t_half)²   ⟹   t_half = γL
```

so the lab sees one tick take 2γL. The photon travels at c in **both** frames — that is the
postulate, not a result — and the stretched tick is what the postulate forces.

Defaults: L = 1 light-second, so one tick is 2 s at rest. The moving clock runs along a finite rail
and wraps around at the end; that is a display convention, not physics. The clock is inertial
throughout and never turns around.

### Spacetime Diagram

Space runs across, `ct` runs up, and the light cone through the origin is the pair of 45° lines
`ct = ±x`. A second frame moving at β is drawn on the *same* undistorted diagram as a sheared
coordinate mesh:

- the **ct′ axis** (constant x′) is the line `x = β·ct` — the worldline of something at rest in the
  moving frame;
- the **x′ axis** (constant t′) is the line `ct = β·x` — the events that frame calls simultaneous
  with the origin.

The two close symmetrically on the light cone as β → 1, which is the geometric content of "you cannot
catch up with light".

The Lorentz transformation acting on `(x, ct)` is

```
x′  = γ( x − β·ct )
ct′ = γ( ct − β·x )
```

Two quantities are computed side by side and behave very differently:

- **the interval** `s² = Δx² − Δ(ct)²`, which every frame computes to the same value — boosting an
  event slides it along a hyperbola of constant s² and never off one;
- **the order** of the two events, which frames disagree about — but only when the separation is
  spacelike, and therefore only when neither event could have caused the other.

For a spacelike pair the order flips exactly as β passes `Δct/Δx`. For a timelike pair no allowed β
can flip it. The "boost to B's frame" button is disabled precisely when B is *not* timelike-separated
from the origin, which is the same statement in a different form.

### Twin Paradox

One twin stays put; the other flies out at β, turns, and comes back. Both worldlines run between the
same two events, so any difference in elapsed time belongs to the *paths*.

```
Earth's elapsed time      = 2·ct_turn
Traveller's elapsed time  = 2·√(ct_turn² − x_turn²) = 2·ct_turn / γ
```

The turn is what breaks the symmetry. On the outbound leg the traveller's frame moves at +β and on
the inbound leg at −β, so the moment on Earth they call "now" is **discontinuous at the turn**: it
jumps forward by

```
Δt_jump = 2·β·x_turn
```

Nothing happens to the Earth clock at that instant. What changes is which slice of spacetime the
traveller calls simultaneous. And the skipped time is not missing — the two legs plus the jump
account for every second of the Earth twin's elapsed time:

```
(ct_turn − β·x_turn)  +  2·β·x_turn  +  (ct_turn − β·x_turn)  =  2·ct_turn
```

That identity is checked directly in `tests/twinJourney.test.ts`, and it is the precise sense in which
"the traveller never sees those years pass" is true without any of them going missing.

The turn is constrained to stay inside the light cone (`ct ≥ 1.04·|x|`), because a trip outside it
would require outrunning light.

### Relativistic Doppler

A light source flies past a stationary observer who sits off to one side of its line of travel. The
offset is deliberate: with the observer directly on the track, the angle could only ever be 0 or π
and the transverse case — the interesting one — could never occur.

The light arriving now left the source some time ago, from wherever the source was **then**. Every
observed quantity is computed from that retarded emission event, found by solving

```
|observer − source(t_e)| = c·(t − t_e)
```

for `t_e`. This is not a refinement: using the source's current position instead would put the
transverse moment in the wrong place and would not reproduce the transverse redshift at all.

With θ the angle, in the observer's frame, between the source's velocity and the received ray:

```
D  = 1 / ( γ(1 − β·cos θ) )        Doppler factor
f_obs = D·f₀        λ_obs = λ₀ / D
```

The three limits:

| Geometry | cos θ | Result |
|---|---|---|
| Head-on | +1 | `D = √((1+β)/(1−β))` — blueshift |
| Straight away | −1 | `D = √((1−β)/(1+β))` — redshift |
| **Transverse** | 0 | `D = 1/γ` — **redshifted by γ with nothing receding** |

The transverse case has no classical counterpart. A classical wave source moving directly across your
line of sight produces no shift at all; here the light is still reddened, by time dilation alone.

**Beaming.** A source that radiates evenly in its own frame does not look even from outside. The
simulation draws relative brightness as

```
I / I_rest = D⁴
```

**This is the bolometric-flux convention** — total power per unit area received from a moving point
source. The exponent depends on what is being measured, and other perfectly correct choices appear in
the literature: D³ for photon arrival *rate*, and D² for specific intensity per unit frequency (D³
per unit wavelength). D⁴ is the one that answers "how bright does it look", which is what the screen
draws.

## Ranges and defaults

| Parameter | Range | Default | Why |
|---|---|---|---|
| β | −0.99 … 0.99 | 0.6 | γ = 1.25 at the default — visibly relativistic while the primed axes stay clearly off the light cone. At the cap γ ≈ 7.09; pushing closer to 1 collapses the axes onto the cone, and the geometry becomes unreadable long before the arithmetic becomes inaccurate. |
| Diagram extent | ±5 ls | — | Light rays run corner to corner |
| Mirror separation L | fixed | 1 ls | One tick = 2 s, an easy number to hold onto while γ stretches it |
| Turn position | \|x\| ≤ 4.2 ls, 0.6 ≤ ct ≤ 4.4 ls | (3, 4) | The 3-4-5 case: γ = 1.512, Earth 8 s against the traveller's 2√7 ≈ 5.29 s |
| Emitted λ | 380 … 700 nm | 550 nm | The visible band; green sits mid-spectrum, so shifts show in both directions |

## Simplifications and assumptions

- **One spatial dimension.** All motion is along a single axis. The Doppler screen recovers the
  angular dependence it needs from the observer's offset, not from a genuine second axis of motion.
- **Flat spacetime, no gravity.** This is special relativity only: no curvature, no gravitational
  time dilation, and no accelerated frames beyond the instantaneous turn on the Twin Paradox screen.
- **The turn is instantaneous.** A real turnaround takes time and involves proper acceleration; here
  it is a corner. Smoothing it would change the numbers slightly but not the argument.
- **Length contraction is never shown.** Every screen is arranged so it does not enter: the light
  clock's mirrors are transverse to the motion, and the diagrams show coordinates rather than rulers.
  A "ladder and barn" treatment would be a natural fifth screen.
- **Light propagation is not raytraced.** The Doppler screen draws wavefronts and computes what one
  observer receives; it does not render the visual distortion (Terrell rotation) of an extended object
  seen at relativistic speed.
- **β is capped at 0.99.** Nothing physical happens at that value; it is where the diagram stops being
  readable.
- **Changing β restarts the Doppler fly-by.** A source that changed speed mid-flight would not be
  inertial, and every formula on that screen assumes it is.

## References

- Taylor & Wheeler, *Spacetime Physics*, 2nd ed. — the invariant interval and the light clock.
- Rindler, *Relativity: Special, General and Cosmological*, 2nd ed. — Doppler shift and aberration.
- Rybicki & Lightman, *Radiative Processes in Astrophysics*, §4.8 — beaming and the D⁴ convention.
