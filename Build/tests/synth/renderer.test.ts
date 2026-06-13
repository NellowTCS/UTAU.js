import { renderNote } from "../../src/synth/renderer"
import { getLanguage } from "../../src/langs/index"
import { buildVoice } from "../../src/voices/index"

describe("renderNote", () => {
  const lang = getLanguage("jp")!
  const voice = buildVoice()

  it("returns a valid AudioChunk for a simple vowel", () => {
    const chunk = renderNote(
      { lyric: "a", noteNum: 72, length: 480, tick: 0 },
      voice, lang, 120, 480,
    )
    expect(chunk.data.length).toBeGreaterThanOrEqual(1)
    expect(chunk.sampleRate).toBe(44100)
    expect(chunk.startSample).toBe(0)
    for (const ch of chunk.data) {
      expect(ch.length).toBeGreaterThan(0)
      for (const s of ch) {
        expect(isFinite(s)).toBe(true)
        expect(isNaN(s)).toBe(false)
        expect(Math.abs(s)).toBeLessThanOrEqual(1)
      }
    }
  })

  it("returns a valid chunk for a consonant-vowel syllable", () => {
    const chunk = renderNote(
      { lyric: "ka", noteNum: 72, length: 480, tick: 0 },
      voice, lang, 120, 480,
    )
    for (const ch of chunk.data) {
      for (const s of ch) {
        expect(isFinite(s)).toBe(true)
        expect(isNaN(s)).toBe(false)
        expect(Math.abs(s)).toBeLessThanOrEqual(1)
      }
    }
  })

  it("handles a silence note", () => {
    const chunk = renderNote(
      { lyric: "R", noteNum: 60, length: 480, tick: 0 },
      voice, lang, 120, 480,
    )
    expect(chunk.data[0].length).toBeGreaterThan(0)
  })

  it("handles unknown lyric gracefully", () => {
    const chunk = renderNote(
      { lyric: "zzz", noteNum: 60, length: 480, tick: 0 },
      voice, lang, 120, 480,
    )
    expect(chunk.data[0].length).toBeGreaterThan(0)
  })

  it("produces mono output for mono voice", () => {
    const monoVoice = { ...voice, channels: 1 as const }
    const chunk = renderNote(
      { lyric: "a", noteNum: 72, length: 480, tick: 0 },
      monoVoice, lang, 120, 480,
    )
    expect(chunk.data.length).toBe(1)
    expect(chunk.channels).toBe(1)
  })

  it("produces stereo output for stereo voice", () => {
    const stereoVoice = { ...voice, channels: 2 as const }
    const chunk = renderNote(
      { lyric: "a", noteNum: 72, length: 480, tick: 0 },
      stereoVoice, lang, 120, 480,
    )
    expect(chunk.data.length).toBe(2)
    expect(chunk.channels).toBe(2)
  })
})
