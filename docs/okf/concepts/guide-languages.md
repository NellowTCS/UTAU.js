---
type: concept
title: Languages
description: "Built-in language support and how to add custom languages"
source: "https://nellowtcs.me/UTAU.js/docs/guide/languages/"
path: /guide/languages/
updated: 2026-08-15
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-08-15T05:13:33.415Z"
---
---
title: "Languages"
description: "Built-in language support and how to add custom languages"
---

## Built-in Languages

### English (en)

- **Phoneme set**: ARPAbet (39 phonemes: vowels, diphthongs, consonants)
- **G2P**: CMU Pronouncing Dictionary (compressed, ~130k entries)
- **Fallback**: Character-level mapping for unknown words
- **Data sources**: Peterson & Barney 1952 (vowel formants), Jongman et al. 2000 (fricative spectra), Stevens 1998 (plosive/nasal data)

### Japanese (jp)

- **Phoneme set**: IPA-like (vowels a/i/u/e/o, consonants including moraic N)
- **G2P**: Hiragana and romaji parsing + EDICT2 kanji lookup
- **Pitch accent**: Automatic accent resolution for prosody generation
- **Data sources**: Yamada et al. 2019 (vowel formants), Kitamura et al. 2009 (F3), standard acoustic-phonetics lit

### Mandarin (zh)

- **Phoneme set**: Pinyin-derived (6 vowels, 21 consonants + apical vowels)
- **G2P**: Pinyin syllable decomposition with y/w spelling changes and tone stripping
- **Tone handling**: Tone numbers (1-5) are stripped from pinyin input; pitch contour is expected to be handled by note-level pitch bend in the score
- **Data sources**: Wu 1990 (standard Mandarin formant values), general acoustic phonetics

## Using Language Modules

```typescript
import { japanese, english, mandarin, getLanguage } from "utaujs";

// Direct reference
renderScore(score, voice, japanese);  // or "jp"

// String lookup
const lang = getLanguage("eng");  // returns english module
renderScore(score, voice, lang);
```

## Registering a Custom Language

Implement the `LanguageModule` interface and register it:

```typescript
import { registerLanguage } from "utaujs";
import type { LanguageModule, PhonemeDef } from "utaujs";

const myLang: LanguageModule = {
  id: "custom",
  name: "My Language",
  phonemes: new Map([
    ["a", { symbol: "a", type: "vowel", voiced: true,
            formants: [{ f: 800, bw: 100 }, { f: 1200, bw: 150 },
                       { f: 2500, bw: 200 }, { f: 3500, bw: 250 },
                       { f: 4500, bw: 300 }] }],
    // ... more phonemes
  ]),
  lyricToPhonemes(lyric: string): string[] {
    // Your G2P logic here
    return [...lyric].filter(ch => this.phonemes.has(ch));
  },
};

registerLanguage(myLang);

// Now usable via "custom" string
const chunks = await renderScore(score, voice, "custom");
```

## Cross-Language Aliasing

The alias system maps language-specific phoneme symbols to a canonical IPA-like set. This is useful when a voicebank recorded for one language sings lyrics in another:

```typescript
import { toCanonical, sequenceToCanonical } from "utaujs";

// Map a single phoneme
toCanonical("en", "IY");   // -> "i"
toCanonical("jp", "sh");   // -> "S"

// Map a sequence
sequenceToCanonical("zh", ["zh", "ir"]);
// -> ["Z", "I"]
```
