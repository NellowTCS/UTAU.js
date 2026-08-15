import type { PhonemeDef, LanguageModule, ReclistEntry, ReclistStyle } from "../core/types";
import g2pData from "./data/jp-g2p.mjs";

// Japanese phoneme data.
//
// I'm going to be responsible and cite my sources x2, gasp:
// Vowel formant targets (F1, F2): Yamada et al. (2019) short-vowel male means
// averaged across 48 speakers.
//   Yamada, J. et al. (2019). "Acoustic Characteristics of Japanese Short and
//   Long Vowels: Formant Displacement Effect Revisited". Proc. ICPhS 2019,
//   Melbourne, pp. 720–724.
//   https://www.internationalphoneticassociation.org/icphs-proceedings/ICPhS2019/papers/ICPhS_720.pdf
//   Table 3 - short vowel midpoint averages for male speakers:
//     /i/ F1=301, F2=2154  /e/ F1=443, F2=1947  /a/ F1=687, F2=1283
//     /o/ F1=462, F2=949   /u/ F1=348, F2=1435
//
// F3 values from the ATR MRI database of Japanese vowel production
// (Kitamura et al. 2009):
//   Kitamura, T., Takemoto, H., Adachi, S., & Honda, K. (2009). "Transfer
//   functions of solid vocal-tract models constructed from ATR MRI database
//   of Japanese vowel production". Acoust. Sci. & Tech. 30(4), 288–298.
//   Table 4 - standalone audio recordings.
//   https://doi.org/10.1250/ast.30.288
//   /a/ F3=2672  /e/ F3=2391  /i/ F3~3000 (extrapolated)  /o/ F3=2414  /u/ F3=2133
//
// Consonant data: general acoustic-phonetics literature.  Noise centre
// frequencies follow the same sources as the English module.
//
// Kana / romaji parsing: standard Hepburn romanisation rules.
//   Kenkyusha's New Japanese-English Dictionary (5th ed.), 2003. (Yes really.)
//
// G2P lexicon for kanji->kana is auto-generated from EDICT2 via
// Build/scripts/build-g2p-jp.ts.

const baseVowel = (symbol: string, f1: number, f2: number, f3: number, bw1 = 70, bw2 = 90, bw3 = 130): PhonemeDef => ({
  symbol,
  type: "vowel",
  voiced: true,
  defaultDuration: 0.12,
  formants: [
    { f: f1, bw: bw1 },
    { f: f2, bw: bw2 },
    { f: f3, bw: bw3 },
    { f: 3500, bw: 200 },
    { f: 4500, bw: 300 },
  ],
});

