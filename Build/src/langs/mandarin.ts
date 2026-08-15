import type { PhonemeDef, LanguageModule, ReclistEntry, ReclistStyle } from "../core/types";

// Mandarin Chinese (Pǔtōnghuà) phoneme data.
//
// Vowel formant targets reference: Wu, Z. (1990) "Mandarin Chinese
// Phonetics" (汉语普通话语音), standard reference values for male speakers.
//   /i/ F1=290 F2=2360  /u/ F1=380 F2=620   /v/ (ü) F1=290 F2=2050
//   /a/ F1=830 F2=1200  /o/ F1=490 F2=780   /e/ F1=580 F2=1500
//   /er/ F1=560 F2=1380 (retroflex vowel, also used as rhotic coda)
//
// Consonant noise centres: typical Mandarin values from acoustic phonetics
// literature.  Mandarin plosives are unaspirated/aspirated pairs (b/p, d/t,
// g/k), all voiceless.  Affricates follow the same pattern: z/c, zh/ch, j/q.
// Fricatives: f, s, sh, x, h (all voiceless).  Sonorants: m, n, l, r.
//
// Pinyin syllable -> phoneme mapping follows the standard decomposition:
//   INITIAL (optional) + FINAL
// where finals may be diphthongs/triphthongs that decompose further.
// See: https://en.wikipedia.org/wiki/Pinyin#Syllables
//
// Tone is annotated as a suffix on the final vowel (1–5), but is not
// represented in the phoneme stream-tone affects pitch contour, which
// the synthesis layer handles via pitch-bend on the note.

