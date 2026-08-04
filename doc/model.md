# Model - Special Relativity

This document describes the model (the underlying physics, math, and behavior) for the simulation, in
terms appropriate for an educator. It is the companion to
[implementation-notes.md](./implementation-notes.md), which targets developers.

## Overview

Special Relativity has five screens, each built on one idea:

| Screen | The idea |
|---|---|
| **Light Clock** | If light travels at c for everyone, a moving clock must tick slower — by γ. |
| **Spacetime Diagram** | The interval between two events is the same for everyone; their *order* need not be. |
| **Length Contraction** | A length is two ends measured at one instant — and frames disagree about which instants those are. |
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
| Proper length | L₀ | light-seconds | A rod's length in its own rest frame — the longest any frame measures it |
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

That triangle can be drawn on the screen rather than only described. Over the lab time Δt since the
last mirror strike the clock has slid βΔt along the rail and the photon has climbed Δt/γ across it,
while the photon itself has covered Δt; those three lengths are the two legs and the hypotenuse, and
`(Δt)² = (βΔt)² + (Δt/γ)²` is the derivation with nothing left over.

**The mirror separation L is adjustable** (0.5 – 1.6 ls, default 1). Both tick periods change with
it — 2L on the clock's own worldline, 2γL in the lab — but their *ratio* is γ whatever L is set to.
That is worth being able to test rather than take on faith: it is the check that the effect is time
dilation and not some artefact of the apparatus. At the default, one tick is 2 s at rest, an easy
number to hold onto while γ stretches it.

The moving clock runs along a finite rail and wraps around at the end; that is a display convention,
not physics. The clock is inertial throughout and never turns around.

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
can flip it.

Two buttons make that concrete, and they are a matched pair — for any placement of A and B, exactly
one of them is available:

| Button | β it goes to | Available when |
|---|---|---|
| **Boost to B's frame** — B at rest at the origin | `Δx/Δct` | B is timelike-separated from the origin |
| **Make simultaneous** — A and B at the same time | `Δct/Δx` | A and B are spacelike separated |

The greyed-out half is as much of the lesson as the live one: no change of frame reaches a
spacelike-separated event, because doing so would mean outrunning light, and none reorders a
timelike pair, because that would put an effect before its cause.

Alongside `s²` the screen reports **√|s²|**, which is the same invariant in units that mean
something: the *proper time* a clock carried between the events would read when they are timelike
separated, and the *proper distance* between them, measured in the frame that calls them
simultaneous, when they are spacelike.

**Coordinate projections.** Reading a coordinate off a skewed mesh is the step students reliably get
wrong, because the rectangular habit — drop a perpendicular — is exactly the wrong move. You travel
parallel to the *other* axis: parallel to ct′ to reach the x′ axis, parallel to x′ to reach the ct′
axis, because "same x′" is a line parallel to ct′ and not a line at right angles to anything. Both
frames' projections can be drawn at once from the selected event, and at β = 0 the primed pair
collapses onto the lab pair, so the familiar recipe appears as the special case it is.

### Length Contraction

A ladder of proper length L₀ flies at β through a barn of proper length B whose two doors are wired
to one switch. This is the ladder-and-barn paradox, and it is the one screen where the same question
gets two different answers and both of them are right.

**A length is not a property of an object alone.** To measure a moving rod you must mark where both
ends are *at the same moment*, and "the same moment" is exactly what frames disagree about. Everything
below follows from that one sentence.

```
L_measured = L₀ / γ
```

Take the origin of the barn frame to be the event *the ladder's centre passes the barn's centre*. The
doors then sit at x = ∓B/2 for all time, and the switch fires them both at ct = 0, so the two slams
are the events

```
entrance slam ( −B/2, 0 )        exit slam ( +B/2, 0 )
```

Δx = B and Δ(ct) = 0, so the two slams are **spacelike separated for every barn of non-zero length**.
No signal can pass between them, so no frame's opinion about their order is the wrong one — which is
the licence the whole screen runs on, and the same fact the Spacetime Diagram screen establishes in
the abstract.

