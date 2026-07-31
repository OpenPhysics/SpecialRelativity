/**
 * lorentz.ts
 *
 * Pure, dependency-free maths for flat-spacetime special relativity. Everything
 * here is a plain function of plain numbers (or Vector2s) so it can be unit-tested
 * without SceneryStack; {@link SpecialRelativityModel} wraps it in Properties, and
 * the screen views call it to build the geometry they draw.
 *
 * ── Conventions used everywhere in this simulation ────────────────────────────
 *
 *  - **Natural units, c = 1.** Space is measured in light-seconds and time in
 *    seconds, so the time coordinate `ct` is also in light-seconds and a light
 *    ray always has slope ±1 on a spacetime diagram. Nothing in this file
 *    multiplies or divides by c; if you find yourself wanting to, the units have
 *    gone wrong somewhere upstream.
 *
 *  - **An event is a `Vector2( x, ct )`** — `x` is the spatial coordinate and `y`
 *    holds `ct`. This ordering matches the diagram (x across, ct up) so view code
 *    can hand events straight to a bamboo ChartTransform.
 *
 *  - **Only one spatial dimension.** Every screen here is 1+1 dimensional. The
 *    Doppler screen recovers the angular dependence it needs from the direction
 *    cosine rather than from a genuine second spatial axis.
 *
 *  - **Signature (+,−): `s² = x² − (ct)²`.** Spacelike separations are positive,
 *    timelike negative. The opposite convention is equally common in textbooks;
 *    this one is chosen so the sign of `s²` matches the sign of the quantity the
 *    diagram shows as a horizontal distance.
 *
 *  - **β is the velocity of the primed frame relative to the unprimed one**,
 *    positive to the right, and is clamped to ±{@link MAX_BETA} by
 *    {@link sanitizeBeta} so every downstream √ and ÷ stays finite.
 */

import { Matrix3, Vector2 } from "scenerystack/dot";

/**
 * Largest speed the simulation will represent, as a fraction of c. γ at this
 * value is ≈ 7.09, which is already a dramatic effect while leaving the diagram
 * readable — the primed axes still sit visibly off the light cone. Pushing much
 * closer to 1 collapses them onto it and the geometry becomes unreadable long
 * before the arithmetic becomes inaccurate.
 */
export const MAX_BETA = 0.99;

/** How the two events of a pair are causally related. */
export const Separation = {
  /** |Δct| > |Δx| — one event can influence the other; every frame agrees on their order. */
  TIMELIKE: "timelike",
  /** |Δct| = |Δx| — connected by a light ray. */
  LIGHTLIKE: "lightlike",
  /** |Δx| > |Δct| — no causal link; frames disagree about which came first. */
  SPACELIKE: "spacelike",
} as const;

export type Separation = (typeof Separation)[keyof typeof Separation];

/** Which of the two branches of an invariant hyperbola to sample. */
export const HyperbolaBranch = {
  /** The +x branch (spacelike s²) or the future +ct branch (timelike s²). */
  POSITIVE: "positive",
  /** The −x branch (spacelike s²) or the past −ct branch (timelike s²). */
  NEGATIVE: "negative",
} as const;

export type HyperbolaBranch = (typeof HyperbolaBranch)[keyof typeof HyperbolaBranch];

/**
 * Clamps β into the representable range and maps non-finite input to 0. This is
 * the one impure-feeling function in the module, and it exists for the same
 * reason a slider has end stops: β = ±1 makes γ infinite and every formula below
 * degenerate, so the invalid values are absorbed here rather than defended
 * against at each call site.
 */
export const sanitizeBeta = (beta: number): number => {
  if (!Number.isFinite(beta)) {
    return 0;
  }
  return Math.max(-MAX_BETA, Math.min(MAX_BETA, beta));
};

/** The Lorentz factor γ = 1 / √(1 − β²). Always ≥ 1. */
export const gammaOf = (beta: number): number => {
  const b = sanitizeBeta(beta);
  return 1 / Math.sqrt(1 - b * b);
};

/**
 * Rapidity η = artanh β — the velocity parameter that *adds* under successive
 * boosts, where β itself does not. A boost is a hyperbolic rotation through η in
 * the (x, ct) plane, which is why the primed axes close on the light cone
 * symmetrically instead of rotating past it.
 */
export const rapidityOf = (beta: number): number => Math.atanh(sanitizeBeta(beta));

/** Inverse of {@link rapidityOf}: β = tanh η. */
export const betaOfRapidity = (rapidity: number): number => Math.tanh(rapidity);

