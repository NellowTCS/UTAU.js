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
  speedQuotient: number;  // 1.3 - 3.0 (see below for why the lower bound exists)
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
It maps to `Tp = Te * sq / (1 + sq)`, the time of the glottal flow minimum within the open phase.

**Valid range is 1.3 and up.** The opening phase is
`E0 * exp(alpha*t) * sin(w_g*t)` with `w_g = pi/Tp`, so it sweeps `w_g*Te` radians over
the open phase. The LF model is only well posed while that sweep stays in `(pi, 2pi)`,
which means `Tp` must exceed `Te/2`, which means `sq` must exceed 1. At `sq = 0.5` and
`sq = 1` exactly, `sin(w_g*Te)` is zero and the amplitude `E0` diverges. Below 1 the
opening completes an extra whole cycle and the continuity equation has no real root.
Values under 1.22 are therefore clamped to the nearest valid configuration.

| Value | Perceptual Effect                     |
|-------|---------------------------------------|
| ~1.4  | Slowest valid closure, dark, rounded  |
| ~2.0  | Natural, balanced                     |
| ~2.5  | Brighter, crisper onset               |
| >3.0  | Very sharp closure, buzzy             |

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
| ~0.02 | Slight breathiness (natural for most voices)  |
| ~0.05 | Noticeably breathy                            |
| >0.1  | Very breathy, significant noise floor         |

The aspiration noise is low-passed at ~4 kHz to stay in the natural band. It is shaped by two resonators whose peak gain is several times the nominal amplitude, so values above ~0.05 add an audible hiss in the 3-4.5 kHz band. Keep named voices low and let `breathiness` scale up from there.

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

The library ships with three named voices, one per register:

### Chitose Chika (female)

```typescript
{
  glottal: { openQuotient: 0.51, speedQuotient: 2.25, tenseness: 0.5, aspiration: 0.018, power: 0.66, jitter: 0.015, shimmer: 0.03 },
  formant: { scale: 1.16, shift: 0, bandwidth: 1.02 },
  vibrato: { rate: 5.9, depth: 38, attack: 0.11 },
}
```

### Chitose Sho (male)

```typescript
{
  glottal: { openQuotient: 0.42, speedQuotient: 2.7, tenseness: 0.66, aspiration: 0.009, power: 0.78, jitter: 0.012, shimmer: 0.025 },
  formant: { scale: 0.88, shift: -1, bandwidth: 0.92 },
  vibrato: { rate: 5.0, depth: 26, attack: 0.16 },
}
```

### Chitose Ren (neutral)

```typescript
{
  glottal: { openQuotient: 0.48, speedQuotient: 2.5, tenseness: 0.57, aspiration: 0.014, power: 0.7, jitter: 0.017, shimmer: 0.032 },
  formant: { scale: 0.97, shift: 0, bandwidth: 1.05 },
  vibrato: { rate: 5.6, depth: 32, attack: 0.14 },
}
```

`chitoseVoices` holds all three in that order.

## Perceptual Scaling

The `scaleVoice()` function maps high-level perceptual controls to the underlying parameters. Each control is a shift *away from the voice you pass in*, so the neutral point of every control returns that voice unchanged:

| Control         | Neutral | Range                                                              |
| --------------- | ------- | ------------------------------------------------------------------ |
| `gender`        | `0`     | `-1` masculine to `1` feminine                                     |
| `breathiness`   | `0.5`   | `0` no breath noise, `0.5` the voice's own aspiration, `1` doubled |
| `tension`       | `0.5`   | `0` relaxed, `1` pressed                                           |
| `brightness`    | `0.5`   | `0` dark, `1` bright                                               |
| `vibratoAmount` | `0.5`   | `0` none, `0.5` the voice's own depth, `1` doubled                 |

```typescript
const adjusted = scaleVoice(chitoseChika, {
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
  glottal: { openQuotient: 0.6, aspiration: 0.03 },
});
```

All unspecified fields fall through to neutral defaults.