const jpPhonemes: PhonemeDef[] = [
  // Vowels:
  // (Yamada et al. 2019 F1/F2; Kitamura et al. 2009 F3)
  //
  // why isn't this aeiou order you ask?  because i wanted to list them
  // in the order of their F1 values, which is more relevant to their acoustic
  // properties and how they should be synthesized.
  baseVowel("a", 687, 1283, 2672),
  baseVowel("i", 301, 2154, 3000, 60, 80, 120),
  baseVowel("u", 348, 1435, 2133, 65, 80, 120),
  baseVowel("e", 443, 1947, 2391),
  baseVowel("o", 462, 949, 2414),

  // Nasals:
  // Stevens (1998) Acoustic Phonetics; Fujimura (1962).
  {
    symbol: "N",
    type: "consonant",
    consonantType: "nasal",
    voiced: true,
    defaultDuration: 0.08,
    formants: [
      { f: 250, bw: 100 },
      { f: 1200, bw: 200 },
      { f: 2500, bw: 250 },
    ],
    antiformants: [{ f: 400, bw: 100 }],
  },
  {
    symbol: "n",
    type: "consonant",
    consonantType: "nasal",
    voiced: true,
    defaultDuration: 0.07,
    formants: [
      { f: 300, bw: 100 },
      { f: 1300, bw: 200 },
      { f: 2600, bw: 250 },
    ],
    antiformants: [{ f: 450, bw: 100 }],
  },
  {
    symbol: "m",
    type: "consonant",
    consonantType: "nasal",
    voiced: true,
    defaultDuration: 0.07,
    formants: [
      { f: 280, bw: 100 },
      { f: 1100, bw: 200 },
      { f: 2400, bw: 250 },
    ],
    antiformants: [{ f: 350, bw: 100 }],
  },

  // Plosives:
  {
    symbol: "k",
    type: "consonant",
    consonantType: "plosive",
    voiced: false,
    defaultDuration: 0.06,
    formants: [
      { f: 300, bw: 200 },
      { f: 2000, bw: 200 },
      { f: 2500, bw: 250 },
    ],
    noise: { amplitude: 0.45, formantShaping: [{ f: 2000, bw: 500 }] },
  },
  {
    symbol: "g",
    type: "consonant",
    consonantType: "plosive",
    voiced: true,
    defaultDuration: 0.06,
    formants: [
      { f: 300, bw: 200 },
      { f: 1800, bw: 200 },
      { f: 2500, bw: 250 },
    ],
    noise: { amplitude: 0.3, formantShaping: [{ f: 2000, bw: 500 }] },
  },
  {
    symbol: "t",
    type: "consonant",
    consonantType: "plosive",
    voiced: false,
    defaultDuration: 0.05,
    formants: [
      { f: 300, bw: 200 },
      { f: 1700, bw: 200 },
      { f: 2600, bw: 250 },
    ],
    noise: { amplitude: 0.45, formantShaping: [{ f: 4000, bw: 1000 }] },
  },
  {
    symbol: "d",
    type: "consonant",
    consonantType: "plosive",
    voiced: true,
    defaultDuration: 0.05,
    formants: [
      { f: 300, bw: 200 },
      { f: 1700, bw: 200 },
      { f: 2600, bw: 250 },
    ],
    noise: { amplitude: 0.25, formantShaping: [{ f: 4000, bw: 1000 }] },
  },
  {
    symbol: "b",
    type: "consonant",
    consonantType: "plosive",
    voiced: true,
    defaultDuration: 0.05,
    formants: [
      { f: 300, bw: 200 },
      { f: 1100, bw: 200 },
      { f: 2100, bw: 250 },
    ],
    noise: { amplitude: 0.2, formantShaping: [{ f: 800, bw: 400 }] },
  },
  {
    symbol: "p",
    type: "consonant",
    consonantType: "plosive",
    voiced: false,
    defaultDuration: 0.05,
    formants: [
      { f: 300, bw: 200 },
      { f: 1100, bw: 200 },
      { f: 2100, bw: 250 },
    ],
    noise: { amplitude: 0.4, formantShaping: [{ f: 800, bw: 400 }] },
  },

  // Fricatives:
  {
    symbol: "s",
    type: "consonant",
    consonantType: "fricative",
    voiced: false,
    defaultDuration: 0.08,
    noise: { amplitude: 0.4, formantShaping: [{ f: 7000, bw: 2000 }] },
  },
  {
    symbol: "z",
    type: "consonant",
    consonantType: "fricative",
    voiced: true,
    defaultDuration: 0.08,
    formants: [
      { f: 350, bw: 100 },
      { f: 2000, bw: 150 },
      { f: 2600, bw: 200 },
    ],
    noise: { amplitude: 0.3, formantShaping: [{ f: 6000, bw: 2000 }] },
  },
  {
    symbol: "sh",
    type: "consonant",
    consonantType: "fricative",
    voiced: false,
    defaultDuration: 0.08,
    noise: { amplitude: 0.4, formantShaping: [{ f: 3500, bw: 1500 }] },
  },
  {
    symbol: "h",
    type: "consonant",
    consonantType: "fricative",
    voiced: false,
    defaultDuration: 0.06,
    formants: [
      { f: 550, bw: 100 },
      { f: 1400, bw: 150 },
      { f: 2400, bw: 200 },
    ],
    noise: { amplitude: 0.25 },
  },
  {
    symbol: "f",
    type: "consonant",
    consonantType: "fricative",
    voiced: false,
    defaultDuration: 0.07,
    noise: { amplitude: 0.35, formantShaping: [{ f: 2000, bw: 1000 }] },
  },

  // Approximants:
  {
    symbol: "y",
    type: "consonant",
    consonantType: "approximant",
    voiced: true,
    defaultDuration: 0.05,
    formants: [
      { f: 301, bw: 80 },
      { f: 2154, bw: 150 },
      { f: 3000, bw: 200 },
    ],
  },
  {
    symbol: "r",
    type: "consonant",
    consonantType: "approximant",
    voiced: true,
    defaultDuration: 0.06,
    formants: [
      { f: 400, bw: 150 },
      { f: 1300, bw: 250 },
      { f: 2400, bw: 250 },
    ],
  },
  {
    symbol: "l",
    type: "consonant",
    consonantType: "approximant",
    voiced: true,
    defaultDuration: 0.06,
    formants: [
      { f: 400, bw: 150 },
      { f: 1300, bw: 250 },
      { f: 2800, bw: 250 },
    ],
  },
  {
    symbol: "w",
    type: "consonant",
    consonantType: "approximant",
    voiced: true,
    defaultDuration: 0.05,
    formants: [
      { f: 348, bw: 80 },
      { f: 1435, bw: 150 },
      { f: 2133, bw: 200 },
    ],
  },

  // Affricates:
  {
    symbol: "ch",
    type: "consonant",
    consonantType: "affricate",
    voiced: false,
    defaultDuration: 0.08,
    noise: { amplitude: 0.35, formantShaping: [{ f: 3500, bw: 1500 }] },
  },
  {
    symbol: "ts",
    type: "consonant",
    consonantType: "affricate",
    voiced: false,
    defaultDuration: 0.08,
    noise: { amplitude: 0.35, formantShaping: [{ f: 6000, bw: 2000 }] },
  },
  {
    symbol: "j",
    type: "consonant",
    consonantType: "affricate",
    voiced: true,
    defaultDuration: 0.07,
    formants: [
      { f: 400, bw: 100 },
      { f: 1800, bw: 150 },
      { f: 2500, bw: 200 },
    ],
    noise: { amplitude: 0.25, formantShaping: [{ f: 3500, bw: 1500 }] },
  },
  {
    symbol: "sil",
    type: "silence",
    defaultDuration: 0.06,
  },
];

