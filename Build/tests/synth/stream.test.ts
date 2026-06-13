import { streamScore, renderScore, mixChunks } from "../../src/synth/stream"
import type { Score } from "../../src/core/types"
import { buildVoice } from "../../src/voices/index"

describe("mixChunks", () => {
  it("mixes multiple chunks into one", () => {
    const chunks = [
      { data: [new Float32Array(100)], sampleRate: 44100, startSample: 0, channels: 1 },
      { data: [new Float32Array(100)], sampleRate: 44100, startSample: 100, channels: 1 },
    ]
    const mixed = mixChunks(chunks)
    expect(mixed.data.length).toBe(1)
    expect(mixed.data[0].length).toBe(200)
    expect(mixed.sampleRate).toBe(44100)
  })

  it("returns empty chunk for empty input", () => {
    const mixed = mixChunks([])
    expect(mixed.data[0].length).toBe(0)
  })

  it("handles overlapping chunks", () => {
    const chunks = [
      { data: [new Float32Array(100).fill(0.5)], sampleRate: 44100, startSample: 0, channels: 1 },
      { data: [new Float32Array(100).fill(0.3)], sampleRate: 44100, startSample: 50, channels: 1 },
    ]
    const mixed = mixChunks(chunks)
    expect(mixed.data[0][0]).toBeCloseTo(0.5, 5)
    expect(mixed.data[0][50]).toBeCloseTo(0.8, 5)
    expect(mixed.data[0][99]).toBeCloseTo(0.8, 5)
    expect(mixed.data[0][149]).toBeCloseTo(0.3, 5)
  })
})

describe("renderScore", () => {
  const voice = buildVoice()

  it("renders a simple score without error", async () => {
    const score: Score = {
      tempos: [{ tick: 0, tempo: 120 }],
      resolution: 480,
      notes: [
        { tick: 0, lyric: "ka", noteNum: 72, length: 480 },
      ],
    }
    const chunks = await renderScore(score, voice, "jp")
    expect(chunks.length).toBeGreaterThan(0)
    for (const chunk of chunks) {
      for (const ch of chunk.data) {
        for (const s of ch) {
          expect(isFinite(s)).toBe(true)
          expect(isNaN(s)).toBe(false)
        }
      }
    }
  })

  it("renders multiple notes respecting ticks", async () => {
    const score: Score = {
      tempos: [{ tick: 0, tempo: 120 }],
      resolution: 480,
      notes: [
        { tick: 0, lyric: "ka", noteNum: 72, length: 480 },
        { tick: 480, lyric: "na", noteNum: 76, length: 480 },
      ],
    }
    const chunks = await renderScore(score, voice, "jp")
    expect(chunks.length).toBe(2)
    expect(chunks[1].startSample).toBeGreaterThan(chunks[0].startSample + chunks[0].data[0].length - 1)
  })

  it("handles voice lookup by name", async () => {
    const score: Score = {
      tempos: [{ tick: 0, tempo: 120 }],
      resolution: 480,
      notes: [{ tick: 0, lyric: "a", noteNum: 72, length: 480 }],
    }
    const chunks = await renderScore(score, "female", "jp")
    expect(chunks.length).toBe(1)
  })
})

describe("streamScore", () => {
  it("yields chunks as an async generator", async () => {
    const score: Score = {
      tempos: [{ tick: 0, tempo: 120 }],
      resolution: 480,
      notes: [{ tick: 0, lyric: "a", noteNum: 72, length: 480 }],
    }
    const voice = buildVoice()
    const chunks: any[] = []
    for await (const chunk of streamScore(score, voice, "jp")) {
      chunks.push(chunk)
    }
    expect(chunks.length).toBe(1)
  })
})