const baseVowel = (symbol: string, f1: number, f2: number, f3: number, bw1 = 80, bw2 = 100, bw3 = 150): PhonemeDef => ({
  symbol,
  type: "vowel" as const,
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

const cnPhonemes: PhonemeDef[] = [
  // Vowels:
  baseVowel("a", 830, 1200, 2800),
  baseVowel("o", 490, 780, 2850),
  baseVowel("e", 580, 1500, 2500),
  baseVowel("i", 290, 2360, 3100, 60, 80, 120),
  baseVowel("u", 380, 620, 2800, 70, 90, 130),
  baseVowel("v", 290, 2050, 3100, 60, 80, 120), // ü

  // Retroflex vowel er
  {
    symbol: "er",
    type: "vowel" as const,
    voiced: true,
    defaultDuration: 0.12,
    formants: [
      { f: 560, bw: 120 },
      { f: 1380, bw: 180 },
      { f: 2100, bw: 200 },
      { f: 3500, bw: 200 },
      { f: 4500, bw: 300 },
    ],
  },

  // Alveolo-palatal vowels (after zhi/chi/shi/ri and zi/ci/si):
  // These are apical vowels with distinct formants from [i].
  {
    symbol: "ir",
    type: "vowel" as const,
    voiced: true,
    defaultDuration: 0.1,
    formants: [
      { f: 400, bw: 120 },
      { f: 1800, bw: 200 },
      { f: 2700, bw: 250 },
      { f: 3500, bw: 200 },
      { f: 4500, bw: 300 },
    ],
  },
  {
    symbol: "iz",
    type: "vowel" as const,
    voiced: true,
    defaultDuration: 0.1,
    formants: [
      { f: 380, bw: 120 },
      { f: 1700, bw: 200 },
      { f: 2700, bw: 250 },
      { f: 3500, bw: 200 },
      { f: 4500, bw: 300 },
    ],
  },

  // Plosives (all voiceless):
  {
    symbol: "b",
    type: "consonant" as const,
    consonantType: "plosive",
    voiced: false,
    defaultDuration: 0.04,
    noise: { amplitude: 0.35, formantShaping: [{ f: 800, bw: 400 }] },
  },
  {
    symbol: "p",
    type: "consonant" as const,
    consonantType: "plosive",
    voiced: false,
    defaultDuration: 0.06,
    noise: { amplitude: 0.45, formantShaping: [{ f: 1200, bw: 500 }] },
  },
  {
    symbol: "d",
    type: "consonant" as const,
    consonantType: "plosive",
    voiced: false,
    defaultDuration: 0.04,
    noise: { amplitude: 0.35, formantShaping: [{ f: 4000, bw: 1000 }] },
  },
  {
    symbol: "t",
    type: "consonant" as const,
    consonantType: "plosive",
    voiced: false,
    defaultDuration: 0.06,
    noise: { amplitude: 0.45, formantShaping: [{ f: 4500, bw: 1000 }] },
  },
  {
    symbol: "g",
    type: "consonant" as const,
    consonantType: "plosive",
    voiced: false,
    defaultDuration: 0.04,
    noise: { amplitude: 0.35, formantShaping: [{ f: 2000, bw: 500 }] },
  },
  {
    symbol: "k",
    type: "consonant" as const,
    consonantType: "plosive",
    voiced: false,
    defaultDuration: 0.06,
    noise: { amplitude: 0.45, formantShaping: [{ f: 2200, bw: 500 }] },
  },

  // Fricatives (all voiceless):
  {
    symbol: "f",
    type: "consonant" as const,
    consonantType: "fricative",
    voiced: false,
    defaultDuration: 0.07,
    noise: { amplitude: 0.35, formantShaping: [{ f: 2000, bw: 1000 }] },
  },
  {
    symbol: "s",
    type: "consonant" as const,
    consonantType: "fricative",
    voiced: false,
    defaultDuration: 0.08,
    noise: { amplitude: 0.4, formantShaping: [{ f: 7000, bw: 2000 }] },
  },
  {
    symbol: "sh",
    type: "consonant" as const,
    consonantType: "fricative",
    voiced: false,
    defaultDuration: 0.08,
    noise: { amplitude: 0.4, formantShaping: [{ f: 3500, bw: 1500 }] },
  },
  {
    symbol: "x",
    type: "consonant" as const,
    consonantType: "fricative",
    voiced: false,
    defaultDuration: 0.08,
    noise: { amplitude: 0.4, formantShaping: [{ f: 5000, bw: 2000 }] },
  },
  {
    symbol: "h",
    type: "consonant" as const,
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

  // Affricates (all voiceless, unaspirated/aspirated pairs):
  {
    symbol: "z",
    type: "consonant" as const,
    consonantType: "affricate",
    voiced: false,
    defaultDuration: 0.06,
    noise: { amplitude: 0.35, formantShaping: [{ f: 7000, bw: 2000 }] },
  },
  {
    symbol: "c",
    type: "consonant" as const,
    consonantType: "affricate",
    voiced: false,
    defaultDuration: 0.08,
    noise: { amplitude: 0.45, formantShaping: [{ f: 7000, bw: 2000 }] },
  },
  {
    symbol: "zh",
    type: "consonant" as const,
    consonantType: "affricate",
    voiced: false,
    defaultDuration: 0.06,
    noise: { amplitude: 0.35, formantShaping: [{ f: 3500, bw: 1500 }] },
  },
  {
    symbol: "ch",
    type: "consonant" as const,
    consonantType: "affricate",
    voiced: false,
    defaultDuration: 0.08,
    noise: { amplitude: 0.45, formantShaping: [{ f: 3500, bw: 1500 }] },
  },
  {
    symbol: "j",
    type: "consonant" as const,
    consonantType: "affricate",
    voiced: false,
    defaultDuration: 0.06,
    noise: { amplitude: 0.35, formantShaping: [{ f: 5000, bw: 2000 }] },
  },
  {
    symbol: "q",
    type: "consonant" as const,
    consonantType: "affricate",
    voiced: false,
    defaultDuration: 0.08,
    noise: { amplitude: 0.45, formantShaping: [{ f: 5000, bw: 2000 }] },
  },

  // Nasals:
  {
    symbol: "m",
    type: "consonant" as const,
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
  {
    symbol: "n",
    type: "consonant" as const,
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
    symbol: "ng",
    type: "consonant" as const,
    consonantType: "nasal",
    voiced: true,
    defaultDuration: 0.07,
    formants: [
      { f: 300, bw: 100 },
      { f: 900, bw: 200 },
      { f: 2400, bw: 250 },
    ],
    antiformants: [
      { f: 500, bw: 100 },
      { f: 2000, bw: 200 },
    ],
  },

  // Approximant:
  {
    symbol: "l",
    type: "consonant" as const,
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
    symbol: "r",
    type: "consonant" as const,
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
    symbol: "sil",
    type: "silence" as const,
    defaultDuration: 0.06,
  },
];

// Pinyin syllable -> phoneme decomposition.
// This maps every valid pinyin syllable (without tone) to its phoneme
// sequence.  The decomposition follows standard Chinese phonology:
//
//   (INITIAL) + FINAL
//
// Where the initial is one of: b p m f d t n l g k h j q x zh ch sh r z c s y w
// and the final decomposes further into medial + vowel + coda.
//
// We only list syllables where the decomposition is non-trivial or
// requires phoneme-level breaking (diphthongs, triphthongs, nasal codas,
// apical vowels).  Pure vowel syllables (a, o, e, etc.) and simple
// CV syllables (ba, po, mi, etc.) are handled by the generic rule below.
const pinyinG2P: Record<string, string[]> = {
  // Syllabic consonants (apical vowels):
  zhi: ["zh", "ir"],
  chi: ["ch", "ir"],
  shi: ["sh", "ir"],
  ri: ["r", "ir"],
  zi: ["z", "iz"],
  ci: ["c", "iz"],
  si: ["s", "iz"],

  // Retroflex final:
  er: ["er"],

  // Diphthong finals:
  ai: ["a", "i"],
  ei: ["e", "i"],
  ao: ["a", "o"],
  ou: ["o", "u"],

  // Nasal finals:
  an: ["a", "n"],
  en: ["e", "n"],
  ang: ["a", "ng"],
  eng: ["e", "ng"],
  ong: ["o", "ng"],

  // i-medial finals:
  ia: ["i", "a"],
  ie: ["i", "e"],
  io: ["i", "o"],
  iu: ["i", "o", "u"], // iou abbreviated
  in: ["i", "n"],
  ing: ["i", "ng"],
  iao: ["i", "a", "o"],
  ian: ["i", "e", "n"], // a->e mutation
  iang: ["i", "a", "ng"],
  iong: ["i", "o", "ng"],

  // u-medial finals:
  ua: ["u", "a"],
  uo: ["u", "o"],
  ui: ["u", "e", "i"], // uei abbreviated
  un: ["u", "e", "n"], // uen abbreviated
  uai: ["u", "a", "i"],
  uan: ["u", "a", "n"],
  uang: ["u", "a", "ng"],

  // ü-medial finals:
  ve: ["v", "e"], // üe
  van: ["v", "e", "n"], // üan has a->e mutation
  vn: ["v", "n"], // ün
  // yu, yue, yuan, yun handled by the y->v mapping below

  // Special: you abbreviation
  you: ["i", "o", "u"],
};

// Initials that cause y/w spelling changes:
//   y- prefix: i -> y (ya), i -> y (yi), ü -> yu (yu)
//   w- prefix: u -> w (wa), u -> w (wu)
// These are handled via substitution before lookup.
const INITIALS = new Set([
  "b",
  "p",
  "m",
  "f",
  "d",
  "t",
  "n",
  "l",
  "g",
  "k",
  "h",
  "j",
  "q",
  "x",
  "zh",
  "ch",
  "sh",
  "r",
  "z",
  "c",
  "s",
  "y",
  "w",
]);

const VOWELS = new Set(["a", "e", "i", "o", "u", "v"]);

/**
 * Convert a single pinyin syllable (without tone number) to phonemes.
 */
function pinyinToPhonemes(syllable: string): string[] {
  const s = syllable.toLowerCase().trim();
  if (!s) return [];

  // Check for direct lookup
  if (pinyinG2P[s]) return [...pinyinG2P[s]];

  // Pure vowel syllable (a, o, e, i, u, v, er)
  if (VOWELS.has(s)) return [s];
  if (s === "er") return ["er"];

  // Split into initial + final
  let initial = "";
  let final = s;

  // Try the longest initial match (zh, ch, sh before z, c, s, etc.)
  for (let len = 2; len >= 1; len--) {
    const candidate = s.slice(0, len);
    if (INITIALS.has(candidate) && candidate !== "y" && candidate !== "w") {
      initial = candidate;
      final = s.slice(len);
      break;
    }
  }

  // Handle y/w spelling changes
  if (!initial && (s.startsWith("y") || s.startsWith("w"))) {
    if (s.startsWith("yu")) {
      // yu -> v
      initial = "";
      final = "v" + s.slice(2);
    } else if (s === "yi") {
      initial = "";
      final = "i";
    } else if (s.startsWith("yi")) {
      initial = "";
      final = "i" + s.slice(2);
    } else if (s === "wu") {
      initial = "";
      final = "u";
    } else if (s.startsWith("wu")) {
      initial = "";
      final = "u" + s.slice(2);
    } else if (s.startsWith("y")) {
      initial = "";
      final = "i" + s.slice(1);
    } else if (s.startsWith("w")) {
      initial = "";
      final = "u" + s.slice(1);
    }
  }

  // If no initial found, treat whole syllable as final
  if (!initial) {
    // Map syllable-initial y/w back
    if (final.startsWith("yu")) final = "v" + final.slice(2);
    else if (final.startsWith("yi")) final = "i" + final.slice(2);
    else if (final.startsWith("y")) final = "i" + final.slice(1);
    else if (final.startsWith("wu")) final = "u" + final.slice(2);
    else if (final.startsWith("w")) final = "u" + final.slice(1);
  }

  // Look up the final in the G2P table
  const finalPhonemes = pinyinG2P[final] ?? (VOWELS.has(final) ? [final] : null);

  // Fallback: if the final is a single vowel, use it; otherwise try a simple split
  if (!finalPhonemes) {
    // Check if the whole syllable is a known phoneme sequence
    if (INITIALS.has(s) && s !== "y" && s !== "w") return [s];
    // Last resort: split into individual characters as phonemes
    return [...s].filter((ch) => ch !== " ").map((ch) => ch);
  }

  return initial ? [initial, ...finalPhonemes] : finalPhonemes;
}

// Pinyin finals (after y/w normalisation). Used to enumerate syllables for
// the voicebank reclists. Medial i/u/ü finals are listed in their phonemic
// form (ia, ua, ve, ...); y/w spelling is restored by pinyinOrthography.
const ZH_FINALS = [
  "a",
  "o",
  "e",
  "i",
  "u",
  "v",
  "er",
  "ai",
  "ei",
  "ao",
  "ou",
  "an",
  "en",
  "ang",
  "eng",
  "ong",
  "ia",
  "ie",
  "iao",
  "ian",
  "iang",
  "ing",
  "iu",
  "io",
  "iong",
  "in",
  "ua",
  "uo",
  "uai",
  "uan",
  "uang",
  "ui",
  "un",
  "ve",
  "van",
  "vn",
];

// Phonotactically valid onset sets per final ("" = zero onset). Encodes the
// standard Putonghua onset-rime constraints so the reclist only contains real
// syllables. (Apical syllables zhi/chi/shi/ri/zi/ci/si decompose to ir/iz and
// are covered by the ir/iz finals contained in the phoneme inventory.)
const ZH_FINAL_ONSETS: Record<string, string[]> = {
  a: ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  o: ["", "b", "p", "m", "f"],
  e: ["", "m", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  i: ["", "b", "p", "m", "d", "t", "n", "l", "j", "q", "x"],
  u: ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  v: ["", "n", "l", "j", "q", "x"],
  er: [""],
  ai: ["", "b", "p", "m", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "z", "c", "s"],
  ei: ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "z", "c", "s"],
  ao: ["", "b", "p", "m", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  ou: ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  an: ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  en: ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  ang: ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  eng: ["", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  ong: ["", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  ia: ["", "d", "t", "n", "l", "j", "q", "x"],
  ie: ["", "b", "p", "m", "d", "t", "n", "l", "j", "q", "x"],
  iao: ["", "b", "p", "m", "d", "t", "n", "l", "j", "q", "x"],
  ian: ["", "b", "p", "m", "d", "t", "n", "l", "j", "q", "x"],
  iang: ["", "n", "l", "j", "q", "x"],
  ing: ["", "b", "p", "m", "d", "t", "n", "l", "j", "q", "x"],
  iu: ["", "d", "t", "n", "l", "j", "q", "x"],
  io: [""],
  iong: ["", "j", "q", "x"],
  in: ["", "b", "p", "m", "d", "t", "n", "l", "j", "q", "x"],
  ua: ["", "g", "k", "h", "zh", "ch", "sh"],
  uo: ["", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  uai: ["", "g", "k", "h", "zh", "ch", "sh"],
  uan: ["", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  uang: ["", "g", "k", "h", "zh", "ch", "sh"],
  ui: ["", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  un: ["", "d", "t", "n", "l", "g", "k", "h", "zh", "ch", "sh", "r", "z", "c", "s"],
  ve: ["", "n", "l", "j", "q", "x"],
  van: ["", "j", "q", "x"],
  vn: ["", "j", "q", "x"],
};

// Nucleus vowels used as the "previous vowel" unit in VCV connections.
const ZH_NUCLEUS = ["a", "o", "e", "i", "u", "v"];

/** Render a (onset, final) pair in canonical pinyin orthography, applying the
 *  y/w spelling rules for zero onsets (yi, wu, yu, yue, yun, yuan, ying, yang,
 *  yong, wei, wen, wang, weng, you, wa, wo, yao, yan, yin, ...). */
function pinyinOrthography(onset: string, final: string): string {
  if (onset === "") {
    if (final === "i") return "yi";
    if (final === "u") return "wu";
    if (final === "v") return "yu";
    if (final === "ong") return "weng";
    if (final === "ve") return "yue";
    if (final === "vn") return "yun";
    if (final === "van") return "yuan";
    if (final.startsWith("i")) return "y" + final.slice(1);
    if (final.startsWith("u")) return "w" + final.slice(1);
    return final; // a, o, e, er
  }
  return onset + final;
}

/** Mandarin CV reclist: one sample per valid pinyin syllable (initial + final),
 *  aliases in canonical pinyin orthography (e.g. "ni", "hao", "wo"). */
function buildZhCv(): ReclistEntry[] {
  const out: ReclistEntry[] = [];
  for (const final of ZH_FINALS) {
    for (const onset of ZH_FINAL_ONSETS[final] ?? []) {
      const syllable = onset + final;
      const phonemes = pinyinToPhonemes(syllable);
      if (phonemes.length === 0) continue;
      out.push({ alias: pinyinOrthography(onset, final), phonemes });
    }
  }
  return out;
}

/** Mandarin VCV reclist: leading/ending finals, nucleus-vowel blends, and
 *  connections from each nucleus vowel to every valid syllable. Uses the
 *  nucleus set (a o e i u v) as the previous-vowel unit to keep the bank a
 *  tractable size while still covering natural Mandarin transitions. */
function buildZhVcv(): ReclistEntry[] {
  const out: ReclistEntry[] = [];
  for (const final of ZH_FINALS) {
    const lead = pinyinOrthography("", final);
    const leadPh = pinyinToPhonemes(final);
    if (leadPh.length === 0) continue;
    out.push({ alias: `- ${lead}`, phonemes: leadPh });
    out.push({ alias: `${lead} -`, phonemes: leadPh });
  }
  for (const f1 of ZH_NUCLEUS) {
    const p1 = pinyinToPhonemes(f1);
    if (p1.length === 0) continue;
    const a1 = pinyinOrthography("", f1);
    for (const f2 of ZH_NUCLEUS) {
      const p2 = pinyinToPhonemes(f2);
      if (p2.length === 0) continue;
      out.push({ alias: `${a1} ${pinyinOrthography("", f2)}`, phonemes: [...p1, ...p2] });
    }
    for (const final of ZH_FINALS) {
      for (const onset of ZH_FINAL_ONSETS[final] ?? []) {
        const sylPh = pinyinToPhonemes(onset + final);
        if (sylPh.length === 0) continue;
        out.push({ alias: `${a1} ${pinyinOrthography(onset, final)}`, phonemes: [...p1, ...sylPh] });
      }
    }
  }
  return out;
}

/** Mandarin Chinese (Putonghua) language module with pinyin-based phoneme
 *  inventory and full syllable decomposition (initial + final, including
 *  y/w spelling changes, apical vowels, and diphthong/triphthong codas).
 *  Tone markers are stripped from pinyin input and pitch contour is handled
 *  by the synthesis layer via note-level pitch bend. */
export const mandarin: LanguageModule = {
  id: "zh",
  name: "Mandarin Chinese",
  phonemes: new Map(cnPhonemes.map((p) => [p.symbol, p])),
  lyricToPhonemes(lyric: string): string[] {
    const clean = lyric.trim();
    if (!clean) return [];

    // Strip tone numbers (1-5) from the end of each syllable
    const noTone = clean.replace(/[1-5]$/, "");

    // Handle multi-syllable lyrics separated by spaces
    const syllables = noTone.split(/[\s_-]+/).filter(Boolean);
    return syllables.flatMap((syl) => pinyinToPhonemes(syl));
  },
  reclist(style: ReclistStyle): ReclistEntry[] {
    return style === "vcv" ? buildZhVcv() : buildZhCv();
  },
};
