import { renderNote, computePhonemeDurations } from "../../src/synth/renderer";
import { FormantCascade } from "../../src/core/dsp/filter";
import { getLanguage } from "../../src/langs/index";
import { buildVoice } from "../../src/voices/index";
import type { Note, PhonemeDef } from "../../src/core/types";

// Peak amplitude per analysis window
function windowPeaks(samples: Float32Array, winSec: number, maxSec = 0.1): number[] {
  const win = Math.max(1, Math.round(winSec * 44100));
  const limit = Math.min(samples.length, Math.round(maxSec * 44100));
  const peaks: number[] = [];
  for (let i = 0; i < limit; i += win) {
    let p = 0;
    for (let j = i; j < Math.min(limit, i + win); j++) p = Math.max(p, Math.abs(samples[j]));
    peaks.push(p);
  }
  return peaks;
}

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
      const note: Note = { lyric: "a", noteNum: 60, length: 480 * 8, tick: 0 };
      const { chunk } = renderNote(note, voice, lang, 120, 480);
      const startIdx = Math.floor(chunk.data[0].length * 0.2);
      const steady = chunk.data[0].slice(startIdx);
      const ratio = hfProxyRatio(steady);
      expect(ratio).toBeGreaterThan(0.05);
      expect(ratio).toBeLessThan(0.8);
    });
  });

  describe("plosive release", () => {
    it("keeps the closure silent and puts the burst at the release", () => {
      const ph = lang.phonemes.get("k");
      expect(ph?.consonantType).toBe("plosive");
      const { chunk } = renderNote({ lyric: "ka", noteNum: 69, length: 1440, tick: 0 }, voice, lang, 120, 480);
      const peaks = windowPeaks(chunk.data[0], 0.005, ph?.defaultDuration ?? 0.06);
      // Nothing during the closure.
      expect(Math.max(...peaks.slice(0, 5))).toBeLessThan(1e-4);
      // The burst arrives in the last third of the closure, not the first.
      const burst = peaks.findIndex((p) => p > 0.01);
      expect(burst).toBeGreaterThanOrEqual(peaks.length * 0.6);
    });
  });

  describe("affricate envelope", () => {
    it("keeps the stop closure silent, then emits a short release", () => {
      const ph = lang.phonemes.get("ch");
      expect(ph?.consonantType).toBe("affricate");
      const { chunk } = renderNote({ lyric: "chi", noteNum: 69, length: 1440, tick: 0 }, voice, lang, 120, 480);
      // Bound the scan to the consonant so the following vowel is not counted.
      const peaks = windowPeaks(chunk.data[0], 0.005, ph?.defaultDuration ?? 0.08);
      // The closure must be genuinely silent, not a quiet sibilant.
      expect(Math.max(...peaks.slice(0, 6))).toBeLessThan(1e-4);
      const voiced = peaks.findIndex((p) => p > 0.01);
      expect(voiced).toBeGreaterThanOrEqual(6);
      // The release must be brief and decay away, not run to the phoneme edge.
      // A continuous fricative would leave the final window near the initial peak.
      const release = peaks.slice(voiced);
      expect(release.length).toBeLessThanOrEqual(9);
      expect(release[release.length - 1]).toBeLessThan(release[0] * 0.35);
    });

    it("is distinguishable from the homorganic fricative", () => {
      const affricate = renderNote({ lyric: "chi", noteNum: 69, length: 1440, tick: 0 }, voice, lang, 120, 480);
      const fricative = renderNote({ lyric: "shi", noteNum: 69, length: 1440, tick: 0 }, voice, lang, 120, 480);
      const a = windowPeaks(affricate.chunk.data[0], 0.005);
      const f = windowPeaks(fricative.chunk.data[0], 0.005);
      const sustained = (p: number[]) => p.filter((x) => x > 0.01).length;
      // "sh" runs noise for its whole duration; "ch" must not.
      expect(sustained(f)).toBeGreaterThan(sustained(a) * 1.5);
    });
  });
});
describe("rest rendering", () => {
  const voice = buildVoice();
  function peak(data: Float32Array): number {
    let p = 0;
    for (const s of data) p = Math.max(p, Math.abs(s));
    return p;
  }
  for (const langId of ["jp", "zh", "en"] as const) {
    const lang = getLanguage(langId)!;
    it(`renders a ${langId} rest as digital silence`, () => {
      const { chunk } = renderNote({ lyric: "R", noteNum: 60, length: 480, tick: 0 }, voice, lang, 120, 480);
      expect(peak(chunk.data[0])).toBe(0);
    });
  }
  it("renders the Japanese sokuon as digital silence", () => {
    const lang = getLanguage("jp")!;
    const { chunk } = renderNote({ lyric: "\u3063", noteNum: 60, length: 480, tick: 0 }, voice, lang, 120, 480);
    expect(peak(chunk.data[0])).toBe(0);
  });
  it("still renders vowels at full level", () => {
    const lang = getLanguage("jp")!;
    const { chunk } = renderNote({ lyric: "a", noteNum: 60, length: 480, tick: 0 }, voice, lang, 120, 480);
    expect(peak(chunk.data[0])).toBeCloseTo(0.5, 2);
  });
});
describe("formant coefficient updates", () => {
  const lang = getLanguage("jp")!;
  const voice = buildVoice();
  const SHORT_NOTE = { lyric: "kirakirakirakira", noteNum: 72, length: 60, tick: 0 };
  it("updates coefficients at every phoneme onset", () => {
    const spy = jest.spyOn(FormantCascade.prototype, "setFormants");
    try {
      const { phonemeStarts } = renderNote(SHORT_NOTE, voice, lang, 120, 480);
      expect(phonemeStarts.length).toBeGreaterThan(8);
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(phonemeStarts.length);
    } finally {
      spy.mockRestore();
    }
  });
  it("applies the new phoneme's formants on its first sample", () => {
    const targets: number[][] = [];
    const spy = jest.spyOn(FormantCascade.prototype, "setFormants").mockImplementation(function (this: FormantCascade, t: { f: number }[]) {
      targets.push(t.map((x) => x.f));
      return undefined;
    });
    try {
      renderNote(SHORT_NOTE, voice, lang, 120, 480);
      const distinct = new Set(targets.map((t) => t.join(",")));
      expect(distinct.size).toBeGreaterThan(2);
    } finally {
      spy.mockRestore();
    }
  });
  it("scales the update interval with the voice sample rate", () => {
    const lowRateVoice = { ...voice, sampleRate: 16000 as const };
    const spy = jest.spyOn(FormantCascade.prototype, "setFormants");
    try {
      const { phonemeStarts } = renderNote(SHORT_NOTE, lowRateVoice, lang, 120, 480);
      expect(phonemeStarts.length).toBeGreaterThan(8);
      expect(spy.mock.calls.length).toBeGreaterThanOrEqual(phonemeStarts.length);
    } finally {
      spy.mockRestore();
    }
  });
});
describe("phoneme duration allocation", () => {
  const lang = getLanguage("jp")!;
  const voice = buildVoice();
  const SR = 44100;

  function alternating(count: number): PhonemeDef[] {
    return Array.from({ length: count }, (_, i) =>
      i % 2 === 0
        ? { symbol: `c${i}`, type: "consonant", consonantType: "plosive", noise: { amplitude: 0.3 } }
        : { symbol: `v${i}`, type: "vowel", formants: [{ f: 700, bw: 80 }] },
    );
  }

  function expectExactAllocation(dur: Int32Array, expectedTotal: number): void {
    for (let i = 0; i < dur.length; i++) {
      expect(dur[i]).toBeGreaterThanOrEqual(0);
    }
    const total = dur.reduce((a, b) => a + b, 0);
    expect(total).toBe(expectedTotal);
  }
  it("sums to the note length with no negative shares at many sizes", () => {
    for (const count of [1, 2, 3, 8, 16, 47, 60, 100, 257]) {
      for (const noteLen of [0, 1, 5, 46, 512, 22050]) {
        expectExactAllocation(computePhonemeDurations(alternating(count), noteLen, SR), noteLen);
      }
    }
  });
  it("never emits a negative share when phonemes outnumber samples", () => {
    const dur = computePhonemeDurations(alternating(60), 46, SR);
    expect(dur.filter((d) => d < 0)).toHaveLength(0);
    expectExactAllocation(dur, 46);
  });
  it("gives every phoneme a share while the note is long enough", () => {
    const dur = computePhonemeDurations(alternating(16), 22050, SR);
    for (let i = 0; i < dur.length; i++) expect(dur[i]).toBeGreaterThan(0);
    expectExactAllocation(dur, 22050);
  });
  it("caps consonant time so a long cluster still leaves room to sing", () => {
    const allCons: PhonemeDef[] = Array.from({ length: 10 }, (_, i) => ({
      symbol: `c${i}`,
      type: "consonant",
      consonantType: "plosive",
      defaultDuration: 0.2,
      noise: { amplitude: 0.3 },
    }));
    const dur = computePhonemeDurations(allCons, 1000, SR);
    expectExactAllocation(dur, 1000);
  });
  it("spreads a vowel-less note across its consonants", () => {
    const dur = computePhonemeDurations(
      alternating(8).filter((_, i) => i % 2 === 0),
      4800,
      SR,
    );
    expectExactAllocation(dur, 4800);
    for (let i = 0; i < dur.length; i++) expect(dur[i]).toBeGreaterThan(0);
  });
  it("returns an empty allocation for an empty phoneme list", () => {
    expect(computePhonemeDurations([], 1000, SR)).toHaveLength(0);
  });
  it("renders a note shorter than its phoneme count without NaN or gaps", () => {
    const lyric = "\u304d\u3082".repeat(30);
    const note: Note = { lyric, noteNum: 72, length: 1, tick: 0 };
    const { chunk, phonemeStarts } = renderNote(note, voice, lang, 120, 480);
    expect(chunk.data[0].length).toBe(46);
    for (const ch of chunk.data) for (const s of ch) expect(isFinite(s)).toBe(true);
    expect(phonemeStarts.length).toBeGreaterThan(50);
    for (let i = 1; i < phonemeStarts.length; i++) {
      expect(phonemeStarts[i]).toBeGreaterThanOrEqual(phonemeStarts[i - 1]);
    }
    expect(phonemeStarts[phonemeStarts.length - 1]).toBeLessThan(chunk.data[0].length);
  });
  it("renders a short lyric on a short note with finite output", () => {
    for (const length of [1, 2, 3, 5, 8, 13, 21, 34]) {
      const note: Note = { lyric: "kirakirakirakira", noteNum: 72, length, tick: 0 };
      const { chunk, phonemeStarts } = renderNote(note, voice, lang, 120, 480);
      for (const ch of chunk.data) for (const s of ch) expect(isFinite(s)).toBe(true);
      for (let i = 1; i < phonemeStarts.length; i++) {
        expect(phonemeStarts[i]).toBeGreaterThanOrEqual(phonemeStarts[i - 1]);
      }
    }
  });
  it("allocates the whole note for a long note", () => {
    const note: Note = { lyric: "kirakirakirakira", noteNum: 72, length: 480, tick: 0 };
    const { chunk, phonemeStarts } = renderNote(note, voice, lang, 120, 480);
    expect(chunk.data[0].length).toBe(voice.sampleRate / 2);
    expect(phonemeStarts[0]).toBe(0);
    expect(phonemeStarts[phonemeStarts.length - 1]).toBeLessThan(chunk.data[0].length);
  });
});
describe("output limiting", () => {
  const lang = getLanguage("jp")!;
  const voice = buildVoice();

  function renderPeak(voiceOverrides: Partial<typeof voice>, length = 480): number {
    const { chunk } = renderNote({ lyric: "a", noteNum: 72, length, tick: 0 }, { ...voice, ...voiceOverrides }, lang, 120, 480);
    let peak = 0;
    for (const ch of chunk.data) for (const s of ch) peak = Math.max(peak, Math.abs(s));
    return peak;
  }
  it("never exceeds full scale even when driven hard", () => {
    for (const overrides of [
      { volume: 200, intensity: 200 },
      { volume: 200, intensity: 200, peakComp: 0, normalizeTarget: 0.99 },
      { volume: 200, peakComp: 0, intensity: 400 },
    ]) {
      expect(renderPeak(overrides)).toBeLessThanOrEqual(1);
    }
  });
  it("stays finite for absurd configuration values", () => {
    for (const overrides of [
      { normalizeTarget: Number.NaN },
      { normalizeTarget: Number.POSITIVE_INFINITY },
      { normalizeTarget: -5 },
      { normalizeTarget: 1e9 },
      { peakComp: -1e9 },
    ]) {
      const peak = renderPeak(overrides);
      expect(Number.isFinite(peak)).toBe(true);
      expect(peak).toBeLessThanOrEqual(1);
    }
  });
  it("clamps peakComp to its documented 0..100 range", () => {
    const note: Note = { lyric: "a", noteNum: 72, length: 480, tick: 0 };
    const render = (peakComp: number) => renderNote(note, { ...voice, peakComp }, lang, 120, 480).chunk.data[0];
    const atZero = render(0);
    for (const below of [-1, -50, -100]) expect(render(below)).toEqual(atZero);
    const atHundred = render(100);
    for (const above of [101, 250, 1e9]) expect(render(above)).toEqual(atHundred);
  });
  it("leaves a normally normalized note below the ceiling", () => {
    expect(renderPeak({})).toBeLessThanOrEqual(0.5);
  });
  it("compresses rather than truncates: the peak of a driven note is a real value", () => {
    const { chunk } = renderNote(
      { lyric: "a", noteNum: 72, length: 960, tick: 0 },
      { ...voice, volume: 200, peakComp: 0, intensity: 400 },
      lang,
      120,
      480,
    );
    const magnitudes = new Set<number>();
    for (const s of chunk.data[0]) if (Math.abs(s) > 0.5) magnitudes.add(Math.abs(s));
    expect(magnitudes.size).toBeGreaterThan(100);
  });
  it("honours a normalizeTarget within the representable range", () => {
    expect(renderPeak({ normalizeTarget: 0.25 })).toBeLessThanOrEqual(0.25);
    expect(renderPeak({ normalizeTarget: 0.8 })).toBeLessThanOrEqual(0.8);
  });
});
