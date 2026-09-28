export type LangCode = "en" | "jp" | "zh";

const CANONICAL_VOWELS: Record<string, string> = {
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

  i: "i",
  e: "e",
  a: "a",
  o: "o",
  u: "u",
  ir: "I",
  iz: "I",
  v: "y",
  er: "er",
};

const CANONICAL_CONSONANTS: Record<string, string> = {
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
  N: "n",
  NG: "N",
  L: "l",
  R: "r",
  Y: "j",
  W: "w",

  b: "b",
  p: "p",
  m: "m",
  f: "f",
  d: "d",
  t: "t",
  n: "n",
  l: "l",
  g: "g",
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

export const REST_LYRIC = "R";

export const REST_PHONEME = "sil";

export function isRestLyric(lyric: string): boolean {
  return lyric.trim() === REST_LYRIC;
}

export function toCanonical(lang: LangCode, phoneme: string): string | undefined {
  return tables[lang]?.[phoneme];
}

export function sequenceToCanonical(lang: LangCode, phonemes: string[]): (string | undefined)[] {
  return phonemes.map((p) => toCanonical(lang, p));
}

export { tables };
