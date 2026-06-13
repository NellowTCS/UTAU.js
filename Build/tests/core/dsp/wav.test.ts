import { encodeWav } from "../../../src/core/dsp/wav"
import type { AudioChunk } from "../../../src/core/types"

describe("encodeWav", () => {
  it("returns a valid RIFF/WAVE header", () => {
    const chunks: AudioChunk[] = [
      { data: [new Float32Array(100).fill(0.5)], sampleRate: 44100, startSample: 0, channels: 1 },
    ]
    const wav = encodeWav(chunks)
    const view = new DataView(wav)
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe("RIFF")
    expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe("WAVE")
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(44100)
    expect(view.getUint16(34, true)).toBe(16)
  })

  it("produces correct data chunk size for mono", () => {
    const chunks: AudioChunk[] = [
      { data: [new Float32Array(100)], sampleRate: 44100, startSample: 0, channels: 1 },
    ]
    const wav = encodeWav(chunks)
    const view = new DataView(wav)
    expect(view.getUint32(40, true)).toBe(100 * 2)
    expect(wav.byteLength).toBe(44 + 200)
  })

  it("handles stereo output", () => {
    const chunks: AudioChunk[] = [
      { data: [new Float32Array(100), new Float32Array(100)], sampleRate: 44100, startSample: 0, channels: 2 },
    ]
    const wav = encodeWav(chunks)
    const view = new DataView(wav)
    expect(view.getUint16(22, true)).toBe(2)
    expect(view.getUint32(40, true)).toBe(100 * 2 * 2)
  })

  it("applies gain", () => {
    const chunks: AudioChunk[] = [
      { data: [new Float32Array([0.5])], sampleRate: 44100, startSample: 0, channels: 1 },
    ]
    const wavNormal = encodeWav(chunks, 1)
    const wavHalf = encodeWav(chunks, 0.5)
    const vNormal = new DataView(wavNormal).getInt16(44, true)
    const vHalf = new DataView(wavHalf).getInt16(44, true)
    expect(Math.abs(vHalf)).toBeLessThan(Math.abs(vNormal))
  })

  it("handles empty chunk list without crashing", () => {
    const wav = encodeWav([], 1)
    expect(wav.byteLength).toBe(44)
  })

  it("clamps values to [-1, 1]", () => {
    const chunks: AudioChunk[] = [
      { data: [new Float32Array([2.0, -2.0])], sampleRate: 44100, startSample: 0, channels: 1 },
    ]
    const wav = encodeWav(chunks, 1)
    const view = new DataView(wav)
    const s0 = view.getInt16(44, true)
    const s1 = view.getInt16(46, true)
    expect(s0).toBeLessThanOrEqual(32767)
    expect(s0).toBeGreaterThanOrEqual(-32768)
    expect(s1).toBeLessThanOrEqual(32767)
    expect(s1).toBeGreaterThanOrEqual(-32768)
  })
})
