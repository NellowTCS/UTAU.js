# TODO

## CI & Release

- [X] GitHub Actions: run tests + build on push/PR
- [X] Tags + release workflow
- [X] Updato CDN

## Demo UX

- [ ] PianoRoll: undo/redo stack
- [ ] File save (.json score export)
- [ ] Tempo/BPM control in TransportBar
- [ ] Scroll-to-playhead during playback

## Synthesis Pipeline

- [ ] Consonant–vowel co-articulation between consecutive notes
- [ ] Phoneme-level attack/decay envelopes (per phoneme type: plosive 2ms attack / 15ms decay, fricative 5ms/3ms, vowel 5ms/3ms)
- [ ] Diphthong formant sweeping over phoneme duration (via `endFormants` on `PhonemeDef`)
- [ ] Per-note vibratoOverride from Note.vibratoOverride

## Languages

- [ ] Expand English G2P to ~1000+ common words using a script probably
- [ ] Pitch accent support for Japanese
- [ ] Chinese (Mandarin) language module
- [ ] Phoneme alias map for cross-language compatibility

## Player

- [ ] Seek to position
- [ ] Loop region
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
