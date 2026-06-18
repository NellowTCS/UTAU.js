---
title: "DSP Primitives"
description: "Low-level digital signal processing components"
---

## LFGlottalSource

Stateful LF glottal pulse source. Create one instance per voice and call `nextSample()` for each output sample.

```typescript
const glottal = new LFGlottalSource();

// Generate a single sample
const sample = glottal.nextSample({
  f0: 261.63,           // C4
  sampleRate: 44100,
  openQuotient: 0.5,
  speedQuotient: 0.85,
  tenseness: 0.55,
  aspiration: 0.05,
  power: 0.7,
  jitter: 0.015,
});

// Generate a buffer of samples
const buf = glottal.generate(params, 1024);

// Reset for a new phrase (avoids click from phase discontinuity)
glottal.reset();
```

## FormantFilter

Single biquad resonator or anti-resonator. Direct Form I implementation.

```typescript
const filter = new FormantFilter();

// Configure as resonator at 500 Hz with 100 Hz bandwidth
filter.setResonator(500, 100, 44100);

// Or as anti-resonator (zero)
filter.setAntiResonator(500, 100, 44100);

// Bypass (passthrough)
filter.setPassthrough();

// Process samples
const output = filter.processSample(input);
const buffer = filter.process(inputBuffer);

// Reset state
filter.reset();
```

## FormantCascade

Cascade of anti-resonators followed by resonators, modelling the vocal-tract transfer function. Typically 5 formants.

```typescript
const cascade = new FormantCascade(5); // 5 formants

// Set formant targets (all at once)
cascade.setFormants([
  { f: 730, bw: 90 },
  { f: 1090, bw: 120 },
  { f: 2440, bw: 150 },
  { f: 3500, bw: 200 },
  { f: 4500, bw: 300 },
], 44100, [{ f: 350, bw: 100 }]); // optional anti-formants

// Process
const out = cascade.processSample(inSample);

// Reset at phoneme boundaries
cascade.reset();
```

## interpolateFormants

Smooth (smoothstep) interpolation between two formant target arrays.

```typescript
const start = [{ f: 730, bw: 90 }, { f: 1090, bw: 120 }, /* ... */];
const end =   [{ f: 390, bw: 60 }, { f: 1990, bw: 80 }, /* ... */];

// t = 0 -> start, t = 1 -> end
const midway = interpolateFormants(start, end, 0.5);
```

## NoiseSource

Uniform white noise generator.

```typescript
const noise = new NoiseSource();
const buf = noise.generate(1024);
```

## shapeNoiseWithFormants

Shape white noise through a series of resonator filters.

```typescript
const noise = new NoiseSource().generate(1024);
const shaped = shapeNoiseWithFormants(noise, [
  { f: 4000, bw: 1000 },
  { f: 7000, bw: 2000 },
], 44100);
```

## applyAmplitudeEnvelope

Apply smooth attack/release envelope to a buffer (in-place).

```typescript
const buf = new Float32Array(44100);
applyAmplitudeEnvelope(buf, 1000, 5000); // 1000 samples attack, 5000 release
```

## mixBuffers

Additively mix a source buffer into a target buffer (in-place).

```typescript
mixBuffers(target, source, targetOffset, 0.5); // mix at 50% gain
```

## encodeWav

Encode AudioChunks as a 16-bit PCM WAV file.

```typescript
const wavBuffer: ArrayBuffer = encodeWav(chunks, 0.8); // 80% gain
```