/**
 * The Lorentz boost taking unprimed coordinates to the frame moving at β, as a
 * Matrix3 acting on `Vector2( x, ct )`:
 *
 *     ⎡  γ   −γβ  0 ⎤   ⎡ x  ⎤     ⎡ γ( x − β·ct ) ⎤
 *     ⎢ −γβ   γ   0 ⎥ · ⎢ ct ⎥  =  ⎢ γ( ct − β·x ) ⎥
 *     ⎣  0    0   1 ⎦   ⎣ 1  ⎦     ⎣       1       ⎦
 *
 * The third row and column are the identity padding Matrix3 requires; because the
 * translation entries m02/m12 are zero, `timesVector2` applies this as the pure
 * linear map above. Pass −β for the inverse boost.
 */
export const boostMatrix = (beta: number): Matrix3 => {
  const b = sanitizeBeta(beta);
  const gamma = gammaOf(b);
  return Matrix3.rowMajor(gamma, -gamma * b, 0, -gamma * b, gamma, 0, 0, 0, 1);
};

/** An event's coordinates as measured in the frame moving at β. */
export const boostEvent = (event: Vector2, beta: number): Vector2 => boostMatrix(beta).timesVector2(event);

/**
 * The invariant interval s² = x² − (ct)² of a *displacement* between two events.
 * Every inertial frame computes the same value — that invariance is the single
 * fact the Spacetime Diagram screen exists to demonstrate.
 */
export const intervalSquared = (displacement: Vector2): number =>
  displacement.x * displacement.x - displacement.y * displacement.y;

/**
 * Classifies the separation between two events.
 *
 * `tolerance` is the half-width, in units of s², of the band around zero that
 * counts as lightlike. It defaults to 0 — exact, which is what tests want — but
 * the view passes a small positive value, because a user dragging an event with a
 * mouse would otherwise never land exactly on the light cone and so would never
 * see the lightlike case at all.
 */
export const separationOf = (from: Vector2, to: Vector2, tolerance = 0): Separation => {
  const s2 = intervalSquared(to.minus(from));
  if (Math.abs(s2) <= tolerance) {
    return Separation.LIGHTLIKE;
  }
  return s2 > 0 ? Separation.SPACELIKE : Separation.TIMELIKE;
};

/**
 * Samples one branch of the invariant hyperbola s² = constant — the locus of every
 * event that some inertial frame would place at the same interval from the origin.
 * Boosting slides an event *along* one of these curves, which is what makes them
 * the right visual anchor for "the interval didn't change".
 *
 * Sampling is uniform in rapidity rather than in x or ct, so the points stay evenly
 * spread along the curve instead of bunching near the vertex.
 *
 * @param sSquared - the invariant interval squared; sign selects the family
 * @param maxRapidity - sample over η ∈ [−maxRapidity, +maxRapidity]
 * @param count - number of samples (≥ 2)
 * @param branch - which of the two mirror-image branches to return
 * @returns points in (x, ct), or an empty array for the degenerate s² = 0 case
 *          (where the "hyperbola" has collapsed onto the light cone itself)
 */
export const hyperbolaSamples = (
  sSquared: number,
  maxRapidity: number,
  count: number,
  branch: HyperbolaBranch = HyperbolaBranch.POSITIVE,
): Vector2[] => {
  if (!Number.isFinite(sSquared) || sSquared === 0 || count < 2) {
    return [];
  }

  const magnitude = Math.sqrt(Math.abs(sSquared));
  const sign = branch === HyperbolaBranch.POSITIVE ? 1 : -1;
  const spacelike = sSquared > 0;

  const points: Vector2[] = [];
  for (let index = 0; index < count; index++) {
    const rapidity = -maxRapidity + (2 * maxRapidity * index) / (count - 1);
    const cosh = magnitude * Math.cosh(rapidity);
    const sinh = magnitude * Math.sinh(rapidity);
    // Spacelike curves open left/right (x is the cosh leg); timelike ones open
    // up/down into the future and past light cones (ct is the cosh leg).
    points.push(spacelike ? new Vector2(sign * cosh, sinh) : new Vector2(sinh, sign * cosh));
  }
  return points;
};

/**
 * Endpoints of the line of simultaneity through `event` for a frame moving at β —
 * every event the moving observer says happens at the same instant as `event`.
 *
 * Constant t′ = γ(ct − βx) means ct = βx + (ct₀ − βx₀): slope β, i.e. parallel to
 * the x′ axis. At β = 0 this is horizontal, as it must be.
 */
