---
type: api
title: "VoiceConfig Reference"
description: "Complete reference for all VoiceConfig parameters and their perceptual effects"
source: "https://nellowtcs.me/UTAU.js/docs/api/voice-config/"
path: /api/voice-config/
updated: 2026-08-15
okf:
  generated_by: "@docmd/plugin-okf"
  generated_at: "2026-08-15T05:13:33.413Z"
---
---
title: "VoiceConfig Reference"
description: "Complete reference for all VoiceConfig parameters and their perceptual effects"
---

## Overview

`VoiceConfig` is the central configuration object passed to every render call. It bundles glottal source parameters, formant transformations, vibrato, and output format settings.

```typescript
interface VoiceConfig {
  name: string;
  glottal: GlottalConfig;
  formant: FormantConfig;
  vibrato: VibratoConfig;
  sampleRate: number;
  channels: 1 | 2;
}
```

## GlottalConfig (Glottal Source)

The glottal source generates the raw pulse train. Its parameters control the shape and stability of the vocal-fold oscillation.

```typescript
interface GlottalConfig {
  openQuotient: number;   // 0.2 - 0.9
  speedQuotient: number;  // 0.3 - 3.0
  tenseness: number;      // 0 - 1
  aspiration: number;     // 0 - 0.3
  power: number;          // 0 - 1
  jitter?: number;        // 0 - 0.05
}
```

### openQuotient

Fraction of the glottal cycle during which the vocal folds are open.

| Value | Perceptual Effect                       |
|-------|-----------------------------------------|
| ~0.3  | Pressed, tense voice (short open phase) |
| ~0.5  | Neutral, modal voice                    |
| ~0.7  | Breathy, soft voice (long open phase)   |
| >0.8  | Very breathy, almost whisper-like       |

Female voices typically use higher OQ (~0.52) than male voices (~0.4).

### speedQuotient

Ratio of the glottal opening duration to closing duration. Controls the skew of the glottal pulse.

| Value | Perceptual Effect                     |
|-------|---------------------------------------|
| ~0.5  | Slow closing, darker timbre           |
| ~1.0  | Neutral balance                       |
| ~2.0  | Fast closing, brighter, more "twangy" |
| >2.5  | Very sharp closure, buzzy             |

### tenseness

Spectral tilt control. Higher values attenuate the high-frequency content of the glottal source.

| Value | Perceptual Effect                     |
|-------|---------------------------------------|
| ~0.2  | Very bright, thin (low spectral tilt) |
| ~0.5  | Neutral balance                       |
| ~0.7  | Dark, warm (higher spectral tilt)     |
| >0.8  | Very dark, muffled                    |

### aspiration

Amount of turbulence noise mixed into the glottal source. Simulates incomplete glottal closure.

| Value | Perceptual Effect                            |
|-------|----------------------------------------------|
| 0     | Clean, no audible aspiration                 |
| ~0.05 | Slight breathiness (natural for most voices) |
| ~0.15 | Noticeably breathy                           |
| >0.25 | Very breathy, significant noise floor        |

The aspiration noise is low-passed at ~4 kHz to stay in the natural band.

### power

Overall gain multiplier for the glottal pulse before formant filtering.

| Value | Perceptual Effect |
|-------|-------------------|
| ~0.5  | Quiet, soft       |
| ~0.7  | Moderate volume   |
| ~0.9  | Loud, full        |

Power interacts with the post-render normalisation: higher power produces a higher peak, which is then scaled back by the gain limiter.

### jitter

Random cycle-to-cycle variation in fundamental frequency and amplitude. Adds natural instability.

| Value | Perceptual Effect                                 |
|-------|---------------------------------------------------|
| 0     | Perfectly stable (robotic)                        |
| ~0.01 | Very slight natural variation                     |
| ~0.02 | Noticeable roughness (typical for natural voices) |
| >0.03 | Rough, hoarse                                     |

Both F0 jitter (frequency variation) and shimmer (amplitude variation) scale with this parameter.

## FormantConfig (Vocal Tract)

The formant config applies a global transformation to all phoneme formant targets. This is equivalent to changing the size or shape of the vocal tract.

```typescript
interface FormantConfig {
  scale: number;      // 0.5 - 2.0 (typically 0.8 - 1.2)
  shift: number;      // -12 - +12 semitones
  bandwidth: number;  // 0.5 - 2.0
}
```

### scale

Multiplicative scale factor on all formant centre frequencies. Simulates vocal-tract length scaling.