const hiraganaMap: Record<string, string> = {
  あ: "a",
  い: "i",
  う: "u",
  え: "e",
  お: "o",
  か: "ka",
  き: "ki",
  く: "ku",
  け: "ke",
  こ: "ko",
  さ: "sa",
  し: "shi",
  す: "su",
  せ: "se",
  そ: "so",
  た: "ta",
  ち: "chi",
  つ: "tsu",
  っ: "sil",
  て: "te",
  と: "to",
  な: "na",
  に: "ni",
  ぬ: "nu",
  ね: "ne",
  の: "no",
  は: "ha",
  ひ: "hi",
  ふ: "fu",
  へ: "he",
  ほ: "ho",
  ま: "ma",
  み: "mi",
  む: "mu",
  め: "me",
  も: "mo",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  ら: "ra",
  り: "ri",
  る: "ru",
  れ: "re",
  ろ: "ro",
  わ: "wa",
  を: "wo",
  ん: "n",
  が: "ga",
  ぎ: "gi",
  ぐ: "gu",
  げ: "ge",
  ご: "go",
  ざ: "za",
  じ: "ji",
  ず: "zu",
  ぜ: "ze",
  ぞ: "zo",
  だ: "da",
  ぢ: "ji",
  づ: "zu",
  で: "de",
  ど: "do",
  ば: "ba",
  び: "bi",
  ぶ: "bu",
  べ: "be",
  ぼ: "bo",
  ぱ: "pa",
  ぴ: "pi",
  ぷ: "pu",
  ぺ: "pe",
  ぽ: "po",
  きゃ: "kya",
  きゅ: "kyu",
  きょ: "kyo",
  しゃ: "sha",
  しゅ: "shu",
  しょ: "sho",
  ちゃ: "cha",
  ちゅ: "chu",
  ちょ: "cho",
  にゃ: "nya",
  にゅ: "nyu",
  にょ: "nyo",
  ひゃ: "hya",
  ひゅ: "hyu",
  ひょ: "hyo",
  みゃ: "mya",
  みゅ: "myu",
  みょ: "myo",
  りゃ: "rya",
  りゅ: "ryu",
  りょ: "ryo",
  ぎゃ: "gya",
  ぎゅ: "gyu",
  ぎょ: "gyo",
  じゃ: "ja",
  じゅ: "ju",
  じょ: "jo",
  びゃ: "bya",
  びゅ: "byu",
  びょ: "byo",
  ぴゃ: "pya",
  ぴゅ: "pyu",
  ぴょ: "pyo",
};

function sanitizeLyric(lyric: string): string {
  // Handle pronunciation alias (※): use text after ※ as the effective lyric
  const aliasIdx = lyric.indexOf("※");
  const effectiveLyric = aliasIdx >= 0 ? lyric.slice(aliasIdx + 1) : lyric;
  // Dot-prefixed lyrics (.sil, .S, etc.) are UTAU rest/special commands so treat as empty for now.
  if (effectiveLyric.startsWith(".")) return "";
  const cleaned = effectiveLyric.replace(/[＠％]/g, "");
  if (!cleaned) return "";
  return hiraganaMap[cleaned] ?? cleaned;
}

