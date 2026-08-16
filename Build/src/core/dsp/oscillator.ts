import type { GlottalSourceParams } from "../types";
import { mulberry32 } from "../rng";

/** Canonical Liljencrants-Fant (LF) glottal flow-derivative source.
 *
 *  Implements the discrete-time LF model of the glottal flow derivative
 *  (Fant 1985; Gobl 2017 / Doval 2006), the standard parametric excitation
 *  fed to the vocal-tract filter in source-filter synthesis. The pulse has
 *  two phases:
 *
 *    opening  (0 <= t <= Te):  E0 * e^{a*t} * sin(wg*t)
 *    return   (Te < t < T0):  -Ee/(e*Ta) * (e^{-e*(t-Te)} - e^{-e*(T0-Te)})
 *
 *  with `e` (epsilon) and `a` (alpha) solved per period from the continuity
 *  constraints so the flow returns smoothly to zero. The public voice knobs
 *  map onto the canonical time parameters:
 *
 *    openQuotient  -> Te = OQ * T0            (end of open phase)
 *    speedQuotient -> Tp = Te * SQ/(1+SQ)     (SQ = opening/closing ratio)
 *    tenseness     -> Fa -> Ta = 1/(2*pi*Fa)  (return-phase spectral tilt)
 *
 *  Phase is tracked as a normalized accumulator `u in [0,1)` advanced by
 *  `f0/sampleRate` each sample (so a gliding f0 correctly changes both the
 *  period length and the pulse shape). Stateful (one instance per phrase) to
 *  keep phase continuity. */
export class LFGlottalSource {
  // Normalized phase within the current glottal period (0 <= u < 1).
  private phase = 0;
  private dcX = 0;
  private dcY = 0;

  // Per-period cached LF coefficients (solved once per glottal cycle).
  private T0 = 0;
  private Te = 0;
  private Tp = 0;
  private Ta = 0;
  private Tb = 0;
  private epsilon = 0;
  private alpha = 0;
  private omegaG = 0;
  private E0 = 0;
  private Ee = 1;
  private jitterF0 = 0;
  private shimmerAmp = 1;
  private cachedF0 = 0;
  private rng: () => number = Math.random;

  /** Seed the internal randomness source for reproducible rendering.
   *  Pass a 32-bit integer (e.g. a hash of the note identity) or an rng
   *  function directly. Without seeding, falls back to `Math.random`. */
  seed(seed: number | (() => number)): void {
    this.rng = typeof seed === "function" ? seed : mulberry32(seed);
  }

  /** Reset all internal state (phase, DC blocker). Call when starting a new
   *  phrase to avoid discontinuity clicks. */
  reset(): void {
    this.phase = 0;
    this.dcX = 0;
    this.dcY = 0;
    this.jitterF0 = 0;
    this.cachedF0 = 0;
  }

  /** Solve epsilon from `epsilon*Ta - 1 + exp(-epsilon*Tb) = 0` (Tb = T0-Te)
   *  via bisection. The equation has a single positive root; g(0)=0 and
   *  g(eps)->+inf as eps->inf, and g goes negative just above 0. */
  private solveEpsilon(Ta: number, Tb: number): number {
    const g = (e: number) => e * Ta - 1 + Math.exp(-e * Tb);
    let lo = 1e-4;
    let hi = 1 / Math.max(1e-6, Ta);
    // Expand hi until g(hi) > 0.
    for (let i = 0; i < 60 && g(hi) <= 0; i++) hi *= 2;
    for (let i = 0; i < 60; i++) {
      const mid = 0.5 * (lo + hi);
      if (g(mid) > 0) hi = mid;
      else lo = mid;
    }
    return 0.5 * (lo + hi);
  }

  /** Solve alpha from the flow-continuity condition Ao(alpha) + Ar(alpha) = 0.
   *  Ar is independent of alpha, so we solve Ao(alpha) = const via a coarse
   *  bracket scan followed by bisection (mirrors mvsoom/lf-model's finder). */
  private solveAlpha(T0: number, Te: number, Tp: number, Ta: number, eps: number): number {
    const wg = Math.PI / Tp;
    const Tb = T0 - Te;
    const sinWgTe = Math.sin(wg * Te);
    // Ar (constant in alpha)
    const Ar = (-this.Ee / (eps * eps * Ta)) * (1 - Math.exp(-eps * Tb) * (1 + eps * Tb));
    const Ao = (a: number): number => {
      const E0 = (-this.Ee * Math.exp(-a * Te)) / sinWgTe;
      const f1 = (E0 * Math.exp(a * Te)) / Math.sqrt(wg * wg + a * a);
      const f2 = Math.sin(wg * Te - Math.atan(wg / Math.max(1e-6, a)));
      return f1 * f2 + (E0 * wg) / (wg * wg + a * a);
    };
    const g = (a: number) => Ao(a) - -Ar;
    const aMin = 1;
    const aMax = 4000;
    const STEPS = 12;
    let prev = g(aMin);
    let lo = aMin;
    let hi = aMax;
    let bracketed = false;
    for (let i = 1; i <= STEPS; i++) {
      const a = aMin + ((aMax - aMin) * i) / STEPS;
      const cur = g(a);
      if (prev <= 0 !== cur <= 0) {
        lo = aMin + ((aMax - aMin) * (i - 1)) / STEPS;
        hi = a;
        bracketed = true;
        break;
      }
      prev = cur;
    }
    if (!bracketed) return aMax; // degenerate; clamp.
    for (let i = 0; i < 50; i++) {
      const mid = 0.5 * (lo + hi);
      if (g(mid) > 0) hi = mid;
      else lo = mid;
    }
    return 0.5 * (lo + hi);
  }

