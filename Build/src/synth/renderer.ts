import type { AudioChunk, VoiceConfig, LanguageModule, Note, PhonemeDef, PitchBend, FormantTarget } from "../core/types";
import { LFGlottalSource } from "../core/dsp/oscillator";
import { FormantCascade, FormantFilter, interpolateFormants } from "../core/dsp/filter";
import { hashNote, mulberry32 } from "../core/rng";

const FORMANT_UPDATE_INTERVAL = Math.round(0.005 * 44100);
function midiToFrequency(noteNum: number): number {
  return 440 * Math.pow(2, (noteNum - 69) / 12);
}

function ticksToDuration(tickLen: number, tempo: number, resolution: number, sampleRate: number): number {
  return tickLen * (60 / (tempo * resolution)) * sampleRate;
}

/* Per-note leveling */
function computeAutoGain(peak: number, voicedRatio: number, peakComp: number, volume: number, target: number): number {
  const volGain = volume * 0.01;
  const autoGain = peak === 0 ? 1 : Math.pow(target / peak, peakComp * 0.01);
  return autoGain * volGain;
}

function interpolatePitchBend(bend: PitchBend | undefined, sampleIdx: number, totalSamples: number, noteLenTicks: number): number {
  if (!bend || bend.ticks.length === 0) return 0;
  const tickPos = (sampleIdx / totalSamples) * noteLenTicks;
  if (tickPos <= bend.ticks[0]) return bend.values[0];
  const last = bend.ticks.length - 1;
  if (tickPos >= bend.ticks[last]) return bend.values[last];
  for (let i = 0; i < last; i++) {
    if (tickPos >= bend.ticks[i] && tickPos < bend.ticks[i + 1]) {
      const t = (tickPos - bend.ticks[i]) / (bend.ticks[i + 1] - bend.ticks[i]);
      return bend.values[i] + t * (bend.values[i + 1] - bend.values[i]);
    }
  }
  return bend.values[last];
}

function computePhonemeDurations(phonemes: PhonemeDef[], noteLenSamp: number, sr: number): Int32Array {
  const dur = new Int32Array(phonemes.length);
  let totalConsSamp = 0;
  let vowelWeight = 0;

  for (const ph of phonemes) {
    if (ph.type === "consonant" || ph.type === "silence") {
      totalConsSamp += Math.round((ph.defaultDuration ?? 0.06) * sr);
    } else {
      // Diphthongs need more time to glide; last vowel gets a natural tail.
      const isLast = ph === phonemes[phonemes.length - 1];
      const weight = (ph.type === "diphthong" ? 1.3 : 1) * (isLast ? 1.2 : 1);
      vowelWeight += weight;
    }
  }

  const maxConsSamp = Math.round(noteLenSamp * 0.4);
  if (totalConsSamp > maxConsSamp) {
    const scale = maxConsSamp / totalConsSamp;
    totalConsSamp = 0;
    for (let i = 0; i < phonemes.length; i++) {
      const ph = phonemes[i];
      if (ph.type === "consonant" || ph.type === "silence") {
        const d = Math.max(1, Math.round((ph.defaultDuration ?? 0.06) * sr * scale));
        dur[i] = d;
        totalConsSamp += d;
      }
    }
  }

  const remaining = noteLenSamp - totalConsSamp;
  if (vowelWeight === 0) {
    const perPh = Math.max(1, Math.floor(noteLenSamp / phonemes.length));
    let pos = 0;
    for (let i = 0; i < phonemes.length; i++) {
      dur[i] = i === phonemes.length - 1 ? noteLenSamp - pos : perPh;
      pos += dur[i];
    }
  } else {
    const samplesPerWeight = Math.max(1, remaining / vowelWeight);
    let pos = 0;
    for (let i = 0; i < phonemes.length; i++) {
      const ph = phonemes[i];
      if (ph.type === "consonant" || ph.type === "silence") {
        if (dur[i] === 0) dur[i] = Math.max(1, Math.round((ph.defaultDuration ?? 0.06) * sr));
      } else {
        const isLast = i === phonemes.length - 1;
        const weight = (ph.type === "diphthong" ? 1.3 : 1) * (isLast ? 1.2 : 1);
        dur[i] = Math.max(1, Math.round(samplesPerWeight * weight));
      }
      pos += dur[i];
    }
    // Correct rounding drift so total matches noteLenSamp exactly.
    const totalDur = dur.reduce((a, b) => a + b, 0);
    if (totalDur !== noteLenSamp) {
      const lastVowel = [...phonemes].findLastIndex((p) => p.type !== "consonant" && p.type !== "silence");
      if (lastVowel >= 0) dur[lastVowel] += noteLenSamp - totalDur;
    }
  }

  return dur;
}

