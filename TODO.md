# TODO

<!-- (sheesh comphrensive todo lol) -->

## Testing

- [ ] Jest
- [ ] Unit tests for DSP: oscillator (LF pulse shape, Oq/Sq variation), filter (FormantCascade frequency response at each formant), noise (NoiseSource amplitude), envelope (envelope shape, mixBuffers)
- [ ] Unit tests for synth: renderNote output shape (sample count, fade), streamScore chunk boundaries, mixChunks overlap-add
- [ ] Unit tests for voices: buildVoice returns correct config, scaleVoice modifies the right params
- [ ] Unit tests for languages: japanese lyricToPhonemes with hiragana + romaji input, english lyricToPhonemes with lexicon hits + fallback
- [ ] Integration test: renderNote("a", MIDI 69, 480, femaleVoice, japanese) -> Float32Array of expected length, non-zero samples
- [ ] Integration test: streamScore with 3-note score -> yields 3+ chunks, last chunk has isLast
- [ ] Player integration test: StreamPlayer play/stop/pause/resume state transitions

## CI & Release

- [ ] GitHub Actions: run tests + build on push/PR
- [ ] npm publish config in Build/package.json (main, module, types, files)
- [ ] Tags + release workflow

## Demo UX

- [ ] Connect VoicePanel easy params to render pipeline (currently visual-only sliders)
- [ ] TransportBar play button uses current voice params + selected language
- [ ] PianoRoll: note selection highlight, hover info, snap to grid
- [ ] PianoRoll: undo/redo stack
- [ ] File save/load: export/import .json scores
- [ ] WAV export: renderScore + download as .wav
- [ ] MIDI file import -> Score
- [ ] Tempo/BPM control in TransportBar
- [ ] Volume slider
- [ ] Scroll-to-playhead during playback

## Synthesis Pipeline

- [ ] Consonant–vowel transition / co-articulation between consecutive notes
- [ ] Phoneme-level attack/decay envelopes (currently uses global fade)
- [ ] Diphthong formant sweeping over note duration (endpoints defined, not interpolated)
- [ ] Nasal anti-resonator integration in renderNote (antiformant data exists, not applied)
- [ ] Tempo: read Score.tempos, convert note ticks to seconds
- [ ] Stereo output mixing (currently mono per channel)
- [ ] Noise mixing for fricatives during phoneme transitions
- [ ] Voice scaling: apply user params (gender, breathiness, tension, brightness) per-note
- [ ] Per-note vibratoOverride from Note.vibratoOverride

## Languages

- [ ] Expand English G2P to ~1000+ most common words (currently ~100) using a script?
- [ ] Pitch accent support for Japanese (HL tone patterns matching UTAU standard)
- [ ] Language selector in UI that actually switches the renderer
- [ ] Chinese (Mandarin) language module with Pinyin -> phoneme mapping
- [ ] Phoneme alias map for cross-language note compatibility (e.g. UTAU reclist mapping)

## Player

- [ ] Emit `progress` events during playback (PlayerEvent.progress type exists, never dispatched)
- [ ] Seek to position
- [ ] Loop region
- [ ] Volume control (gain node already wired, no API surface)
- [ ] Pre-buffer threshold / buffer underrun handling

## Performance

- [ ] Move note rendering to a Web Worker so UI stays responsive during long scores
- [ ] Chunk prefetch: render ahead of playback clock
- [ ] AudioBuffer recycling / pool allocation
- [ ] Reuse Web Audio nodes instead of createBuffer+createBufferSource per chunk

## Documentation

- [ ] README: quickstart, API overview, architecture diagram
- [ ] JSDoc on all public exports in Build/src/index.ts
- [ ] DocMD docs probably
- [ ] Example: basic script that renders a score to .wav in Node.js
- [ ] API reference for VoiceConfig parameters and their perceptual effect
