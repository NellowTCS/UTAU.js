import { ufDataToScore } from "../../src/import/ufdata"
import type { UfData } from "../../src/import/ufdata"

function makeData(overrides?: Partial<UfData["project"]>): UfData {
  return {
    formatVersion: 1,
    project: {
      name: "test",
      tracks: [
        {
          name: "Track 1",
          notes: [
            { key: 60, tickOn: 0, tickOff: 480, lyric: "a", phoneme: null },
            { key: 62, tickOn: 480, tickOff: 960, lyric: "i", phoneme: null },
            { key: 64, tickOn: 960, tickOff: 1440, lyric: "u", phoneme: null },
          ],
          pitch: null,
        },
      ],
      tempos: [{ tickPosition: 0, bpm: 120 }],
      measurePrefix: 0,
      ...overrides,
    },
  }
}

describe("ufDataToScore", () => {
  it("converts notes with tick/tickOff mapping", () => {
    const score = ufDataToScore(makeData())
    expect(score.notes).toHaveLength(3)
    expect(score.notes[0]).toEqual({ tick: 0, lyric: "a", noteNum: 60, length: 480 })
    expect(score.notes[1]).toEqual({ tick: 480, lyric: "i", noteNum: 62, length: 480 })
    expect(score.notes[2]).toEqual({ tick: 960, lyric: "u", noteNum: 64, length: 480 })
  })

  it("maps tempos correctly", () => {
    const score = ufDataToScore(makeData({
      tempos: [
        { tickPosition: 0, bpm: 80 },
        { tickPosition: 960, bpm: 160 },
      ],
    }))
    expect(score.tempos).toHaveLength(2)
    expect(score.tempos[0]).toEqual({ tick: 0, tempo: 80 })
    expect(score.tempos[1]).toEqual({ tick: 960, tempo: 160 })
  })

  it("falls back to tempo 120 when tempos array is empty", () => {
    const score = ufDataToScore(makeData({ tempos: [] }))
    expect(score.tempos).toHaveLength(1)
    expect(score.tempos[0]).toEqual({ tick: 0, tempo: 120 })
  })

  it("sets track name as voice", () => {
    const score = ufDataToScore(makeData())
    expect(score.voice).toBe("Track 1")
  })

  it("resolves a custom track index", () => {
    const data = makeData()
    data.project.tracks.push({
      name: "Track 2",
      notes: [{ key: 60, tickOn: 0, tickOff: 240, lyric: "x", phoneme: null }],
      pitch: null,
    })
    const score = ufDataToScore(data, { trackIndex: 1 })
    expect(score.voice).toBe("Track 2")
    expect(score.notes).toHaveLength(1)
  })

  it("throws when track index is out of range", () => {
    expect(() => ufDataToScore(makeData(), { trackIndex: 99 })).toThrow("Track 99 not found")
  })

  it("sets resolution to 480", () => {
    const score = ufDataToScore(makeData())
    expect(score.resolution).toBe(480)
  })

  describe("pitch bend splitting", () => {
    it("splits absolute pitch per note, padding to note length", () => {
      const data = makeData()
      data.project.tracks[0].pitch = {
        ticks: [0, 240, 480, 720, 960, 1200],
        values: [60, 60.5, 62, 61.5, 64, 64],
        isAbsolute: true,
      }
      const score = ufDataToScore(data)
      expect(score.notes[0].pitchBend).toBeDefined()
      expect(score.notes[0].pitchBend!.ticks).toEqual([0, 240, 480])
      expect(score.notes[0].pitchBend!.values).toEqual([0, 0.5, 2])
      expect(score.notes[1].pitchBend!.ticks).toEqual([0, 240, 480])
      expect(score.notes[1].pitchBend!.values).toEqual([0, -0.5, 2])
      expect(score.notes[2].pitchBend!.ticks).toEqual([0, 240, 480])
      expect(score.notes[2].pitchBend!.values).toEqual([0, 0, 0])
    })

    it("passes through relative pitch values unchanged", () => {
      const data = makeData()
      data.project.tracks[0].pitch = {
        ticks: [0, 240, 480],
        values: [0, 0.5, 1],
        isAbsolute: false,
      }
      const score = ufDataToScore(data)
      expect(score.notes[0].pitchBend!.values).toEqual([0, 0.5, 1])
    })

    it("extrapolates start value from preceding pitch point", () => {
      const data = makeData()
      data.project.tracks[0].pitch = {
        ticks: [-120, 120],
        values: [62, 61],
        isAbsolute: true,
      }
      const score = ufDataToScore(data)
      expect(score.notes[0].pitchBend).toBeDefined()
      expect(score.notes[0].pitchBend!.ticks[0]).toBe(0)
      expect(score.notes[0].pitchBend!.values[0]).toBe(2)
    })

    it("filters out null pitch values from the curve", () => {
      const data = makeData()
      data.project.tracks[0].pitch = {
        ticks: [0, 240, 480],
        values: [null, 60.5, null],
        isAbsolute: true,
      }
      const score = ufDataToScore(data)
      expect(score.notes[0].pitchBend).toBeDefined()
      expect(score.notes[0].pitchBend!.values).toEqual([0, 0.5, 0.5])
    })

    it("skips notes with no pitch points in range", () => {
      const data = makeData()
      data.project.tracks[0].pitch = {
        ticks: [2000, 2400],
        values: [62, 63],
        isAbsolute: true,
      }
      const score = ufDataToScore(data)
      for (const n of score.notes) {
        expect(n.pitchBend).toBeUndefined()
      }
    })

    it("does not set pitchBend when pitch data is null", () => {
      const data = makeData()
      const score = ufDataToScore(data)
      for (const n of score.notes) {
        expect(n.pitchBend).toBeUndefined()
      }
    })

    it("does not set pitchBend when pitch option is false", () => {
      const data = makeData()
      data.project.tracks[0].pitch = {
        ticks: [0, 240, 480],
        values: [60, 60.5, 62],
        isAbsolute: true,
      }
      const score = ufDataToScore(data, { pitch: false })
      for (const n of score.notes) {
        expect(n.pitchBend).toBeUndefined()
      }
    })
  })
})