  private recomputeCoefficients(f0: number, openQuotient: number, speedQuotient: number, tenseness: number): void {
    // All time quantities are in seconds so the LF equations are consistent:
    // the pulse sample is computed as t = u * T0 (u = normalized phase), and
    // the period T0, phase boundaries Te/Tp/Tb, and return time Ta are seconds.
    const T0 = 1 / Math.max(1, f0);
    let Te = Math.max(0.05, openQuotient) * T0;
    const sq = Math.max(0.3, Math.min(3.0, speedQuotient));
    let Tp = (Te * sq) / (1 + sq);
    // Return-phase time constant from tenseness via spectral-tilt frequency Fa.
    const Fa = 350 + tenseness * 650; // Hz; relaxed -> dark, pressed -> bright
    let Ta = 1 / (2 * Math.PI * Fa);
    // Keep the phases within the period.
    Ta = Math.min(Ta, T0 * 0.45);
    Te = Math.min(Te, T0 - Ta - 1e-9);
    Tp = Math.min(Tp, Te * 0.95);
    const Tb = T0 - Te;

    // epsilon and alpha depend only weakly on f0; recompute them only when the
    // fundamental changes by more than 15% so we don't re-run the root solver on
    // every glottal cycle. Vibrato (~3%) and jitter (~1.5%) stay well under this,
    // so a typical note solves once; deliberate pitch shifts (bends, note changes)
    // re-solve a handful of times. The glottal *shape* stays tied to the base f0
    // within a note, which is inaudible and keeps render cost flat.
    if (this.cachedF0 === 0 || Math.abs(f0 - this.cachedF0) / this.cachedF0 > 0.15) {
      this.epsilon = this.solveEpsilon(Ta, Tb);
      this.alpha = this.solveAlpha(T0, Te, Tp, Ta, this.epsilon);
      this.cachedF0 = f0;
    }
    const wg = Math.PI / Tp;
    const sinWgTe = Math.max(0.1, Math.abs(Math.sin(wg * Te))) * Math.sign(Math.sin(wg * Te) || 1);
    const E0 = (-this.Ee * Math.exp(-this.alpha * Te)) / sinWgTe;
    this.T0 = T0;
    this.Te = Te;
    this.Tp = Tp;
    this.Ta = Ta;
    this.Tb = Tb;
    this.omegaG = wg;
    this.E0 = E0;
  }

  /** Generate the next glottal flow-derivative sample given the current
   *  parameters. Applies jitter (cycle F0 variation), shimmer (amplitude
   *  variation), and a DC blocker. */
  nextSample(params: GlottalSourceParams): number {
    const { f0, sampleRate, openQuotient, speedQuotient, tenseness, power, jitter = 0, shimmer = 0 } = params;

    if (this.jitterF0 === 0) {
      this.jitterF0 = f0 * (1 + jitter * (this.rng() * 2 - 1));
      this.recomputeCoefficients(this.jitterF0, openQuotient, speedQuotient, tenseness);
    }

    // Advance the normalized phase by the fraction of a period elapsed.
    this.phase += this.jitterF0 / sampleRate;
    if (this.phase >= 1) {
      this.phase -= 1;
      // New glottal period: re-apply jitter to the cycle length and, if the
      // fundamental has shifted enough, re-solve the LF coefficients.
      this.jitterF0 = f0 * (1 + jitter * (this.rng() * 2 - 1));
      this.shimmerAmp = 1 + shimmer * (this.rng() * 2 - 1);
      if (Math.abs(this.jitterF0 - this.cachedF0) / this.cachedF0 > 0.15) {
        this.recomputeCoefficients(this.jitterF0, openQuotient, speedQuotient, tenseness);
      }
    }

    // Seconds within the current period.
    const t = this.phase * this.T0;
    let pulse: number;
    if (t < this.Te) {
      pulse = this.E0 * Math.exp(this.alpha * t) * Math.sin(this.omegaG * t);
    } else {
      pulse = (-this.Ee / (this.epsilon * this.Ta)) * (Math.exp(-this.epsilon * (t - this.Te)) - Math.exp(-this.epsilon * this.Tb));
    }
    const rawSample = pulse * this.shimmerAmp * power;
    // DC blocker: y[n] = x[n] - x[n-1] + R*y[n-1]
    const centeredSample = rawSample - this.dcX + 0.99 * this.dcY;
    this.dcX = rawSample;
    this.dcY = centeredSample;
    return centeredSample;
  }

  /** Generate a fixed-length buffer of glottal pulses. Convenience wrapper
   *  around repeated `nextSample` calls. */
  generate(params: GlottalSourceParams, numSamples: number): Float32Array {
    const out = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) out[i] = this.nextSample(params);
    return out;
  }
}