| Value | Perceptual Effect                              |
|-------|------------------------------------------------|
| ~0.8  | Larger vocal tract, darker, "more masculine"   |
| 1.0   | Neutral (no change)                            |
| ~1.2  | Smaller vocal tract, brighter, "more feminine" |
| ~1.5  | Very small vocal tract, "child-like"           |

A scale of 1.18 is used by the female voice preset to produce the typical female formant shift.

### shift

Additive formant shift in semitones, applied after scaling. Finer control than scale.

| Value | Perceptual Effect    |
|-------|----------------------|
| -6    | Darker, more muffled |
| 0     | Neutral              |
| +6    | Brighter, more nasal |

### bandwidth

Multiplier on all formant bandwidths. Controls the width of resonant peaks.

| Value | Perceptual Effect                    |
|-------|--------------------------------------|
| ~0.6  | Narrow resonances, ringing, "twangy" |
| 1.0   | Neutral                              |
| ~1.5  | Wide resonances, muffled, soft       |
| >2.0  | Very wide, formants blur together    |

## VibratoConfig (Pitch Modulation)

```typescript
interface VibratoConfig {
  rate: number;    // Hz (typically 4 - 7)
  depth: number;   // cents (typically 10 - 80)
  attack: number;  // seconds (0 - 2)
}
```

### rate

Frequency of the vibrato oscillation in Hz (cycles per second).

| Value | Perceptual Effect              |
|-------|--------------------------------|
| ~4    | Slow, wide vibrato (classical) |
| ~5.5  | Moderate vibrato (male pop)    |
| ~6    | Moderate vibrato (female pop)  |
| >7    | Fast, tremolo-like             |

### depth

Peak-to-peak depth of the pitch modulation in cents (100 cents = 1 semitone).

| Value | Perceptual Effect               |
|-------|---------------------------------|
| ~10   | Very subtle, barely perceptible |
| ~30   | Moderate vibrato                |
| ~50   | Wide, expressive vibrato        |
| >80   | Extreme, wobbling               |

### attack

Time in seconds for the vibrato to reach full depth after the note onset.

| Value | Perceptual Effect                  |
|-------|------------------------------------|
| 0     | Vibrato starts instantly           |
| ~0.1  | Quick onset (pop style)            |
| ~0.3  | Gradual onset (classical style)    |
| >0.5  | Late vibrato, note starts straight |

## Output Format

```typescript
sampleRate: number;  // 22050 - 96000 (typical: 44100)
channels: 1 | 2;     // 1 = mono, 2 = stereo
```

### sampleRate

Output sample rate in Hz. 44100 is the standard CD quality. Lower rates (22050) save CPU at the cost of high-frequency content.

### channels

- **1**: Mono output (single Float32Array per chunk)
- **2**: Stereo output (identical data in both channels)

## Voice Presets

The library ships with two built-in presets:

### Male Voice

```typescript
{
  glottal: { openQuotient: 0.4, speedQuotient: 0.65, tenseness: 0.65, aspiration: 0.05, power: 0.75, jitter: 0.01 },
  formant: { scale: 1.0, shift: 0, bandwidth: 1.0 },
  vibrato: { rate: 5.5, depth: 30, attack: 0.15 },
}
```

### Female Voice

```typescript
{
  glottal: { openQuotient: 0.52, speedQuotient: 1.1, tenseness: 0.48, aspiration: 0.08, power: 0.65, jitter: 0.02 },
  formant: { scale: 1.18, shift: 0, bandwidth: 1.0 },
  vibrato: { rate: 6.0, depth: 40, attack: 0.1 },
}
```

## Perceptual Scaling

The `scaleVoice()` function maps high-level perceptual controls to the underlying parameters:

```typescript
const adjusted = scaleVoice(femaleVoice, {
  gender: 0.3,        // More feminine (formant scale + SQ)
  breathiness: 0.4,   // Increase OQ + aspiration
  tension: 0.6,       // Increase tenseness
  brightness: 0.7,    // Reduce formant bandwidth
  vibratoAmount: 0.8, // Scale vibrato depth
});
```

## Building Custom Voices

Use `buildVoice()` with partial overrides for a neutral starting point:

```typescript
const myVoice = buildVoice({
  name: "Custom",
  sampleRate: 48000,
  glottal: { openQuotient: 0.6, aspiration: 0.1 },
});
```

All unspecified fields fall through to neutral defaults.
