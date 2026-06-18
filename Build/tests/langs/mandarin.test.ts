import { mandarin } from "../../src/langs/mandarin";

describe("mandarin", () => {
  it("has the correct id and name", () => {
    expect(mandarin.id).toBe("zh");
    expect(mandarin.name).toBe("Mandarin Chinese");
  });

  it("all phonemes have a type and a symbol", () => {
    for (const [key, def] of mandarin.phonemes) {
      expect(def.symbol).toBe(key);
      expect(def.type).toBeDefined();
      expect(["vowel", "consonant", "diphthong", "silence"]).toContain(def.type);
    }
  });

  it("vowels have formants", () => {
    for (const [, def] of mandarin.phonemes) {
      if (def.type === "vowel") {
        expect(def.formants?.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("parses a simple CV syllable (ba)", () => {
    const result = mandarin.lyricToPhonemes("ba");
    expect(result).toEqual(["b", "a"]);
  });

  it("parses a syllable with diphthong (bei)", () => {
    const result = mandarin.lyricToPhonemes("bei");
    expect(result).toEqual(["b", "e", "i"]);
  });

  it("parses a syllable with nasal coda (an)", () => {
    const result = mandarin.lyricToPhonemes("an");
    expect(result).toEqual(["a", "n"]);
  });

  it("parses zhi with retroflex vowel", () => {
    const result = mandarin.lyricToPhonemes("zhi");
    expect(result).toEqual(["zh", "ir"]);
  });

  it("parses zi with dental vowel", () => {
    const result = mandarin.lyricToPhonemes("zi");
    expect(result).toEqual(["z", "iz"]);
  });

  it("parses a triphthong (xiao)", () => {
    const result = mandarin.lyricToPhonemes("xiao");
    expect(result).toEqual(["x", "i", "a", "o"]);
  });

  it("parses ian with a->e mutation (jian)", () => {
    const result = mandarin.lyricToPhonemes("jian");
    expect(result).toEqual(["j", "i", "e", "n"]);
  });

  it("handles yu spelling change", () => {
    const result = mandarin.lyricToPhonemes("yu");
    expect(result).toEqual(["v"]);
  });

  it("handles yue spelling change", () => {
    const result = mandarin.lyricToPhonemes("yue");
    expect(result).toEqual(["v", "e"]);
  });

  it("handles yi spelling change", () => {
    const result = mandarin.lyricToPhonemes("yi");
    expect(result).toEqual(["i"]);
  });

  it("handles wu spelling change", () => {
    const result = mandarin.lyricToPhonemes("wu");
    expect(result).toEqual(["u"]);
  });

  it("handles wa with w spelling change", () => {
    const result = mandarin.lyricToPhonemes("wa");
    expect(result).toEqual(["u", "a"]);
  });

  it("handles tone suffix stripping (ma1)", () => {
    const result = mandarin.lyricToPhonemes("ma1");
    expect(result).toEqual(["m", "a"]);
  });

  it("handles multi-syllable input", () => {
    const result = mandarin.lyricToPhonemes("ni hao");
    expect(result).toEqual(["n", "i", "h", "a", "o"]);
  });

  it("handles empty input", () => {
    const result = mandarin.lyricToPhonemes("");
    expect(result).toEqual([]);
  });

  it("all output phonemes exist in the phoneme map", () => {
    const testSyllables = [
      "ba",
      "po",
      "mi",
      "fa",
      "da",
      "ta",
      "na",
      "la",
      "ga",
      "ka",
      "ha",
      "zhi",
      "chi",
      "shi",
      "ri",
      "zi",
      "ci",
      "si",
      "ju",
      "qu",
      "xu",
      "zhuang",
      "shuang",
      "qiong",
      "xuan",
      "yue",
      "yun",
      "er",
    ];
    for (const syl of testSyllables) {
      const phonemes = mandarin.lyricToPhonemes(syl);
      for (const p of phonemes) {
        expect(mandarin.phonemes.has(p)).toBe(true);
      }
    }
  });
});
