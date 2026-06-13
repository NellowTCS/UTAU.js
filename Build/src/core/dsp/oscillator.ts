import type { GlottalSourceParams } from "../types"

export class LFGlottalSource {
  private phase = 0
  private prevSample = 0
  private dcX = 0
  private dcY = 0

  reset(): void {
    this.phase = 0
    this.prevSample = 0
    this.dcX = 0
    this.dcY = 0
  }

  nextSample(params: GlottalSourceParams): number {
    const { f0, sampleRate, openQuotient, speedQuotient, tenseness, aspiration, power, jitter = 0 } = params
    const jitterF0 = f0 * (1 + jitter * (Math.random() * 2 - 1))
    const period = sampleRate / jitterF0
    const oq = Math.max(0.2, Math.min(0.9, openQuotient))
    const sq = Math.max(0.3, Math.min(3.0, speedQuotient))
    const te = oq * period
    const tp = te / (1 + sq)
    const tn = period * 0.02
    const tc = te + tn
    const epsilon = 1.0 / (tn * f0 * (1 - tenseness * 0.5 + 0.5))

    const t = this.phase
    let sample: number
    if (t < 0 || t >= period) {
      sample = 0
    } else if (t < tp) {
      sample = Math.sin((Math.PI / tp) * t)
    } else if (t < te) {
      const x = (t - tp) / (te - tp)
      sample = -Math.sin(Math.PI * (1 - x * x * 0.5))
    } else if (t < tc) {
      const x = (t - te) / tn
      sample = -Math.exp(-epsilon * x * period)
    } else {
      sample = 0
    }
    const tilt = 1 - tenseness * 0.3
    const breathyNoise = Math.random() * 2 - 1
    const rawSample = sample * tilt * power + breathyNoise * aspiration * 0.1
    const smoothed = rawSample * 0.8 + this.prevSample * 0.2
    this.prevSample = smoothed
    const centeredSample = smoothed - this.dcX + 0.995 * this.dcY
    this.dcX = smoothed
    this.dcY = centeredSample
    this.phase++
    if (this.phase >= period) this.phase -= period
    return centeredSample
  }

  generate(params: GlottalSourceParams, numSamples: number): Float32Array {
    const out = new Float32Array(numSamples)
    for (let i = 0; i < numSamples; i++) out[i] = this.nextSample(params)
    return out
  }
}
