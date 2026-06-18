import type { FormantTarget } from "../types";

/** Second-order IIR biquad filter configurable as a resonator (pole pair)
 *  or anti-resonator (zero pair). Direct Form I implementation for numeric
 *  stability. */
export class FormantFilter {
  private a1 = 0;
  private a2 = 0;
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private y1 = 0;
  private y2 = 0;
  private x1 = 0;
  private x2 = 0;

  /** Configure as a resonator (formant) at `freq` Hz with bandwidth `bw` Hz.
   *  Coefficients computed via standard bilinear-transform pole placement. */
  setResonator(freq: number, bw: number, sampleRate: number): void {
    const theta = (2 * Math.PI * freq) / sampleRate;
    const r = Math.exp((-Math.PI * bw) / sampleRate);
    const B = 2 * r * Math.cos(theta);
    const C = -(r * r);
    this.b0 = 1 - B - C;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = -B;
    this.a2 = -C;
  }

  /** Configure as an anti-resonator (spectral zero / anti-formant) at `freq`
   *  Hz with bandwidth `bw` Hz. Used for nasal antiformants. */
  setAntiResonator(freq: number, bw: number, sampleRate: number): void {
    const theta = (2 * Math.PI * freq) / sampleRate;
    const rz = Math.exp((-Math.PI * bw) / sampleRate);
    this.b0 = 1;
    this.b1 = -2 * rz * Math.cos(theta);
    this.b2 = rz * rz;
    const rp = Math.exp((-Math.PI * bw * 1.5) / sampleRate);
    this.a1 = -2 * rp * Math.cos(theta);
    this.a2 = rp * rp;
  }

  /** Bypass the filter: output equals input with no frequency shaping. */
  setPassthrough(): void {
    this.b0 = 1;
    this.b1 = 0;
    this.b2 = 0;
    this.a1 = 0;
    this.a2 = 0;
  }

  /** Process one sample through the biquad filter (Direct Form I). */
  processSample(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }

  /** Process an entire buffer through the filter. Allocates a new
   *  Float32Array for the output. */
  process(input: Float32Array): Float32Array {
    const out = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) out[i] = this.processSample(input[i]);
    return out;
  }

  /** Reset internal filter state (previous input/output samples). Call at
   *  phoneme boundaries to avoid cross-phoneme filter-memory artefacts. */
  reset(): void {
    this.y1 = 0;
    this.y2 = 0;
    this.x1 = 0;
    this.x2 = 0;
  }
}

/** Cascade of anti-resonators followed by resonators, modelling the
 *  vocal-tract transfer function. Anti-resonators (zeros) come first,
 *  followed by resonators (poles), matching the source-filter model:
 *  S(f) = G(f) * Z(f) / P(f). */
export class FormantCascade {
  private resonators: FormantFilter[];
  private antiResonators: FormantFilter[];

  /** Create a cascade with `numFormants` resonator/anti-resonator pairs.
   *  5 pairs is sufficient for most vowel spectra. */
  constructor(numFormants = 5) {
    this.resonators = Array.from({ length: numFormants }, () => new FormantFilter());
    this.antiResonators = Array.from({ length: numFormants }, () => new FormantFilter());
  }

  /** Set formant/antiformant coefficients for all resonator pairs.
   *  Unused resonators default to a flat high-frequency shelf. */
  setFormants(targets: FormantTarget[], sampleRate: number, antiformants?: FormantTarget[]): void {
    for (let i = 0; i < this.resonators.length; i++) {
      if (i < targets.length) {
        this.resonators[i].setResonator(targets[i].f, targets[i].bw, sampleRate);
      } else {
        this.resonators[i].setResonator(5000, sampleRate * 0.5, sampleRate);
      }
    }
    for (let i = 0; i < this.antiResonators.length; i++) {
      if (antiformants && i < antiformants.length) {
        this.antiResonators[i].setAntiResonator(antiformants[i].f, antiformants[i].bw, sampleRate);
      } else {
        this.antiResonators[i].setPassthrough();
      }
    }
  }

  /** Process one sample through the full cascade (anti-resonators then
   *  resonators). */
  processSample(x: number): number {
    for (const ar of this.antiResonators) x = ar.processSample(x);
    for (const res of this.resonators) x = res.processSample(x);
    return x;
  }

  /** Reset all filters in the cascade. Call at phoneme boundaries to avoid
   *  cross-phoneme artefacts. */
  reset(): void {
    for (const res of this.resonators) res.reset();
    for (const ar of this.antiResonators) ar.reset();
  }
}

/** Smooth (smoothstep) interpolation between two formant target arrays.
 *  Used for phoneme transitions and diphthong glides. */
export function interpolateFormants(a: FormantTarget[], b: FormantTarget[], t: number, count = 5): FormantTarget[] {
  const result: FormantTarget[] = [];
  for (let i = 0; i < count; i++) {
    const fa = a[i] ?? { f: 5000, bw: 200 };
    const fb = b[i] ?? { f: 5000, bw: 200 };
    const st = t * t * (3 - 2 * t);
    result.push({ f: fa.f + (fb.f - fa.f) * st, bw: fa.bw + (fb.bw - fa.bw) * st });
  }
  return result;
}
