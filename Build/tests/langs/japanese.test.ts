import { japanese } from "../../src/langs/japanese";

describe("japanese", () => {
  it("has the correct id and name", () => {
    expect(japanese.id).toBe("jp");
    expect(japanese.name).toBe("Japanese");
  });

  it("parses a single vowel lyric", () => {
    const result = japanese.lyricToPhonemes("a");
    expect(result.length).toBeGreaterThanOrEqual(1);
    for (const s of result) {
      expect(japanese.phonemes.has(s)).toBe(true);
    }
  });

  it("parses a CV syllable", () => {
    const result = japanese.lyricToPhonemes("ka");
    expect(result.length).toBe(2);
    expect(japanese.phonemes.get(result[0])?.type).toBe("consonant");
    expect(japanese.phonemes.get(result[1])?.type).toBe("vowel");
  });

  it("parses a nasal coda syllable", () => {
    const result = japanese.lyricToPhonemes("N");
    expect(result.length).toBe(1);
  });

  it("handles /l/ as a consonant", () => {
    const result = japanese.lyricToPhonemes("la");
    expect(result.length).toBe(2);
    expect(japanese.phonemes.get(result[0])?.type).toBe("consonant");
  });

  it("handles shi (3-letter reading)", () => {
    const result = japanese.lyricToPhonemes("shi");
    expect(result.length).toBe(2);
    expect(result[0]).toBe("sh");
    expect(result[1]).toBe("i");
  });

  it("parses kya as 3 phonemes", () => {
    const result = japanese.lyricToPhonemes("kya");
    expect(result).toEqual(["k", "y", "a"]);
  });

  it("all phonemes have a type and a symbol", () => {
    for (const [key, def] of japanese.phonemes) {
      expect(def.symbol).toBe(key);
      expect(def.type).toBeDefined();
      expect(["vowel", "consonant", "diphthong", "silence"]).toContain(def.type);
    }
  });

  it("vowels have formants", () => {
    for (const [, def] of japanese.phonemes) {
      if (def.type === "vowel") {
        expect(def.formants?.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  describe("resolveAccents", () => {
    it("is defined", () => {
      expect(japanese.resolveAccents).toBeDefined();
    });

    it("returns heiban pattern for a multi-mora word", () => {
      const result = japanese.resolveAccents!(["ka", "ra", "su"]);
      expect(result).toEqual([0, 1, 1]);
    });

    it("returns 0 for a single-mora word", () => {
      const result = japanese.resolveAccents!(["ki"]);
      expect(result).toEqual([0]);
    });

    it("handles empty input", () => {
      const result = japanese.resolveAccents!([]);
      expect(result).toEqual([]);
    });

    it("handles a phrase with many morae", () => {
      const result = japanese.resolveAccents!(["a", "ri", "ga", "to", "u"]);
      expect(result).toEqual([0, 1, 1, 1, 1]);
    });
  });
});
