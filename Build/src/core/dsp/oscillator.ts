import type { GlottalSourceParams } from "../types";

/** Liljencrants-Fant (LF) glottal pulse source with jitter, shimmer,
 *  aspiration noise, and DC blocking. Stateful as it creates one instance per
 *  voice to maintain phase continuity across a phrase.
 *
 *  The LF model parameterises the glottal flow derivative as a piecewise
 *  function: sinusoidal opening, exponential+sinusoidal return phase, and
 *  optional closed phase.  See Fant (1986), Liljencrants (1985). */
export class LFGlottalSource {
  private phase = 0;
  private dcX = 0;
  private dcY = 0;
  private jitterF0 = 0;
  private jitterPeriod = 0;
  private noiseLP = 0;
  private shimmerAmp = 1;

  /** Reset all internal state (phase, DC blocker, jitter LFO). Call when
   *  starting a new phrase to avoid discontinuity clicks. */
  reset(): void {
    this.phase = 0;
    this.dcX = 0;
    this.dcY = 0;
    this.jitterF0 = 0;
    this.jitterPeriod = 0;
    this.noiseLP = 0;
    this.shimmerAmp = 1;
  }

  /** Generate the next glottal pulse sample given the current parameters.
   *  Applies jitter (cycle-to-cycle F0 variation), shimmer (amplitude
   *  variation), aspiration noise (low-passed), and DC blocking. */
  nextSample(params: GlottalSourceParams): number {
    const { f0, sampleRate, openQuotient, speedQuotient, tenseness, aspiration, power, jitter = 0 } = params;
    if (this.phase === 0 || this.phase >= this.jitterPeriod) {
      this.jitterF0 = f0 * (1 + jitter * (Math.random() * 2 - 1));
      this.jitterPeriod = sampleRate / Math.max(1, this.jitterF0);
      this.shimmerAmp = 1 + jitter * 2 * (Math.random() * 2 - 1);
    }
    const period = this.jitterPeriod;
    const oq = Math.max(0.2, Math.min(0.9, openQuotient));
    const sq = Math.max(0.3, Math.min(3.0, speedQuotient));
    const te = oq * period;
    const tp = te / (1 + sq);
    const tn = period * 0.02;
    const tc = te + tn;
    const epsilon = 1.0 / (tn * f0 * (1 - tenseness * 0.5 + 0.5));

    const t = this.phase;
    let sample: number;
    if (t < 0 || t >= period) {
      sample = 0;
    } else if (t < tp) {
      sample = Math.sin((Math.PI / tp) * t);
    } else if (t < te) {
      const x = (t - tp) / (te - tp);
      sample = -Math.sin(Math.PI * (1 - x * x * 0.5));
    } else if (t < tc) {
      const x = (t - te) / tn;
      // Real LF return phase: exponential decay modulated by sin(π·t/tn).
      // The sin term makes the slope match the open phase at t=te (C¹
      // continuity) and reach 0 at t=tc, killing the click at every pulse
      // boundary. Without it, the exponential alone starts at -1 with
      // non-zero slope -> audible click on every glottal closure.
      sample = -Math.exp(-epsilon * x * period) * Math.sin(Math.PI * x);
    } else {
      sample = 0;
    }
    const tilt = 1 - tenseness * 0.3;
    const rawNoise = Math.random() * 2 - 1;
    this.noiseLP = this.noiseLP * 0.6 + rawNoise * 0.4;
    const breathyNoise = rawNoise - this.noiseLP;
    // DC blocker: y[n] = x[n] - x[n-1] + R·y[n-1]
    // The DC blocker below handles drift; an additional 0.8/0.2 smoother on
    // prevSample would just low-pass the glottal pulse and phase-distort it.
    const rawSample = (sample * tilt * power + breathyNoise * aspiration * 0.15) * this.shimmerAmp;
    const centeredSample = rawSample - this.dcX + 0.99 * this.dcY;
    this.dcX = rawSample;
    this.dcY = centeredSample;
    this.phase++;
    if (this.phase >= period) this.phase -= period;
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
