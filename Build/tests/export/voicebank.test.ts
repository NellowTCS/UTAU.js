import { buildVoicebank } from "../../src/export/voicebank";
import { japanese, english, mandarin } from "../../src/langs";
import { femaleVoice, maleVoice } from "../../src/voices";
import type { LanguageModule, PhonemeDef, ReclistEntry } from "../../src/core/types";

/** Minimal phoneme inventory for the synthetic test language. */
const testPhonemes = new Map<string, PhonemeDef>([
  ["a", { symbol: "a", type: "vowel", formants: [{ f: 700, bw: 80 }] }],
  ["k", { symbol: "k", type: "consonant", consonantType: "plosive", noise: { amplitude: 0.3 } }],
]);

function fakeLang(entries: ReclistEntry[]): LanguageModule {
  return {
    id: "xx",
    name: "Test",
    phonemes: testPhonemes,
    lyricToPhonemes: (l) => l.split(" "),
    reclist: () => entries,
  };
}

/** Validate a 16-bit PCM mono WAV header. The third time i've written a manual WAV... thing. oop */
function expectValidWav(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  const str = (off: number, len: number) => String.fromCharCode(...bytes.slice(off, off + len));
  expect(str(0, 4)).toBe("RIFF");
  expect(str(8, 4)).toBe("WAVE");
  expect(str(12, 4)).toBe("fmt ");
  expect(str(36, 4)).toBe("data");
  const view = new DataView(buf);
  expect(view.getUint16(22, true)).toBe(1); // mono
  expect(view.getUint32(24, true)).toBe(44100); // sample rate
  expect(view.getUint16(34, true)).toBe(16); // 16-bit
  // Non-zero audio payload.
  expect(buf.byteLength).toBeGreaterThan(44);
}

describe("buildVoicebank (CV/VCV oto conventions)", () => {
  const cvEntries: ReclistEntry[] = [
    { alias: "a", phonemes: ["a"] },
    { alias: "k a", phonemes: ["k", "a"] },
  ];
  const vcvEntries: ReclistEntry[] = [
    { alias: "- a", phonemes: ["a"] },
    { alias: "a -", phonemes: ["a"] },
    { alias: "a ka", phonemes: ["a", "k", "a"] },
  ];

  it("CV: pure vowel has zero preutter; consonant sample anchors at 0", () => {
    const bundle = buildVoicebank({ language: fakeLang(cvEntries), voice: femaleVoice, style: "cv" });
    expect(bundle.samples).toHaveLength(2);

    const vowel = bundle.samples.find((s) => s.alias === "a")!;
    expect(vowel.offset).toBe(0);
    expect(vowel.preutter).toBe(0);
    expect(vowel.consonant).toBe(0);
    expect(vowel.cutoff).toBeLessThan(0);
    expectValidWav(vowel.wav);

    const cons = bundle.samples.find((s) => s.alias === "k a")!;
    expect(cons.offset).toBe(0);
    expect(cons.preutter).toBeGreaterThan(0);
    expect(cons.consonant).toBe(cons.preutter);
    expect(cons.overlap).toBe(Math.round(cons.preutter / 2));
    expectValidWav(cons.wav);
  });

  it("VCV: consonant sample places offset at the consonant start", () => {
    const bundle = buildVoicebank({ language: fakeLang(vcvEntries), voice: femaleVoice, style: "vcv" });
    const vcv = bundle.samples.find((s) => s.alias === "a ka")!;
    expect(vcv.offset).toBeGreaterThan(0);
    expect(vcv.preutter).toBeGreaterThan(0);
    expect(vcv.consonant).toBe(vcv.preutter);
    expect(vcv.cutoff).toBeLessThan(0);
    expectValidWav(vcv.wav);
  });

  it("oto.ini has one parseable line per sample with valid ranges", () => {
    const bundle = buildVoicebank({ language: fakeLang(vcvEntries), voice: femaleVoice, style: "vcv" });
    const lines = bundle.otoIni.trim().split("\n");
    expect(lines).toHaveLength(bundle.samples.length);
    for (const line of lines) {
      const [file, rest] = line.split("=");
      const parts = rest.split(",");
      expect(parts).toHaveLength(6);
      const [offset, consonant, cutoff, preutter, overlap] = parts.slice(1).map(Number);
      expect(file).toMatch(/\.wav$/);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(preutter).toBeGreaterThanOrEqual(0);
      expect(consonant).toBeGreaterThanOrEqual(0);
      expect(overlap).toBeGreaterThanOrEqual(0);
      expect(cutoff).toBeLessThan(0);
      // The fixed region never exceeds the sample length.
      expect(offset + consonant).toBeLessThanOrEqual(-cutoff + offset);
    }
    expect(bundle.characterTxt).toContain("name=");
  });

  it("emits character.txt with the voice name", () => {
    const bundle = buildVoicebank({ language: fakeLang(cvEntries), voice: femaleVoice, style: "cv" });
    expect(bundle.characterTxt).toBe("name=Female\n");
  });
});

describe("buildVoicebank integration (real languages)", () => {
  function sliceLang(lang: LanguageModule, style: "cv" | "vcv", n = 12): LanguageModule {
    return { ...lang, reclist: () => lang.reclist!(style).slice(0, n) };
  }

  it("JP CV covers core aliases", () => {
    const entries = japanese.reclist!("cv");
    expect(entries.some((e) => e.alias === "a")).toBe(true);
    expect(entries.some((e) => e.alias === "ka")).toBe(true);
    for (const e of entries) expect(e.phonemes.length).toBeGreaterThan(0);
  });

  it("EN and ZH reclists produce non-empty cv/vcv tables with valid phonemes", () => {
    for (const lang of [english, mandarin]) {
      const cv = lang.reclist!("cv");
      const vcv = lang.reclist!("vcv");
      expect(cv.length).toBeGreaterThan(0);
      expect(vcv.length).toBeGreaterThan(cv.length);
      for (const e of [...cv, ...vcv]) {
        for (const p of e.phonemes) expect(lang.phonemes.has(p)).toBe(true);
      }
    }
  });

  it("bakes valid WAVs for a real phoneme set (jp cv/vcv, en/zh cv)", () => {
    const cases: Array<[LanguageModule, "cv" | "vcv"]> = [
      [japanese, "cv"],
      [japanese, "vcv"],
      [english, "cv"],
      [mandarin, "cv"],
    ];
    for (const [lang, style] of cases) {
      const bundle = buildVoicebank({ language: sliceLang(lang, style), voice: femaleVoice, style });
      expect(bundle.samples.length).toBeGreaterThan(0);
      expect(bundle.samples.every((s) => s.filename.endsWith(".wav"))).toBe(true);
      expectValidWav(bundle.samples[0].wav);
    }
  });

  it("builds for both male and female voices", () => {
    for (const voice of [maleVoice, femaleVoice]) {
      const bundle = buildVoicebank({ language: sliceLang(japanese, "cv"), voice, style: "cv" });
      expect(bundle.samples.length).toBeGreaterThan(0);
      expectValidWav(bundle.samples[0].wav);
    }
  });

  it("throws on unknown language and on missing reclist", () => {
    expect(() => buildVoicebank({ language: "qq", voice: femaleVoice, style: "cv" })).toThrow();
    const noReclist: LanguageModule = {
      id: "nr",
      name: "NoReclist",
      phonemes: testPhonemes,
      lyricToPhonemes: (l) => l.split(" "),
    };
    expect(() => buildVoicebank({ language: noReclist, voice: femaleVoice, style: "cv" })).toThrow();
  });
});