| | Barn frame | Ladder frame |
|---|---|---|
| Ladder measures | L₀/γ | L₀ |
| Barn measures | B | B/γ |
| The two slams | together, at ct = 0 | γβB apart — **exit door first** |
| Ladder ever wholly inside? | yes, when L₀/γ < B | no, when L₀ > B/γ |

Both columns can hold at once, and they do whenever

```
B/γ²  <  L₀/γ  <  B
```

which is a non-empty range for every γ > 1. The screen's default configuration (B = 4 ls, L₀ = 5 ls,
β = 0.8, so γ = 5/3) sits inside it in round numbers: the ladder is measured at exactly 3 ls in the
barn frame and the barn at exactly 2.4 ls in the ladder frame.

**The resolution is not that one frame is mistaken.** Follow the ladder frame's own account: at
ct′ = −γβB/2 the exit door slams and reopens while the ladder's nose is still short of it; the barn
keeps sweeping past; at ct′ = +γβB/2 the entrance door slams behind the ladder's tail, which is by
then well inside. No door ever touches the ladder, and the ladder is never wholly inside. The barn
frame's account has both doors shut at once with the ladder wholly between them. Every *event* in
those two stories is the same event; only the pairing into simultaneous moments differs. The tests
check both accounts for consistency, including that no door ever shuts through the ladder.

**Two pictures, one spacetime.** The stage is drawn with the selected frame's rulers and clock, so
the toggle rearranges it completely. The spacetime diagram below is always in **barn-frame**
coordinates, and the toggle changes exactly one thing on it: the tilt of the line of simultaneity the
measurement is taken along. Each object's two ends sweep out a band — an upright strip for the barn,
a strip leaning by β for the ladder — and the question "does it fit?" becomes plainly a question about
*which slice of the overlap you take*. The two slam markers do not move when the toggle does.

The doors are drawn shut for a short window either side of each slam. That is the only display
convention on the screen: a slam is an instant, and an instant occupies one frame of animation.

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
would require outrunning light. The journey plays back in **Earth seconds** — the scrubber, the ct
axis and the Earth readout are all the same number — and stops at the reunion.

#### Counting flashes instead of trusting coordinates

The argument above is made entirely in coordinates, and a student's fair objection is that
coordinates are exactly the thing they have just been told not to trust. So each twin can also send
the other a light pulse once per second of their **own** time, and each can count what arrives.

- Earth's pulses go out one per second of lab time. An outbound pulse chases a receding target and
  takes `t_e/(1−β)` to land; after the turn it meets the traveller head-on instead. The gaps between
  arrivals are therefore longer than a second on the way out and shorter on the way back — the
  Doppler shift of the trip, with no Doppler formula anywhere in sight.
- The traveller's pulses leave at proper times `k·τ`, which is lab time `k·γτ`. That stretch *is*
  their time dilation, expressed as something the Earth twin can count.

By the reunion the traveller has seen **every** pulse Earth sent, all `⌊2·ct_turn / τ⌋` of them,
while Earth has seen only the traveller's fewer `⌊τ_traveller / τ⌋`. Neither twin has to be told
whose clock ran slow; they counted. Both totals are checked in the tests.

### Relativistic Doppler

A light source flies past a stationary observer who sits off to one side of its line of travel. The
offset is deliberate: with the observer directly on the track, the angle could only ever be 0 or π
and the transverse case — the interesting one — could never occur.

**The observer can be moved**, and where they stand is half the experiment. Sliding them along the
track moves the transverse moment with them: it happens when the *emission* was straight across from
where they are standing, not when the source passes some fixed marker. Standing further off the track
stretches the whole approach-to-recede swing out and gentles it, because the angle changes more
slowly; standing close makes it violent. The physics is identical in every case — only the sampling
of it changes — and the transverse shift is exactly 1/γ wherever they stand, because that factor is
time dilation and has nothing to do with geometry.

The light arriving now left the source some time ago, from wherever the source was **then**. Every
observed quantity is computed from that retarded emission event, found by solving

```
|observer − source(t_e)| = c·(t − t_e)
```

