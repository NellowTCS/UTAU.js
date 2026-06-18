import { renderNote } from "../../src/synth/renderer";
import { getLanguage } from "../../src/langs/index";
import { buildVoice } from "../../src/voices/index";
import type { Note } from "../../src/core/types";

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

  describe("pitchAccent", () => {
    it("is optional on Note", () => {
      const note: Note = { lyric: "a", noteNum: 72, length: 480 };
      expect(note.pitchAccent).toBeUndefined();
    });

    it("produces valid output when set", () => {
      const { chunk } = renderNote({ lyric: "a", noteNum: 72, length: 480, tick: 0, pitchAccent: 1 }, voice, lang, 120, 480);
      for (const ch of chunk.data) {
        for (const s of ch) {
          expect(isFinite(s)).toBe(true);
          expect(isNaN(s)).toBe(false);
          expect(Math.abs(s)).toBeLessThanOrEqual(1);
        }
      }
    });

    it("changes output compared to un-accented note", () => {
      const { chunk: base } = renderNote({ lyric: "a", noteNum: 72, length: 480, tick: 0 }, voice, lang, 120, 480);
      const { chunk: accented } = renderNote({ lyric: "a", noteNum: 72, length: 480, tick: 0, pitchAccent: 2 }, voice, lang, 120, 480);
      let diff = 0;
      for (let i = 0; i < base.data[0].length; i++) {
        diff += Math.abs(base.data[0][i] - accented.data[0][i]);
      }
      expect(diff).toBeGreaterThan(0);
    });
  });

  describe("signal quality", () => {
    // Crude noise-content estimator
    function hfProxyRatio(samples: Float32Array): number {
      let sumSq = 0;
      let sumSqDiff = 0;
      let prev = 0;
      for (let i = 0; i < samples.length; i++) {
        sumSq += samples[i] * samples[i];
        const d = samples[i] - prev;
        sumSqDiff += d * d;
        prev = samples[i];
      }
      const rms = Math.sqrt(sumSq / samples.length);
      const rmsDiff = Math.sqrt(sumSqDiff / samples.length);
      return rmsDiff / Math.max(rms, 1e-9);
    }

    it("long note stays in sample range and is finite throughout", () => {
      // Baseline invariant, a long note should not crash, NaN, or clip.
      const note: Note = { lyric: "a", noteNum: 60, length: 480 * 8, tick: 0 };
      const { chunk } = renderNote(note, voice, lang, 120, 480);
      for (const ch of chunk.data) {
        for (const s of ch) {
          expect(isFinite(s)).toBe(true);
          expect(isNaN(s)).toBe(false);
          expect(Math.abs(s)).toBeLessThanOrEqual(1);
        }
      }
    });

    it("long note is not dominated by white noise", () => {
      // Sanity check: a non-noisy signal has correlated adjacent samples.
      const note: Note = { lyric: "a", noteNum: 60, length: 480 * 8, tick: 0 };
      const { chunk } = renderNote(note, voice, lang, 120, 480);
      // Skip the first 20% (attack transient).
      const startIdx = Math.floor(chunk.data[0].length * 0.2);
      const steady = chunk.data[0].slice(startIdx);
      const ratio = hfProxyRatio(steady);
      expect(ratio).toBeGreaterThan(0.05);
      expect(ratio).toBeLessThan(0.8);
    });
  });
});
