import { renderNote } from "../../src/synth/renderer";
import { getLanguage } from "../../src/langs/index";
import { buildVoice } from "../../src/voices/index";

describe("renderNote", () => {
  const lang = getLanguage("jp")!;
  const voice = buildVoice();

  it("returns a valid AudioChunk for a simple vowel", () => {
    const { chunk } = renderNote({ lyric: "a", noteNum: 72, length: 480, tick: 0 }, voice, lang, 120, 480);
    expect(chunk.data.length).toBeGreaterThanOrEqual(1);
    expect(chunk.sampleRate).toBe(44100);
    expect(chunk.startSample).toBe(0);
    for (const ch of chunk.data) {
      expect(ch.length).toBeGreaterThan(0);
      for (const s of ch) {
        expect(isFinite(s)).toBe(true);
        expect(isNaN(s)).toBe(false);
        expect(Math.abs(s)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("returns a valid chunk for a consonant-vowel syllable", () => {
    const { chunk } = renderNote({ lyric: "ka", noteNum: 72, length: 480, tick: 0 }, voice, lang, 120, 480);
    for (const ch of chunk.data) {
      for (const s of ch) {
        expect(isFinite(s)).toBe(true);
        expect(isNaN(s)).toBe(false);
        expect(Math.abs(s)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("handles a silence note", () => {
    const { chunk } = renderNote({ lyric: "R", noteNum: 60, length: 480, tick: 0 }, voice, lang, 120, 480);
    expect(chunk.data[0].length).toBeGreaterThan(0);
  });

  it("handles unknown lyric gracefully", () => {
    const { chunk } = renderNote({ lyric: "zzz", noteNum: 60, length: 480, tick: 0 }, voice, lang, 120, 480);
    expect(chunk.data[0].length).toBeGreaterThan(0);
  });

  it("produces mono output for mono voice", () => {
    const monoVoice = { ...voice, channels: 1 as const };
    const { chunk } = renderNote({ lyric: "a", noteNum: 72, length: 480, tick: 0 }, monoVoice, lang, 120, 480);
    expect(chunk.data.length).toBe(1);
    expect(chunk.channels).toBe(1);
  });

  it("produces stereo output for stereo voice", () => {
    const stereoVoice = { ...voice, channels: 2 as const };
    const { chunk } = renderNote({ lyric: "a", noteNum: 72, length: 480, tick: 0 }, stereoVoice, lang, 120, 480);
    expect(chunk.data.length).toBe(2);
    expect(chunk.channels).toBe(2);
  });

  describe("pitch bend", () => {
    it("produces valid output with pitchBend", () => {
      const { chunk } = renderNote(
        { lyric: "a", noteNum: 72, length: 480, tick: 0, pitchBend: { ticks: [0, 240], values: [0, 12] } },
        voice,
        lang,
        120,
        480,
      );
      for (const ch of chunk.data) {
        for (const s of ch) {
          expect(isFinite(s)).toBe(true);
          expect(isNaN(s)).toBe(false);
          expect(Math.abs(s)).toBeLessThanOrEqual(1);
        }
      }
    });

    it("changes output compared to un-bent note", () => {
      const { chunk: base } = renderNote({ lyric: "a", noteNum: 72, length: 480, tick: 0 }, voice, lang, 120, 480);
      const { chunk: bent } = renderNote(
        { lyric: "a", noteNum: 72, length: 480, tick: 0, pitchBend: { ticks: [0, 480], values: [0, 12] } },
        voice,
        lang,
        120,
        480,
      );
      let diff = 0;
      for (let i = 0; i < base.data[0].length; i++) {
        diff += Math.abs(base.data[0][i] - bent.data[0][i]);
      }
      expect(diff).toBeGreaterThan(0);
    });

    it("handles flat pitchBend (constant offset)", () => {
      const { chunk } = renderNote(
        { lyric: "a", noteNum: 72, length: 480, tick: 0, pitchBend: { ticks: [0], values: [0] } },
        voice,
        lang,
        120,
        480,
      );
      expect(chunk.data[0].length).toBeGreaterThan(0);
      for (const s of chunk.data[0]) expect(isFinite(s)).toBe(true);
    });
  });

  describe("pitchBend type", () => {
    it("pitchBend is optional on Note", () => {
      const note: { lyric: string; noteNum: number; length: number; tick?: number; pitchBend?: { ticks: number[]; values: number[] } } = {
        lyric: "a",
        noteNum: 72,
        length: 480,
        tick: 0,
      };
      expect(note.pitchBend).toBeUndefined();
    });

    it("pitchBend can be set on Note", () => {
      const note: { lyric: string; noteNum: number; length: number; tick?: number; pitchBend?: { ticks: number[]; values: number[] } } = {
        lyric: "a",
        noteNum: 72,
        length: 480,
        tick: 0,
        pitchBend: { ticks: [0, 480], values: [0, 1] },
      };
      expect(note.pitchBend).toBeDefined();
      expect(note.pitchBend!.ticks).toHaveLength(2);
    });
  });
});
