import type { PhonemeDef, LanguageModule } from "../core/types"

// English (ARPAbet) phoneme data.
//
// I'm going to be responsible and cite my sources, gasp:
// Vowel formant targets: Peterson & Barney 1952, mean values for 33 male
// speakers (the "standard P&B table" as reproduced by e.g. CCRMA Stanford and
// the Praat phonetics software).
//   Peterson, G.E. & Barney, H.L. (1952). "Control methods used in a study of
//   the vowels". JASA 24, 175–184.
//   Praat implementation: https://praat.org/manual/Create_formant_table__Peterson___Barney_1952_.html
//   CCRMA table: https://ccrma.stanford.edu/~kglee/m220c/formant.html
//
// Consonant noise centre frequencies: general acoustic-phonetics literature.
// Sibilant spectral peaks follow Jongman et al. (2000):
//   Jongman, A., Wayland, R., & Wong, S. "Acoustic and perceptual properties
//   of English fricatives". ICSLP 2000.
// Plosive burst loci and nasal formant/antiformant values are standard
// textbook values (Stevens 1998, Ladefoged 2006).
//
// ARPAbet phoneme set:
//   https://en.wikipedia.org/wiki/ARPABET
//   CMU Pronouncing Dictionary: http://www.speech.cs.cmu.edu/cgi-bin/cmudict
//
// G2P lexicon: a smol subset of ~100 common English words. 
// I should expand this at some point, but it's good enough for testing purposes for now.  
// (And I guess it's kind of fun to have a "core vocabulary" of words that the synthesizer can reliably pronounce, 
// even if it doesn't cover every possible word.)

const baseVowel = (symbol: string, f1: number, f2: number, f3: number, bw1 = 80, bw2 = 100, bw3 = 120): PhonemeDef => ({
  symbol, type: "vowel", voiced: true, defaultDuration: 0.12,
  formants: [{ f: f1, bw: bw1 }, { f: f2, bw: bw2 }, { f: f3, bw: bw3 }, { f: 3500, bw: 200 }, { f: 4500, bw: 300 }],
})

