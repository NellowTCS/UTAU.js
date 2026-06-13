import type { FormantTarget } from "../types"

export class FormantFilter {
  private a1 = 0; private a2 = 0
  private b0 = 1; private b1 = 0; private b2 = 0
  private y1 = 0; private y2 = 0
  private x1 = 0; private x2 = 0

  setResonator(freq: number, bw: number, sampleRate: number): void {
    const theta = (2 * Math.PI * freq) / sampleRate
    const r = Math.exp(-Math.PI * bw / sampleRate)
    const B = 2 * r * Math.cos(theta)
    const C = -(r * r)
    this.b0 = 1 - B - C
    this.b1 = 0; this.b2 = 0
    this.a1 = -B; this.a2 = -C
  }

  setAntiResonator(freq: number, bw: number, sampleRate: number): void {
    const theta = (2 * Math.PI * freq) / sampleRate
    const rz = Math.exp(-Math.PI * bw / sampleRate)
    this.b0 = 1; this.b1 = -2 * rz * Math.cos(theta); this.b2 = rz * rz
    this.a1 = -2 * 0.99 * Math.cos(theta * 0.95); this.a2 = 0.99 * 0.99
  }

  setPassthrough(): void {
    this.b0 = 1; this.b1 = 0; this.b2 = 0
    this.a1 = 0; this.a2 = 0
  }

  processSample(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2
      - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1; this.x1 = x
    this.y2 = this.y1; this.y1 = y
    return y
  }

  reset(): void { this.y1 = 0; this.y2 = 0; this.x1 = 0; this.x2 = 0 }
}

export class FormantCascade {
  private resonators: FormantFilter[]
  private antiResonators: FormantFilter[]

  constructor(numFormants = 5) {
    this.resonators = Array.from({ length: numFormants }, () => new FormantFilter())
    this.antiResonators = Array.from({ length: numFormants }, () => new FormantFilter())
  }

  setFormants(targets: FormantTarget[], sampleRate: number, antiformants?: FormantTarget[]): void {
    for (let i = 0; i < this.resonators.length; i++) {
      if (i < targets.length) {
        this.resonators[i].setResonator(targets[i].f, targets[i].bw, sampleRate)
      } else {
        this.resonators[i].setResonator(5000, sampleRate * 0.5, sampleRate)
      }
    }
    for (let i = 0; i < this.antiResonators.length; i++) {
      if (antiformants && i < antiformants.length) {
        this.antiResonators[i].setAntiResonator(antiformants[i].f, antiformants[i].bw, sampleRate)
      } else {
        this.antiResonators[i].setPassthrough()
      }
    }
  }

  processSample(x: number): number {
    for (const ar of this.antiResonators) x = ar.processSample(x)
    for (const res of this.resonators) x = res.processSample(x)
    return x
  }

  reset(): void {
    for (const res of this.resonators) res.reset()
    for (const ar of this.antiResonators) ar.reset()
  }
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
