# TODO

## Demo UX

- [ ] PianoRoll: undo/redo stack
- [ ] File save (.json score export)
- [ ] Tempo/BPM control in TransportBar
- [ ] Scroll-to-playhead during playback
- [ ] Seek to position
- [ ] Loop region
- [ ] Pre-buffer threshold / buffer underrun handling

## Languages

- [ ] Expand English G2P to ~1000+ common words using a script probably
- [x] Pitch accent support for Japanese
- [ ] Chinese (Mandarin) language module
- [ ] Phoneme alias map for cross-language compatibility

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