const enPhonemes: PhonemeDef[] = [
  // Vowels:
  // (P&B 1952 male means)
  baseVowel("IY", 270, 2290, 3010, 60, 90, 120),
  baseVowel("IH", 390, 1990, 2550),
  baseVowel("EH", 530, 1840, 2480),
  baseVowel("AE", 660, 1720, 2410),
  baseVowel("AA", 730, 1090, 2440),
  baseVowel("AO", 570, 840, 2410),
  baseVowel("UH", 440, 1020, 2240),
  baseVowel("UW", 300, 870, 2240, 60, 80, 110),
  baseVowel("AH", 640, 1190, 2390),
  {
    symbol: "ER", type: "vowel", voiced: true, defaultDuration: 0.12,
    formants: [{ f: 490, bw: 100 }, { f: 1350, bw: 150 }, { f: 1690, bw: 150 }, { f: 3500, bw: 200 }, { f: 4500, bw: 300 }]
  },

  // Diphthongs:
  // (approximate, derived from P&B endpoints)
  {
    symbol: "AY", type: "diphthong", voiced: true, defaultDuration: 0.15,
    formants: [{ f: 730, bw: 100 }, { f: 1300, bw: 150 }, { f: 2600, bw: 150 }, { f: 3500, bw: 200 }, { f: 4500, bw: 300 }]
  },
  {
    symbol: "EY", type: "diphthong", voiced: true, defaultDuration: 0.14,
    formants: [{ f: 550, bw: 100 }, { f: 1850, bw: 150 }, { f: 2600, bw: 150 }, { f: 3500, bw: 200 }, { f: 4500, bw: 300 }]
  },
  {
    symbol: "OY", type: "diphthong", voiced: true, defaultDuration: 0.15,
    formants: [{ f: 500, bw: 100 }, { f: 1200, bw: 150 }, { f: 2550, bw: 150 }, { f: 3500, bw: 200 }, { f: 4500, bw: 300 }]
  },
  {
    symbol: "AW", type: "diphthong", voiced: true, defaultDuration: 0.15,
    formants: [{ f: 700, bw: 100 }, { f: 1200, bw: 150 }, { f: 2550, bw: 150 }, { f: 3500, bw: 200 }, { f: 4500, bw: 300 }]
  },

  // Plosives:
  // Burst centre frequencies (so fancy): /p,b/ ~800 Hz (labial), /t,d/ ~4 kHz (alveolar),
  // /k,g/ ~2 kHz (velar).  Stevens (1998) Acoustic Phonetics, MIT Press.
  { symbol: "P", type: "consonant", consonantType: "plosive", voiced: false, defaultDuration: 0.05, noise: { amplitude: 0.3, formantShaping: [{ f: 800, bw: 400 }] } },
  { symbol: "B", type: "consonant", consonantType: "plosive", voiced: true, defaultDuration: 0.05, noise: { amplitude: 0.2, formantShaping: [{ f: 800, bw: 400 }] } },
  { symbol: "T", type: "consonant", consonantType: "plosive", voiced: false, defaultDuration: 0.05, noise: { amplitude: 0.35, formantShaping: [{ f: 4000, bw: 1000 }] } },
  { symbol: "D", type: "consonant", consonantType: "plosive", voiced: true, defaultDuration: 0.05, noise: { amplitude: 0.25, formantShaping: [{ f: 4000, bw: 1000 }] } },
  { symbol: "K", type: "consonant", consonantType: "plosive", voiced: false, defaultDuration: 0.06, noise: { amplitude: 0.3, formantShaping: [{ f: 2000, bw: 500 }] } },
  { symbol: "G", type: "consonant", consonantType: "plosive", voiced: true, defaultDuration: 0.06, noise: { amplitude: 0.2, formantShaping: [{ f: 2000, bw: 500 }] } },

  // Fricatives:
  // Spectral peak locations (Jongman et al. 2000):
  // /s,z/ ~4-5 kHz (spectral mean ~5-6 kHz); /ʃ,ʒ/ ~2.5-3.5 kHz;
  // /f,v/ diffuse 2-4 kHz; /θ,ð/ ~4-5 kHz.
  { symbol: "S", type: "consonant", consonantType: "fricative", voiced: false, defaultDuration: 0.08, noise: { amplitude: 0.4, formantShaping: [{ f: 7000, bw: 2000 }] } },
  { symbol: "Z", type: "consonant", consonantType: "fricative", voiced: true, defaultDuration: 0.08, noise: { amplitude: 0.3, formantShaping: [{ f: 6000, bw: 2000 }] } },
  { symbol: "SH", type: "consonant", consonantType: "fricative", voiced: false, defaultDuration: 0.08, noise: { amplitude: 0.4, formantShaping: [{ f: 3500, bw: 1500 }] } },
  { symbol: "ZH", type: "consonant", consonantType: "fricative", voiced: true, defaultDuration: 0.08, noise: { amplitude: 0.3, formantShaping: [{ f: 3500, bw: 1500 }] } },
  { symbol: "F", type: "consonant", consonantType: "fricative", voiced: false, defaultDuration: 0.07, noise: { amplitude: 0.35, formantShaping: [{ f: 2000, bw: 1000 }] } },
  { symbol: "V", type: "consonant", consonantType: "fricative", voiced: true, defaultDuration: 0.07, noise: { amplitude: 0.25, formantShaping: [{ f: 2000, bw: 1000 }] } },
  { symbol: "TH", type: "consonant", consonantType: "fricative", voiced: false, defaultDuration: 0.06, noise: { amplitude: 0.3, formantShaping: [{ f: 4000, bw: 1000 }] } },
  { symbol: "DH", type: "consonant", consonantType: "fricative", voiced: true, defaultDuration: 0.06, noise: { amplitude: 0.2, formantShaping: [{ f: 4000, bw: 1000 }] } },
  { symbol: "HH", type: "consonant", consonantType: "fricative", voiced: false, defaultDuration: 0.06, noise: { amplitude: 0.25 } },

  // Nasals:
  // Formant/antiformant values: Stevens (1998), Fujimura (1962).
  {
    symbol: "M", type: "consonant", consonantType: "nasal", voiced: true, defaultDuration: 0.07,
    formants: [{ f: 280, bw: 100 }, { f: 1100, bw: 200 }, { f: 2400, bw: 250 }], antiformants: [{ f: 350, bw: 100 }]
  },
  {
    symbol: "N", type: "consonant", consonantType: "nasal", voiced: true, defaultDuration: 0.07,
    formants: [{ f: 300, bw: 100 }, { f: 1300, bw: 200 }, { f: 2600, bw: 250 }], antiformants: [{ f: 450, bw: 100 }]
  },
  {
    symbol: "NG", type: "consonant", consonantType: "nasal", voiced: true, defaultDuration: 0.07,
    formants: [{ f: 300, bw: 100 }, { f: 900, bw: 200 }, { f: 2400, bw: 250 }], antiformants: [{ f: 500, bw: 100 }, { f: 2000, bw: 200 }]
  },

  // Approximants:
  {
    symbol: "L", type: "consonant", consonantType: "approximant", voiced: true, defaultDuration: 0.06,
    formants: [{ f: 400, bw: 150 }, { f: 1300, bw: 250 }, { f: 2800, bw: 250 }]
  },
  {
    symbol: "R", type: "consonant", consonantType: "approximant", voiced: true, defaultDuration: 0.06,
    formants: [{ f: 400, bw: 200 }, { f: 1300, bw: 300 }, { f: 2400, bw: 250 }]
  },
  { symbol: "Y", type: "consonant", consonantType: "approximant", voiced: true, defaultDuration: 0.05 },
  { symbol: "W", type: "consonant", consonantType: "approximant", voiced: true, defaultDuration: 0.05 },

  // Affricates:
  { symbol: "CH", type: "consonant", consonantType: "affricate", voiced: false, defaultDuration: 0.08, noise: { amplitude: 0.35, formantShaping: [{ f: 3500, bw: 1500 }] } },
  { symbol: "JH", type: "consonant", consonantType: "affricate", voiced: true, defaultDuration: 0.07, noise: { amplitude: 0.25, formantShaping: [{ f: 3500, bw: 1500 }] } },
]

