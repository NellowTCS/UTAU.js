import type { GlottalSourceParams } from "../types";
import { mulberry32 } from "../rng";

const LF_MIN_TP_RATIO = 0.55;
const LF_MAX_TP_RATIO = 0.9;

const LF_ALPHA_SCAN_MIN = 1e-6;
const LF_ALPHA_SCAN_STEPS = 64;
const LF_ALPHA_BISECT_STEPS = 60;
const LF_ALPHA_BISECT_REL_TOL = 1e-12;

const SHAPE_EPSILON = 1e-6;
const SHAPE_F0_TOLERANCE = 0.01;

export class LFGlottalSource {
  private phase = 0;
  private dcX = 0;
  private dcY = 0;

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
  private jitterF0 = -1;
  private shimmerAmp = 1;
  private cachedShapeF0 = -1;
  private cachedOQ = -1;
  private cachedSQ = -1;
  private cachedTenseness = -1;
  private rng: () => number = Math.random;

  seed(seed: number | (() => number)): void {
    this.rng = typeof seed === "function" ? seed : mulberry32(seed);
  }

  reset(): void {
    this.phase = 0;
    this.dcX = 0;
    this.dcY = 0;
    this.jitterF0 = -1;
    this.cachedShapeF0 = -1;
  }

  private solveEpsilon(Ta: number, Tb: number): number {
    const g = (e: number) => e * Ta - 1 + Math.exp(-e * Tb);
    let lo = 1e-4;
    let hi = 1 / Math.max(1e-6, Ta);
    for (let i = 0; i < 60 && g(hi) <= 0; i++) hi *= 2;
    for (let i = 0; i < 60; i++) {
      const mid = 0.5 * (lo + hi);
      if (g(mid) > 0) hi = mid;
      else lo = mid;
    }
    return 0.5 * (lo + hi);
  }

  private solveAlpha(Te: number, Ta: number, Tb: number, wg: number, sinWgTe: number, eps: number): number {
    const Ar = (-this.Ee / (eps * eps * Ta)) * (1 - Math.exp(-eps * Tb) * (1 + eps * Tb));
    const Ao = (a: number): number => {
      const E0 = (-this.Ee * Math.exp(-a * Te)) / sinWgTe;
      const f1 = (E0 * Math.exp(a * Te)) / Math.sqrt(wg * wg + a * a);
      const f2 = Math.sin(wg * Te - Math.atan(wg / Math.max(1e-6, a)));
      return f1 * f2 + (E0 * wg) / (wg * wg + a * a);
    };
    const g = (a: number) => Ao(a) + Ar;

    const aMin = LF_ALPHA_SCAN_MIN;
    const aMax = 1 / Math.max(1e-9, Math.min(Ta, Te));
    let prevA = aMin;
    let prevG = g(prevA);
    for (let i = 1; i <= LF_ALPHA_SCAN_STEPS; i++) {
      const a = aMin * Math.pow(aMax / aMin, i / LF_ALPHA_SCAN_STEPS);
      const cur = g(a);
      if (Number.isFinite(prevG) && Number.isFinite(cur) && prevG <= 0 !== cur <= 0) {
        let lo = prevA;
        let hi = a;
        for (let k = 0; k < LF_ALPHA_BISECT_STEPS; k++) {
          const mid = 0.5 * (lo + hi);
          if (g(lo) <= 0 !== g(mid) <= 0) hi = mid;
          else lo = mid;
          if (hi - lo <= LF_ALPHA_BISECT_REL_TOL * lo) break;
        }
        return 0.5 * (lo + hi);
      }
      prevA = a;
      prevG = cur;
    }
    return 0;
  }