function romajiToPhonemes(romaji: string): string[] {
  const special: Record<string, string> = {
    shi: "sh i",
    chi: "ch i",
    tsu: "ts u",
    fu: "f u",
    ji: "j i",
    kya: "k y a",
    kyu: "k y u",
    kyo: "k y o",
    sha: "sh a",
    shu: "sh u",
    sho: "sh o",
    cha: "ch a",
    chu: "ch u",
    cho: "ch o",
    nya: "n y a",
    nyu: "n y u",
    nyo: "n y o",
    hya: "h y a",
    hyu: "h y u",
    hyo: "h y o",
    mya: "m y a",
    myu: "m y u",
    myo: "m y o",
    rya: "r y a",
    ryu: "r y u",
    ryo: "r y o",
    gya: "g y a",
    gyu: "g y u",
    gyo: "g y o",
    ja: "j a",
    ju: "j u",
    jo: "j o",
    bya: "b y a",
    byu: "b y u",
    byo: "b y o",
    pya: "p y a",
    pyu: "p y u",
    pyo: "p y o",
    ye: "y e",
  };
  const vowels = new Set(["a", "i", "u", "e", "o"]);
  const consonants = new Set(["k", "s", "t", "n", "h", "m", "y", "r", "w", "g", "z", "d", "b", "p", "sh", "ch", "ts", "f", "j", "l"]);
  let s = romaji.toLowerCase().replace(/\s+/g, "");
  if (special[s]) {
    s = special[s];
  }
  const result: string[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === " ") {
      i++;
      continue;
    }
    if (s[i] === "n" && (i + 1 >= s.length || !vowels.has(s[i + 1]))) {
      result.push("N");
      i++;
      continue;
    }
    if (s[i] === s[i + 1] && consonants.has(s[i])) {
      result.push(s[i]);
      i++;
      continue;
    }
    const two = s.slice(i, i + 2);
    if (two === "ts" || two === "ch" || two === "sh") {
      result.push(two);
      i += 2;
    } else {
      result.push(s[i]);
      i++;
    }
  }
  return result;
}

const HIGH_OFFSET = 1;

function resolveAccents(lyrics: string[]): (number | undefined)[] {
  const result: (number | undefined)[] = new Array(lyrics.length).fill(undefined);
  if (lyrics.length === 0) return result;
  for (let i = 0; i < lyrics.length; i++) {
    result[i] = i === 0 ? 0 : HIGH_OFFSET;
  }
  return result;
}

const CV_VOWELS = ["a", "i", "u", "e", "o"];

/** Build the Japanese CV reclist: one sample per mora (consonant+vowel),
 *  plus standalone vowels, the nasal ん ("n"), and the sokuon っ ("sil").
 *  Aliases are romaji; duplicates (e.g. じ/ぢ -> "ji") are collapsed. */
function buildJpCv(): ReclistEntry[] {
  const map = new Map<string, ReclistEntry>();
  for (const romaji of Object.values(hiraganaMap)) {
    if (romaji === "sil") {
      if (!map.has("sil")) map.set("sil", { alias: "sil", phonemes: ["sil"] });
      continue;
    }
    const phonemes = romajiToPhonemes(romaji);
    if (phonemes.length === 0) continue;
    if (!map.has(romaji)) map.set(romaji, { alias: romaji, phonemes });
  }
  return [...map.values()];
}

/** Build the Japanese VCV reclist: leading vowels ("- a"), endings ("a -"),
 *  vowel blends ("a i"), and every prev-vowel + mora connection ("a ka").
 *  Morae are every CV alias whose first phoneme is not a standalone vowel. */
function buildJpVcv(): ReclistEntry[] {
  const out: ReclistEntry[] = [];
  const cv = buildJpCv();
  const morae = cv.filter((e) => !CV_VOWELS.includes(e.phonemes[0]));

  for (const v of CV_VOWELS) {
    out.push({ alias: `- ${v}`, phonemes: [v] });
    out.push({ alias: `${v} -`, phonemes: [v] });
  }
  for (const v1 of CV_VOWELS) {
    for (const v2 of CV_VOWELS) {
      out.push({ alias: `${v1} ${v2}`, phonemes: [v1, v2] });
    }
  }
  for (const v of CV_VOWELS) {
    for (const m of morae) {
      out.push({ alias: `${v} ${m.alias}`, phonemes: [v, ...m.phonemes] });
    }
  }
  return out;
}

/** Japanese language module with IPA-like phoneme inventory, hiragana/romaji
 *  conversion, and EDICT2-based kanji G2P. Handles pitch-accent resolution
 *  for prosody generation. */
export const japanese: LanguageModule = {
  id: "jp",
  name: "Japanese",
  phonemes: new Map(jpPhonemes.map((p) => [p.symbol, p])),
  lyricToPhonemes(lyric: string): string[] {
    // If lyric contains kanji (CJK Unified Ideographs), look up the reading
    // from the G2P lexicon, then convert each kana character to phonemes.
    if (/[\u4e00-\u9fff]/.test(lyric)) {
      const reading = (g2pData as Record<string, string>)[lyric];
      if (reading) {
        return [...reading]
          .flatMap((ch) => {
            const romaji = hiraganaMap[ch];
            if (!romaji) return [];
            return romajiToPhonemes(romaji);
          })
          .filter(Boolean);
      }
    }
    return sanitizeLyric(lyric)
      .split(/[\s_-]+/)
      .filter(Boolean)
      .flatMap((p) => romajiToPhonemes(p));
  },
  resolveAccents,
  reclist(style: ReclistStyle): ReclistEntry[] {
    return style === "vcv" ? buildJpVcv() : buildJpCv();
  },
};
