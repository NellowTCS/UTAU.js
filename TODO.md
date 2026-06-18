# TODO

## Demo UX

- [ ] Scroll-to-playhead during playback (toggleable, settings)
- [ ] Seek to position
- [ ] Loop region

## Languages

- [x] Expand English G2P to full CMUDict (124,911 words, via Build/scripts/build-g2p-en.ts)
- [x] Japanese G2P from EDICT2 (224,808 kanji->kana entries, via Build/scripts/build-g2p-jp.ts)
- [x] Chinese (Mandarin) language module
- [x] Phoneme alias map for cross-language compatibility

## Performance

- [ ] Move note rendering to a Web Worker
- [ ] Chunk prefetch: render ahead of playback clock

## Documentation

- [ ] README: quickstart, API overview, architecture diagram
- [ ] JSDoc on all public exports
- [ ] DocMD docs probably
- [ ] Examples: render score to .wav in Node.js, import + play UST in browser
- [ ] API reference for VoiceConfig parameters and their perceptual effect