  private recomputeCoefficients(f0: number, shapeF0: number, openQuotient: number, speedQuotient: number, tenseness: number): void {
    const T0 = 1 / Math.max(1, f0);
    let Te = Math.max(0.05, openQuotient) * T0;
    const sq = Math.max(0.3, Math.min(3.0, speedQuotient));
    let Tp = (Te * sq) / (1 + sq);

    const Fa = 350 + tenseness * 650;
    const shapeT0 = 1 / Math.max(1, shapeF0);
    const Ta = Math.min(1 / (2 * Math.PI * Fa), shapeT0 * 0.45);

    Te = Math.min(Te, T0 - Ta - 1e-9);
    Tp = Math.max(Tp, Te * LF_MIN_TP_RATIO);
    Tp = Math.min(Tp, Te * LF_MAX_TP_RATIO);
    const Tb = T0 - Te;

    const wg = Math.PI / Tp;
    const sinWgTe = Math.sin(wg * Te);

    if (
      this.cachedShapeF0 < 0 ||
      Math.abs(openQuotient - this.cachedOQ) > SHAPE_EPSILON ||
      Math.abs(sq - this.cachedSQ) > SHAPE_EPSILON ||
      Math.abs(tenseness - this.cachedTenseness) > SHAPE_EPSILON ||
      Math.abs(shapeF0 - this.cachedShapeF0) / this.cachedShapeF0 > SHAPE_F0_TOLERANCE
    ) {
      const shapeTe = Math.min(Math.max(0.05, openQuotient) * shapeT0, shapeT0 - Ta - 1e-9);
      const shapeTp = Math.max(Math.min((shapeTe * sq) / (1 + sq), shapeTe * LF_MAX_TP_RATIO), shapeTe * LF_MIN_TP_RATIO);
      const shapeTb = shapeT0 - shapeTe;
      this.epsilon = this.solveEpsilon(Ta, shapeTb);
      this.alpha = this.solveAlpha(shapeTe, Ta, shapeTb, Math.PI / shapeTp, Math.sin((Math.PI / shapeTp) * shapeTe), this.epsilon);
      this.cachedShapeF0 = shapeF0;
      this.cachedOQ = openQuotient;
      this.cachedSQ = sq;
      this.cachedTenseness = tenseness;
    }

    const E0 = (-this.Ee * Math.exp(-this.alpha * Te)) / sinWgTe;
    this.T0 = T0;
    this.Te = Te;
    this.Tp = Tp;
    this.Ta = Ta;
    this.Tb = Tb;
    this.omegaG = wg;
    this.E0 = E0;
  }

  private jitteredF0(f0: number, jitter: number): number {
    if (jitter <= 0) return f0;
    return f0 * (1 + jitter * (this.rng() * 2 - 1));
  }

  nextSample(params: GlottalSourceParams): number {
    const { f0, sampleRate, openQuotient, speedQuotient, tenseness, power, jitter = 0, shimmer = 0 } = params;

    if (this.jitterF0 < 0) {
      this.jitterF0 = this.jitteredF0(f0, jitter);
      this.recomputeCoefficients(this.jitterF0, f0, openQuotient, speedQuotient, tenseness);
    }

    this.phase += this.jitterF0 / sampleRate;
    if (this.phase >= 1) {
      this.phase -= 1;
      this.jitterF0 = this.jitteredF0(f0, jitter);
      this.shimmerAmp = 1 + shimmer * (this.rng() * 2 - 1);
      this.recomputeCoefficients(this.jitterF0, f0, openQuotient, speedQuotient, tenseness);
    }

    const t = this.phase * this.T0;
    let pulse: number;
    if (t < this.Te) {
      pulse = this.E0 * Math.exp(this.alpha * t) * Math.sin(this.omegaG * t);
    } else {
      pulse = (-this.Ee / (this.epsilon * this.Ta)) * (Math.exp(-this.epsilon * (t - this.Te)) - Math.exp(-this.epsilon * this.Tb));
    }
    const rawSample = pulse * this.shimmerAmp * power;
    const centeredSample = rawSample - this.dcX + 0.99 * this.dcY;
    this.dcX = rawSample;
    this.dcY = centeredSample;
    return centeredSample;
  }

  generate(params: GlottalSourceParams, numSamples: number): Float32Array {
    const out = new Float32Array(numSamples);
    for (let i = 0; i < numSamples; i++) out[i] = this.nextSample(params);
    return out;
  }
}
