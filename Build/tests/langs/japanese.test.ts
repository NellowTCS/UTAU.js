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

  it("parses nya with a palatal nasal, not the syllabic N plus a glide", () => {
    expect(japanese.lyricToPhonemes("nya")).toEqual(["ny", "a"]);
    expect(japanese.lyricToPhonemes("nyu")).toEqual(["ny", "u"]);
    expect(japanese.lyricToPhonemes("nyo")).toEqual(["ny", "o"]);
    const ny = japanese.phonemes.get("ny");
    expect(ny?.consonantType).toBe("nasal");
    // The palatal nasal's F2 must sit far above the alveolar n.
    const alveolar = japanese.phonemes.get("n");
    expect(ny?.formants?.[1].f ?? 0).toBeGreaterThan((alveolar?.formants?.[1].f ?? 0) + 500);
  });

  it("keeps the standalone n and the syllabic N distinct", () => {
    expect(japanese.lyricToPhonemes("na")).toEqual(["n", "a"]);
    expect(japanese.lyricToPhonemes("n")).toEqual(["N"]);
    expect(japanese.lyricToPhonemes("かん")).toEqual(["k", "a", "N"]);
  });

  it("marks ん syllabic at the kana layer, not from a romaji neighbour", () => {
    expect(japanese.lyricToPhonemes("んあ")).toEqual(["N", "a"]);
    expect(japanese.lyricToPhonemes("かんあ")).toEqual(["k", "a", "N", "a"]);
    expect(japanese.lyricToPhonemes("しんい")).toEqual(["sh", "i", "N", "i"]);
    // Every neighbouring kana, so the outcome cannot depend on what follows.
    for (const next of ["あ", "い", "う", "え", "お", "か", "し", "ゃ", "っ"]) {
      expect(japanese.lyricToPhonemes(`ん${next}`)).toContain("N");
    }
  });

  it("parses each kana unit as its own mora", () => {
    // Units are the mora
    const cases: [string, string[]][] = [
      ["なな", ["n", "a", "n", "a"]],
      ["にの", ["n", "i", "n", "o"]],
      ["きき", ["k", "i", "k", "i"]],
      ["にゃ", ["ny", "a"]],
    ];
    for (const [kana, expected] of cases) {
      expect(japanese.lyricToPhonemes(kana)).toEqual(expected);
    }
  });

  it("resolves multi-mora kana to defined phonemes", () => {
    // Digraph kana must be matched as a pair
    const cases: [string, string[]][] = [
      ["きゃく", ["k", "y", "a", "k", "u"]],
      ["しゃしん", ["sh", "a", "sh", "i", "N"]],
      ["んじゅ", ["N", "j", "u"]],
    ];
    for (const [kana, expected] of cases) {
      const result = japanese.lyricToPhonemes(kana);
      expect(result).toEqual(expected);
      for (const s of result) expect(japanese.phonemes.has(s)).toBe(true);
    }
  });

  it("every kana and kanji reading resolves to defined phonemes", () => {
    const kana =
      "あいうえおかがきぎくくけこさざしじすずせそただちっつづてとなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもやゆよらりるれろわをんアイウエオカガキギクグケコサザシジスズセソタダチッツヅテトナニヌネノハバパヒビピフブプヘベペホボポマミムメモヤユヨラリルレロワヲンガギグゲゴザジズゼゾダビヂヅデドバビブベボパピプペポャュョ";
    for (const ch of kana) {
      for (const seq of japanese.lyricToPhonemes(ch)) {
        expect(japanese.phonemes.has(seq)).toBe(true);
      }
    }
    // Every hiragana/katakana pair too, since digraphs only exist for some.
    for (const a of kana) {
      for (const b of kana) {
        if (!/[\u3040-\u309f]/.test(a) || !/[\u3041-\u3096]/.test(b)) continue;
        for (const seq of japanese.lyricToPhonemes(a + b)) {
          expect(japanese.phonemes.has(seq)).toBe(true);
        }
      }
    }
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

  it("looks up a common kanji word in the G2P lexicon", () => {
    const result = japanese.lyricToPhonemes("食べる");
    expect(result.length).toBeGreaterThan(0);
    for (const s of result) {
      expect(japanese.phonemes.has(s)).toBe(true);
    }
  });

  it("looks up 音楽 in the G2P lexicon", () => {
    const result = japanese.lyricToPhonemes("音楽");
    expect(result.length).toBeGreaterThan(0);
    for (const s of result) {
      expect(japanese.phonemes.has(s)).toBe(true);
    }
  });

  it("falls through for unknown kanji", () => {
    const result = japanese.lyricToPhonemes("無茶苦茶");
    expect(result.length).toBeGreaterThan(0);
    for (const s of result) {
      expect(japanese.phonemes.has(s)).toBe(true);
    }
  });

  describe("resolveAccents", () => {
    it("is defined", () => {
      expect(japanese.resolveAccents).toBeDefined();
    });

    it("returns all-undefined (accent disabled) for a multi-mora word", () => {
      const result = japanese.resolveAccents!(["ka", "ra", "su"]);
      expect(result).toEqual([undefined, undefined, undefined]);
    });

    it("returns all-undefined (accent disabled) for a single-mora word", () => {
      const result = japanese.resolveAccents!(["ki"]);
      expect(result).toEqual([undefined]);
    });

    it("handles empty input", () => {
      const result = japanese.resolveAccents!([]);
      expect(result).toEqual([]);
    });

    it("handles a phrase with many morae", () => {
      const result = japanese.resolveAccents!(["a", "ri", "ga", "to", "u"]);
      expect(result).toEqual([undefined, undefined, undefined, undefined, undefined]);
    });
  });
});

describe("japanese rests and sokuon", () => {
  it("maps the UTAU rest marker to the silence phoneme", () => {
    expect(japanese.lyricToPhonemes("R")).toEqual(["sil"]);
  });

  it("does not spell out the rest marker as s-i-l", () => {
    const symbols = japanese.lyricToPhonemes("R");
    expect(symbols).not.toContain("s");
    expect(symbols).not.toContain("l");
  });

  it("defines the rest phoneme as unvoiced silence", () => {
    const def = japanese.phonemes.get("sil");
    expect(def?.type).toBe("silence");
    expect(def?.voiced).toBe(false);
  });

  it("keeps lowercase r singable as the mora ra", () => {
    expect(japanese.lyricToPhonemes("r")).toEqual(["r"]);
  });

  it("maps the sokuon to silence, not to the spelled-out letters", () => {
    expect(japanese.lyricToPhonemes("\u3063")).toEqual(["sil"]);
  });

  it("resolves a kana reading containing the sokuon to silence", () => {
    const result = japanese.lyricToPhonemes("\u304d\u3063\u3066");
    expect(result).toContain("sil");
  });

  it("keeps an ordinary moraic reading free of silence", () => {
    const result = japanese.lyricToPhonemes("\u5bff");
    expect(result).not.toContain("sil");
  });
});