function getPhonemeEnvelopeSamples(ph: PhonemeDef, sr: number): { attack: number; decay: number } {
  if (ph.type === "silence") return { attack: 0, decay: 0 };
  if (ph.consonantType === "plosive") {
    return { attack: Math.round(0.002 * sr), decay: Math.round(0.015 * sr) };
  }
  if (ph.type === "consonant") {
    return { attack: Math.round(0.005 * sr), decay: Math.round(0.003 * sr) };
  }
  return { attack: Math.round(0.005 * sr), decay: Math.round(0.003 * sr) };
}

/** Render a single note from an already-resolved phoneme sequence.
 *  Returns the audio chunk, the final formant targets of the last phoneme
 *  (for cross-note continuity), and the start sample of each phoneme within
 *  the chunk (used to compute voicebank slice points).
 *
 *  `prevFormants` provides the ending formant targets from the previous
 *  note for smooth formant transitions across note boundaries. */
export function renderPhonemes(
  phonemes: PhonemeDef[],
  note: Note,
  voice: VoiceConfig,
  tempo: number,
  resolution: number,
  prevFormants?: FormantTarget[],
): { chunk: AudioChunk; finalFormants: FormantTarget[]; phonemeStarts: number[] } {
  const sr = voice.sampleRate;
  const baseF0 = midiToFrequency(note.noteNum);

  const noteLen = Math.max(1, Math.round(ticksToDuration(note.length, tempo, resolution, sr)));
  const fScale = voice.formant.scale;
  const fShift = voice.formant.shift;

  const applyVoice = (targets: { f: number; bw: number }[]) =>
    targets.map((t) => ({ f: t.f * fScale * Math.pow(2, fShift / 12), bw: t.bw * voice.formant.bandwidth }));

  const DEFAULT_FORMANTS = applyVoice([
    { f: 500, bw: 120 },
    { f: 1500, bw: 180 },
    { f: 2500, bw: 220 },
    { f: 3500, bw: 350 },
    { f: 4500, bw: 500 },
  ]);

  if (phonemes.length === 0) {
    const len = Math.max(1, Math.round(ticksToDuration(note.length, tempo, resolution, sr)));
    const chunk: AudioChunk = {
      data: [new Float32Array(len), new Float32Array(len)],
      sampleRate: sr,
      startSample: 0,
      channels: voice.channels,
    };
    return { chunk, finalFormants: DEFAULT_FORMANTS, phonemeStarts: [] };
  }

  const glottal = new LFGlottalSource();
  const seedBase = hashNote(note, `${tempo}:${resolution}:${phonemes.map((p) => p.symbol).join(",")}`);
  const rng = mulberry32(seedBase);
  glottal.seed(rng);
  const cascade = new FormantCascade();

  const mono = new Float32Array(noteLen);
  const vibOverride = note.vibratoOverride ?? {};
  const vibRate = vibOverride.rate ?? voice.vibrato.rate;
  const vibDepth = vibOverride.depth ?? voice.vibrato.depth;
  const vibAttackSamp = Math.round((vibOverride.attack ?? voice.vibrato.attack) * sr);

  const transitionLen = Math.round(0.03 * sr);
  const fadeLen = Math.round(0.003 * sr);
  const boundaryFadeLen = Math.round(0.002 * sr);

  // Velocity (0-127) modulates breath, shimmer, and aspiration dynamics.
  // Higher velocity = more breath, less shimmer, stronger aspiration.
  const velNorm = Math.max(0, Math.min(1, (note.velocity ?? 100) / 127));
  const velBreathScale = 0.5 + velNorm * 0.8;       // 0.5x at v=0, 1.3x at v=127
  const velShimmerScale = 1 - velNorm * 0.6;         // 1.0x at v=0, 0.4x at v=127
  const velAspirationScale = 0.6 + velNorm * 0.6;    // 0.6x at v=0, 1.2x at v=127
  const intensity = note.intensity ?? 100;
  const intensityScale = intensity / 100;

  const phDurations = computePhonemeDurations(phonemes, noteLen, sr);
  const piAtSample = new Int32Array(noteLen);
  const phSampleCounts = new Int32Array(phonemes.length);
  {
    let pos = 0;
    for (let pi = 0; pi < phonemes.length; pi++) {
      const end = Math.min(pos + phDurations[pi], noteLen);
      for (let i = pos; i < end; i++) {
        piAtSample[i] = pi;
        phSampleCounts[pi]++;
      }
      pos = end;
    }
    while (pos < noteLen) {
      piAtSample[pos] = phonemes.length - 1;
      phSampleCounts[phonemes.length - 1]++;
      pos++;
    }
  }

  const phEnvelopes = phonemes.map((ph) => getPhonemeEnvelopeSamples(ph, sr));

  let prevPi = -1;
  let phSegStart = 0;
  let overallPeak = 1e-10;
  let voicedSamples = 0;
  let lastFormantUpdateSample = -FORMANT_UPDATE_INTERVAL; // force update on first sample
  const parallelFilters: FormantFilter[] = Array.from({ length: 3 }, () => new FormantFilter());
  for (const pf of parallelFilters) pf.setPassthrough();

  // Klatt-style parallel aspiration branch: glottal breath is shaped by a
  // fixed broadband formant pair and summed *after* the voiced cascade, so it
  // is independent of the vowel formants (unlike the old pre-cascade injection).
  const breathFilters: FormantFilter[] = [
    (() => {
      const f = new FormantFilter();
      f.setResonator(1800, 1200, sr);
      return f;
    })(),
    (() => {
      const f = new FormantFilter();
      f.setResonator(3500, 1800, sr);
      return f;
    })(),
  ];

  for (let i = 0; i < noteLen; i++) {
    const pi = piAtSample[i];
    const cp = phonemes[pi] ?? phonemes[phonemes.length - 1];

    if (pi !== prevPi) {
      phSegStart = i;
      prevPi = pi;
      // Keep filter state from the previous phoneme: the ringing of the old
      // coefficients naturally crossfades into the new ones as they settle,
      // producing a smooth formant glide instead of a discontinuity.
      // Update parallel noise-filter coefficients for the new phoneme.
      const noiseTargets = cp.noise?.formantShaping ?? [];
      for (let fi = 0; fi < parallelFilters.length; fi++) {
        if (fi < noiseTargets.length) {
          const at = applyVoice([noiseTargets[fi]])[0];
          parallelFilters[fi].setResonator(at.f, at.bw, sr);
        } else {
          parallelFilters[fi].setPassthrough();
        }
      }
    }

    const vibGain = i < vibAttackSamp ? i / vibAttackSamp : 1;
    const pitchBendSemitones = interpolatePitchBend(note.pitchBend, i, noteLen, note.length);
    const vibCents = Math.sin((2 * Math.PI * vibRate * i) / sr) * vibDepth * vibGain;
    const accentCents = (note.pitchAccent ?? 0) * 100;
    const f0 = baseF0 * Math.pow(2, (pitchBendSemitones * 100 + vibCents + accentCents) / 1200);
    const pp = pi === 0 && prevFormants ? ({ formants: prevFormants } as PhonemeDef) : (phonemes[Math.max(0, pi - 1)] ?? cp);
    const segPos = i - phSegStart;
    const phDur = phSampleCounts[pi];
    const tt = Math.min(1, segPos / Math.max(1, transitionLen));

    // Throttle formant coefficient updates.
    if (i - lastFormantUpdateSample >= FORMANT_UPDATE_INTERVAL) {
      lastFormantUpdateSample = i;
      const ft = pp.formants ?? [];
      const ct = cp.formants ?? ft;
      if (tt < 1 && ft.length && ct.length) {
        cascade.setFormants(
          interpolateFormants(applyVoice(ft), applyVoice(ct), tt),
          sr,
          cp.antiformants ? applyVoice(cp.antiformants) : undefined,
        );
      } else if (cp.type === "diphthong" && cp.endFormants && cp.endFormants.length > 0) {
        const sweepT = Math.min(1, (segPos - transitionLen) / Math.max(1, phDur - transitionLen));
        const swept = interpolateFormants(applyVoice(ct), applyVoice(cp.endFormants), sweepT);
        cascade.setFormants(swept, sr, cp.antiformants ? applyVoice(cp.antiformants) : undefined);
      } else if (ct.length) {
        cascade.setFormants(applyVoice(ct), sr, cp.antiformants ? applyVoice(cp.antiformants) : undefined);
      } else {
        cascade.setFormants(DEFAULT_FORMANTS, sr);
      }
    }

    const gSample = glottal.nextSample({ f0, sampleRate: sr, ...voice.glottal, shimmer: (voice.glottal.shimmer ?? 0) * velShimmerScale });
    const voiced = cp.voiced !== false;
    if (voiced) voicedSamples++;
    const nSample = rng() * 2 - 1;

    const noiseFadeIn = Math.min(1, segPos / Math.max(1, fadeLen));
    const noiseFadeOut = Math.max(0, Math.min(1, (phDur - segPos - 1) / Math.max(1, fadeLen)));
    const noiseEnv =
      cp.consonantType === "plosive"
        ? Math.min(noiseFadeIn, Math.max(0, 1 - segPos / Math.max(1, Math.round(0.012 * sr))))
        : Math.min(noiseFadeIn, noiseFadeOut);

    let glottalSignal = voiced ? gSample : 0;
    let noiseSignal = 0;
    if (cp.type === "consonant" && cp.noise) {
      if (cp.noise.formantShaping && cp.noise.formantShaping.length > 0) {
        for (let fi = 0; fi < Math.min(parallelFilters.length, cp.noise.formantShaping.length); fi++) {
          noiseSignal += parallelFilters[fi].processSample(nSample);
        }
      } else {
        noiseSignal = nSample;
      }
      noiseSignal *= cp.noise.amplitude * noiseEnv * velBreathScale;
    }
    let breathSignal = 0;
    if (cp.type === "vowel" || cp.type === "diphthong") {
      // Parallel aspiration branch (broadband breath), summed post-cascade.
      let breath = 0;
      for (const bf of breathFilters) breath += bf.processSample(nSample);
      breathSignal = breath * voice.glottal.aspiration * noiseEnv * velAspirationScale;
    }

    const phEnv = phEnvelopes[pi];
    let env = 1;
    if (phEnv.attack > 0 && segPos < phEnv.attack) {
      const t = segPos / phEnv.attack;
      env *= t * t * (3 - 2 * t);
    }
    if (phEnv.decay > 0 && segPos >= phDur - phEnv.decay) {
      const t = (phDur - segPos) / phEnv.decay;
      env *= t * t * (3 - 2 * t);
    }
    const cascaded = cascade.processSample(glottalSignal);
    const boundaryFade = Math.min(1, segPos / Math.max(1, boundaryFadeLen));
    const enveloped = (cascaded + noiseSignal + breathSignal) * env * boundaryFade;
    mono[i] = enveloped;
    if (Math.abs(enveloped) > overallPeak) overallPeak = Math.abs(enveloped);
  }

  const voicedRatio = noteLen > 0 ? voicedSamples / noteLen : 1;
  const volume = voice.volume ?? 100;
  const peakComp = voice.peakComp ?? 100;
  const target = voice.normalizeTarget ?? 0.5;
  const gain = computeAutoGain(overallPeak, voicedRatio, peakComp, volume, target) * intensityScale;
  for (let i = 0; i < noteLen; i++) {
    const s = mono[i] * gain;
    mono[i] = s > 0.99 ? 0.99 : s < -0.99 ? -0.99 : s;
  }

  const lastPh = phonemes[phonemes.length - 1];
  let finalFormants: FormantTarget[];
  if (lastPh.type === "diphthong" && lastPh.endFormants && lastPh.endFormants.length > 0) {
    finalFormants = applyVoice(lastPh.endFormants);
  } else if (lastPh.formants && lastPh.formants.length > 0) {
    finalFormants = applyVoice(lastPh.formants);
  } else {
    finalFormants = DEFAULT_FORMANTS;
  }

  const phonemeStarts = new Array<number>(phonemes.length);
  let acc = 0;
  for (let pi = 0; pi < phonemes.length; pi++) {
    phonemeStarts[pi] = acc;
    acc += phSampleCounts[pi];
  }

  const chunk: AudioChunk =
    voice.channels === 2
      ? { data: [new Float32Array(mono), new Float32Array(mono)], sampleRate: sr, startSample: 0, channels: 2 }
      : { data: [mono], sampleRate: sr, startSample: 0, channels: 1 };
  return { chunk, finalFormants, phonemeStarts };
}

/** Render a single note from a lyric string. Resolves phonemes via the
 *  language module (`lang.lyricToPhonemes`), applies the note-join marker
 *  (＠) rule, and delegates to `renderPhonemes`. Returns the same tuple plus
 *  per-phoneme start samples. */
export function renderNote(
  note: Note,
  voice: VoiceConfig,
  lang: LanguageModule,
  tempo: number,
  resolution: number,
  prevFormants?: FormantTarget[],
): { chunk: AudioChunk; finalFormants: FormantTarget[]; phonemeStarts: number[] } {
  const phonemeSymbols = lang.lyricToPhonemes(note.lyric);
  const phonemes = phonemeSymbols
    .map((s) => {
      const p = lang.phonemes.get(s);
      if (!p) console.warn(`renderNote: missing phoneme "${s}" in lyric "${note.lyric}"`);
      return p;
    })
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  // Handle note-join marker (＠): suppress the initial consonant so the
  // vowel carries through as a continuation of the previous note.
  if (note.lyric.includes("＠") && phonemes.length > 0 && phonemes[0].type === "consonant") {
    phonemes.shift();
  }

  return renderPhonemes(phonemes, note, voice, tempo, resolution, prevFormants);
}
