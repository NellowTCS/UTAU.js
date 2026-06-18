/**
 * Cross-language phoneme alias map.
 *
 * Each language defines its own phoneme symbols (ARPAbet for English,
 * IPA-like for Japanese, pinyin-based for Mandarin, etc.).  The alias map
 * provides a bridge: it maps a source-language phoneme symbol to a
 * canonical IPA-like target that represents the *acoustic target*.
 *
 * This is useful when a UTAU voicebank recorded for one language is used
 * to sing lyrics in another language, the synthesis layer uses the
 * canonical target's formant/noise data rather than the source language's.
 *
 * The canonical set is a subset of IPA with roughly 40 symbols covering
 * the most common acoustic targets across English, Japanese, and Mandarin:
 *
 *   Vowels:  i  y  e  ø  E  a  A  O  o  u  @  V  er  Y  I  U  ei  ai  au  ou  oi
 *   Consonants: p b t d k g f v T D s z S Z h C j m n N l r w
 *
 * Each language module exposes its alias table; the engine can look it up
 *
 * This file defines the per-language tables.  New languages add their own
 * mapping.
 */

export type LangCode = "en" | "jp" | "zh";

// Each canonical symbol appears only once per table.  When the same phoneme
// symbol is used across languages (e.g. Japanese /i/ and Mandarin /i/ both map
// to canonical "i"), the single entry covers all.
const CANONICAL_VOWELS: Record<string, string> = {
  // English uppercase
  IY: "i",
  IH: "I",
  EY: "ei",
  EH: "E",
  AE: "Y",
  AA: "A",
  AO: "O",
  OW: "ou",
  UH: "U",
  UW: "u",
  AH: "V",
  ER: "er",
  AY: "ai",
  AW: "au",
  OY: "oi",

  // Shared lowercase vowels (Japanese, Mandarin)
  i: "i",
  e: "e",
  a: "a",
  o: "o",
  u: "u",
  ir: "I",
  iz: "I",
  v: "y", // ü
  er: "er",
};

// All consonant phonemes from English (ARPAbet uppercase), Japanese, and
// Mandarin, combined
const CANONICAL_CONSONANTS: Record<string, string> = {
  // English (ARPAbet)
  P: "p",
  B: "b",
  T: "t",
  D: "d",
  K: "k",
  G: "g",
  F: "f",
  V: "v",
  TH: "T",
  DH: "D",
  S: "s",
  Z: "z",
  SH: "S",
  ZH: "Z",
  HH: "h",
  CH: "C",
  JH: "j",
  M: "m",
  N: "n", // English N (e.g. "N" in "knee")
  NG: "N",
  L: "l",
  R: "r",
  Y: "j",
  W: "w",

  // Japanese / Mandarin (lowercase)
  b: "b",
  p: "p",
  m: "m",
  f: "f",
  d: "d",
  t: "t",
  n: "n",
  l: "l",
  g: "k",
  k: "k",
  h: "h",
  ts: "ts",
  s: "s",
  z: "z",
  sh: "S",
  ch: "C",
  j: "j",
  y: "j",
  r: "r",
  w: "w",
  c: "ts",
  zh: "Z",
  q: "C",
  x: "S",
  ng: "N",
};

type AliasTable = Record<string, string>;

const enAliases: AliasTable = { ...CANONICAL_VOWELS, ...CANONICAL_CONSONANTS };

const JP_SYMBOLS = new Set([
  "i",
  "e",
  "a",
  "o",
  "u",
  "k",
  "g",
  "s",
  "z",
  "t",
  "d",
  "n",
  "h",
  "b",
  "p",
  "m",
  "y",
  "r",
  "w",
  "sh",
  "ch",
  "ts",
  "f",
  "j",
  "l",
  "N",
]);

const ZH_SYMBOLS = new Set([
  "a",
  "o",
  "e",
  "i",
  "u",
  "v",
  "er",
  "ir",
  "iz",
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
  "ng",
]);

const jpAliases: AliasTable = {};
for (const [sym, canonical] of Object.entries(CANONICAL_VOWELS)) {
  if (JP_SYMBOLS.has(sym)) jpAliases[sym] = canonical;
}
for (const [sym, canonical] of Object.entries(CANONICAL_CONSONANTS)) {
  if (JP_SYMBOLS.has(sym)) jpAliases[sym] = canonical;
}

const zhAliases: AliasTable = {};
for (const [sym, canonical] of Object.entries(CANONICAL_VOWELS)) {
  if (ZH_SYMBOLS.has(sym)) zhAliases[sym] = canonical;
}
for (const [sym, canonical] of Object.entries(CANONICAL_CONSONANTS)) {
  if (ZH_SYMBOLS.has(sym)) zhAliases[sym] = canonical;
}

const tables: Record<LangCode, AliasTable> = {
  en: enAliases,
  jp: jpAliases,
  zh: zhAliases,
};

/**
 * Map a language-specific phoneme symbol to its canonical IPA target.
 * Returns `undefined` if no mapping exists.
 */
export function toCanonical(lang: LangCode, phoneme: string): string | undefined {
  return tables[lang]?.[phoneme];
}

/**
 * Map a phoneme sequence for a given language to canonical IPA symbols.
 */
export function sequenceToCanonical(lang: LangCode, phonemes: string[]): (string | undefined)[] {
  return phonemes.map((p) => toCanonical(lang, p));
}

export { tables };
