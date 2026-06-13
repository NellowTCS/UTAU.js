export function applyAmplitudeEnvelope(
  buffer: Float32Array, attackSamples: number, releaseSamples: number,
): void {
  const len = buffer.length
  for (let i = 0; i < attackSamples && i < len; i++) {
    const t = i / attackSamples; buffer[i] *= t * t * (3 - 2 * t)
  }
  for (let i = Math.max(0, len - releaseSamples); i < len; i++) {
    const t = (len - i) / releaseSamples; buffer[i] *= t * t * (3 - 2 * t)
  }
}

export function mixBuffers(
  target: Float32Array, source: Float32Array, targetOffset: number, gain = 1,
): void {
  for (let i = 0; i < source.length; i++) {
    const idx = targetOffset + i
    if (idx >= target.length) break
    target[idx] += source[i] * gain
  }
}
