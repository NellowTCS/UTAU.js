# TODO

## CI & Release

- [ ] GitHub Actions: run tests + build on push/PR
- [ ] Tags + release workflow

## Demo UX

- [x] Connect VoicePanel easy params to render pipeline
- [x] TransportBar play button uses current voice params + selected language
- [x] PianoRoll: note selection highlight + pitch curve overlay
- [ ] PianoRoll: undo/redo stack
- [ ] File save (.json score export)
- [x] WAV export
- [x] UST/USTX/VPR/VSQX/MIDI import (via utaformatix-ts)
- [ ] Tempo/BPM control in TransportBar
- [x] Volume slider
- [ ] Scroll-to-playhead during playback

## Synthesis Pipeline

- [ ] Consonant–vowel co-articulation between consecutive notes
- [ ] Phoneme-level attack/decay envelopes (currently uses global fade)
- [ ] Diphthong formant sweeping over note duration
- [x] Nasal anti-resonator integration in renderNote
- [x] Tempo: read Score.tempos, convert note ticks to seconds
- [x] Stereo output (dual mono — true stereo mixing still needed)
- [x] Noise mixing for fricatives during phoneme transitions
- [x] Voice scaling: apply user params (gender, breathiness, tension, brightness)
- [x] Pitch curve support (pitchBend on Note, interpolated per-sample in renderer)
- [ ] Per-note vibratoOverride from Note.vibratoOverride (defined but unused)

## Languages

- [ ] Expand English G2P to ~1000+ common words
- [ ] Pitch accent support for Japanese
- [x] Language selector in UI that switches the renderer
- [ ] Chinese (Mandarin) language module
- [ ] Phoneme alias map for cross-language compatibility

## Player

- [x] Emit progress events during playback
- [ ] Seek to position
- [ ] Loop region
- [x] Volume control (gain node + setVolume API)
- [ ] Pre-buffer threshold / buffer underrun handling

## Performance

- [ ] Move note rendering to a Web Worker
- [ ] Chunk prefetch: render ahead of playback clock
- [ ] AudioBuffer recycling / pool allocation
- [ ] Reuse Web Audio nodes instead of createBuffer+createBufferSource per chunk

## Documentation

- [ ] README: quickstart, API overview, architecture diagram
- [ ] JSDoc on all public exports
- [ ] DocMD docs probably
- [ ] Examples: render score to .wav in Node.js, import + play UST in browser
- [ ] API reference for VoiceConfig parameters and their perceptual effect