const g2p: Record<string, string[]> = {
  "I": ["IY"], "YOU": ["Y", "UW"], "HE": ["HH", "IY"], "SHE": ["SH", "IY"], "WE": ["W", "IY"],
  "THEY": ["DH", "EY"], "ME": ["M", "IY"], "A": ["AH"], "AN": ["AE", "N"], "THE": ["DH", "AH"],
  "AND": ["AE", "N", "D"], "OR": ["AO", "R"], "IN": ["IH", "N"], "ON": ["AA", "N"], "AT": ["AE", "T"],
  "TO": ["T", "UW"], "FOR": ["F", "AO", "R"], "WITH": ["W", "IH", "DH"], "OF": ["AH", "V"],
  "IS": ["IH", "Z"], "IT": ["IH", "T"], "THIS": ["DH", "IH", "S"], "THAT": ["DH", "AE", "T"],
  "NOT": ["N", "AA", "T"], "ARE": ["AA", "R"], "WAS": ["W", "AA", "Z"], "BE": ["B", "IY"],
  "HAVE": ["HH", "AE", "V"], "HAS": ["HH", "AE", "Z"], "DO": ["D", "UW"], "WILL": ["W", "IH", "L"],
  "CAN": ["K", "AE", "N"], "GO": ["G", "OW"], "COME": ["K", "AH", "M"], "SEE": ["S", "IY"],
  "KNOW": ["N", "OW"], "GET": ["G", "EH", "T"], "MAKE": ["M", "EY", "K"], "LIKE": ["L", "AY", "K"],
  "LOVE": ["L", "AH", "V"], "WANT": ["W", "AA", "N", "T"], "HELLO": ["HH", "EH", "L", "OW"],
  "WORLD": ["W", "ER", "L", "D"], "GOOD": ["G", "UH", "D"], "BAD": ["B", "AE", "D"],
  "BIG": ["B", "IH", "G"], "SMALL": ["S", "M", "AO", "L"], "ALL": ["AO", "L"],
  "MY": ["M", "AY"], "YOUR": ["Y", "AO", "R"], "OUR": ["AW", "R"], "THEIR": ["DH", "EH", "R"],
  "HIS": ["HH", "IH", "Z"], "HER": ["HH", "ER"], "UP": ["AH", "P"], "DOWN": ["D", "AW", "N"],
  "LEFT": ["L", "EH", "F", "T"], "RIGHT": ["R", "AY", "T"], "OUT": ["AW", "T"], "OFF": ["AO", "F"],
  "ONLY": ["OW", "N", "L", "IY"], "JUST": ["JH", "AH", "S", "T"],
  "SUN": ["S", "AH", "N"], "MOON": ["M", "UW", "N"], "STAR": ["S", "T", "AA", "R"],
  "SKY": ["S", "K", "AY"], "SEA": ["S", "IY"], "MUSIC": ["M", "Y", "UW", "Z", "IH", "K"],
  "SONG": ["S", "AO", "NG"], "SING": ["S", "IH", "NG"], "RING": ["R", "IH", "NG"],
  "DAWN": ["D", "AO", "N"], "DARK": ["D", "AA", "R", "K"], "LIGHT": ["L", "AY", "T"],
  "NIGHT": ["N", "AY", "T"], "DAY": ["D", "EY"], "TIME": ["T", "AY", "M"],
  "HEART": ["HH", "AA", "R", "T"], "MIND": ["M", "AY", "N", "D"],
  "DREAM": ["D", "R", "IY", "M"], "LIFE": ["L", "AY", "F"],
  "EARTH": ["ER", "TH"], "FIRE": ["F", "AY", "R"], "WATER": ["W", "AO", "T", "ER"],
  "WIND": ["W", "IH", "N", "D"], "RAIN": ["R", "EY", "N"], "SNOW": ["S", "N", "OW"],
  "TRUE": ["T", "R", "UW"], "FREE": ["F", "R", "IY"], "PEACE": ["P", "IY", "S"],
  "HOPE": ["HH", "OW", "P"], "JOY": ["JH", "OY"],
  "NEVER": ["N", "EH", "V", "ER"], "ALWAYS": ["AO", "L", "W", "EY", "Z"],
  "AGAIN": ["AH", "G", "EH", "N"], "HAPPY": ["HH", "AE", "P", "IY"], "SAD": ["S", "AE", "D"],
  "KIND": ["K", "AY", "N", "D"], "STRONG": ["S", "T", "R", "AO", "NG"],
  "NOTHING": ["N", "AH", "TH", "IH", "NG"], "EVERYTHING": ["EH", "V", "R", "IY", "TH", "IH", "NG"],
  "BEAUTIFUL": ["B", "Y", "UW", "T", "IH", "F", "UH", "L"],
  "WONDERFUL": ["W", "AH", "N", "D", "ER", "F", "UH", "L"],
  "FOREVER": ["F", "AO", "R", "EH", "V", "ER"],
  "TOGETHER": ["T", "UW", "G", "EH", "DH", "ER"],
  "REMEMBER": ["R", "IH", "M", "EH", "M", "B", "ER"],
}

export const english: LanguageModule = {
  id: "en", name: "English",
  phonemes: new Map(enPhonemes.map((p) => [p.symbol, p])),
  lyricToPhonemes(lyric: string): string[] {
    const clean = lyric.trim().toUpperCase()
    if (g2p[clean]) return [...g2p[clean]]
    const parts = clean.split(/[\s_-]+/).filter(Boolean)
    if (parts.every((p) => this.phonemes.has(p))) return parts
    const simple: Record<string, string> = {
      "A": "AA", "B": "B", "D": "D", "E": "EH", "F": "F", "G": "G",
      "H": "HH", "I": "IH", "K": "K", "L": "L", "M": "M", "N": "N",
      "O": "AA", "P": "P", "R": "R", "S": "S", "T": "T", "U": "AH",
      "V": "V", "W": "W", "Y": "Y", "Z": "Z",
    }
    const mapped = [...clean].map((c) => simple[c]).filter(Boolean)
    return mapped.length > 0 ? mapped : ["AH"]
  },
}