for `t_e`. This is not a refinement: using the source's current position instead would put the
transverse moment in the wrong place and would not reproduce the transverse redshift at all. The
retarded position can be shown on screen, marked where the source *was* and joined to where it is
now — the gap between the two is the whole of "you never see a moving thing where it is".

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
| Mirror separation L | 0.5 … 1.6 ls | 1 ls | At the default one tick = 2 s, an easy number to hold onto while γ stretches it. The range is kept modest so the taller clock still fits between the readouts and the rail |
| Barn length B | fixed | 4 ls | Only the *ratio* of the two lengths matters, so a second length slider would only reach states the ladder slider already reaches. The barn is the one held still because the diagram is drawn in its frame |
| Ladder proper length L₀ | 2 … 8 ls | 5 ls | Spans "fits in both frames" through "fits in neither". At the default β the paradox regime is 2.56 … 4 ls of *contracted* length, and 5 ls lands in it at exactly 3 |
| Ladder speed β | 0.1 … 0.95 | 0.8 | γ = 5/3, so 5 ls contracts to exactly 3 and 4 ls to exactly 2.4. Strictly positive because at β = 0 nothing passes anything; capped below the sim-wide 0.99 because in the ladder's frame the slams are γβB apart, and at 0.99 that window is four times longer than the fly-past it brackets |
| Turn position | \|x\| ≤ 4.2 ls, 0.6 ≤ ct ≤ 4.4 ls | (3, 4) | The 3-4-5 case: γ = 1.512, Earth 8 s against the traveller's 2√7 ≈ 5.29 s |
| Journey time | 0 … 8.8 s | 0 | The latest reunion any allowed turn can produce; the reachable end moves with the trip |
| Signal interval | fixed | 1 s of the sender's own time | A handful of pulses per leg on the default trip — enough to see the spacing stretch and crowd, few enough that the diagram does not turn into hatching |
| Emitted λ | 380 … 700 nm | 550 nm | The visible band; green sits mid-spectrum, so shifts show in both directions |
| Observer position | \|x\| ≤ 6 ls, 1.5 ≤ d ≤ 6.5 ls | (0, −2.6) | The near limit keeps the observer clear of the track: a ray grazing the source's own path makes the retarded construction degenerate just as it becomes most interesting to look at |

## Simplifications and assumptions

- **One spatial dimension.** All motion is along a single axis. The Doppler screen recovers the
  angular dependence it needs from the observer's offset, not from a genuine second axis of motion.
- **Flat spacetime, no gravity.** This is special relativity only: no curvature, no gravitational
  time dilation, and no accelerated frames beyond the instantaneous turn on the Twin Paradox screen.
- **The turn is instantaneous.** A real turnaround takes time and involves proper acceleration; here
  it is a corner. Smoothing it would change the numbers slightly but not the argument.
- **The doors slam and reopen instantaneously**, and the barn and ladder are perfectly rigid. Both are
  the standard idealizations of the ladder-and-barn puzzle. A real ladder is not rigid — relativity
  forbids it, because a rigid rod would carry a signal along its length instantly — but nothing on the
  screen turns on the difference: no door ever touches the ladder in either frame.
- **Length contraction appears on exactly one screen.** The other four are arranged so it does not
  enter — the light clock's mirrors are transverse to the motion, and the diagrams show coordinates
  rather than rulers — so that time dilation can be established without it, and it can then be
  introduced on its own terms rather than as a second effect tangled into the first.
- **Light propagation is not raytraced.** The Doppler screen draws wavefronts and computes what one
  observer receives; it does not render the visual distortion (Terrell rotation) of an extended object
  seen at relativistic speed.
- **β is capped at 0.99.** Nothing physical happens at that value; it is where the diagram stops being
  readable.
- **Changing β restarts the Doppler fly-by.** A source that changed speed mid-flight would not be
  inertial, and every formula on that screen assumes it is.

## References

- Taylor & Wheeler, *Spacetime Physics*, 2nd ed. — the invariant interval and the light clock.
- Rindler, *Relativity: Special, General and Cosmological*, 2nd ed. — Doppler shift and aberration;
  §3.5 for the pole-and-barn (here ladder-and-barn) paradox and its resolution by simultaneity.
- Rybicki & Lightman, *Radiative Processes in Astrophysics*, §4.8 — beaming and the D⁴ convention.
