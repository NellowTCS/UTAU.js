import type { FormantTarget } from "../types"
import { FormantFilter } from "./filter"

export class NoiseSource {
  generate(numSamples: number): Float32Array {
    const out = new Float32Array(numSamples)
    for (let i = 0; i < numSamples; i++) out[i] = Math.random() * 2 - 1
    return out
  }
}

export function shapeNoiseWithFormants(
  noise: Float32Array, formants: FormantTarget[], sampleRate: number,
): Float32Array {
  let shaped = noise
  for (const f of formants) {
    const filter = new FormantFilter()
    filter.setResonator(f.f, f.bw, sampleRate)
    shaped = filter.process(shaped)
  }
  return shaped
}
