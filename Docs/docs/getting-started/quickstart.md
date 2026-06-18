---
title: "Quick Start"
description: "Render your first singing voice synthesis in 5 minutes"
---

This guide gets you from zero to a working UTAU.js render. You will create a score, render it with a voice preset, and save the output as a WAV file.

::: callout tip "Prerequisites"
You need Node.js 18+ or a modern browser. See [Installation](./installation) to set things up.
:::

::: steps

1. **Create a Score**

   A Score is the input to the renderer: tempo map, timing resolution, and a list of notes. Each note has a lyric, MIDI note number, and duration.

   ```typescript
   import { renderScore, femaleVoice, japanese, encodeWav } from "utaujs";

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
   ```

   The lyric text is passed through the language module's G2P pipeline:
   - **Japanese**: hiragana / kanji -> romaji -> phoneme symbols
   - **English**: text -> CMUDict lookup -> ARPAbet phonemes
   - **Mandarin**: pinyin syllables -> initial + final decomposition

2. **Render the Score**

   Call `renderScore` with your score, a voice config, and a language identifier:

   ```typescript
   const chunks = await renderScore(score, femaleVoice, "jp");
   console.log(`Rendered ${chunks.length} notes`);
   ```

   Each chunk is an `AudioChunk` with sample-accurate positioning on the timeline. You can mix them into a single buffer or stream them to the audio output.

3. **Export as WAV**

   ```typescript
   const wav = encodeWav(chunks);
   // Node.js: save to disk
   const { writeFileSync } = await import("node:fs");
   writeFileSync("output.wav", Buffer.from(wav));
   ```

   Or in the browser, create a download link:

   ```typescript
   const blob = new Blob([wav], { type: "audio/wav" });
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = "output.wav";
   a.click();
   URL.revokeObjectURL(url);
   ```

4. **Stream to Audio Output (Browser)**

   For real-time playback without waiting for the full render:

   ```typescript
   import { streamScore, StreamPlayer } from "utaujs";

   const player = new StreamPlayer();
   await player.play(streamScore(score, femaleVoice, "jp"));
   ```

   The renderer produces audio chunks while the player schedules them against the Web Audio clock. Pre-buffer threshold defaults to 1 second.

5. **Try a Different Voice**

   UTAU.js ships with male and female presets, plus a builder for custom voices:

   ```typescript
   import { maleVoice, buildVoice, scaleVoice } from "utaujs";

   // Use the built-in male voice
   const chunks1 = await renderScore(score, maleVoice, "jp");

   // Build a custom voice
   const custom = buildVoice({ name: "My Voice", sampleRate: 48000 });

   // Scale along perceptual dimensions
   const breathy = scaleVoice(femaleVoice, {
     breathiness: 0.6,
     tension: 0.3,
     vibratoAmount: 0.5,
   });

   const chunks2 = await renderScore(score, breathy, "en");
   ```

:::

## Next Steps

::: grids
::: grid
::: button "Installation" ./installation.md icon:download
:::
::: grid
::: button "Core Concepts" ./concepts.md icon:book
:::
::: grid
::: button "API Reference" ../api/ icon:code
:::
::: grid
::: button "Voice Config" ../api/voice-config.md icon:sliders
:::
:::
