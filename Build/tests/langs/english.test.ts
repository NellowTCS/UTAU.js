import { english } from "../../src/langs/english";

describe("english", () => {
  it("has the correct id and name", () => {
    expect(english.id).toBe("en");
    expect(english.name).toBe("English");
  });

  it("parses a simple word into phonemes", () => {
    const result = english.lyricToPhonemes("HELLO");
    expect(result.length).toBeGreaterThan(1);
    for (const s of result) {
      expect(english.phonemes.has(s)).toBe(true);
    }
  });

  it("parses a CVC word", () => {
    const result = english.lyricToPhonemes("TEST");
    expect(result.length).toBeGreaterThan(1);
  });

  it("handles silence (R)", () => {
    const result = english.lyricToPhonemes("R");
    expect(result.length).toBe(1);
    expect(result[0]).toBe("R");
  });

  it("all phonemes have a type and a symbol", () => {
    for (const [key, def] of english.phonemes) {
      expect(def.symbol).toBe(key);
      expect(def.type).toBeDefined();
      expect(["vowel", "consonant", "diphthong", "silence"]).toContain(def.type);
    }
  });

  it("vowels have formants", () => {
    for (const [, def] of english.phonemes) {
      if (def.type === "vowel") {
        expect(def.formants?.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("handles consonant clusters", () => {
    const result = english.lyricToPhonemes("WORLD");
    expect(result.length).toBeGreaterThan(2);
  });

  it("handles single-letter words like A", () => {
    const result = english.lyricToPhonemes("A");
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("looks up a word from CMUDict (ABBOTT)", () => {
    const result = english.lyricToPhonemes("ABBOTT");
    expect(result.length).toBeGreaterThan(0);
    for (const s of result) {
      expect(english.phonemes.has(s)).toBe(true);
    }
  });

  it("looks up AMERICAN from CMUDict", () => {
    const result = english.lyricToPhonemes("AMERICAN");
    expect(result.length).toBeGreaterThan(0);
  });
});