export const simultaneityLineThrough = (event: Vector2, beta: number, halfExtent: number): [Vector2, Vector2] => {
  const b = sanitizeBeta(beta);
  const ctAt = (x: number): number => b * x + (event.y - b * event.x);
  return [new Vector2(-halfExtent, ctAt(-halfExtent)), new Vector2(halfExtent, ctAt(halfExtent))];
};

/**
 * Endpoints of the worldline through `event` of an object at rest in the frame
 * moving at β — every event that observer says happens at the same *place*.
 *
 * Constant x′ = γ(x − β·ct) means x = β·ct + (x₀ − β·ct₀): parallel to the ct′
 * axis. Parametrising by β rather than by a slope keeps β = 0 (a vertical line)
 * finite instead of infinite.
 */
export const worldlineThrough = (event: Vector2, beta: number, halfExtent: number): [Vector2, Vector2] => {
  const b = sanitizeBeta(beta);
  const xAt = (ct: number): number => b * ct + (event.x - b * event.y);
  return [new Vector2(xAt(-halfExtent), -halfExtent), new Vector2(xAt(halfExtent), halfExtent)];
};

/**
 * Proper time elapsed along a piecewise-inertial worldline: Σ √(Δct² − Δx²).
 *
 * This is the quantity a clock carried along the path actually reads, and the
 * whole of the Twin Paradox screen is the observation that it depends on the path
 * and not just on its endpoints. Segments that are not timelike contribute 0 —
 * they are unphysical for a worldline, and clamping keeps a mid-drag intermediate
 * state from producing NaN.
 */
export const properTimeAlong = (vertices: readonly Vector2[]): number => {
  let total = 0;
  let previous = vertices[0];
  for (const current of vertices.slice(1)) {
    if (previous) {
      const delta = current.minus(previous);
      total += Math.sqrt(Math.max(0, delta.y * delta.y - delta.x * delta.x));
    }
    previous = current;
  }
  return total;
};

/**
 * Relativistic composition of collinear velocities: β = (β₁ + β₂) / (1 + β₁β₂).
 * The result never reaches 1 for inputs below it — this is the algebraic reason
 * the speed of light cannot be overtaken by changing frames.
 */
export const velocityAddition = (beta1: number, beta2: number): number => {
  const b1 = sanitizeBeta(beta1);
  const b2 = sanitizeBeta(beta2);
  return (b1 + b2) / (1 + b1 * b2);
};

/**
 * The relativistic Doppler factor D = 1 / (γ(1 − β cos θ)).
 *
 * `cosTheta` is the cosine of the angle, measured in the observer's frame,
 * between the source's velocity and the direction the received light travels
 * (source → observer). So cos θ = +1 is a source coming straight at you and
 * gives the maximum blueshift; cos θ = −1 is one receding and gives the
 * strongest redshift; cos θ = 0 is the transverse case, which is redshifted by
 * exactly γ from time dilation alone even though nothing is approaching or
 * receding. Observed frequency is D·f₀ and observed wavelength is λ₀/D.
 */
export const dopplerFactor = (beta: number, cosTheta: number): number => {
  const b = sanitizeBeta(beta);
  return 1 / (gammaOf(b) * (1 - b * cosTheta));
};

/**
 * Relativistic aberration: the direction cosine of a ray in the observer's frame,
 * given its direction cosine in the source's rest frame.
 *
 *     cos θ = (cos θ' + β) / (1 + β cos θ')
 *
 * Light a source emits evenly in all directions is swept forward into a narrow
 * cone as β → 1. Pass −β to transform the other way.
 */
export const aberrationCos = (cosThetaRest: number, beta: number): number => {
  const b = sanitizeBeta(beta);
  return (cosThetaRest + b) / (1 + b * cosThetaRest);
};

/**
 * Relativistic beaming: how much brighter a moving source appears in a given
 * direction than the same source at rest.
 *
 * **This simulation uses D⁴, the bolometric-flux convention** — total power per
 * unit area received from a moving point source. The exponent depends on what is
 * being measured, and other perfectly correct choices appear in the literature:
 * D³ for photon arrival *rate*, and D² for specific intensity per unit frequency
 * (D³ per unit wavelength). D⁴ is the one that matches "how bright does it look",
 * which is what the Relativistic Doppler screen draws.
 */
export const bolometricBeaming = (beta: number, cosTheta: number): number => dopplerFactor(beta, cosTheta) ** 4;
