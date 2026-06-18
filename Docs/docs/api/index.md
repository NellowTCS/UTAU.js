---
title: "API Reference"
description: "Complete API reference for UTAU.js"
---

UTAU.js exposes a flat module surface through its main entry point. All public types and functions are exported from `utaujs`.

## Core Types

| Export                | Description                                                             |
|-----------------------|-------------------------------------------------------------------------|
| `VoiceConfig`         | Complete voice configuration (glottal, formant, vibrato, output format) |
| `GlottalConfig`       | LF glottal pulse source parameters                                      |
| `FormantConfig`       | Vocal-tract formant transformation                                      |
| `VibratoConfig`       | Pitch vibrato modulation                                                |
| `FormantTarget`       | Single formant centre frequency + bandwidth                             |
| `NoiseConfig`         | Noise source for consonant generation                                   |
| `PhonemeDef`          | Full acoustic definition of a phoneme                                   |
| `Note`                | A single note with lyric, pitch, timing, and overrides                  |
| `Score`               | Complete musical score (tempos + notes)                                 |
| `TempoEvent`          | Tempo change event                                                      |
| `AudioChunk`          | Processed audio segment with timeline position                          |
| `LanguageModule`      | Language module interface                                               |
| `PitchBend`           | Pitch-bend envelope                                                     |
| `GlottalSourceParams` | Runtime glottal source parameters                                       |

## DSP Primitives

| Export                   | Description                                  |
|--------------------------|----------------------------------------------|
| `LFGlottalSource`        | LF glottal pulse source (stateful)           |
| `FormantFilter`          | Biquad resonator / anti-resonator            |
| `FormantCascade`         | Cascaded formant filter bank                 |
| `interpolateFormants`    | Smooth interpolation between formant targets |
| `NoiseSource`            | White noise generator                        |
| `shapeNoiseWithFormants` | Filter noise through formant resonators      |
| `applyAmplitudeEnvelope` | Attack/release envelope shaping              |
| `mixBuffers`             | Additive buffer mixing                       |
| `encodeWav`              | Encode AudioChunks as WAV                    |

## Synthesis

| Export        | Description                     |
|---------------|---------------------------------|
| `renderNote`  | Render a single note            |
| `renderScore` | Render an entire score          |
| `streamScore` | Stream score as async generator |
| `mixChunks`   | Mix overlapping AudioChunks     |

## Language

| Export                | Description                           |
|-----------------------|---------------------------------------|
| `getLanguage`         | Look up language module by ID         |
| `registerLanguage`    | Register a custom language module     |
| `japanese`            | Japanese language module              |
| `english`             | English language module               |
| `mandarin`            | Mandarin Chinese language module      |
| `toCanonical`         | Map phoneme symbol to canonical IPA   |
| `sequenceToCanonical` | Map phoneme sequence to canonical IPA |

## Voice

| Export          | Description                             |
|-----------------|-----------------------------------------|
| `getVoice`      | Look up registered voice by name        |
| `registerVoice` | Register a custom voice config          |
| `maleVoice`     | Default male voice preset               |
| `femaleVoice`   | Default female voice preset             |
| `buildVoice`    | Build voice from partial overrides      |
| `scaleVoice`    | Scale voice along perceptual dimensions |

## Playback

| Export         | Description                                       |
|----------------|---------------------------------------------------|
| `StreamPlayer` | Web Audio streaming player                        |
| `PlayerState`  | Player state type ("idle" / "playing" / "paused") |
| `PlayerEvent`  | Player event union type                           |
| `PlayOptions`  | Playback options                                  |

## Import / Export

| Export                 | Description                                          |
|------------------------|------------------------------------------------------|
| `ufDataToScore`        | Convert UfData (utaformatix-3 intermediate) to Score |
| `importScoreFromFile`  | Import score from a File object                      |
| `importScoreFromBytes` | Import score from raw bytes                          |
| `ImportOptions`        | Import options                                       |
| `UfData`               | UTAU Format Data structure                           |
| `scoreToUfData`        | Convert Score to UfData                              |
| `exportScoreToBytes`   | Export score as Uint8Array                           |
| `exportScoreToBlob`    | Export score as Blob                                 |
| `exportScoreToUrl`     | Export score as blob URL                             |
| `downloadScore`        | Trigger browser download                             |
| `ExportOptions`        | Export options                                       |
