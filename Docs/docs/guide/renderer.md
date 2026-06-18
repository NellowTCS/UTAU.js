---
title: "Renderer"
description: "How the synthesis engine produces audio from a score"
---

## Note Rendering Pipeline

When `renderNote()` processes a single note, it follows these steps:

### 1. Phoneme Resolution

The note's lyric string is passed to the language module's `lyricToPhonemes()` function, which returns an array of phoneme symbols:

```typescript
// Japanese: "こ" -> ["k", "o"]
// English:  "hello" -> ["HH", "AH", "L", "OW"]
// Mandarin: "ni3" -> ["n", "i"]  (tone stripped)
```

Each symbol is looked up in the language module's phoneme map to get a `PhonemeDef` with formant targets, noise parameters, duration defaults, and voicing state.

### 2. Duration Allocation

Phoneme durations are allocated from the note's total sample length:

- Consonants and silence get their `defaultDuration` (capped at 40% of the note)
- Vowels split the remaining time equally
- If the note is very short, all durations are scaled proportionally

### 3. Glottal Pulse Generation

For each sample, the LF glottal source computes a pulse based on:

- **F0**: base pitch from `noteNum`, modulated by pitch bend, vibrato, and accent
- **OQ/SQ/Tenseness**: from `VoiceConfig.glottal`
- **Jitter/Shimmer**: random cycle-to-cycle variation (adds natural instability)

The LF model produces the differentiated glottal flow: sinusoidal opening, a return phase with exponential decay modulated by a sinusoid for C1 continuity, and a closed phase (silence).

### 4. Formant Filtering

The glottal signal passes through a cascaded formant filter (anti-resonators first, then resonators, matching the source-filter model). Formant targets are interpolated:

- Between successive phonemes (cross-fade over ~30ms)
- Within diphthongs (sweep from onset to end formants)

Formant coefficients are updated at intervals of ~5ms to balance CPU usage against spectral accuracy.

### 5. Noise Mixing

Consonants add shaped noise:

- **Fricatives**: noise filtered through resonant peaks at the fricative's spectral centre
- **Plosives**: short noise burst with fast decay
- **Aspiration**: low-passed noise mixed into vowels (controlled by `glottal.aspiration`)

### 6. Envelope and Normalisation

Each phoneme gets a smooth amplitude envelope (attack/decay). The entire note is then normalised to prevent clipping, scaled by a gain factor derived from the peak sample.

## Cross-Note Continuity

The renderer returns both the `AudioChunk` and the final formant targets of the last phoneme. The streamer passes these as `prevFormants` to the next note, enabling smooth formant transitions across note boundaries.

## Performance

- Single-note rendering is O(n) in note duration
- The heaviest operations per sample are: glottal pulse computation, formant cascade (2 cascades × 5 filters each), and noise shaping
- For typical scores (tempo 120, 480 ticks/note), a note renders in under 1ms on modern hardware
