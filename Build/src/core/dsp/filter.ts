import type { FormantTarget } from "../types"

export class FormantFilter {
  private a1 = 0; private a2 = 0
  private b0 = 1; private b1 = 0; private b2 = 0
  private y1 = 0; private y2 = 0
  private x1 = 0; private x2 = 0

  setResonator(freq: number, bw: number, sampleRate: number): void {
    const theta = (2 * Math.PI * freq) / sampleRate
    const r = Math.exp(-Math.PI * bw / sampleRate)
    this.b0 = 1 - r * r; this.b1 = 0; this.b2 = 0
    this.a1 = -2 * r * Math.cos(theta); this.a2 = r * r
  }

  setAntiResonator(freq: number, bw: number, sampleRate: number): void {
    const theta = (2 * Math.PI * freq) / sampleRate
    const rz = Math.exp(-Math.PI * bw / sampleRate)
    this.b0 = 1; this.b1 = -2 * rz * Math.cos(theta); this.b2 = rz * rz
    this.a1 = -2 * 0.99 * Math.cos(theta * 0.95); this.a2 = 0.99 * 0.99
  }

  process(input: Float32Array): Float32Array {
    const out = new Float32Array(input.length)
    for (let i = 0; i < input.length; i++) {
      const x = input[i]
      const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2
        - this.a1 * this.y1 - this.a2 * this.y2
      this.x2 = this.x1; this.x1 = x
      this.y2 = this.y1; this.y1 = y
      out[i] = y
    }
    return out
  }

  processInPlace(input: Float32Array): void {
    for (let i = 0; i < input.length; i++) {
      const x = input[i]
      const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2
        - this.a1 * this.y1 - this.a2 * this.y2
      this.x2 = this.x1; this.x1 = x
      this.y2 = this.y1; this.y1 = y
      input[i] = y
    }
  }

  reset(): void { this.y1 = 0; this.y2 = 0; this.x1 = 0; this.x2 = 0 }
}

export class FormantCascade {
  private resonators: FormantFilter[]

  constructor(numFormants = 5) {
    this.resonators = Array.from({ length: numFormants }, () => new FormantFilter())
  }

  setFormants(targets: FormantTarget[], sampleRate: number): void {
    for (let i = 0; i < this.resonators.length; i++) {
      if (i < targets.length) {
        this.resonators[i].setResonator(targets[i].f, targets[i].bw, sampleRate)
      } else {
        this.resonators[i].setResonator(5000 + i * 1000, 200, sampleRate)
      }
    }
  }

  processInPlace(input: Float32Array): void {
    for (const res of this.resonators) res.processInPlace(input)
  }

  reset(): void { for (const res of this.resonators) res.reset() }
}

export function interpolateFormants(
  a: FormantTarget[], b: FormantTarget[], t: number, count = 5,
): FormantTarget[] {
  const result: FormantTarget[] = []
  for (let i = 0; i < count; i++) {
    const fa = a[i] ?? { f: 5000, bw: 200 }
    const fb = b[i] ?? { f: 5000, bw: 200 }
    const st = t * t * (3 - 2 * t)
    result.push({ f: fa.f + (fb.f - fa.f) * st, bw: fa.bw + (fb.bw - fa.bw) * st })
  }
  return result
}
