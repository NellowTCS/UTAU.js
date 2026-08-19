---
title: "Ichikara"
description: "A speech-synthesis library for singing voice synthesis in the browser"
---

::: hero layout:split glow:true

<!-- markdownlint-disable MD025 -->
# Ichikara

A speech-synthesis library for singing voice synthesis in the browser.

::: tag "LF Glottal"
::: tag "Formant Filter"
::: tag "Cross-Language"

::: button "Quick Start" ./getting-started/quickstart.md icon:play
<!--markdownlint-disable MD034-->
::: button "GitHub" external:https://github.com/NellowTCS/Ichikara icon:github

== side

::: card "Why Ichikara?"
Traditional UTAU needs a separate voicebank for every character or style. Each one recorded, oto'd, and bundled individually. Ichikara flips that: one parametric voice, infinite variation. Change gender, breathiness, brightness, or vibrato with a single function call. No thousand-voice library, no multi-gigabyte downloads.
:::
:::

## Features

::: grids
::: grid
::: card "LF Glottal Source" icon:waveform
Liljencrants-Fant glottal pulse model with jitter, shimmer, aspiration noise, and DC blocking. Control OQ, SQ, tenseness, and power independently.
:::
:::

::: grid
::: card "Cascaded Formant Filter" icon:combine
Series of anti-resonators + resonators modelling the vocal-tract transfer function. Smooth interpolation between phoneme targets.
:::
:::

::: grid
::: card "Three Languages" icon:globe
English (ARPAbet + CMUDict G2P), Japanese (hiragana/romaji + EDICT2 kanji), Mandarin (pinyin syllable decomposition). Extensible via `registerLanguage`.
:::
:::

::: grid
::: card "Streaming Playback" icon:wind
AsyncGenerator-based render pipeline. Play notes as they render via Web Audio with batching and buffer pooling.
:::
:::

::: grid
::: card "File Import / Export" icon:file-up
Read and write UST, USTX, VPR, VSQX, MIDI, MusicXML, and more via utaformatix-3.
:::
:::

::: grid
::: card "OneVoice System" icon:sliders
One parametric voice, infinite variations. Male, female, breathy, bright, tense. All from a single config. `scaleVoice()` maps high-level sliders (gender, breathiness, brightness, tension) to the underlying DSP parameters.
:::
:::

:::

## Quick Example

::: tabs

== tab "Node.js"

```typescript
import { renderScore, femaleVoice, japanese, encodeWav } from "ichikara";
import { writeFileSync } from "node:fs";

const score = {
  tempos: [{ tick: 0, tempo: 120 }],
  resolution: 480,
  notes: [
    { lyric: "こ", noteNum: 60, length: 480 },
    { lyric: "ん", noteNum: 62, length: 480 },
    { lyric: "に", noteNum: 64, length: 480 },
    { lyric: "ち", noteNum: 65, length: 480 },
    { lyric: "は", noteNum: 67, length: 960 },
  ],
};

const chunks = await renderScore(score, femaleVoice, "jp");
const wav = encodeWav(chunks);
writeFileSync("hello.wav", Buffer.from(wav));
```

== tab "Browser"

```typescript
import { streamScore, femaleVoice, japanese, StreamPlayer } from "ichikara";

const score = { /* ... */ };
const player = new StreamPlayer();

player.on((event) => {
  if (event.type === "stateChange") console.log(event.state);
  if (event.type === "progress") console.log(`${event.renderedSamples} samples scheduled`);
});

await player.play(streamScore(score, femaleVoice, "jp"));
```

== tab "Custom Voice"

```typescript
import { renderScore, buildVoice, scaleVoice, encodeWav } from "ichikara";

const brightFemale = scaleVoice(buildVoice({
  name: "Bright Alto",
  formant: { scale: 1.25, shift: 2, bandwidth: 1.0 },
}), {
  gender: 0.3,
  breathiness: 0.2,
  vibratoAmount: 0.8,
});

const chunks = await renderScore(score, brightFemale, "en");
```

:::

## Installation

```bash
npm install ichikara
```

## Next Steps

::: grids
::: grid

### Getting Started

Start here if you are new to Ichikara.

::: button "Quick Start" ./getting-started/quickstart.md icon:play
::: button "Installation" ./getting-started/installation.md icon:download
:::
::: grid

### Learn the Engine

Understand how the synthesis engine works.

::: button "Core Concepts" ./getting-started/concepts.md icon:book
::: button "Architecture" ./guide/architecture.md icon:box
:::
::: grid

### Reference

Browse the full API documentation.

::: button "API Reference" ./api/ icon:code
::: button "Voice Config" ./api/voice-config.md icon:sliders
:::
:::
